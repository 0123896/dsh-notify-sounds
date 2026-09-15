# @0123896/dsh-notify-sounds

## 📣 简介（中文）

一个轻量、可移植的 **DeepSeek Harness（DSH）** 提示音插件，基于其动态
Cordis 运行时开发。它会在两种关键时刻发出**不同的提示音**，让你不用一直
盯着屏幕：

- ✅ **对话结束 / 回复完成** → 播放“结束”提示音（默认是高音 beep，880 Hz）
- 🚨 **需要手动确认 / 提问** → 播放“确认”提示音（默认是低音 beep，660 Hz）

**无需内置任何音频文件**：默认用浏览器 Web Audio 实时合成声音，零资源、
零版权问题，开箱即用。同时也支持**自定义声音**——提供一个 URL 或本地文件
路径即可换成自己的 MP3/WAV。插件不包含硬编码本地路径，也不打包任何音源，
因此完全适合开源分发。

以下是英文版介绍。

---

A tiny, portable notification-sound plugin for **DeepSeek Harness (DSH)**'s
dynamic Cordis runtime. Published on the same `@<scope>/dsh-<app>` convention
as e.g. `@linxin666/dsh-web-all` (repo: `github.com/0123896/dsh-notify-sounds`).
It plays two distinct sounds:

| Moment | Default action | You hear |
| --- | --- | --- |
| 🎬 Conversation / reply finished | `end` sound | a short high **beep** (880 Hz) by default |
| 🚨 User must confirm / answer a question | `approval` sound | a longer low **beep** (660 Hz) by default |

Each sound is fully configurable — point it at a URL to play your own MP3/WAV,
or keep the built-in Web Audio tones (zero assets, fully portable).

> ⚠️ **No audio files are bundled.** The default is pure Web Audio synthesis, so
> this repo is safe to open-source without licensing concerns.

---

## How it detects the two moments

All detection happens on the **host half**; the sound always plays in the
**browser** (client half).

| Moment | Signal |
| --- | --- |
| Reply finished (`end`) | `agent/turn-stopping` — fires when an assistant turn closes with no pending tool calls/steering |
| Must confirm (`approval`) | `tools/pre-execute` when the tool name is `ask_user_question` (fires the moment the question is dispatched) + `approval/request` / `user-questions/request` as robust fallbacks |

The two halves talk over a **package-private RPC**:

```
Host  ──harness.handle('notif-drain')── waiting-deep----> client interval(400ms).host.call('notif-drain')
```

The client coalesces events (de-dupe for up to 2.5 s for `approval`) so multiple
triggers produce one sound.

---

## Files

```
dsh-notify-sounds/
├── package.json          # metadata & peer dep on @deepseek-ai/cordis
├── LICENSE               # MIT
├── README.md             # this file (contains a 中文简介 section)
├── CONTRIBUTING.md       # contribution guide
├── CHANGELOG.md          # version history
├── .gitignore
└── src/
    ├── host.js           # Host half body  (events + optional file serving)
    ├── client.js         # Client half body (poll + audio)
    └── index.js          # convenience: exports the two bodies
```

---

## Usage inside a running DSH session

DSH dynamic plugins are **two plain-JS body strings**. Paste them into the
`cordis_define` tool:

```
code: {
  host:   <contents of src/host.js>,
  client: <contents of src/client.js>,
}
name: "@0123896/dsh-notify-sounds"
purpose: "Play distinct sounds on reply-finished and needs-confirmation"
plugin: { kind: "new", idPrefix: "notif" }
```

Then run it with `cordis_run` (mode `run`), and approve the browser/client
activation when asked.

On first use in a browser that blocks autoplay, click anywhere on the page once
to establish a user gesture, then trigger the sounds.

---

## Custom audio files (optional)

Pass config to `apply`:

```js
// host config
{ endFilePath: 'C:/path/end.mp3', approvalFilePath: 'C:/path/approval.mp3' }

// client config
{ endUrl: '/__dsh-notify/end.mp3', approvalUrl: '/__dsh-notify/approval.mp3' }
```

When a URL is present the client plays that file; otherwise it synthesizes a tone.
Serve the file yourself, or let the host half serve it from `endFilePath` /
`approvalFilePath` via the DSH `webServer` (the host half already does this for
`/__dsh-notify/…`).

---

## Customizing the tones

Common runtime tone parameters are exposed as config fields on the client side:

| Config | Default | Meaning |
| --- | --- | --- |
| `endFrequency` | `880` | Hz of the end tone |
| `endDurationMs` | `240` | length of the end tone |
| `approvalFrequency` | `660` | Hz of the approval tone |
| `approvalDurationMs` | `420` | length of the approval tone |

Feel free to change `SOURCES` in `src/client.js` directly too.

---

## Notes / limitations

- DSH dynamic plugin **host** runs behind a sandbox: it can only reach
  services declared in `inject`. This package declares `inject: ['fs',
  'webServer']` (files + web server) and `inject: ['timer']` for the client.
- The client uses ambient browser globals (`Audio`, `AudioContext`). These are
  NOT the runner-supplied intrinsics, so they work in the page, but are subject
  to browser autoplay policy.

## License

MIT — see [LICENSE](LICENSE). Free to fork, remix, and re-license.