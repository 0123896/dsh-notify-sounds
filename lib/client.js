/**
 * @0123896/dsh-notify-sounds — BROWSER half.
 *
 * Loaded by DSH from the `dsh.client` manifest + the "./client" export. It polls
 * the host half's `/notify-sounds/drain` route and plays a short sound:
 *   · default: a Web Audio tone (no assets, nothing to ship);
 *   · if a `url` is configured: that file, served by the host half.
 *
 * Registered through the DSH client module loader, as every bundle's browser
 * half is; the factory returns a Cordis client plugin ({ inject, apply }).
 */
window.__ModuleLoader__.load({
  id: '@0123896/dsh-notify-sounds',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const POLL_MS = 400
    const BASE = '/notify-sounds'

    /** Default tones; `url` (when set) wins over the synthesized tone. */
    const SOURCES = {
      end: { url: '', frequency: 880, durationMs: 240 },
      approval: { url: '', frequency: 660, durationMs: 420 },
    }

    // A short coalescing window keeps several triggers for one logical moment
    // (e.g. an `ask` decision plus a fallback event) to a single sound.
    const DEDUP_MS = { end: 700, approval: 2500 }

    const state = { audioContext: null, lastPlayed: {} }

    function getAudioContext() {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return null
      if (!state.audioContext) {
        try {
          state.audioContext = new Ctor()
        } catch {
          state.audioContext = null
        }
      }
      return state.audioContext
    }

    function playTone(cfg) {
      const ac = getAudioContext()
      if (!ac) return
      try {
        if (ac.state === 'suspended') ac.resume()
        const duration = (cfg.durationMs || 300) / 1000
        const start = ac.currentTime + 0.01
        const oscillator = ac.createOscillator()
        const gain = ac.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(cfg.frequency || 880, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        oscillator.connect(gain)
        gain.connect(ac.destination)
        oscillator.start(start)
        oscillator.stop(start + duration + 0.05)
      } catch (error) {
        console.warn('[dsh-notify-sounds] tone failed', error)
      }
    }

    function play(cfg) {
      if (cfg.url && typeof window.Audio === 'function') {
        try {
          const audio = new window.Audio(cfg.url)
          audio.addEventListener('error', () => playTone(cfg))
          const started = audio.play()
          if (started && typeof started.catch === 'function') started.catch(() => {})
          return
        } catch (error) {
          console.warn('[dsh-notify-sounds] audio url failed', error)
        }
      }
      playTone(cfg)
    }

    function playCoalesced(kind) {
      const cfg = SOURCES[kind]
      if (!cfg) return
      const now = Date.now()
      const window_ = DEDUP_MS[kind] || 700
      if (state.lastPlayed[kind] && now - state.lastPlayed[kind] < window_) return
      state.lastPlayed[kind] = now
      play(cfg)
    }

    async function drain() {
      try {
        const response = await fetch(BASE + '/drain', { cache: 'no-store' })
        if (!response.ok) return
        const body = await response.json()
        if (!body) return
        // Custom-sound URLs come from the host half, so the file paths are
        // configured in exactly one place (the host's config).
        if (body.urls) {
          if (typeof body.urls.end === 'string') SOURCES.end.url = body.urls.end
          if (typeof body.urls.approval === 'string') SOURCES.approval.url = body.urls.approval
        }
        if (!Array.isArray(body.items)) return
        for (const item of body.items) {
          if (item && typeof item.kind === 'string') playCoalesced(item.kind)
        }
      } catch {
        // Host not reachable yet (or reloading) — the next poll retries.
      }
    }

    const inject = []

    function apply(ctx) {
      // Optional tone overrides, if a config reaches the client half.
      const config = (ctx && ctx.config) || {}
      if (config.endFrequency) SOURCES.end.frequency = config.endFrequency
      if (config.endDurationMs) SOURCES.end.durationMs = config.endDurationMs
      if (config.approvalFrequency) SOURCES.approval.frequency = config.approvalFrequency
      if (config.approvalDurationMs) SOURCES.approval.durationMs = config.approvalDurationMs

      const timer = setInterval(drain, POLL_MS)
      ctx.effect(() => () => clearInterval(timer))
      drain()
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
