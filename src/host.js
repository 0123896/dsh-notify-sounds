/**
 * DSH "DingDing" notification sounds — HOST half.
 *
 * Runs inside the DeepSeek Harness dynamic-Cordis host runner. It detects the
 * two moments and enqueues notification events that the CLIENT half drains and
 * turns into audio.
 *
 *  1. 「对话结束 / reply finished」 -> enqueue { kind: 'end' }
 *     Event: `agent/turn-stopping` (reliably fires when an assistant turn
 *     closes with no pending tool calls / steering).
 *
 *  2. 「需要手动确认 / user must confirm」 -> enqueue { kind: 'approval' }
 *     Event: `tools/pre-execute`. When its `next()` decides
 *            `{ kind: 'ask' }` (the tool needs human approval) or the tool is
 *            `ask_user_question`, the approval tone plays. `approval/request` /
 *            `user-questions/request` remain as fallbacks. If you use other
 *            "confirmation" tools, list them in CONFIRM_TOOL_NAMES.
 *
 * The client half polls `notif-drain` (a package-private RPC) and plays a
 * tone or a configured audio file. This half NEVER embeds audio and carries
 * no local absolute paths, so it is portable and safe to open-source.
 *
 * Just the plain-JavaScript body (no TS/JSX). See README for wiring.
 */

// Tool calls that mean "the user needs to confirm/answer". Tune to taste.
const CONFIRM_TOOL_NAMES = new Set(['ask_user_question'])

return {
  inject: ['fs', 'webServer'],
  async apply(ctx, config = {}) {
    const queue = []

    const enqueue = (kind) => queue.push({ kind })

    // ------------------------------------------------------------------
    // 1) 对话结束
    // ------------------------------------------------------------------
    ctx.on('agent/turn-stopping', () => {
      enqueue('end')
    })

    // ------------------------------------------------------------------
    // 2) 需要手动确认 / 提问 / 审批
    //    `tools/pre-execute` is the most reliable signal: it runs for EVERY tool
    //    dispatch and its `next()` decides whether the tool is allowed, denied,
    //    or needs user approval (`{ kind: 'ask' }`). So we play the approval tone
    //    whenever a call ends up asking the user — either an explicit question
    //    (ask_user_question) or a normal tool that requires human approval.
    // ------------------------------------------------------------------
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
    // Optional extra waterfalls that also signal a confirmation (some runtimes
    // reach them, some don't — the client dedupes, so duplicates are harmless).
    ctx.on('approval/request', (req, next) => {
      enqueue('approval')
      return next()
    })
    ctx.on('user-questions/request', (request, next) => {
      enqueue('approval')
      return next()
    })

    // ------------------------------------------------------------------
    // Optionally serve custom sound files via the DSH webServer.
    // config.endUrl / config.approvalUrl are absolute paths on THIS machine.
    // If omitted, the client uses pure Web Audio tones (no files needed).
    // Routes are disposable on unload.
    // ------------------------------------------------------------------
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
      for (const disposer of soundRoutes.values()) disposer()
    })

    // The browser half polls HERE.
    harness.handle('notif-drain', () => {
      const items = queue.splice(0, queue.length)
      return { items }
    })
  },
}