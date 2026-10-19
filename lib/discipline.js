/**
 * 输出纪律片段：防止「过度注重细节」与「死循环」。
 *
 * 与 probe.js 的分工（重要）：
 * - probe 是**自动探测**：先看草稿里有没有病灶，命中才追加对应规则，规则是英文、面向模型的一次性纠正。
 * - 本模块是**用户主动选择**：按钮打开后无条件把这段写进提示词，面向的是「这次希望输出保持克制」。
 *
 * 两者不重复也不冲突：probe 治「输入已经带病」，这里治「输出应当收敛」。
 */

/** 单条规则：目标 + 判据 + 越界时的做法。 */
const RULES = [
	{
		key: "no-overdetail",
		title: "不为细节而细节",
		aim: "细节服务于结论，而不是用来证明你做得很认真",
		test: "删掉这条细节后，读者对结论的理解不变——那它就不该出现",
		stop: "拿不准一个细节是否必要，就省略它并说明「另有细节可按需展开」"
	},
	{
		key: "depth-budget",
		title: "深度要有预算",
		aim: "为每个问题设定停止条件，而不是尽量挖到底",
		test: "先问「这个问题的答案会改变我下一步做什么吗」，不会就停在这里",
		stop: "连续两层追问仍未改变结论时停止，把剩余疑点列成待确认项"
	},
	{
		key: "no-loop",
		title: "不复读、不绕圈",
		aim: "同一件事只交代一次，同一结论只论证一次",
		test: "准备第三次回到同一个话题时，先检查前两次是否已经给出结论",
		stop: "发现自己在重复措辞，立刻停止该段并收尾；宁可短，不要原地打转"
	},
	{
		key: "escape-hatch",
		title: "留出退出条件",
		aim: "给自己一个明确的终止信号，避免无限自查",
		test: "动手前先说出「什么情况下我就不再继续了」",
		stop: "达到该条件即停止，把未完成部分写清楚，而不是硬凑完整"
	}
];

/** 默认启用全部条目。 */
export const DEFAULT_DISCIPLINE = RULES.map((rule) => rule.key);

/** 抬头：说清这段是「收敛」，并声明不牺牲必要深度。 */
const PREAMBLE = [
	"输出纪律（可选片段）",
	"下面这段要求你收着写：不为细节而细节、给深度设预算、不复读绕圈、留出退出条件。",
	"它不等于偷懒——省掉的是无效细节，不是必要的依据、风险与取舍。"
].join("\n");

/** 结尾：防止走向另一个极端。 */
const POSTAMBLE = [
	"如果任务确实需要展开（例如用户明确要求详尽，或多方案对比本身就是交付物），照常展开，但要在开头说明为什么这里需要详尽。",
	"判断标准始终是「读者拿这个去做什么」，而不是「我还能想到多少」。"
].join("\n");

/**
 * 生成纪律片段文本。
 * @param sections - 要包含的条目 key；省略或非法时回落全部。
 * @param extra - 追加在末尾的自定义文本（按字面量拼接）。
 * @returns 片段文本。
 */
export function buildDiscipline(sections = DEFAULT_DISCIPLINE, extra = "") {
	const wanted = normalizeDiscipline(sections);
	const picked = RULES.filter((rule) => wanted.includes(rule.key));
	const body = picked.map((rule, index) =>
		[
			`${String(index + 1)}. ${rule.title}`,
			`   - 要做到：${rule.aim}`,
			`   - 自检：${rule.test}`,
			`   - 越界时：${rule.stop}`
		].join("\n")
	);
	const text = [PREAMBLE, ...body, POSTAMBLE].join("\n\n");
	const tail = typeof extra === "string" ? extra.trim() : "";
	return tail === "" ? text : `${text}\n\n${tail}`;
}

/** 供界面展示的条目标签。 */
export const DISCIPLINE_LABELS = Object.fromEntries(RULES.map((rule) => [rule.key, rule.title]));

/**
 * 规范化条目标志：去重、过滤未知 key、空则回落全集。
 * @param value - 上游传入的数组。
 * @returns 合法 key 数组。
 */
export function normalizeDiscipline(value) {
	if (!Array.isArray(value)) return [...DEFAULT_DISCIPLINE];
	const valid = value.filter((key) => typeof key === "string" && DISCIPLINE_LABELS[key] !== undefined);
	const unique = [...new Set(valid)];
	return unique.length > 0 ? unique : [...DEFAULT_DISCIPLINE];
}
