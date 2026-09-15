/**
 * @author 0123896
 *
 * @0123896/dsh-notify-sounds — DeepSeek Harness (DSH) notification-sound plugin.
 *
 * Installable (static-composition) form of the dynamic two-body plugin kept in
 * src/host.js and src/client.js. This is a proper Cordis HOST plugin:
 *
 *   module.exports            — { inject, apply }: runs in the DSH Node process,
 *                                detects the two moments, keeps a drain queue
 *                                and serves optional sound files.
 *   module.exports.clientText — the browser-half body (src/client.js) as a string,
 *                                for a host integration that mounts the page side.
 *
 * The dynamic (cordis_define code.host / code.client) form remains the simplest
 * in-tool path; this package is the equivalent for a static cordis.yml / preset.
 */

const CONFIRM_TOOL_NAMES = new Set(['ask_user_question'])

module.exports = {
  inject: ['fs', 'webServer'],
  async apply(ctx, config = {}) {
    const queue = []
    const enqueue = (kind) => queue.push({ kind })

    // 1) 对话结束
    ctx.on('agent/turn-stopping', () => enqueue('end'))

    // 2) 提问 / 审批（调用前决策为 ask，或工具即 ask_user_question）
    ctx.on('tools/pre-execute', async (exec, next) => {
      let decision
      try {
        decision = await next()
      } catch {
        decision = undefined
      }
      const asked = !!decision && decision.kind === 'ask'
      const isQuestion = !!(exec && CONFIRM_TOOL_NAMES.has(exec.name))
      if (asked || isQuestion) enqueue('approval')
      return decision
    })
    ctx.on('approval/request', (req, next) => {
      enqueue('approval')
      return next()
    })
    ctx.on('user-questions/request', (request, next) => {
      enqueue('approval')
      return next()
    })

    // Optional custom sound files served via the DSH webServer.
    const soundRoutes = new Map()
    const serve = (path, absPath, contentType) => {
      if (!absPath) return
      const disposer = ctx.webServer.register({
        kind: 'exact',
        path,
        handler: async (_req, res) => {
          try {
            const target = await ctx.fs.resolve(absPath)
            const data = await ctx.fs.readBytes(target, undefined, 50 * 1024 * 1024)
            res.writeHead(200, {
              'Content-Type': contentType,
              'Content-Length': String(data.byteLength),
            })
            res.end(data)
          } catch (e) {
            console.error('[dsh-notify-sounds] serve audio failed', path, e)
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('not found')
          }
        },
      })
      soundRoutes.set(path, disposer)
    }
    serve('/__dsh-notify/end.mp3', config.endFilePath, 'audio/mpeg')
    serve('/__dsh-notify/approval.mp3', config.approvalFilePath, 'audio/mpeg')
    ctx.effect(() => () => {
      for (const d of soundRoutes.values()) d()
    })

    // The browser half drains here.
    harness.handle('notif-drain', () => {
      const items = queue.splice(0, queue.length)
      return { items }
    })
  },
}

// Optional static webServer route serving the client body string for a UI that
// wants to load it. The drain RPC is enough for the paired client; this is only
// a convenience for debugging / explicit loading.
Object.defineProperty(module.exports, 'client', {
  value: require('fs').readFileSync(require('path').join(__dirname, 'client.js'), 'utf8'),
  enumerable: true,
})