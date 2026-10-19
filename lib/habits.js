/**
 * 互动协议片段：把「边做边说」这套习惯写成可直接拼进提示词的一段文本。
 *
 * 与 dsh-chatterbox 的区别（重要）：
 * chatterbox 通过 `systemPrompt.section` 常驻注入，对所有对话生效、用户无法逐次选择；
 * 这里是一段**可选片段**，只在用户按下按钮、且仅对这一次优化生效。
 *
 * 因此文本写法也不同——chatterbox 面向「长期默认节奏」，用五条纪律约束；
 * 这里面向「这一次输出」，所以每条都写成**触发条件 + 该怎么做 + 做到什么程度**，
 * 让模型能判断何时适用，而不是笼统记住五条口号。
 *
 * 纯函数、无依赖，便于单测。
 */

/** 单条规则的形状。 */
const RULES = [
	{
		key: "narrate",
		title: "边做边说",
		/** 触发条件：什么时候适用。 */
		when: "你即将执行多步操作，或单步可能耗时较久",
		/** 做法：具体动作。 */
		do: "动手前用一句话说明你要做什么、为什么；每完成一个可独立交代的阶段，用一两句说明结果与下一步",
		/** 尺度：做到什么程度。 */
		degree: "说事实与判断依据，不说「正在处理中」这类空话；同一件事只交代一次"
	},
	{
		key: "ask",
		title: "需要人时开口",
		when: "遇到只有人类能提供的输入——登录、验证码、权限、实物操作、外部信息、口径选择、是否放弃目标",
		do: "直接说明卡点，按「我卡在哪 → 需要你做什么 → 我已试过什么 → 建议怎么做及原因」说清",
		degree: "读文件、跑命令、查资料能确定的，自己查完给结论，不必问"
	},
	{
		key: "question",
		title: "提问的方式",
		when: "确实需要用户决策时",
		do: "在对话里问，讲清背景、你的推荐与理由；若是在少数等价候选里挑一个，用选项形式并说明为什么给这几个",
		degree: "用户或工作区已有规则（如某流程要求用提问框确认）优先于本条"
	},
	{
		key: "verify",
		title: "验证要有预算",
		when: "准备重复检查同一件事时",
		do: "一次独立核查即可，有新证据再继续",
		degree: "结论里区分「已核对 / 待核对 / 已知风险」；真正不确定的交给人类"
	},
	{
		key: "speech",
		title: "说人话",
		when: "组织最终回复时",
		do: "句子短，先说事实再给判断",
		degree: "不用「首先/其次/最后」「综上所述」这类公文腔；结尾不堆待办清单，也不反问「还需要我做什么」"
	}
];

/** 默认启用全部条目。 */
export const DEFAULT_SECTIONS = RULES.map((rule) => rule.key);

/** 稳定的抬头：先把「这段是什么、什么时候压过它」讲清楚。 */
const PREAMBLE = [
	"互动优化（可选片段）",
	"下面这段只讲「你怎么和人一起做事」，不讲「你做什么」。它默认生效，但用户当轮提出的要求、以及安全与权限的约束，优先级都高于它。",
	"五条规则各自带触发条件——条件不成立时不必强行套用。"
].join("\n");

/** 结尾：防止模型把规则当检查表逐条对照。 */
const POSTAMBLE = "以上是默认节奏，不是检查表。按任务轻重自行拿捏；如果只能记住一条，记住「让对面看得见过程」。";

/**
 * 生成协议文本。
 * @param sections - 要包含的条目 key；省略或空数组表示全部。
 * @param extra - 追加在末尾的自定义文本（按字面量拼接，不做变量插值）。
 * @returns 协议文本。
 */
export function buildProtocol(sections = DEFAULT_SECTIONS, extra = "") {
	// 先规范化：传空数组、全非法 key 或非数组时都回落到默认全集，
	// 避免调用方忘了先调 normalizeSections 就拿到一份空协议。
	const wanted = normalizeSections(sections);
	const picked = RULES.filter((rule) => wanted.includes(rule.key));
	const body = picked.map((rule, index) =>
		[
			`${String(index + 1)}. ${rule.title}`,
			`   - 何时适用：${rule.when}`,
			`   - 怎么做：${rule.do}`,
			`   - 尺度：${rule.degree}`
		].join("\n")
	);
	const text = [PREAMBLE, ...body, POSTAMBLE].join("\n\n");
	const tail = typeof extra === "string" ? extra.trim() : "";
	return tail === "" ? text : `${text}\n\n${tail}`;
}

/** 供客户端展示的条目标签。 */
export const SECTION_LABELS = Object.fromEntries(RULES.map((rule) => [rule.key, rule.title]));

/**
 * 规范化条目标志：去重、过滤未知 key。
 * @param value - 上游传入的数组。
 * @returns 合法 key 数组；全部非法时返回默认全集。
 */
export function normalizeSections(value) {
	if (!Array.isArray(value)) return [...DEFAULT_SECTIONS];
	const valid = value.filter((key) => typeof key === "string" && SECTION_LABELS[key] !== undefined);
	const unique = [...new Set(valid)];
	return unique.length > 0 ? unique : [...DEFAULT_SECTIONS];
}
