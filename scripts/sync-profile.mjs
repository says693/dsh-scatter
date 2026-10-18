/**
 * 把插件源码同步进一个 DSH profile 里的两处落地位置。
 *
 * 为什么需要这个脚本：profile 依赖常写成 `file:./local-plugins/<name>`，
 * pnpm 用**硬链接**落地到 node_modules。硬链接共享 inode，所以「改动已有文件
 * 的内容」两份自动同步；但「新增文件」不会——node_modules 里那份仍是旧的
 * 文件清单。少一个模块时，宿主 import 直接失败，插件被静默跳过，表现为
 * 「重启后插件没运行」，而 cordis.yml 看起来还是对的。
 *
 * 用法：
 *   node scripts/sync-profile.mjs <profile 目录> [--check]
 *   node scripts/sync-profile.mjs C:\Users\me\.dsh\profiles\desktop
 *   node scripts/sync-profile.mjs C:\Users\me\.dsh\profiles\desktop --check
 */
import { readdirSync, existsSync, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..");
const name = basename(source);

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const checkOnly = process.argv.includes("--check");
const profile = positional[0];

if (profile === undefined) {
	console.error("用法: node scripts/sync-profile.mjs <profile 目录> [--check]");
	process.exit(2);
}

const targets = [join(profile, "local-plugins", name), join(profile, "node_modules", name)];

/** 不参与同步的目录与文件。 */
const SKIP_DIRS = new Set(["node_modules", ".git", "scripts"]);
const SKIP_FILES = new Set([".gitignore", ".gitattributes"]);

function walk(dir, base = dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			walk(full, base, out);
		} else if (entry.isFile()) {
			if (SKIP_FILES.has(entry.name)) continue;
			out.push(relative(base, full));
		}
	}
	return out;
}

const files = walk(source);
const digestOf = (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null);
let problems = 0;

console.log(`源:   ${source}`);
console.log(`文件: ${files.length} 个\n`);

for (const target of targets) {
	if (!existsSync(target)) {
		console.log(`跳过（不存在）: ${target}`);
		problems += 1;
		continue;
	}
	let copied = 0;
	let same = 0;
	for (const rel of files) {
		const from = join(source, rel);
		const to = join(target, rel);
		if (digestOf(from) === digestOf(to)) {
			same += 1;
			continue;
		}
		if (checkOnly) {
			console.log(`  不一致: ${rel}`);
			problems += 1;
			continue;
		}
		mkdirSync(dirname(to), { recursive: true });
		copyFileSync(from, to);
		copied += 1;
	}
	// 反向检查：目标里多出来的模块（源码已删）同样要报出来。
	const extra = walk(target).filter((rel) => !files.includes(rel));
	for (const rel of extra) {
		console.log(`  多余文件: ${rel}  (${target})`);
		problems += 1;
	}
	console.log(`${target}`);
	console.log(`  一致 ${same}，${checkOnly ? "不一致" : "已复制"} ${checkOnly ? "见上" : copied}，多余 ${extra.length}\n`);
}

if (problems === 0) console.log(checkOnly ? "两处都与源码一致" : "同步完成");
else {
	console.log(`${problems} 处需要处理`);
	process.exitCode = 1;
}
