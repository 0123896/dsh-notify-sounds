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
零版权负担、开箱即用。同时支持**自定义提示音**——提供一个 URL 或本地文件路径
即可换成自己的 MP3/WAV。

| 能力 | 原生 dsh web | 本插件 |
| --- | --- | --- |
| 对话结束提醒 | 无 | 回复完成即响（`end`） |
| 提问 / 审批提醒 | 无 | 请求确认时即响（`approval`） |
| 自定义提示音 | — | 支持（URL / 本地文件） |
| 内置音频 / 版权风险 | — | 无（默认 Web Audio 合成） |
| 侵入源码 | — | 否（官方 profile bundle 插件） |

### 触发时机对照表

| 时机 | 触发信号 | 提示音 |
| --- | --- | --- |
| 会话 / 回复结束 | `agent/turn-stopping` | 🎬 `end`（默认 880 Hz） |
| 需确认 / 提问 / 审批 | `tools/pre-execute` 决策为 `ask` 或工具名为 `ask_user_question` | 🚨 `approval` |

> 探测都发生在插件 **Host 端（事件检测）**，声音统一在**浏览器（client）**播放；
> 两者通过同源 HTTP 路由协作：host 半提供 `/notify-sounds/drain`，客户端每 400 ms 轮询一次，
> 并对同一类事件在短窗口内去重（`approval` 为 2.5s），避免重复。

---

## 什么时候响

插件把“需要你注意”的两种场景拆成两种音，方便区分（也可配置成同一段音）：

| 场景 | 目的 | 你可听到 |
| --- | --- | --- |
| 我完成一次回复 / 处理完一轮 | 提醒你回来看 | 高音短促 beep（`end`） |
| 需要你回答、或某操作需要批准 | 提醒你处理 | 低音稍长 beep（`approval`） |

“需要确认”的判断，来自**工具执行前的审批决策**：当某个工具调用需要用户批准
（决策为 `{ kind: 'ask' }`），或正是提问工具 `ask_user_question`，都会播放
`approval` 音——因此**提问和审批用同一个确认音**。

---

## 快速上手

本插件是一个**标准 DSH profile 插件包**（bundle）：装进 profile 后随 DSH 启动自动挂载，
**重启依然生效**，不需要每次粘贴源码，也不用发布到 npm（本地 `link:` 即可）。

### 安装

```bash
# 1) 把插件注册为 profile 依赖（本地目录用 link:，也可换成已发布的版本号）
#    编辑 $DSH_HOME/profiles/<profile>/package.json：
#      "dependencies": { "@0123896/dsh-notify-sounds": "link:D:/path/to/dsh-notify-sounds" }
#      "dsh": { "profile": { "bundles": [ ... , "@0123896/dsh-notify-sounds" ] } }

# 2) 安装依赖，让包进入 profile 的 node_modules
dsh plugin --profile web install
```

### 生效

`dsh plugin ... install` 之后**重启 DSH**（新增 bundle 需要重新加载组合树），
插件就会自动挂载：host 半负责事件检测与 `/notify-sounds/*` 路由，浏览器半由
`dsh.client` 清单自动加载进页面。

### 首次使用测试

1. 让模型正常**回复一条消息** → 应听到“结束”音（`end`）。
2. 触发一次**提问 / 审批** → 应听到“确认”音（`approval`）。
3. 若完全没响：多半是浏览器**自动播放策略**拦截。先在页面任意处**点一下**建立一次
   用户手势，再触发；仍无效请看 [常见问题](#常见问题)。

### 工作原理（两半如何协作）

| 半 | 位置 | 职责 |
| --- | --- | --- |
| host | `lib/index.js`（DSH Node 进程） | 监听 `agent/turn-stopping` 与 `tools/pre-execute` 的 `ask` 决策，维护待播队列，注册 `/notify-sounds/drain` 与声音文件路由 |
| client | `lib/client.js`（浏览器） | 每 400 ms 轮询 `/notify-sounds/drain`，播放提示音（默认 Web Audio 合成） |

`package.json` 的 `dsh` 字段声明了 `bundle.patch`（组合补丁）与 `client.platform`
（浏览器半）；`cordis.patch.yml` 只插入一行 host 插件行。

---

## 自定义声音

只需要在**一处**配置本地文件的路径——在 profile 的组合里给该插件行传 `config`
（插进 profile 的 `cordis.patch.yml`，或在 `cordis.patch.yml` 里改这一行）：

```yaml
- id: dsh-notify-sounds
  name: '@0123896/dsh-notify-sounds'
  config:
    endFilePath: 'C:/path/end.mp3'        # host 半以 /notify-sounds/end.mp3 提供
    approvalFilePath: 'C:/path/approval.mp3'
```

配置了路径后，host 半会在轮询响应里带上这两个 URL，浏览器半自动改用它们播放；
不配置则用 Web Audio 实时合成蜂鸣。常用音调参数：

| Config | 默认 | 含义 |
| --- | --- | --- |
| `endFrequency` | `880` | “结束”音的频率（Hz） |
| `endDurationMs` | `240` | “结束”音时长 |
| `approvalFrequency` | `660` | “确认”音的频率（Hz） |
| `approvalDurationMs` | `420` | “确认”音时长 |

> 不传任何配置也能用：默认音由浏览器实时合成，仓库里不含任何音频文件。

---

## 常见问题

**为什么提问没有立刻响？**
浏览器可能拦截了自动播放，先在页面点一下；再确认插件已随 profile 挂载（重启 DSH 后生效）。

**为什么“审批”和“提问”是同一个音？**
是刻意如此——都代表“需要你确认”，用同一段 `approval`，方便你形成记忆。

**我能用别人的 MP3 吗？**
可以，通过 `endFilePath` / `approvalFilePath` 指向你的文件；但**不要把有版权的音频随仓库分发**，
避免侵权。默认的 Web Audio 蜂鸣无任何版权问题。

**它会影响 DSH 本体吗？**
不会。它只用官方 bundle 机制（`dsh.bundle.patch` + `dsh.client`）与公开事件/路由，不修改源码。

---

## 已知限制

- 依赖**浏览器侧** Web Audio，受浏览器自动播放策略影响（首次需一次用户手势）。
- host 半 `inject` 只声明 `webServer`（`fs` 仅在提供自定义声音文件时按需取用）。
- 新增 bundle 后需**重启 DSH** 才会挂载（组合树在启动时组装）。
- 同一类事件在短窗口会**合并成一次**（去重），可能少打一次音（避免回响）。
- 徽章依赖 shields.io 渲染，离线 / 无网络时不显示（不影响功能）。

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