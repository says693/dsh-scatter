/**
 * 插件配置：探测阈值与提示词语气强度。
 *
 * 通过 cordis.patch.yml 的 `config:` 段下发；Cordis 在激活时校验，非法值直接报错，
 * 不会让插件带着半套配置跑起来。
 */
import z from "@deepseek-ai/schemastery";
import { normalizeSections } from "./habits.js";

/** 探测阈值默认值：与 probe.js 里写死的判定线一致。 */
export const DEFAULT_THRESHOLDS = {
	/** 无用细节密度 0~1：越高说明越堆砌。 */
	detailDensity: 0.55,
	/** 填充词密度 0~1。 */
	fillerDensity: 0.5,
	/** 复读判定：同一子串至少连续重复几次。 */
	repetitionRepeats: 4
};

/** 探测相关配置。 */
export const ProbeConfig = z.object({
	/** 关掉后完全不做探测，等于回到「固定提示词」的老行为。 */
	enabled: z.boolean().default(true),
	/** 无用细节密度阈值，0~1；设为 1 表示几乎不判。 */
	detailDensity: z.number().min(0).max(1).default(DEFAULT_THRESHOLDS.detailDensity),
	/** 填充词密度阈值，0~1。 */
	fillerDensity: z.number().min(0).max(1).default(DEFAULT_THRESHOLDS.fillerDensity),
	/** 复读判定：同一子串连续重复几次才判为循环，范围 2~20。 */
	repetitionRepeats: z.number().min(2).max(20).default(DEFAULT_THRESHOLDS.repetitionRepeats)
});

/** 会话上下文配置：优化时把当前会话的最近对话作为背景带入。 */
export const ContextConfig = z.object({
	/** 关掉后只按草稿本身优化。 */
	enabled: z.boolean().default(true),
	/** 取最近几轮对话（一轮 = 一条用户消息及其助手回复），1~10。 */
	maxTurns: z.number().min(1).max(10).default(3),
	/** 背景文本字符上限，避免压缩优化请求本身的空间。 */
	maxChars: z.number().min(200).max(20_000).default(2_000)
});

/** 互动协议片段配置：用户按按钮时才生效，区别于常驻注入。 */
export const HabitsConfig = z.object({
	/** 包含哪几条；省略等于全部。 */
	sections: z.array(z.string()).default([]),
	/** 追加在协议末尾的自定义文本（按字面量拼接）。 */
	extra: z.string().default("")
});

/** 插件总配置。 */
export const Config = z.object({
	probe: ProbeConfig.default({}),
	context: ContextConfig.default({}),
	habits: HabitsConfig.default({}),
	/** 单次优化的 token 上限。 */
	maxTokens: z.number().min(256).max(32768).default(4096),
	/** 优化超时（毫秒）。 */
	timeoutMs: z.number().min(5_000).max(600_000).default(90_000)
});

/**
 * 把外部配置收敛成内部使用的完整形态，缺项一律回落到默认值。
 * 数值按 schema 声明的范围 clamp——正常路径由 Cordis 校验拦住，
 * 这里兜底是防止绕过校验（例如直接调用）时带着越界值跑。
 * @param raw - 上游传入的 config（可能为空或残缺）。
 * @returns 补齐后的配置。
 */
export function normalizeConfig(raw) {
	const value = raw !== null && typeof raw === "object" ? raw : {};
	const probe = value.probe !== null && typeof value.probe === "object" ? value.probe : {};
	const context = value.context !== null && typeof value.context === "object" ? value.context : {};
	const habits = value.habits !== null && typeof value.habits === "object" ? value.habits : {};
	const number = (source, key, fallback, min, max) => {
		const candidate = source[key];
		if (typeof candidate !== "number" || !Number.isFinite(candidate)) return fallback;
		return Math.min(max, Math.max(min, candidate));
	};
	return {
		probe: {
			enabled: typeof probe.enabled === "boolean" ? probe.enabled : true,
			detailDensity: number(probe, "detailDensity", DEFAULT_THRESHOLDS.detailDensity, 0, 1),
			fillerDensity: number(probe, "fillerDensity", DEFAULT_THRESHOLDS.fillerDensity, 0, 1),
			repetitionRepeats: Math.round(
				number(probe, "repetitionRepeats", DEFAULT_THRESHOLDS.repetitionRepeats, 2, 20)
			)
		},
		context: {
			enabled: typeof context.enabled === "boolean" ? context.enabled : true,
			maxTurns: Math.round(number(context, "maxTurns", 3, 1, 10)),
			maxChars: Math.round(number(context, "maxChars", 2_000, 200, 20_000))
		},
		habits: {
			sections: normalizeSections(habits.sections),
			extra: typeof habits.extra === "string" ? habits.extra : ""
		},
		maxTokens: Math.round(number(value, "maxTokens", 4096, 256, 32768)),
		timeoutMs: Math.round(number(value, "timeoutMs", 90_000, 5_000, 600_000))
	};
}
