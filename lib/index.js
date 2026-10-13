/**
 * @0123896/dsh-notify-sounds — HOST half.
 *
 * Standard DSH bundle plugin (ESM). Runs in the DSH Node host process:
 *   · detects the two notification moments and queues them;
 *   · serves the queue and (optional) sound files over same-origin HTTP routes
 *     that the browser half polls directly.
 *
 * No audio is bundled: with no config the browser half synthesizes the tones
 * with Web Audio. Point `endFilePath` / `approvalFilePath` at local files to
 * serve your own MP3/WAV instead.
 *
 * Routes (all relative to the DSH web origin):
 *   GET /notify-sounds/drain          → { items: [{ kind }] } and clears the queue
 *   GET /notify-sounds/end.mp3        → config.endFilePath        (if set)
 *   GET /notify-sounds/approval.mp3   → config.approvalFilePath   (if set)
 */

/** Tool calls that always mean "the user must confirm/answer". */
const CONFIRM_TOOL_NAMES = new Set(['ask_user_question'])

/** Route prefix owned by this plugin. */
const BASE = '/notify-sounds'

export const name = 'dsh-notify-sounds'

// `webServer` is a hard dependency: without an HTTP server the browser half has
// nothing to poll. `fs` is only needed to serve custom sound files.
export const inject = ['webServer']

export default function apply(ctx, config = {}) {
  const queue = []
  const enqueue = (kind) => {
    queue.push({ kind, at: Date.now() })
    // Bound the queue so a client that never polls cannot grow it forever.
    if (queue.length > 64) queue.splice(0, queue.length - 64)
  }

  // ── 1) conversation / reply finished ──────────────────────────────────────
  ctx.on('agent/turn-stopping', () => enqueue('end'))

  // ── 2) the user must confirm: a question or any tool that needs approval ──
  // `tools/pre-execute` runs for every dispatch; its `next()` decides
  // allow / deny / ask. `{ kind: 'ask' }` is exactly "approval requested".
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
  // Fallbacks for runtimes that raise these instead of an `ask` decision.
  ctx.on('approval/request', (_req, next) => {
    enqueue('approval')
    return next()
  })
  ctx.on('user-questions/request', (_request, next) => {
    enqueue('approval')
    return next()
  })

  const webServer = ctx.get('webServer')
  if (!webServer) return

  const json = (res, status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify(body))
  }

  // The browser half polls HERE; draining clears the queue. The response also
  // carries the custom-sound URLs (when configured), so the browser half needs
  // no copy of the config of its own.
  webServer.register({
    kind: 'exact',
    path: `${BASE}/drain`,
    handler: async (_req, res) => {
      const items = queue.splice(0, queue.length)
      const urls = {}
      if (config.endFilePath) urls.end = `${BASE}/end.mp3`
      if (config.approvalFilePath) urls.approval = `${BASE}/approval.mp3`
      json(res, 200, { items, urls })
    },
  })

  // Optional custom audio files.
  const serveFile = (route, absPath) => {
    if (!absPath) return
    webServer.register({
      kind: 'exact',
      path: route,
      handler: async (_req, res) => {
        try {
          const fs = ctx.get('fs')
          if (!fs) throw new Error('fs service unavailable')
          const target = await fs.resolve(absPath)
          const data = await fs.readBytes(target, undefined, 50 * 1024 * 1024)
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(data.byteLength),
            'Cache-Control': 'no-store',
          })
          res.end(data)
        } catch (error) {
          ctx.logger?.warn?.(`[dsh-notify-sounds] cannot serve ${absPath}: ${error?.message ?? error}`)
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('not found')
        }
      },
    })
  }
  serveFile(`${BASE}/end.mp3`, config.endFilePath)
  serveFile(`${BASE}/approval.mp3`, config.approvalFilePath)
}