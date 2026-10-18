/**
 * 继续优化方向的维度体系。
 *
 * 纯函数、无依赖：host 端用它生成提示词与去重，客户端用它展示维度标签，
 * 测试直接打这些函数。
 *
 * 为什么需要维度：模型天然偏爱反复推荐「补充输入」「规范格式」这两类，
 * 跨轮不约束就会让用户看到同类建议。这里把方向归到 6 个互斥维度，
 * 并保证每轮 3 条落在不同维度上。
 */

/** 六个互斥的优化维度。 */
export const DIMENSIONS = [
	{ key: "constraints", label: "约束条件", hint: "长度上限、时间范围、禁用词、必须包含项" },
	{ key: "format", label: "输出格式", hint: "结构、排版、字段、标题层级" },
	{ key: "role", label: "角色设定", hint: "身份、语气、受众、专业程度" },
	{ key: "criteria", label: "成功标准", hint: "可验证的验收条件、达标判据" },
	{ key: "input", label: "输入处理", hint: "缺失信息如何处理、需要用户补充什么" },
	{ key: "edge", label: "边界情况", hint: "异常输入、空值、超长文本、冲突指令" }
];

/** key → 中文标签。 */
export const DIMENSION_LABELS = Object.fromEntries(DIMENSIONS.map((item) => [item.key, item.label]));

/** 维度关键词表：把一条方向文案归到最匹配的维度。 */
const DIMENSION_KEYWORDS = {
	constraints: [/约束/, /字数/, /上限/, /长度/, /限制/, /禁止/, /禁用/, /必须包含/, /篇幅/, /不超过/, /\bconstrain/i, /\blimit/i],
	format: [/格式/, /排版/, /结构/, /标题/, /分段/, /表格/, /JSON/i, /Markdown/i, /三段/, /层级/, /\bformat/i, /\bstructur/i],
	role: [/角色/, /身份/, /语气/, /口吻/, /受众/, /专业/, /扮演/, /\brole/i, /\btone\b/i, /\bpersona/i],
	criteria: [/标准/, /验收/, /判据/, /达标/, /成功条件/, /可验证/, /衡量/, /\bcriteria/i, /\baccept/i],
	input: [/输入/, /补充信息/, /需要用户提供/, /缺失/, /背景资料/, /提供.*数据/, /\binput\b/i],
	edge: [/边界/, /异常/, /空值/, /超长/, /冲突/, /极端情况/, /兜底/, /\bedge case/i, /\bcorner case/i]
};

/**
 * 判断一条方向属于哪个维度。
 * @param text - 方向文案。
 * @returns 维度 key；识别不出返回 null。
 */
export function classifyDimension(text) {
	const value = String(text ?? "");
	let best = null;
	let bestScore = 0;
	for (const [key, patterns] of Object.entries(DIMENSION_KEYWORDS)) {
		let score = 0;
		for (const pattern of patterns) if (pattern.test(value)) score++;
		if (score > bestScore) {
			bestScore = score;
			best = key;
		}
	}
	return best;
}

/**
 * 把一批方向映射到维度，找出重复与未覆盖项。
 * @param directions - 方向文案数组。
 * @returns {{dimensions: string[], duplicate: string[], missing: string[]}}
 */
export function auditDirections(directions) {
	const list = Array.isArray(directions) ? directions : [];
	const counted = new Map();
	const ordered = [];
	for (const text of list) {
		const key = classifyDimension(text);
		if (key === null) continue;
		if (!counted.has(key)) {
			counted.set(key, 0);
			ordered.push(key);
		}
		counted.set(key, counted.get(key) + 1);
	}
	const duplicate = ordered.filter((key) => counted.get(key) > 1);
	const missing = DIMENSIONS.map((item) => item.key).filter((key) => !counted.has(key));
	return { dimensions: ordered, duplicate, missing };
}

/**
 * 若方向在维度上有重复，用未覆盖维度就地替换，保证 3 条分属不同维度。
 *
 * 不重试模型调用：为了凑维度再打一次模型，代价高于收益，用户也要多等。
 *
 * @param directions - 原始方向。
 * @param usedDimensions - 之前轮次已用过的维度，替换时优先避开。
 * @returns {{directions: string[], dimensions: string[]}}
 */
export function diversifyDirections(directions, usedDimensions = []) {
	const list = Array.isArray(directions) ? [...directions] : [];
	const used = Array.isArray(usedDimensions) ? usedDimensions : [];
	const seen = new Set();
	for (let index = 0; index < list.length; index++) {
		const key = classifyDimension(list[index]);
		if (key === null) continue;
		if (!seen.has(key)) {
			seen.add(key);
			continue;
		}
		const replacement =
			DIMENSIONS.find((item) => !seen.has(item.key) && !used.includes(item.key) && item.key !== key) ??
			DIMENSIONS.find((item) => !seen.has(item.key) && item.key !== key);
		if (replacement === undefined) continue;
		list[index] = `${replacement.label}方向：${replacement.hint}`;
		seen.add(replacement.key);
	}
	const dimensions = [...new Set(list.map((text) => classifyDimension(text)).filter((key) => key !== null))];
	return { directions: list, dimensions };
}

/** 默认兜底方向：模型没给出可用结果时使用。 */
export const FALLBACK_DIRECTIONS = [
	"补充约束条件：明确长度、范围与禁用项",
	"调整输出格式：规定结构化输出与标题层级",
	"细化成功标准：给出可验证的验收条件"
];

/**
 * 解析模型输出的方向：容忍编号、项目符号、引号、代码围栏与重复项。
 * @param text - 模型原始输出。
 * @returns 三条方向；不足三条时返回 FALLBACK_DIRECTIONS。
 */
export function parseDirections(text) {
	const cleaned = String(text ?? "")
		.replace(/```[a-z]*\n?/gi, "")
		.split("\n")
		.map((line) =>
			line
				.trim()
				.replace(/^(?:\d+[.、)．]|[-*•])\s*/u, "")
				.replace(/^["'「『]|["'」』]$/gu, "")
				.trim()
		)
		.filter((line) => line !== "" && line.length <= 120);
	const unique = [];
	for (const line of cleaned) {
		if (!unique.includes(line)) unique.push(line);
		if (unique.length === 3) break;
	}
	return unique.length === 3 ? unique : FALLBACK_DIRECTIONS;
}
