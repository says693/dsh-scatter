/**
 * dsh-prompt-scatter — browser half.
 *
 * Composer "auto-optimize prompt" trigger, built for the official DSH desktop
 * kernel 0.2.0-rc.2:
 *   - the draft comes from the session standard kit's `useInput` snapshot hook
 *     (0.2.0-rc.2 `SessionStandardProps` exposes
 *     `{ useConversation, useInput, inputActions }`),
 *   - the shared primitives ship `IconSparkleRegular` /
 *     `IconLoadingOutlineRegular` (the `*16` glyph names are gone),
 *   - package id, slot id, style id, storage keys and route paths live under
 *     `dsh-prompt-scatter`.
 *
 * @license MIT
 * @author says693
 */
window.__ModuleLoader__.load({
	id: "dsh-prompt-scatter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/prompt-optimize/styles.ts
		/**
		 * 提示词优化入口样式（运行时幂等注入 <style>）。
		 *
		 * 图标按钮规格对齐 DSH 官方工具行小控件：28px 高、胶囊圆角、透明底、
		 * hover 用 interactive-bg-hover，主题变量一律走 DSH 令牌。popover 面板
		 * 规格对齐官方弹出菜单（底色/阴影/圆角同源）。
		 */
		const css = {
			root: "dsh-ps-root",
			trigger: "dsh-ps-trigger",
			busy: "dsh-ps-busy",
			panel: "dsh-ps-panel",
			panelOpen: "dsh-ps-panel-open",
			panelTitle: "dsh-ps-panel-title",
			caption: "dsh-ps-caption",
			status: "dsh-ps-status",
			statusOptimizing: "dsh-ps-status-optimizing",
			statusDone: "dsh-ps-status-done",
			statusError: "dsh-ps-status-error",
			options: "dsh-ps-options",
			option: "dsh-ps-option",
			optionLabel: "dsh-ps-option-label",
			switch: "dsh-ps-switch",
			switchOn: "dsh-ps-switch-on",
			knob: "dsh-ps-switch-knob",
			knobOn: "dsh-ps-switch-knob-on",
			stop: "dsh-ps-stop",
			panelMulti: "dsh-ps-panel-multi",
			panelClosing: "dsh-ps-panel-closing",
			multiBody: "dsh-ps-multi-body",
			sourceBlock: "dsh-ps-source",
			sourceLabel: "dsh-ps-source-label",
			sourceText: "dsh-ps-source-text",
			candidates: "dsh-ps-candidates",
			candidate: "dsh-ps-candidate",
			candidateHead: "dsh-ps-candidate-head",
			candidateLabel: "dsh-ps-candidate-label",
			candidateText: "dsh-ps-candidate-text",
			recommendBadge: "dsh-ps-recommend",
			closeCard: "dsh-ps-close",
			roundBar: "dsh-ps-round-bar",
			roundTitle: "dsh-ps-round-title",
			rolledBadge: "dsh-ps-rolled",
			historyToggle: "dsh-ps-history-toggle",
			historyList: "dsh-ps-history-list",
			historyItem: "dsh-ps-history-item",
			historyItemActive: "dsh-ps-history-item-active",
			historyHead: "dsh-ps-history-head",
			historyId: "dsh-ps-history-id",
			historyBranch: "dsh-ps-history-branch",
			historyCurrent: "dsh-ps-history-current",
			historyMeta: "dsh-ps-history-meta",
			historyPreview: "dsh-ps-history-preview",
			historyRollback: "dsh-ps-history-rollback",
			multiEmpty: "dsh-ps-multi-empty",
			multiEditor: "dsh-ps-multi-editor",
			multiHint: "dsh-ps-multi-hint",
			multiError: "dsh-ps-multi-error",
			multiActions: "dsh-ps-multi-actions",
			roundDivider: "dsh-ps-round-divider",
			directions: "dsh-ps-directions",
			direction: "dsh-ps-direction",
			directionNo: "dsh-ps-direction-no",
			directionText: "dsh-ps-direction-text",
			float: "dsh-ps-float",
			panelPreview: "dsh-ps-panel-preview",
			previewBody: "dsh-ps-preview-body",
			previewActions: "dsh-ps-preview-actions",
			previewPrimary: "dsh-ps-preview-primary",
			previewSecondary: "dsh-ps-preview-secondary",
			probeNote: "dsh-ps-probe-note"
		};
		const STYLE_ID = "dsh-prompt-scatter-styles";
		const SHEET = `
.dsh-ps-root{position:relative;display:grid;place-items:center}
.dsh-ps-trigger{display:grid;place-items:center;width:28px;height:28px;padding:0;border:none;border-radius:14px;outline:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-ps-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-ps-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
.dsh-ps-trigger:disabled{opacity:.5;cursor:default}
.dsh-ps-busy{animation:dsh-ps-spin 1s linear infinite}
@keyframes dsh-ps-spin{to{transform:rotate(360deg)}}
/* 面板常驻渲染（不随 hover 卸载重挂）：hover 抖动根治 —— 挂载即播动画会让
 * 面板与 ::before 桥接区位移，鼠标在缝隙处反复 enter/leave 的循环抽搐。改为
 * opacity/visibility 过渡显隐。定位用 fixed：absolute 向上展开会伸出 composer
 * 滚动容器被裁切；fixed 相对视口定位，天然不受任何祖先 overflow 裁剪。 */
.dsh-ps-panel{position:fixed;left:var(--po-left,auto);top:var(--po-top,auto);bottom:auto;right:auto;z-index:5000;width:max-content;min-width:236px;max-width:320px;padding:14px 16px;border:1px solid var(--dsw-alias-border-inverted);border-radius:14px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);opacity:0;visibility:hidden;transform:translateY(6px) scale(.98);transition:opacity 140ms cubic-bezier(.2,.8,.2,1),transform 140ms cubic-bezier(.2,.8,.2,1),visibility 0s linear 140ms;pointer-events:none}
.dsh-ps-panel-open{opacity:1;visibility:visible;transform:none;transition:opacity 140ms cubic-bezier(.2,.8,.2,1),transform 140ms cubic-bezier(.2,.8,.2,1);pointer-events:auto}
/* 透明桥接：覆盖卡片与图标之间的间隙，鼠标移动时命中卡片不中断 hover。 */
.dsh-ps-panel::before{content:'';position:absolute;left:0;right:0;bottom:-10px;height:10px}
.dsh-ps-panel-title{font-size:14px;font-weight:600;line-height:20px;margin-bottom:4px}
.dsh-ps-caption{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);margin-bottom:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ps-options{display:flex;flex-direction:column;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-ps-option{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-ps-option-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-ps-switch{position:relative;width:34px;height:18px;border-radius:9px;border:none;padding:0;cursor:pointer;flex:none;background:var(--dsw-alias-border-l2);transition:background .15s}
.dsh-ps-switch-on{background:var(--dsw-alias-state-business-primary)}
.dsh-ps-switch-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-tertiary);transition:left .15s,background .15s;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.dsh-ps-switch-knob-on{left:18px;background:#fff}
.dsh-ps-status{display:flex;align-items:center;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary)}
.dsh-ps-status-optimizing{color:var(--dsw-alias-state-business-primary)}
.dsh-ps-status-done{color:var(--dsw-alias-state-success-primary)}
.dsh-ps-status-error{color:var(--dsw-alias-state-error-primary)}
.dsh-ps-stop{display:flex;align-items:center;justify-content:center;width:100%;height:28px;margin-top:10px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);font-size:12px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.dsh-ps-stop:hover{background:var(--dsw-alias-state-error-primary);color:#fff}
/* 多轮候选卡片：滑出动画（滑入沿用 panel 的 rise）。
 * important 覆盖玻璃模式 html[data-dsh-glass] 的 rise 强制 animation。 */
.dsh-ps-panel-closing{animation:dsh-ps-slide-out 140ms cubic-bezier(.4,0,.6,1) forwards!important}
@keyframes dsh-ps-slide-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(6px)}}
.dsh-ps-panel-multi{position:fixed;left:0;right:0;top:0;bottom:0;margin:auto;width:800px;max-width:calc(100vw - 32px);height:fit-content;max-height:82vh;padding:20px 24px;overflow-y:auto;z-index:5000}
.dsh-ps-multi-body{display:flex;flex-direction:column;gap:14px;min-width:0}
.dsh-ps-source{margin-top:2px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.dsh-ps-source-label{font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-secondary);margin-bottom:6px}
.dsh-ps-source-text{font-size:15px;line-height:24px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
.dsh-ps-candidates{display:flex;flex-direction:column;gap:12px;min-width:0}
.dsh-ps-candidate{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:transparent;text-align:left;cursor:pointer;transition:border-color .15s,background .15s}
.dsh-ps-candidate:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-ps-candidate-head{display:flex;align-items:center;gap:10px}
.dsh-ps-candidate-label{font-size:14px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary)}
.dsh-ps-recommend{font-size:13px;line-height:18px;font-weight:600;padding:0 8px;border-radius:6px;background:var(--dsw-alias-state-business-primary);color:#fff}
.dsh-ps-candidate-text{font-size:15px;line-height:24px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
.dsh-ps-close{display:flex;align-items:center;justify-content:center;width:100%;height:36px;margin-top:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.dsh-ps-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* portal 浮层（预览卡 / 候选卡）复用 .dsh-ps-panel 的外观，但后者自带
 * hover 面板的隐藏态（opacity:0 / visibility:hidden / pointer-events:none），
 * 必须显式翻回可见，否则整张卡渲染了却看不见。 */
.dsh-ps-float{opacity:1;visibility:visible;pointer-events:auto}
/* 预览卡：位置由 placePanel() 写入的 --po-left/--po-top 决定（与 hover 面板同一套坐标）。 */
.dsh-ps-panel-preview{width:420px;max-width:min(560px,calc(100vw - 32px));padding:16px 18px}
.dsh-ps-preview-body{max-height:min(46vh,420px);margin-top:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-l2);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;white-space:pre-wrap;overflow:auto;word-break:break-word}
.dsh-ps-preview-body::-webkit-scrollbar{width:8px}
.dsh-ps-preview-body::-webkit-scrollbar-thumb{border-radius:4px;background:var(--dsw-alias-border-l3)}
.dsh-ps-preview-actions{display:flex;gap:8px;margin-top:12px}
.dsh-ps-preview-primary{flex:1;height:34px;border:none;border-radius:8px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}
.dsh-ps-preview-primary:hover{opacity:.9}
.dsh-ps-preview-secondary{height:34px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
.dsh-ps-preview-secondary:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-ps-probe-note{margin-top:8px;padding:6px 10px;border-radius:8px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:12px;line-height:18px;opacity:.9}
/* ---- 多轮优化浮层 ---- */
.dsh-ps-round-bar{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-ps-round-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-ps-rolled{font-size:11px;line-height:16px;padding:1px 7px;border-radius:6px;background:var(--dsw-alias-state-error-primary);color:#fff}
.dsh-ps-history-toggle{margin-left:auto;height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer}
.dsh-ps-history-toggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-ps-history-list{max-height:min(30vh,240px);overflow-y:auto;margin-bottom:12px;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-l2)}
.dsh-ps-history-item{padding:6px 8px;border-radius:7px;border-left:3px solid transparent}
.dsh-ps-history-item-active{background:var(--dsw-alias-interactive-bg-hover);border-left-color:var(--dsw-alias-state-business-primary)}
.dsh-ps-history-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsh-ps-history-id{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-ps-history-branch,.dsh-ps-history-current{font-size:10px;line-height:14px;padding:0 5px;border-radius:4px}
.dsh-ps-history-branch{background:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
.dsh-ps-history-current{background:var(--dsw-alias-state-business-primary);color:#fff}
.dsh-ps-history-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-left:auto}
.dsh-ps-history-preview{margin-top:3px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ps-history-rollback{margin-top:4px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer}
.dsh-ps-history-rollback:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-ps-history-rollback:disabled{opacity:.5;cursor:default}
.dsh-ps-multi-editor{display:block;width:100%;min-height:180px;max-height:50vh;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-l2);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box}
.dsh-ps-multi-editor:focus{border-color:var(--dsw-alias-state-business-primary)}
.dsh-ps-multi-hint{margin-top:4px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dsh-ps-multi-empty{padding:18px 0;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dsh-ps-multi-error{margin-top:8px;padding:6px 10px;border-radius:8px;background:var(--dsw-alias-state-error-primary);color:#fff;font-size:12px;line-height:18px}
.dsh-ps-round-divider{margin:14px 0 8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dsh-ps-directions{display:flex;flex-direction:column;gap:6px}
.dsh-ps-direction{display:flex;align-items:flex-start;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.dsh-ps-direction:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-state-business-primary)}
.dsh-ps-direction:disabled{opacity:.5;cursor:default}
.dsh-ps-direction-no{flex:0 0 auto;width:18px;height:18px;border-radius:9px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:11px;line-height:18px;text-align:center}
.dsh-ps-direction-text{flex:1 1 auto;min-width:0}
.dsh-ps-multi-actions{display:flex;gap:8px;margin-top:12px}
`;
/** 多轮浮层固定尺寸。 */
const MULTI_WIDTH = 720;
		/** 注入样式表（幂等；loader 卸载插件时会移除其 style 标签）。 */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const tag = document.createElement("style");
			tag.id = STYLE_ID;
			tag.dataset.plugin = "dsh-prompt-scatter";
			tag.dataset.pluginCss = "dsh-prompt-scatter/styles";
			tag.textContent = SHEET;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/prompt-optimize/PromptOptimizeButton.tsx
		/**
		 * PromptOptimizeButton — 对话框「自动优化提示词」图标按钮。
		 *
		 * 注册在 `conversation.input.right`（order 5，位于模型座位控件左侧）。
		 * 点击后用当前会话选中的模型（ModelDirectory store 的 `current`）优化输入框
		 * 草稿：草稿与选中模型 → 插件 SSE 路由 → 边收 text 增量边写回草稿，
		 * 图标上方 popover 展示优化链路与实时进度。
		 *
		 * 草稿读取走会话标准 kit 的 `useInput` 快照钩子（0.2.0-rc.2 契约），
		 * 写回走 `inputActions.setDraft`（唯一公开写入路径），不碰 DOM。
		 */
		function classNames(...values) {
			return values.filter((value) => typeof value === "string" && value !== "").join(" ");
		}
		/** 把毫秒格式化为可读耗时。 */
		function formatMs(ms) {
			if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "已完成";
			if (ms < 1e3) return `已完成 · ${String(Math.round(ms))}ms`;
			return `已完成 · ${(ms / 1e3).toFixed(1)}s`;
		}
		/** 「设定目标提示词」开关的 localStorage 键。 */
		const TARGET_KEY = "dsh-prompt-scatter:set-target";
		/** 「多轮优化」开关的 localStorage 键。 */
		const MULTI_KEY = "dsh-prompt-scatter:multi-round";
		/** 多轮会话状态在 sessionStorage 的键前缀（按会话隔离，不跨会话）。 */
		const SESSION_KEY_PREFIX = "dsh-prompt-scatter:multiround:";
		/** host 探测到的输出问题 → 中文说明。 */
		const PROBE_LABELS = {
			repetition: "复读循环",
			"useless-detail": "无用细节堆砌",
			filler: "填充词过多"
		};

		//#region 版本链模型（纯函数；与 lib/versions.js 逻辑一致，由 harness 校验同步）
		//
		// 不能 import 同包模块：client.js 由 window.__ModuleLoader__ 加载，
		// 只允许 require 宿主白名单里的那几个包。lib/versions.js 供宿主导入与测试。

		/** 取某个版本；不存在返回 null。 */
		function versionOf(state, id) {
			if (id === null || id === undefined) return null;
			return state.versions.find((version) => version.id === id) ?? null;
		}
		/** 当前基线版本。 */
		function cursorVersion(state) {
			return versionOf(state, state.cursorId);
		}
		/** 最新（数组末尾）版本。 */
		function latestVersion(state) {
			return state.versions.length === 0 ? null : state.versions[state.versions.length - 1];
		}
		/** 是否处于「回退中」——游标不在最新版。 */
		function isRolledBack(state) {
			const latest = latestVersion(state);
			if (latest === null) return false;
			return state.cursorId !== latest.id;
		}
		/** 追加一轮结果（只追加，不覆盖）。 */
		function appendRound(state, raw, direction) {
			const base = cursorVersion(state);
			const latest = latestVersion(state);
			const round = state.versions.length + 1;
			const rolledBackFrom = latest !== null && base !== null && latest.id !== base.id ? base.id : null;
			const version = {
				id: `v${round}`,
				round,
				baseId: base === null ? null : base.id,
				direction,
				raw,
				edited: raw,
				createdAt: Date.now(),
				rolledBackFrom
			};
			return {
				...state,
				versions: [...state.versions, version],
				cursorId: version.id,
				phase: "awaiting",
				error: null
			};
		}
		/** 编辑某一版内容（只动 edited，不动 raw）。 */
		function editVersion(state, id, text) {
			return {
				...state,
				versions: state.versions.map((version) => (version.id === id ? { ...version, edited: text } : version))
			};
		}
		/** 回退：只移动游标，不删任何版本。 */
		function rollbackTo(state, id) {
			if (versionOf(state, id) === null) return state;
			if (state.cursorId === id) return state;
			return { ...state, cursorId: id, error: null };
		}
		/**
		 * 版本树：按父子关系展开，分叉枝加深缩进。
		 * @returns {Array<{version: object, depth: number, branched: boolean}>}
		 */
		function versionTree(state) {
			const byId = new Map(state.versions.map((version) => [version.id, version]));
			const rootId = state.versions.find((version) => version.baseId === null)?.id ?? null;
			const children = new Map();
			for (const version of state.versions) {
				if (version.baseId === null) continue;
				if (!children.has(version.baseId)) children.set(version.baseId, []);
				children.get(version.baseId).push(version.id);
			}
			const out = [];
			const seen = new Set();
			const walk = (id, depth) => {
				if (id === null || seen.has(id) || !byId.has(id)) return;
				seen.add(id);
				const generated = children.get(id) ?? [];
				out.push({ version: byId.get(id), depth, branched: generated.length > 1 });
				generated.forEach((kid, index) => walk(kid, index === 0 ? depth : depth + 1));
			};
			walk(rootId, 0);
			for (const version of state.versions) {
				if (!seen.has(version.id)) out.push({ version, depth: 0, branched: false });
			}
			return out;
		}
		/** 序列化到 sessionStorage。 */
		function serializeState(state) {
			return JSON.stringify({
				versions: state.versions,
				cursorId: state.cursorId,
				directions: state.directions,
				historyOpen: state.historyOpen
			});
		}
		/** 反序列化；坏数据一律退回空状态。 */
		function deserializeState(raw) {
			const blank = { versions: [], cursorId: null, directions: [], historyOpen: false };
			if (typeof raw !== "string" || raw === "") return blank;
			try {
				const parsed = JSON.parse(raw);
				const versions = (Array.isArray(parsed?.versions) ? parsed.versions : []).filter(
					(version) =>
						version !== null &&
						typeof version === "object" &&
						typeof version.id === "string" &&
						typeof version.round === "number" &&
						typeof version.raw === "string" &&
						typeof version.edited === "string"
				);
				const cursorId =
					typeof parsed?.cursorId === "string" && versions.some((version) => version.id === parsed.cursorId)
						? parsed.cursorId
						: (versions[versions.length - 1]?.id ?? null);
				return {
					versions,
					cursorId,
					directions: Array.isArray(parsed?.directions)
						? parsed.directions.filter((item) => typeof item === "string")
						: [],
					historyOpen: parsed?.historyOpen === true
				};
			} catch {
				return blank;
			}
		}
		//#endregion

		/** 从 localStorage 读开关状态；缺省值在首次（从未点过）时生效。 */
		function readFlag(key, fallback) {
			try {
				const raw = window.localStorage.getItem(key);
				return raw === null ? fallback : raw !== "0";
			} catch {
				return fallback;
			}
		}
		/** 把开关状态写入 localStorage（选择过即持久化）。 */
		function writeFlag(key, value) {
			try {
				window.localStorage.setItem(key, value ? "1" : "0");
			} catch {}
		}
		/**
		 * 渲染「自动优化提示词」图标按钮。
		 * @param props - injected face + owner + session standard kit。
		 * @returns 图标按钮，或 null（subagent 会话不渲染）。
		 */
		function PromptOptimizeButton({ available, directory, useInput, inputActions, sessionId }) {
			ensureStyles();
			// 0.2.0-rc.2：草稿由会话标准 kit 的 useInput 快照钩子提供（旧版是打包进来的 input prop）。
			const draft = useInput((state) => state.draft);
			const state = (0, react.useSyncExternalStore)((fn) => directory.subscribe(fn), () => directory.getSnapshot());
			const [phase, setPhase] = (0, react.useState)("idle");
			const [detail, setDetail] = (0, react.useState)("");
			const [hovered, setHovered] = (0, react.useState)(false);
			const [setTarget, setSetTarget] = (0, react.useState)(() => readFlag(TARGET_KEY, true));
			const [multiRound, setMultiRound] = (0, react.useState)(() => readFlag(MULTI_KEY, false));
			/** 单轮优化结果：先在这里预览，用户点「替换」才写回输入框。 */
			const [preview, setPreview] = (0, react.useState)("");
			/** 本次优化探测到的输出问题（复读 / 无用细节 / 填充词）。 */
			const [probeIssues, setProbeIssues] = (0, react.useState)([]);
			// ---- 多轮版本链 ----
			/** 版本数组（只追加）。 */
			const [versions, setVersions] = (0, react.useState)([]);
			/** 当前基线版本 id。回退改的就是它。 */
			const [cursorId, setCursorId] = (0, react.useState)(null);
			/** 本轮给出的 3 个继续方向。 */
			const [directions, setDirections] = (0, react.useState)([]);
			/** 历史面板是否展开。 */
			const [historyOpen, setHistoryOpen] = (0, react.useState)(false);
			/** 多轮浮层是否显示。 */
			const [multiOpen, setMultiOpen] = (0, react.useState)(false);
			/** 此前轮次已经给过的维度，用于让模型换一批。 */
			const usedDimensionsRef = (0, react.useRef)([]);
			/** 方向生成 / 继续优化中。 */
			const [multiBusy, setMultiBusy] = (0, react.useState)(false);
			const [multiError, setMultiError] = (0, react.useState)("");
			const [closing, setClosing] = (0, react.useState)(false);
			const closeTimer = (0, react.useRef)(null);
			const hoverLeaveTimer = (0, react.useRef)(null);
			const abortRef = (0, react.useRef)(null);
			const lastWrittenRef = (0, react.useRef)("");
			const rootRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const previewRef = (0, react.useRef)(null);
			const multiRef = (0, react.useRef)(null);
			const busy = phase === "optimizing";
			// 卸载清理：定时器要清，正在进行的优化请求也要中止——否则切走会话
			// 或插件被卸载后，迟到的 delta 会继续往已经不存在的草稿里写。
			(0, react.useEffect)(() => () => {
				if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
				if (hoverLeaveTimer.current !== null) window.clearTimeout(hoverLeaveTimer.current);
				abortRef.current?.abort();
				abortRef.current = null;
			}, []);
			// fixed 面板坐标跟随：内容变化（状态行文字增减）与窗口缩放都会改变几何，
			// phase 非 idle 的常驻态也要重算（hover 打开路径已在 showPanel 里算过）。
			// 依赖 phase/hovered：只有面板可见时才挂 resize 监听，隐藏时立即摘掉。
			(0, react.useEffect)(() => {
				if (phase === "idle" && !hovered) return;
				placePanel();
				placePreview();
				const onResize = () => {
					placePanel();
					placePreview();
				};
				window.addEventListener("resize", onResize, { passive: true });
				return () => window.removeEventListener("resize", onResize);
			}, [phase, hovered]);
			if (!available) return null;
			const cancelHoverHide = () => {
				if (hoverLeaveTimer.current !== null) {
					window.clearTimeout(hoverLeaveTimer.current);
					hoverLeaveTimer.current = null;
				}
			};
			const showPanel = () => {
				cancelHoverHide();
				placePanel();
				setHovered(true);
			};
			const scheduleHide = () => {
				// 候选卡与预览卡是常驻浮层，不跟随 hover 收起。
				if (phase === "multi" || phase === "preview") return;
				cancelHoverHide();
				hoverLeaveTimer.current = window.setTimeout(() => {
					hoverLeaveTimer.current = null;
					setHovered(false);
				}, 80);
			};
			/** fixed 定位坐标：浮层底缘贴触发钮顶缘上方 10px，右缘对齐按钮右缘，两端 clamp 进视口。 */
			const placeFloating = (panelEl) => {
				const rootEl = rootRef.current;
				if (!rootEl || !panelEl) return;
				const r = rootEl.getBoundingClientRect();
				const pr = panelEl.getBoundingClientRect();
				const margin = 8;
				let left = r.right - pr.width;
				if (left < margin) left = margin;
				if (left + pr.width > window.innerWidth - margin) left = window.innerWidth - margin - pr.width;
				let top = r.top - pr.height - 10;
				if (top < margin) top = Math.min(r.bottom + 10, window.innerHeight - margin - pr.height);
				panelEl.style.setProperty("--po-left", String(Math.round(left)) + "px");
				panelEl.style.setProperty("--po-top", String(Math.round(top)) + "px");
			};
			const placePanel = () => placeFloating(panelRef.current);
			const placePreview = () => placeFloating(previewRef.current);
			const finish = (next, text) => {
				setPhase(next);
				setDetail(text);
				if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
				closeTimer.current = window.setTimeout(() => {
					setPhase("idle");
					setDetail("");
				}, next === "done" ? 2400 : 3800);
			};
			const toggleTarget = () => {
				setSetTarget((prev) => {
					const next = !prev;
					writeFlag(TARGET_KEY, next);
					return next;
				});
			};
			const toggleMulti = () => {
				setMultiRound((prev) => {
					const next = !prev;
					writeFlag(MULTI_KEY, next);
					return next;
				});
			};
			/** 采纳预览结果：这一步才真正改动输入框。 */
			const acceptPreview = () => {
				if (preview === "") return;
				inputActions.setDraft(preview);
				lastWrittenRef.current = preview;
				setPreview("");
				setPhase("idle");
				setDetail("");
				setHovered(false);
			};
			/** 放弃预览：输入框本就没被动过，清空预览即可。 */
			const discardPreview = () => {
				setPreview("");
				setPhase("idle");
				setDetail("");
				setHovered(false);
			};
			/** 复制预览结果到剪贴板，方便先存着再决定。 */
			const copyPreview = () => {
				if (preview === "") return;
				void navigator.clipboard?.writeText(preview).then(
					() => setDetail("已复制到剪贴板"),
					() => setDetail("复制失败")
				);
			};
			/** 紧急停止：中止 fetch，并显式通知 host 中止模型调用（不依赖 TCP 断开检测）。 */
			const stop = () => {
				abortRef.current?.abort();
				fetch("/api/dsh-prompt-scatter/stop", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ sessionId })
				}).catch(() => {});
			};
			const current = state.current;
			/** 当前选中的 provider；未选为空串。 */
			const providerOf = (selection) => selection?.provider ?? "";
			/** 当前选中的 model；未选为空串。 */
			const modelOf = (selection) => selection?.model ?? "";
			const modelName =
				state.groups.flatMap((group) => group.models).find((model) => model.id === current?.model)?.name ??
				current?.model ??
				"未选模型";
			const optimize = async () => {
				if (busy) return;
				if (draft.trim() === "") {
					finish("error", "请先输入要优化的提示词");
					return;
				}
				if (current === null || current.provider === void 0 || current.model === void 0) {
					finish("error", "请先选择模型");
					return;
				}
				const provider = current.provider;
				const model = current.model;
				if (multiRound) {
					// 已有版本链时只重新打开浮层，接着上一轮继续；
					// 空链才开新会话（否则用户采纳后想再改一步，会被强制从头开始）。
					setMultiOpen(true);
					if (versions.length > 0) {
						const base = cursorVersionNow?.edited ?? "";
						// 用户可能在输入框里改过内容：那意味着要开新会话。
						if (draft.trim() !== "" && draft.trim() !== base.trim()) {
							commit([], null, [], false);
							usedDimensionsRef.current = [];
							await runRound(provider, model, null);
						} else if (directions.length === 0) {
							// 链还在但方向没了（例如刷新后恢复）：补拉一次。
							await fetchDirections(base, provider, model, usedDimensionsRef.current);
						}
					} else {
						commit([], null, [], false);
						usedDimensionsRef.current = [];
						await runRound(provider, model, null);
					}
				} else await optimizeSingle(provider, model);
			};
			/** 单轮优化：流式收进预览区，用户确认后才写回草稿。 */
			const optimizeSingle = async (provider, model) => {
				const text = draft.trim();
				setPhase("optimizing");
				setPreview("");
				setDetail("正在调用模型…");
				const controller = new AbortController();
				abortRef.current = controller;
				let reader = null;
				try {
					const response = await fetch("/api/dsh-prompt-scatter", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							model,
							text,
							setTarget,
							sessionId
						}),
						signal: controller.signal
					});
					if (!response.ok) throw new Error(`优化请求失败（HTTP ${String(response.status)}）`);
					if (response.body === null) throw new Error("无响应流");
					reader = response.body.getReader();
					const decoder = new TextDecoder();
					let buffer = "";
					let accumulated = "";
					let sawTerminal = false;
					const onFrame = (payload) => {
						if (payload.type === "delta" && typeof payload.text === "string") {
							accumulated += payload.text;
							// 只更新预览，不动输入框。
							setPreview(accumulated);
							setDetail(`正在生成 · ${String(accumulated.length)} 字`);
							return;
						}
						if (payload.type === "done") {
							sawTerminal = true;
							const objective = accumulated.trim();
							if (objective === "") {
								finish("done", formatMs(payload.elapsedMs));
								return;
							}
							// host 会把探测到的输出问题带回来，展示给用户看。
							setProbeIssues(Array.isArray(payload.probe?.applied) ? payload.probe.applied : []);
							setPreview(setTarget ? `/goal ${objective}` : objective);
							setPhase("preview");
							setDetail(formatMs(payload.elapsedMs));
							return;
						}
						if (payload.type === "error") {
							sawTerminal = true;
							throw new Error(payload.message ?? "优化失败");
						}
					};
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true });
						let idx;
						while ((idx = buffer.indexOf("\n\n")) !== -1) {
							const frame = buffer.slice(0, idx);
							buffer = buffer.slice(idx + 2);
							for (const line of frame.split("\n")) {
								if (!line.startsWith("data: ")) continue;
								const data = line.slice(6);
								if (data === "") continue;
								let payload;
								try {
									payload = JSON.parse(data);
								} catch {
									continue;
								}
								onFrame(payload);
							}
						}
					}
					buffer += decoder.decode();
					if (!sawTerminal) {
						if (controller.signal.aborted) throw new Error("stopped");
						throw new Error("响应流意外结束");
					}
				} catch (error) {
					if (controller.signal.aborted) finish("error", "已停止优化");
					else
						finish(
							"error",
							`失败：${error instanceof Error ? error.message : String(error)}`
						);
				} finally {
					if (abortRef.current === controller) abortRef.current = null;
					if (reader !== null) reader.cancel().catch(() => {});
				}
			};
			//#region 多轮优化流程
			/** 把当前版本链存进 sessionStorage（按会话隔离）。 */
			const persist = (vers, cur, dirs, open) => {
				try {
					window.sessionStorage.setItem(
						SESSION_KEY_PREFIX + sessionId,
						serializeState({ versions: vers, cursorId: cur, directions: dirs, historyOpen: open })
					);
				} catch {
					/* 隐私模式或配额满：忽略，内存态照常工作 */
				}
			};
			/** 从 sessionStorage 恢复。 */
			(0, react.useEffect)(() => {
				try {
					const raw = window.sessionStorage.getItem(SESSION_KEY_PREFIX + sessionId);
					const restored = deserializeState(raw);
					if (restored.versions.length === 0) return;
					setVersions(restored.versions);
					setCursorId(restored.cursorId);
					setDirections(restored.directions);
					setHistoryOpen(restored.historyOpen);
					setMultiOpen(true);
				} catch {
					/* 读不到就当没有 */
				}
			}, [sessionId]);
			/** 更新版本链并同步持久化。 */
			const commit = (vers, cur, dirs = directions, open = historyOpen) => {
				setVersions(vers);
				setCursorId(cur);
				setDirections(dirs);
				setHistoryOpen(open);
				persist(vers, cur, dirs, open);
			};
			const cursorVersionNow = versionOf({ versions, cursorId }, cursorId);
			const rolledBack = isRolledBack({ versions, cursorId });
			/** 当前编辑区的值：取基线版本的 edited。 */
			const editable = cursorVersionNow?.edited ?? "";
			/** 当前编辑内容的字数（渲染用，避免在 JSX 里重复计算）。 */
			const editedLength = editable.length;
			/** 修改编辑区 → 写回该版本的 edited。 */
			const onEditChange = (text) => {
				if (cursorVersionNow === null) return;
				const next = editVersion({ versions, cursorId }, cursorVersionNow.id, text);
				commit(next.versions, next.cursorId);
			};
			/** 回退到某一版：只移动游标，不删版本。 */
			const onRollback = (id) => {
				// rollbackTo 只换 cursorId，versions 的引用不变，所以不能拿 versions 判断有无变化。
				if (id === cursorId || versionOf({ versions, cursorId }, id) === null) return;
				commit(versions, id);
				setMultiError("");
			};
			/**
			 * 调 host 拉取 3 个继续方向。
			 * @param base - 本轮结果文本。
			 * @param provider - 模型供应商。
			 * @param model - 模型 id。
			 * @param used - 此前轮次已用过的维度，传给 host 让模型避开。
			 */
			const fetchDirections = async (base, provider, model, used = []) => {
				try {
					const response = await fetch("/api/dsh-prompt-scatter", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							model,
							text: base,
							mode: "directions",
							usedDimensions: used,
							sessionId
						})
					});
					if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
					const raw = await response.text();
					let found = [];
					let dims = [];
					for (const chunk of raw.split("\n\n")) {
						if (!chunk.startsWith("data: ")) continue;
						try {
							const payload = JSON.parse(chunk.slice(6).trim());
							if (payload.type === "directions") {
								if (Array.isArray(payload.directions)) found = payload.directions;
								if (Array.isArray(payload.dimensions)) dims = payload.dimensions;
							}
						} catch {
							/* 跳过坏帧 */
						}
					}
					if (found.length === 3) setDirections(found);
					// 记下这一轮用掉的维度，下一轮让模型避开。
					if (dims.length > 0) {
						const merged = new Set([...usedDimensionsRef.current, ...dims]);
						usedDimensionsRef.current = [...merged];
					}
				} catch {
					// 方向拉取失败不影响本轮结果，host 端已有兜底方向。
				}
			};
			/**
			 * 发起一轮：首轮用草稿，续写用基线版本的 edited。
			 * @param provider - 模型供应商。
			 * @param model - 模型 id。
			 * @param direction - 所选方向；首轮传 null。
			 */
			const runRound = async (provider, model, direction) => {
				const base = direction === null ? draft.trim() : (cursorVersionNow?.edited ?? "").trim();
				if (base === "") {
					setMultiError("请先输入要优化的提示词");
					return;
				}
				setMultiBusy(true);
				setMultiError("");
				setDirections([]);
				const controller = new AbortController();
				abortRef.current = controller;
				let reader = null;
				try {
					const response = await fetch("/api/dsh-prompt-scatter", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							model,
							text: base,
							mode: direction === null ? "optimize" : "continue",
							direction: direction ?? undefined,
							setTarget: direction === null && setTarget,
							sessionId
						}),
						signal: controller.signal
					});
					if (!response.ok) throw new Error(`优化请求失败（HTTP ${String(response.status)}）`);
					if (response.body === null) throw new Error("无响应流");
					reader = response.body.getReader();
					const decoder = new TextDecoder();
					let buffer = "";
					let accumulated = "";
					let sawDone = false;
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true });
						let cut;
						while ((cut = buffer.indexOf("\n\n")) !== -1) {
							const frame = buffer.slice(0, cut);
							buffer = buffer.slice(cut + 2);
							for (const line of frame.split("\n")) {
								if (!line.startsWith("data: ")) continue;
								const data = line.slice(6);
								if (data === "") continue;
								let payload;
								try {
									payload = JSON.parse(data);
								} catch {
									continue;
								}
								if (payload.type === "delta" && typeof payload.text === "string") {
									accumulated += payload.text;
								} else if (payload.type === "done") {
									sawDone = true;
								} else if (payload.type === "error") {
									throw new Error(payload.message ?? "优化失败");
								}
							}
						}
					}
					if (!sawDone) throw new Error("响应流意外结束");
					const text = accumulated.trim();
					if (text === "") throw new Error("模型未返回优化结果");
					const next = appendRound(
						{ versions, cursorId, directions, historyOpen, phase: "awaiting", error: null },
						text,
						direction
					);
					commit(next.versions, next.cursorId, [], false);
					// 结果落地后再要方向：首轮与续写走同一条路。
					// 把历史上给过的维度带过去，让模型换一批不同维度的建议。
					await fetchDirections(text, provider, model, usedDimensionsRef.current);
				} catch (error) {
					if (controller.signal.aborted) setMultiError("已停止优化");
					else setMultiError(error instanceof Error ? error.message : String(error));
				} finally {
					if (abortRef.current === controller) abortRef.current = null;
					if (reader !== null) reader.cancel().catch(() => {});
					setMultiBusy(false);
				}
			};
			/** 关闭多轮浮层（保留状态，下次打开还在）。 */
			const closeMulti = () => {
				if (closing) return;
				setClosing(true);
				window.setTimeout(() => {
					setClosing(false);
					setMultiOpen(false);
				}, 150);
			};
			/**
			 * 加入输入框：以 edited 为准，不是 raw。
			 * 写入后关闭浮层——用户已经采纳了结果，继续留着大窗口反而挡视线。
			 * 版本链不清空，下次点星标还能接着上一轮继续。
			 */
			const applyToInput = () => {
				const text = cursorVersionNow?.edited ?? "";
				if (text.trim() === "") return;
				inputActions.setDraft(text);
				lastWrittenRef.current = text;
				closeMulti();
			};
			/** 结束多轮：清空版本链与持久化。 */
			const endMulti = () => {
				commit([], null, [], false);
				usedDimensionsRef.current = [];
				setMultiOpen(false);
				setMultiError("");
				try {
					window.sessionStorage.removeItem(SESSION_KEY_PREFIX + sessionId);
				} catch {
					/* 忽略 */
				}
			};
			//#endregion
			// 候选卡/预览卡打开时，hover 小面板让位，避免两层浮层叠在一起。
			const panelVisible = phase === "preview" ? false : hovered || phase !== "idle";
			const statusClass =
				phase === "optimizing"
					? css.statusOptimizing
					: phase === "done"
						? css.statusDone
						: phase === "error"
							? css.statusError
							: void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.root,
				ref: rootRef,
				onMouseEnter: showPanel,
				onMouseLeave: scheduleHide,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: css.trigger,
						"aria-label": "自动优化提示词",
						title: "自动优化提示词",
						disabled: busy,
						onClick: () => {
							optimize();
						},
						children: busy
							? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(primitives.IconLoadingOutlineRegular, {
									className: css.busy
								})
							: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(primitives.IconSparkleRegular, {})
					}),
					phase !== "multi" &&
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: panelVisible ? `${css.panel} ${css.panelOpen}` : css.panel,
							ref: panelRef,
							role: "group",
							"aria-label": "提示词优化面板",
							"aria-hidden": panelVisible ? void 0 : "true",
							onMouseEnter: showPanel,
							onMouseLeave: scheduleHide,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: css.panelTitle,
									children: "优化提示词"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.caption,
									children: ["用 ", modelName, " 优化当前草稿"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.options,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: css.option,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: css.optionLabel,
													children: "多轮优化"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													role: "switch",
													"aria-checked": multiRound,
													"aria-label": "多轮优化",
													className: classNames(css.switch, multiRound && css.switchOn),
													onClick: toggleMulti,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: classNames(css.knob, multiRound && css.knobOn)
													})
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: css.option,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: css.optionLabel,
													children: "设定目标"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													role: "switch",
													"aria-checked": setTarget,
													"aria-label": "设定目标提示词",
													className: classNames(css.switch, setTarget && css.switchOn),
													onClick: toggleTarget,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: classNames(css.knob, setTarget && css.knobOn)
													})
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: classNames(css.status, statusClass),
									children: [
										phase === "optimizing" &&
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(
												primitives.IconLoadingOutlineRegular,
												{ className: css.busy }
											),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											children:
												phase === "idle"
													? multiRound
														? "点击生成多个候选"
														: "点击用当前模型优化"
													: detail
										})
									]
								}),
								busy &&
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: css.stop,
										onClick: stop,
										children: "停止优化"
									})
							]
						}),
					phase === "preview" &&
						(0, react_dom.createPortal)(
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: classNames(css.panel, css.float, css.panelPreview, "dsh-glass-anim-in"),
								role: "group",
								"aria-label": "优化结果预览",
								ref: previewRef,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.panelTitle,
										children: setTarget ? "优化结果 · 已生成 /goal" : "优化结果"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.caption,
										children: "确认无误再点「替换」，输入框在你点之前不会变。"
									}),
									probeIssues.length > 0 &&
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: css.probeNote,
											children: [
												"已针对这些输出问题加固提示词：",
												probeIssues
													.map((issue) => PROBE_LABELS[issue] ?? issue)
													.join("、")
											]
										}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: css.sourceBlock,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: css.sourceLabel,
												children: "原话"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: css.sourceText,
												children: draft
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.previewBody,
										children: preview
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: css.previewActions,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: css.previewPrimary,
												onClick: acceptPreview,
												children: "替换输入框"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: css.previewSecondary,
												onClick: copyPreview,
												children: "复制"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: css.previewSecondary,
												onClick: discardPreview,
												children: "取消"
											})
										]
									})
								]
							}),
							document.body
						),
						multiOpen &&
						(0, react_dom.createPortal)(
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: classNames(
									css.panel,
									css.float,
									css.panelMulti,
									closing ? css.panelClosing : "dsh-glass-anim-in"
								),
								role: "group",
								"aria-label": "多轮优化",
								ref: multiRef,
								children: [
									// ---- 轮次条 ----
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: css.roundBar,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: css.roundTitle,
												children:
													cursorVersionNow === null
														? "多轮优化"
														: `第 ${String(cursorVersionNow.round)} 轮 · 基于 ${cursorVersionNow.baseId ?? "初始"}`
											}),
											rolledBack &&
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: css.rolledBadge,
													children: "回退中"
												}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: css.historyToggle,
												onClick: () => {
													const next = !historyOpen;
													setHistoryOpen(next);
													persist(versions, cursorId, directions, next);
												},
												"aria-expanded": historyOpen,
												children: ["历史 (", versions.length, ")"]
											})
										]
									}),
									// ---- 历史面板 ----
									historyOpen &&
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: css.historyList,
											children: versionTree({ versions, cursorId }).map((node) => {
												const isCursor = node.version.id === cursorId;
												const label = node.version.direction ?? "初始";
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(
													"div",
													{
														className: classNames(
															css.historyItem,
															isCursor && css.historyItemActive
														),
														style: { paddingLeft: `${String(8 + node.depth * 16)}px` },
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: css.historyHead,
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: css.historyId,
																		children: node.version.id
																	}),
																	node.branched &&
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: css.historyBranch,
																			children: "分叉"
																		}),
																	isCursor &&
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: css.historyCurrent,
																			children: "当前"
																		}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: css.historyMeta,
																		children: `${label} · ${String(node.version.edited.length)}字`
																	})
																]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: css.historyPreview,
																children: node.version.edited.slice(0, 80)
															}),
															!isCursor &&
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	type: "button",
																	className: css.historyRollback,
																	disabled: multiBusy,
																	onClick: () => onRollback(node.version.id),
																	children: "回退到此版本"
																})
														]
													},
													node.version.id
												);
											})
										}),
									// ---- 编辑区 ----
									cursorVersionNow === null
										? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: css.multiEmpty,
												children: multiBusy ? "正在生成第 1 轮…" : "点右上角星标开始优化"
											})
										: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, {
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
														className: css.multiEditor,
														value: editable,
														spellCheck: false,
														onChange: (event) => onEditChange(event.target.value),
														"aria-label": "本轮优化结果（可编辑）"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: css.multiHint,
														children: [
															cursorVersionNow.edited === cursorVersionNow.raw
																? "可直接修改"
																: "已编辑",
															" · ",
															editedLength,
															" 字"
														]
													}),
													// ---- 继续方向 ----
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: css.roundDivider,
														children: "继续优化方向"
													}),
													multiBusy
														? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: css.multiEmpty,
																children: "正在优化…"
															})
														: directions.length === 0
															? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: css.multiEmpty,
																	children: "方向生成中…"
																})
															: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: css.directions,
																	children: directions.map((text, index) =>
																		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(
																			"button",
																			{
																				type: "button",
																				className: css.direction,
																				disabled: multiBusy,
																				onClick: () => {
																					void runRound(providerOf(current), modelOf(current), text);
																				},
																				children: [
																					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(
																						"span",
																						{
																							className: css.directionNo,
																							children: index + 1
																						}
																					),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(
																						"span",
																						{
																							className: css.directionText,
																							children: text
																						}
																					)
																				]
																			},
																			text
																		)
																	)
																}),
													multiError !== "" &&
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: css.multiError,
															children: multiError
														}),
													// ---- 操作 ----
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: css.multiActions,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: css.previewPrimary,
																disabled: editable.trim() === "",
																onClick: applyToInput,
																children: "替换输入框"
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: css.previewSecondary,
																disabled: directions.length === 0 || multiBusy,
																onClick: () =>
																	void runRound(providerOf(current), modelOf(current), null),
																children: ["重新生成"]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: css.previewSecondary,
																onClick: endMulti,
																children: "结束多轮"
															})
														]
													})
												]
											}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: css.closeCard,
										onClick: closeMulti,
										children: multiBusy ? "收起（继续后台跑）" : "收起"
									})
								]
							}),
							document.body
						)
				]
			});
		}
		//#endregion
		//#region src/client/prompt-optimize/index.ts
		/**
		 * 挂载提示词优化图标入口。
		 * @param ctx - client root context。
		 */
		function applyPromptOptimize(ctx) {
			ctx.inject(["slots", "modelDirectories", "sessions"], (scope) => {
				const models = scope.modelDirectories;
				const sessions = scope.sessions;
				scope.slots.inject("conversation.input.right", () =>
					scope.slots.register(
						{
							name: "conversation.input.right",
							id: "dsh-prompt-scatter",
							order: 5,
							inject: (sessionId) => {
								const directory = models.directoryFor(sessionId);
								return {
									available: sessions.subagentAddress(sessionId) === void 0,
									directory: directory.store,
									sessionId
								};
							}
						},
						PromptOptimizeButton
					)
				);
			});
		}
		//#endregion
		//#region src/client/index.ts
		const name = "dsh-prompt-scatter-client";
		const inject = ["slots", "modelDirectories", "sessions"];
		function apply(ctx) {
			applyPromptOptimize(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
