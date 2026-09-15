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
Cordis 运行时开发。它会在**两种关键时刻发出不同的提示音**，让你不用一直盯着
屏幕：

- ✅ **对话结束 / 回复完成** → “结束”提示音（默认高音 beep，880 Hz）
- 🚨 **提问 / 请求审批** → “确认”提示音（默认低音 beep，660 Hz）

**不需要内置任何音频文件**：默认用浏览器 Web Audio 实时合成声音，零资源、
零版权负担、开箱即用。同时支持**自定义提示音**——提供一个 URL 或本地文件路径
即可换成自己的 MP3/WAV。

| 能力 | 原生 dsh web | 本插件 |
| --- | --- | --- |
| 对话结束提醒 | 无 | 回复完成即在响（`end`） |
| 提问 / 审批提醒 | 无 | 请求确认时即响（`approval`） |
| 自定义提示音 | — | 支持（URL / 本地文件） |
| 内置音频 / 版权风险 | — | 无（默认 Web Audio 合成） |
| 侵入源码 | — | 否（官方动态 Cordis 插件） |

### 触发时机对照表

| 时机 | 触发信号 | 提示音 |
| --- | --- | --- |
| 会话 / 回复结束 | `agent/turn-stopping` | 🎬 `end`（默认 880 Hz） |
| 需确认 / 提问 / 审批 | `tools/pre-execute` 决策为 `ask` 或工具名为 `ask_user_question` | 🚨 `approval` |

> 探测都发生在插件 **Host 端（事件检测）**，声音统一在**浏览器（client）**播放；
> 两者通过插件私有 RPC：`host.call('notif-drain')`，客户端每 400 ms 轮询一次，
> 并对同一类事件在短窗口内去重（`approval` 为 2.5s），避免多次。

---

## 什么时候响

插件把“需要你注意”的两种场景拆成两种音，方便区分（也可配置成同一段音）：

| 场景 | 目的 | 你可听到 |
| --- | --- | --- |
| 我完成一次回复 / 处理完一轮  | 提醒你回来看 | 高音短促 beep（`end`） |
| 依赖你回答、或某操作需要批准 | 提醒你处理 | 低音稍长 beep（`approval`） |

“需要确认”的判断，来自**工具执行前的审批决策**：当某个工具调用需要用户批准
（决策为 `{ kind: 'ask' }`），或正是提问工具 `ask_user_question`，都会播放
`approval` 音——因此**提问和审批用同一个确认音**。

---

## 快速上手

两种方式任选其一，让插件在 DSH 里跑起来。

### 方式一：会话内载入（无安装、最快速）

在运行中的 **DSH 会话**里，用 `cordis_define` 粘贴两个 body（不用先安装任何包）：

1. 打开 **[`src/host.js`](src/host.js)**，把全文复制为 `code.host`。
2. 打开 **[`src/client.js`](src/client.js)**，把全文复制为 `code.client`。
3. 调用 `cordis_define`，再 `cordis_run` 激活即可（首次会在浏览器弹激活确认，如实批准）。

### 方式二：安装预设（更省心，适合长期用）

如果你希望**不用每次粘贴源码**、让它在多个会话里自动挂载，把本插件当作一个
**可安装包 + Agent preset** 来用：

```bash
# 1) 安装插件包（已发布时用 npm install；本地开发用 npm link）
npm install @0123896/dsh-notify-sounds   # 或：npm link

# 2) 把 preset 放进你的用户预设目录
#    把 preset/ 下的 agent.cordis.yml + preset.yml 复制到
#    $DSH_HOME/.agent-presets/dsh-notify-sounds/   （$DSH_HOME 默认 ~/.dsh）
```

然后在 DSH 里选 “dsh-notify-sounds” 预设开局即可。

> 注意事项（重要）：这是一种“标准 Cordis 插件”（host 端）的安装方式。声音
> 由**浏览器半（client）**负责，DSH 会在加载 preset 时负责把对应的 client
> 一并挂进页面。若浏览器端未被挂载，host 端仍会正常做事件检测，只是不出声。
> 若你不想碰 preset / npm，直接用**方式一**是最稳的路径。

### 首次使用提示

1. 激活成功后，让模型正常**回复一条消息** → 应听到“结束”音（`end`）。
2. 触发一次**提问 / 审批** → 应听到“确认”音（`approval`）。
3. 若完全没响：多半是浏览器**自动播放策略**拦截。先在页面任意处**点一下**建立一次
   用户手势，再触发；仍无效请看 [常见问题](#常见问题)。

---

## 自定义声音

给 `apply` 传配置：

```js
// 宿主侧（host）：监听本地声音文件，插件经由 webServer 以 /__dsh-notify/ 提供
{ endFilePath: 'C:/path/end.mp3', approvalFilePath: 'C:/path/approval.mp3' }

// 浏览器侧（client）：直接用 URL 播放（file 或 http）
{ endUrl: '/__dsh-notify/end.mp3', approvalUrl: '/__dsh-notify/approval.mp3' }
```

给了 `url` 就播文件，否则合成蜂鸣。不善配置时，可用下面的常改参数交给 client：

| Config | 默认 | 含义 |
| --- | --- | --- |
| `endFrequency` | `880` | “结束”音频率（Hz） |
| `endDurationMs` | `240` | “结束”音时长 |
| `approvalFrequency` | `660` | “确认”音频率（Hz） |
| `approvalDurationMs` | `420` | “确认”音时长 |

---

## 常见问题

**为什么提问没有立刻响？**
浏览器可能拦截了自动播放，先在页面点一下；再确认插件已激活（`cordis_run` 成功）。

**为什么“审批”和“提问”同一个音？**
是刻意如此——都代表“需要你确认”，用同一段 `approval`，方便你形成记忆。

**我能用别人的 MP3 吗？**
可以，通过 `url` / `filePath` 指向你的文件；但**不要暴露在仓库里放有版权的音频**。
默认的 Web Audio 蜂鸣无任何版权问题。

**它会影响 DSH 本体吗？**
不会。只用官方服务与私有 RPC，不修改源码、不注入其它 API。

---

## 已知限制

- 依赖**浏览器侧** Web Audio，受浏览器自动播放策略影响（首次需一次用户手势）。
- **host 端**在受限沙箱：只能访问 `inject` 声明过的服务（本插件 host：
  `fs`、`webServer`；client：`timer`）。
- 同一类事件在短窗口内会**合并成一次**（去重），可能少打一次音（避免回响）。
- 徽章依赖 shields.io 渲染，离线 / 无网络时徽章不显示（不影响功能）。

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