# dsh-prompt-scatter

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](README.md) · **简体中文**

一个给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）输入框用的提示词优化插件。

输入框右侧会出现一个小星标。点它，会话**当前选中的模型**会把你的草稿改写成更好的提示词。
结果先进预览卡，**你点「替换输入框」之前，输入框一个字都不会变**。
开启「多轮优化」后，每一轮还会给出 3 个继续优化的方向，也可以自己写一个。

## 功能

- **先预览再替换** —— 改写结果流式显示在卡片里；只有你点「替换」才写入输入框，之前绝不改动。
- **用你当前的模型** —— 不需要另配 API Key，也不需要第二套供应商配置。会话里选了哪个模型，就用哪个优化。
- **多轮优化 + 版本链** —— 每一轮基于上一轮继续。所有版本都保留，可以回退到任意一版接着改；回退不会删除任何版本，而是在历史里形成分叉。
- **每轮 3 个方向，且来自不同维度** —— 约束条件、输出格式、角色设定、成功标准、输入处理、边界情况。前几轮用过的维度会被排除，避免连着几轮给同类建议。没合适的可以自己写。
- **结果可编辑** —— 结果区是真正的 `textarea`。写回输入框的是你编辑后的内容，不是模型原始输出。
- **代入会话上下文** —— 优化时会读取当前会话最近几轮对话作为背景，改写结果能贴合你正在做的事，而不是孤立地看一段草稿。默认取最近 3 轮、约 2000 字，可配置。
- **可选的互动优化** —— 一个开关把五条互动规则（边做边说、需要人时开口、提问的方式、验证要有预算、说人话）写进改写后的提示词。默认关闭，打开也只影响这一次优化。
- **输出质量探测** —— 优化前先检查草稿是否存在复读循环、无用细节堆砌、填充词过多；命中哪类就追加一条针对性规则到系统提示词。
- **能干净地停止** —— 有真正的中止路径，停止后恢复你的原始草稿。
- **只在本机** —— HTTP 路由拒绝非回环请求，只接受 POST，并对请求体和提示词长度设上限。

## 安装

需要 DSH 内核 `>= 0.2.0-rc.2`。

```sh
dsh plugin --profile <配置名> add file:/绝对路径/dsh-prompt-scatter
```

或者在插件界面安装：**设置 → 插件 → 添加插件**，填入绝对路径（发布到 registry 后也可以填包名）。

手动安装：把 `"dsh-prompt-scatter"` 加进 profile 的 `dependencies`，把包名追加到
`dsh.profile.bundles`，然后在 profile 目录里执行 `pnpm install`。

## 使用

| 操作 | 效果 |
| --- | --- |
| 点星标 | 优化当前草稿，结果显示在预览卡 |
| **替换输入框** | 把预览内容（或你的修改）写入输入框 |
| 打开**多轮优化** | 打开多轮面板，每轮生成一个新版本 |
| 选一个方向 | 基于当前版本开始下一轮 |
| **自己写一个方向** | 同上，方向由你输入 |
| **历史** | 列出所有版本；可回退到任意一版 |
| 多轮里的**替换输入框** | 收起编辑区，保留方向列表 |
| **展开编辑** | 采纳后重新展开编辑区 |
| **结束多轮** | 清空版本链与会话缓存 |

多轮状态按会话存在 `sessionStorage` 里，刷新页面不会丢。一旦提示词真的发送出去
（判定：会话从空闲转为运行中，且输入框已清空）就清掉——因为版本链属于那条刚被消费掉的提示词。

## 工作原理

两半都是普通模块：

**主机端**（`lib/index.js`）在本地 web 服务器上注册两个精确路由：

| 路由 | 用途 |
| --- | --- |
| `POST /api/dsh-prompt-scatter` | SSE 流；`mode` 选 `optimize`、`continue` 或 `directions` |
| `POST /api/dsh-prompt-scatter/stop` | 中止该会话正在进行的优化 |

通过内核的供应商中立 LLM 接缝调用
`ctx.llm.stream({ provider, model, messages, system, maxTokens })`，
所以部署里配了哪些适配器，它就支持哪些。

**浏览器端**（`lib/client.js`）注册进 `conversation.input.right` 槽位
（`order: 5`），通过会话标准 kit 的 `useInput` 读草稿，
并且只通过 `inputActions.setDraft` 写回——这是唯一的公开写入路径，不碰编辑器 DOM。

安全限制：仅回环（非回环调用返回 403）、仅 POST（405）、
请求体 4 MB、提示词 20 万字符，超时可配置。

### 会话上下文怎么取

`conversation.input.right` 槽位拿到的 `SessionSnapshot` 只有生命周期状态
（`running` / `openState` / `blank` 等），**没有消息正文**，浏览器端拼不出对话。
所以上下文在主机端读：`sessions.deriveMessages()` 是公开 API，
取最近若干轮、过滤掉 system 消息和工具调用、按字符预算从最近往前截断。

## 互动优化（写在提示词里，不是注进系统提示）

`dsh-chatterbox` 通过 `systemPrompt.section` 把类似协议注进**每一轮的系统提示词**——
常驻生效，用户没法逐次选择。本插件站另一个立场：同样的东西变成**可选的提示词片段**，
放在面板开关后面，只作用于你正在做的这一次优化。

两者不是替代关系，而是不同层面：

| | `dsh-chatterbox` | 本插件的开关 |
| --- | --- | --- |
| 落在哪 | 系统提示词段落，每轮都有 | 改写后的提示词正文，只有一次 |
| 谁来选 | 改 profile 的人 | 按开关的人 |
| 作用范围 | 整个对话 | 一次优化 |
| 文本形态 | 五条常驻纪律 | 五条规则，各带「何时适用 / 怎么做 / 尺度」 |

因为是提示词层面，它和草稿本身的要求**组合**而不是**竞争**；
而且改写结果被复制出 DSH 之后，这段习惯依然跟着走。

条目 id：`narrate`、`ask`、`question`、`verify`、`speech`。
用 `habits.sections` 指定开关插入哪几条（空 = 全部），`habits.extra` 追加自由文本。

## 输出质量探测

探测是纯文本分析，**不会多花一次模型调用**。

| 问题 | 判定依据 |
| --- | --- |
| `repetition` | 同一子串反复出现，或同一行反复出现（比对前会去掉行首编号，所以 `1. x` / `2. x` / `3. x` 也算） |
| `useless-detail` | 无用细节密度：时间戳、IP、绝对路径、长数字串、版本号、URL、长引用块 |
| `filler` | 填充词密度：「请注意」「需要强调的是」「综上所述」及其英文对应词 |

命中的问题会显示在预览卡里，方便你看清加了哪几条规则。

## 配置

bundle patch 里带一个 `config` 段，激活时按插件导出的 `Config`（schemastery）校验：

```yaml
- insert:
    - id: dsh-prompt-scatter
      name: dsh-prompt-scatter
      config:
        probe:
          enabled: true          # false = 不做探测，用固定提示词
          detailDensity: 0.55    # 0~1，越低越严
          fillerDensity: 0.5     # 0~1，越低越严
          repetitionRepeats: 4   # 2~20，越低越严
        context:
          enabled: true          # false = 只看草稿，不带会话上下文
          maxTurns: 3            # 1~10，取最近几轮
          maxChars: 2000         # 200~20000，背景文本字符上限
        habits:
          sections: []           # 空 = 全部五条
          extra: ""              # 按字面量追加
        maxTokens: 4096          # 256~32768
        timeoutMs: 90000         # 5000~600000
```

所有键都可省略。越界的数值会被夹到范围内，结构不对则回落默认值，不会让插件启动失败。

密度的读法：都是「每 1000 字符的命中次数」归一化到 0~1，
细节在 8 次/千字饱和、填充词在 12 次/千字饱和。
所以一段短提示词里偶尔出现一个「请注意」，密度大约在 0.05，离阈值很远。

### 不改包的前提下覆盖配置

不要改 `node_modules` 里的 patch——重装就没了。把覆盖写进 profile 自己的 patch 层
（`<profile>/cordis.patch.yml`），它在所有 bundle 层之后应用，按 `id` 覆盖：

```yaml
- id: dsh-prompt-scatter
  name: dsh-prompt-scatter
  config:
    probe:
      enabled: true
      detailDensity: 0.55
      fillerDensity: 0.5
      repetitionRepeats: 6   # 只改了这一项
    context:
      enabled: true
      maxTurns: 3
      maxChars: 2000
    habits:
      sections: []
      extra: ""
    maxTokens: 4096
    timeoutMs: 90000
```

两个必须知道的行为：

- **config 段是整段替换，不是逐键合并。** 只写
  `config: { probe: { repetitionRepeats: 6 } }` 会让 `detailDensity` 和
  `fillerDensity` 整项消失。插件的 `normalizeConfig` 会把它们补成默认值，
  所以不会出错——但你已经不在继承 bundle 里声明的值了，而是悄悄回到了默认值。
  把关心的键都重写一遍，像上面那样。
- **必须重启。** 生成的 `cordis.yml` 是启动时重建的，改完 patch 层不重启没有任何效果。

## 兼容性

在 Windows 上针对 DSH `0.2.0-rc.2` 构建并验证。

这个插件的功能原先只以字符串补丁的形式存在于某个第三方 WebUI bundle 里。
这里改为按官方 DSH 插件契约实现，所以能像其他 bundle 一样安装、升级、卸载。
移植时需要桥接的 API 差异：

| 第三方 bundle | 这里 | 原因 |
| --- | --- | --- |
| `PromptOptimizeButton({ input, … })` 读 `input.draft` | `useInput((state) => state.draft)` | 会话标准 kit 提供的是 `useInput` + `inputActions`，不是 `input` 对象 |
| `source: { kind: "plugin", … }` | `source: { kind: "user" }` | `MessageSourceMap` 没有通配的 `plugin` 类型 |
| `IconSparkle16` / `IconLoadingOutline16` | `IconSparkleRegular` / `IconLoadingOutlineRegular` | primitives 只导出 `Regular`/`Medium` 两种变体 |
| `webui-po-*` 类名、`/api/dsh-webui-prompt-optimizer` | `dsh-ps-*`、`/api/dsh-prompt-scatter` | 去掉第三方命名空间 |

提示词工程部分的系统提示词、SSE 协议、中止路径、`<<< >>>` 注入防护都原样保留。

## 目录结构

```
lib/index.js           host 半身 —— 路由、SSE、llm.stream、会话上下文、安全限制
lib/directions.js      方向维度：归类、审计、去重
lib/probe.js           输出质量探测（复读 / 无用细节 / 填充词）
lib/habits.js          互动优化片段（可选，按按钮生效）
lib/config.js          Config schema 与归一化
lib/versions.js        版本链模型（只追加、按游标回退）
lib/client.js          浏览器半身 —— 输入框按钮、浮层、版本链
cordis.patch.yml       bundle patch（一行 insert）
icon.png               插件列表显示的图标
package.json           dsh.bundle / dsh.client 声明
```

## 开发

```sh
node scripts/sync-profile.mjs <profile目录>          # 同步进 profile
node scripts/sync-profile.mjs <profile目录> --check  # 检查两处是否一致
```

浏览器半身内联了一份版本模型副本，因为 `window.__ModuleLoader__` 只能解析
启动图里注册过的模块，**无法** `import "./versions.js"`。
两份需要手动保持一致；`lib/versions.js` 是主机端与测试的参考实现。

## 作者

says693 — <https://github.com/says693>

## 许可证

MIT。
