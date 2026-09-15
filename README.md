# @0123896/dsh-notify-sounds

> DeepSeek Harness（DSH）对话提示音插件 · 不用一直盯着屏幕

<p align="center">
  <img src="https://img.shields.io/github/v/release/0123896/dsh-notify-sounds?style=flat-square" alt="Version">
  &nbsp;
  <img src="https://img.shields.io/github/stars/0123896/dsh-notify-sounds?style=flat-square" alt="Stars">
  &nbsp;
  <img src="https://img.shields.io/github/forks/0123896/dsh-notify-sounds?style=flat-square" alt="Forks">
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  &nbsp;
  <img src="https://img.shields.io/badge/platform-web%20(DSH)-informational?style=flat-square" alt="Platform">
</p>

<p align="center">
  <strong>会话结束时一声 · 提问/审批时一响 · 纯 Web Audio，零音源，零版权负担</strong><br>
  <em>短小 · 可移植 · 完全可自定义声音</em>
</p>

<div align="center">

[是什么](#是什么) · [什么时候响？](#什么时候响) · [快速上手](#快速上手) · [自定义声音](#自定义声音) · [常见问题](#常见问题) · [已知限制](#已知限制) · [社区](#社区)

</div>

## 是什么

一个轻量、可移植的 **DeepSeek Harness（DSH）** 对话提示音插件，基于其动态
Cordis 运行时开发。它会在**两种关键时刻发出不同的提示音**，让你不用一直
盯着屏幕：

- ✅ **对话结束 / 回复完成** → “结束”提示音（默认高音 beep，880 Hz）
- 🚨 **提问 / 请求审批** → “确认”提示音（默认低音 beep，660 Hz）

**不需要内置任何音频文件**：默认用浏览器 Web Audio 实时合成声音，零资源、
零版权负担、开箱即用。同时支持**自定义提示音**——提供一个 URL 或本地文件
路径即可换成自己的 MP3/WAV。

| 能力 | 原生 dsh web | 本插件 |
| --- | --- | --- |
| 对话结束提醒 | 无 | 回复完成即响（`end`） |
| 提问 / 审批提醒 | 无 | 请求确认时即响（`approval`） |
| 自定义提示音 | — | 支持（URL / 本地文件） |
| 内置音频 / 版权风险 | — | 无（默认 Web Audio 合成） |
| 侵入源码 | — | 否（官方动态 Cordis 插件） |

### 触发时机对照表

| 时机 | 触发信号 | 提示音 |
| --- | --- | --- |
| 会话 / 回复结束 | `agent/turn-stopping` | 🎬 `end`（默认 880 Hz） |
| 依赖确认 / 提问 / 审批 | `tools/pre-execute` 决策为 `ask` 或工具名为 `ask_user_question` | 🚨 `approval` |

> 探测都发生在插件 **Host 端（事件检测）**，声音统一在**浏览器（client）**播放；
> 两者通过插件私有 RPC：`host.call('notif-drain')`，客户端每 400 ms 轮询一次，
> 并对同一类事件在短窗口内去重（`approval` 为 2.5s），避免多次响亮。

---

## 什么时候响

插件把“需要你注意”的两种场景拆成两种音，方便区别（也可配置成同一段音）：

| 场景 | 目的 | 你可听到 |
| --- | --- | --- |
| 我完成一次回复 / 处理完一轮 | 提醒你回来看 | 高音短促 beep（`end`） |
| 依赖你回答、或某操作需要批准 | 提醒你处理 | 低音稍长 beep（`approval`） |

“需要确认”的判断，来自**工具执行前的审批决策**：当某个工具调用需要用户批准
（决策为 `{ kind: 'ask' }`），或正是提问工具 `ask_user_question`，都会播放
`approval` 音——因此**提问和审批用同一个确认音**。

---

## 快速上手

本插件**不需要 `npm install`**，随 DSH 的**动态 Cordis 插件**机制载入。下面两种
方式任选其一，约一分钟即可让提示音生效。

### 方式一：会话内载入（推荐、最快速）

在运行中的 **DSH 会话**里，用 `cordis_define` 工具粘贴两个代码体：

1. 打开仓库里的 **[`src/host.js`](src/host.js)**，把**全部内容**复制为 `code.host`。
2. 打开 **[`src/client.js`](src/client.js)**，把**全部内容**复制为 `code.client`。
3. 调用：

```
code: {
  host:   <将 src/host.js 全文粘贴到这里>,
  client: <将 src/client.js 全文粘贴到这里>,
}
name: "@0123896/dsh-notify-sounds"
purpose: "会话结束 / 提问或审批时播放提示音"
plugin: { kind: "new", idPrefix: "notif" }
```

4. 运行激活：

```
cordis_run pluginId=<返回的 pluginId> packageId=<返回的 packageId> mode=run
```

首次会弹浏览器激活请求，请如实批准（见下文「首次使用提示」）。

### 方式二：静态挂载到 Cordis 组合

如果你用静态组合（`cordis.yml` / preset），把 `src/host.js`、`src/client.js` 作为
两个插件源挂到同一 Agent 上下文即可，契约与动态方式完全一致。

> 无论哪种方式，插件都只通过 **`inject` 声明过的服务**工作（host：`fs`、`webServer`；
> client：`timer`），不触碰其它 API，也不修改 DSH 源码。

### 首次使用提示

1. 激活成功后，让模型正常**回复一条消息** → 应听到“结束”音（`end`）。
2. 触发一次**提问 / 审批** → 应听到“确认”音（`approval`）。
3. 若完全没响：多半是**浏览器自动播放策略**拦截。先在页面任意处**点一下**建立一次用户
   手势，再触发；仍不行请见 [常见问题](#常见问题)。

---

## 自定义声音

给 `apply` 传配置：

```js
// 端侧：指定本地声音文件，插件用 webServer 以 /__dsh-notify/ 提供
{ endFilePath: 'C:/path/end.mp3', approvalFilePath: 'C:/path/approval.mp3' }

// 端侧：直接用 URL 播放（file 或 http）
{ endUrl: '/__dsh-notify/end.mp3', approvalUrl: '/__dsh-notify/approval.mp3' }
```

给了 `url` 就播文件，否则合成蜂鸣。改动后重启插件即可生效。

不自定义时，可用下面的常改参数交给 client：

| Config | 默认 | 含义 |
| --- | --- | --- |
| `endFrequency` | `880` | “结束”音的频率（Hz） |
| `endDurationMs` | `240` | “结束”音时长 |
| `approvalFrequency` | `660` | “确认”音频率（Hz） |
| `approvalDurationMs` | `420` | “确认”音时长 |

---

## 常见问题

**为什么提问没有立刻响？**
浏览器可能拦截了自动播放，先点一下页面；再确认插件已激活（`cordis_run` 成功）。

**为什么“审批”和“提问”是同一个音？**
是刻意如此——都代表“需要你确认”，用同一段 `approval` 音，方便你形成记忆。

**我能用别人的 MP3 吗？**
可以，通过 `url` / `filePath` 指向你的文件；但**不要把有版权的音频随仓库分发**，
避免侵权。默认的 Web Audio 蜂鸣无任何版权问题。

**它会影响 DSH 本体吗？**
不会。它只靠官方动态插件机制（事件 + 私有 RPC），不修改源码、不侵入服务。

---

## 已知限制

- 依赖**浏览器侧** Web Audio，受浏览器脚本自动播放策略影响（首次需一次用户手势）。
- 插件 **host 端**运行在受限沙箱：只能访问 `inject` 中声明过的服务（`fs`、
  `webServer`，以及客户端 `timer`）。
- 同一类事件在短窗口内会**合并成一次**（去重），可能少打一次音（避免自震）。
- 不内置任何第三方图片 / 商标，视觉完全依赖 shields 徽章与文本。

---

## 社区

- 报告 / 建议：[Issues](https://github.com/0123896/dsh-notify-sounds/issues)
- 欢迎 PR，提交前请看 [CONTRIBUTING.md](CONTRIBUTING.md)
- 变更历史：[CHANGELOG.md](CHANGELOG.md)

<div align="center">

**喜欢这个项目？点个 Star。**<br>
<a href="https://github.com/0123896/dsh-notify-sounds/issues">报告 Bug</a> ·
<a href="https://github.com/0123896/dsh-notify-sounds/pulls">提交 PR</a> ·
<a href="https://github.com/0123896/dsh-notify-sounds/releases">Releases</a>

</div>

## 许可证

[MIT](LICENSE) — 自由使用、修改、再分发，注明作者即可。