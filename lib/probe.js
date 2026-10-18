/**
 * 输出质量探测：识别模型复读循环与无用细节堆砌。
 *
 * 纯函数、无依赖，host 与浏览器两半共用同一套判定，避免两边标准漂移。
 * 这里只看「文本形态」，不调用模型——探测本身不能再花一次模型调用。
 */

/** 判定为循环所需的最短重复单元长度（字符）。 */
const MIN_CYCLE_UNIT = 6;
/** 同一个 n-gram 重复这么多遍才算循环。 */
const MIN_CYCLE_REPEATS = 4;
/** 连续相同行重复到这一次数视为复读。 */
const MIN_REPEAT_LINE = 3;

/**
 * 找「短句无限复读」：同一个子串连续重复 ≥4 次。
 * 覆盖「好的好的好的好的」「1. 步骤 1. 步骤 1. 步骤」这类退化。
 * @param text - 待检查文本。
 * @returns 命中的重复单元，或 null。
 */
function detectRepetition(text) {
	const n = text.length;
	for (let unit = MIN_CYCLE_UNIT; unit <= Math.min(200, Math.floor(n / MIN_CYCLE_REPEATS)); unit++) {
		let run = 1;
		let prev = text.slice(0, unit);
		for (let at = unit; at + unit <= n; at += unit) {
			const chunk = text.slice(at, at + unit);
			if (chunk === prev) {
				run++;
				if (run >= MIN_CYCLE_REPEATS) return prev.trim();
			} else {
				run = 1;
				prev = chunk;
			}
		}
	}
	return null;
}

/**
 * 找「同一行反复出现」（容忍行内小差异，比如递增编号）。
 * @param text - 待检查文本。
 * @returns 命中的行内容，或 null。
 */
function detectRepeatedLines(text) {
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "");
	if (lines.length < MIN_REPEAT_LINE) return null;
	let run = 1;
	for (let i = 1; i < lines.length; i++) {
		// 去掉行首编号/项目符号后再比，避免 "1. 同上" / "2. 同上" 逃过判定。
		const strip = (line) => line.replace(/^[\s>*\-#\d.)、]+/u, "").trim();
		if (strip(lines[i]) === strip(lines[i - 1]) && strip(lines[i]) !== "") run++;
		else run = 1;
		if (run >= MIN_REPEAT_LINE) return lines[i];
	}
	return null;
}

/**
 * 估算「无用细节」密度：具体的执行细节 vs 任务本身的产出。
 * 高密度特征：大量示例值、时间戳、路径、版本号、URL、六位以上数字串。
 * @param text - 待检查文本。
 * @returns 0~1 之间的占比。
 */
function detailDensity(text) {
	const sample = text.slice(0, 20000);
	if (sample.trim() === "") return 0;
	const patterns = [
		/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/g, // 时间戳
		/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, // IP
		/["'`][^"'`\n]{40,}["'`]/g, // 长引用串
		/\b[A-Za-z]:[\\/][^\s'"`]+/g, // Windows 路径
		/(?:^|\s)\/(?:[\w.-]+\/){2,}[\w.-]+/g, // 绝对路径
		/\b\d{6,}\b/g, // 长数字串
		/\b\d+\.\d+\.\d+(?:-[\w.]+)?\b/g, // 版本号
		/https?:\/\/\S+/g // URL
	];
	let hits = 0;
	for (const pattern of patterns) hits += (sample.match(pattern) ?? []).length;
	const chars = Math.max(1, sample.length);
	// 每 100 字符一个「细节命中」视为高密度；封顶 1。
	return Math.min(1, (hits / chars) * 100);
}

/**
 * 估算填充词密度：反复出现的「注意/请务必/总之/需要强调的是」这类。
 * @param text - 待检查文本。
 * @returns 0~1 之间的占比。
 */
function fillerDensity(text) {
	const sample = text.slice(0, 20000);
	if (sample.trim() === "") return 0;
	const filler = [
		/需要强调的是/g,
		/请注意/g,
		/务必/g,
		/总之/g,
		/综上所述/g,
		/简而言之/g,
		/值得一提的是/g,
		/值得注意/g,
		/非常重要/g,
		/尽可能/g,
		/尽量/g,
		/一定要/g,
		/记得/g,
		/\b(?:please note|note that|it is important to|make sure to|be sure to|needless to say|in conclusion)\b/gi
	];
	let hits = 0;
	for (const pattern of filler) hits += (sample.match(pattern) ?? []).length;
	const chars = Math.max(1, sample.length);
	return Math.min(1, (hits / chars) * 400);
}

/** 各问题的判定阈值。 */
const THRESHOLDS = {
	repetition: 0,
	detailDensity: 0.55,
	fillerDensity: 0.5
};

/**
 * 探测输出质量。
 * @param text - 模型输出（或待优化的原始提示词）。
 * @returns {{issues: string[], repetition: string|null, detailDensity: number, fillerDensity: number, length: number}}
 */
export function probeOutput(text) {
	const value = typeof text === "string" ? text : "";
	const repetition = detectRepetition(value) ?? detectRepeatedLines(value);
	const detail = detailDensity(value);
	const filler = fillerDensity(value);
	const issues = [];
	if (repetition !== null) issues.push("repetition");
	if (detail >= THRESHOLDS.detailDensity) issues.push("useless-detail");
	if (filler >= THRESHOLDS.fillerDensity) issues.push("filler");
	return {
		issues,
		repetition,
		detailDensity: Number(detail.toFixed(3)),
		fillerDensity: Number(filler.toFixed(3)),
		length: value.length
	};
}

/** 每个问题对应的纠正指令，追加到系统提示词里。 */
const REMEDIES = {
	repetition:
		"Do NOT repeat yourself. Never emit the same sentence, list item or phrase twice. If you run out of distinct content, stop instead of looping.",
	"useless-detail":
		"Do NOT pile up incidental detail (exact timestamps, sample IPs, invented file paths, version numbers, long quoted blobs). Mention a concrete detail only when the task cannot be done without it.",
	filler:
		"Do NOT pad with filler phrases (\"please note\", \"it is important to\", \"in conclusion\", \"needless to say\"). Say each thing once, plainly."
};

/**
 * 把探测到的问题翻译成额外的系统提示词规则。
 * @param issues - probeOutput 返回的 issue 列表。
 * @returns 追加规则数组（可为空）。
 */
export function remediesFor(issues) {
	const list = Array.isArray(issues) ? issues : [];
	return [...new Set(list)].map((issue) => REMEDIES[issue]).filter((rule) => rule !== undefined);
}
