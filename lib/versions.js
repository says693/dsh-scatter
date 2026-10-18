/**
 * 多轮优化的版本链模型。
 *
 * 纯函数、无 React 依赖，便于单独测试。所有写操作都返回新数组，
 * 且**只追加**——回退只改 cursorId，从不删除版本。
 */

/** 版本记录。 */
export function createVersion({ round, baseId, direction, raw, rolledBackFrom = null }) {
	return {
		id: `v${round}`,
		round,
		baseId,
		direction,
		raw,
		edited: raw,
		createdAt: Date.now(),
		rolledBackFrom
	};
}

/** 初始状态。 */
export function emptyState() {
	return {
		versions: [],
		cursorId: null,
		phase: "idle",
		directions: [],
		historyOpen: false,
		error: null
	};
}

/** 取某个版本；不存在返回 null。 */
export function versionOf(state, id) {
	if (id === null || id === undefined) return null;
	return state.versions.find((version) => version.id === id) ?? null;
}

/** 当前基线版本。 */
export function cursorVersion(state) {
	return versionOf(state, state.cursorId);
}

/** 最新（数组末尾）版本。 */
export function latestVersion(state) {
	return state.versions.length === 0 ? null : state.versions[state.versions.length - 1];
}

/**
 * 追加一轮结果。
 * @param state - 当前状态。
 * @param raw - 模型原始输出。
 * @param direction - 触发本轮的方向；首轮为 null。
 * @returns 新状态。
 */
export function appendRound(state, raw, direction) {
	const base = cursorVersion(state);
	const round = state.versions.length + 1;
	// 若基线不是最新版，说明这轮是从历史分叉出来的。
	const latest = latestVersion(state);
	const rolledBackFrom = latest !== null && base !== null && latest.id !== base.id ? base.id : null;
	const version = createVersion({
		round,
		baseId: base === null ? null : base.id,
		direction,
		raw,
		rolledBackFrom
	});
	return {
		...state,
		versions: [...state.versions, version],
		cursorId: version.id,
		phase: "awaiting",
		error: null
	};
}

/**
 * 编辑某一版的内容。
 * @param state - 当前状态。
 * @param id - 版本 id。
 * @param text - 新内容。
 * @returns 新状态。
 */
export function editVersion(state, id, text) {
	return {
		...state,
		versions: state.versions.map((version) => (version.id === id ? { ...version, edited: text } : version))
	};
}

/**
 * 回退到某一版：只移动游标，不动版本数组。
 * @param state - 当前状态。
 * @param id - 目标版本 id。
 * @returns 新状态。
 */
export function rollbackTo(state, id) {
	if (versionOf(state, id) === null) return state;
	if (state.cursorId === id) return state;
	return { ...state, cursorId: id, error: null };
}

/** 是否处于「回退中」——游标不在最新版。 */
export function isRolledBack(state) {
	const latest = latestVersion(state);
	if (latest === null) return false;
	return state.cursorId !== latest.id;
}

/** 轮次条文案。 */
export function roundLabel(state) {
	const cursor = cursorVersion(state);
	if (cursor === null) return "尚未开始";
	return `第 ${cursor.round} 轮 · 基于 ${cursor.baseId ?? "初始"}`;
}

/**
 * 版本树：按父子关系分组，用于分叉展示。
 * 返回按创建顺序排列的节点，每个带 depth（分叉越深缩进越大）。
 * @param state - 当前状态。
 * @returns 节点数组。
 */
export function versionTree(state) {
	const byId = new Map(state.versions.map((version) => [version.id, version]));
	const rootId = state.versions.find((version) => version.baseId === null)?.id ?? null;
	// 每个节点的子节点，按创建顺序。
	const children = new Map();
	for (const version of state.versions) {
		const parent = version.baseId;
		if (parent === null) continue;
		if (!children.has(parent)) children.set(parent, []);
		children.get(parent).push(version.id);
	}
	const out = [];
	const seen = new Set();
	const walk = (id, depth) => {
		if (id === null || seen.has(id) || !byId.has(id)) return;
		seen.add(id);
		const version = byId.get(id);
		out.push({ version, depth, branched: (children.get(id)?.length ?? 0) > 1 });
		// 分叉的子节点按创建顺序，第一个延续，其余加深缩进。
		const kids = children.get(id) ?? [];
		kids.forEach((kid, index) => walk(kid, index === 0 ? depth : depth + 1));
	};
	walk(rootId, 0);
	// 兜底：任何没被走到的节点（理论上不该有）也列出来。
	for (const version of state.versions) {
		if (!seen.has(version.id)) out.push({ version, depth: 0, branched: false });
	}
	return out;
}

/** 序列化，用于 sessionStorage。 */
export function serializeState(state) {
	return JSON.stringify({
		versions: state.versions,
		cursorId: state.cursorId,
		phase: state.phase === "running" ? "awaiting" : state.phase,
		directions: state.directions,
		historyOpen: state.historyOpen,
		error: null
	});
}

/**
 * 反序列化；任何异常都退回空状态，不让坏数据影响插件。
 * @param raw - sessionStorage 里的字符串。
 * @returns 状态。
 */
export function deserializeState(raw) {
	if (typeof raw !== "string" || raw === "") return emptyState();
	try {
		const parsed = JSON.parse(raw);
		const versions = Array.isArray(parsed?.versions) ? parsed.versions : [];
		// 逐条校验形状，坏项直接丢掉。
		const valid = versions.filter(
			(version) =>
				version !== null &&
				typeof version === "object" &&
				typeof version.id === "string" &&
				typeof version.round === "number" &&
				typeof version.raw === "string" &&
				typeof version.edited === "string"
		);
		const cursorId =
			typeof parsed?.cursorId === "string" && valid.some((version) => version.id === parsed.cursorId)
				? parsed.cursorId
				: (valid[valid.length - 1]?.id ?? null);
		return {
			versions: valid,
			cursorId,
			phase: valid.length === 0 ? "idle" : "awaiting",
			directions: Array.isArray(parsed?.directions) ? parsed.directions.filter((d) => typeof d === "string") : [],
			historyOpen: parsed?.historyOpen === true,
			error: null
		};
	} catch {
		return emptyState();
	}
}
