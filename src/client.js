/**
 * DSH "DingDing" notification sounds — CLIENT half.
 *
 * Runs in the browser page. It polls the host half's `notif-drain` RPC and
 * plays a short Web Audio tone (default, no assets) or a configured audio file
 * (optional `endUrl` / `approvalUrl`, e.g. served by the host half).
 *
 * Plain JavaScript only (no JSX/TS). Uses ambient browser globals that are NOT
 * shadowed by the runner: `globalThis`, `Audio`, `AudioContext`.
 */

return {
  inject: ['timer'],
  apply(ctx, config = {}) {
    const root = (typeof globalThis !== 'undefined' ? globalThis : null) || {}

    // Per-kind audio: either an explicit URL or a synthesized tone.
    const SOURCES = {
      end: {
        url: config.endUrl || '',
        frequency: config.endFrequency || 880,
        durationMs: config.endDurationMs || 240,
      },
      approval: {
        url: config.approvalUrl || '',
        frequency: config.approvalFrequency || 660,
        durationMs: config.approvalDurationMs || 420,
      },
    }

    // ---- Web Audio tone synthesis ------------------------------------
    let audioCtx = null
    const getAudioContext = () => {
      const Ctor = root.AudioContext || root.webkitAudioContext
      if (!Ctor) return null
      if (!audioCtx) {
        try { audioCtx = new Ctor() } catch (e) { audioCtx = null }
      }
      return audioCtx
    }

    const playTone = (cfg) => {
      const ac = getAudioContext()
      if (!ac) return
      try {
        if (ac.state === 'suspended') ac.resume()
        const freq = cfg.frequency || 880
        const dur = (cfg.durationMs || 300) / 1000
        const t0 = ac.currentTime + 0.01
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t0)
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        osc.connect(gain)
        gain.connect(ac.destination)
        osc.start(t0)
        osc.stop(t0 + dur + 0.05)
      } catch (e) {
        console.error('[dsh-notify-sounds] beep failed', e)
      }
    }

    const playOne = (cfg) => {
      if (cfg.url) {
        const AudioCtor = root.Audio
        if (!AudioCtor) { playTone(cfg); return }
        try {
          const el = new AudioCtor(cfg.url)
          el.addEventListener('error', () => playTone(cfg))
          const p = el.play()
          if (p && typeof p.catch === 'function') p.catch(() => {})
          return
        } catch (e) {
          console.error('[dsh-notify-sounds] audio url failed', e)
        }
      }
      playTone(cfg)
    }

    // Dedup: short-window coalescing so multiple host listeners for the same
    // logical moment produce only one tone.
    const lastPlayed = {}
    const playCoalesced = (kind) => {
      const cfg = SOURCES[kind]
      if (!cfg) return
      const win = kind === 'approval' ? 2500 : 700
      const now = Date.now()
      if (lastPlayed[kind] && now - lastPlayed[kind] < win) return
      lastPlayed[kind] = now
      playOne(cfg)
    }

    const drain = () => {
      host.call('notif-drain', {}).then((res) => {
        if (!res || !Array.isArray(res.items)) return
        for (const item of res.items) {
          if (item && typeof item.kind === 'string') playCoalesced(item.kind)
        }
      }).catch((e) => console.error('[dsh-notify-sounds] drain failed', e))
    }

    ctx.interval(drain, 400)
    drain()
  },
}