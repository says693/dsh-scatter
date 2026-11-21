import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import { appendRound, deserializeState, editVersion, emptyState, rollbackTo, serializeState, versionTree } from "../lib/versions.js";

// Load the actual host modules without installing DSH or calling a model.
// Only the external message constructor and declarative schema builder are doubles.
const schema = new Proxy(() => {}, { get: () => schema, apply: () => schema });
const externals = new Map([
	["@deepseek-ai/dsh-llm", new SyntheticModule(["createUserMessage"], function () {
		this.setExport("createUserMessage", (message) => message);
	})],
	["@deepseek-ai/schemastery", new SyntheticModule(["default"], function () {
		this.setExport("default", schema);
	})]
]);
const modules = new Map();
async function loadModule(url) {
	if (!modules.has(url.href)) {
		modules.set(url.href, readFile(url, "utf8").then((source) => new SourceTextModule(source, { identifier: url.href })));
	}
	return modules.get(url.href);
}
const host = await loadModule(new URL("../lib/index.js", import.meta.url));
await host.link((specifier, parent) => {
	if (specifier.startsWith(".")) return loadModule(new URL(specifier, parent.identifier));
	const external = externals.get(specifier);
	if (external === undefined) throw new Error(`Unexpected host dependency: ${specifier}`);
	return external;
});
await host.evaluate();
const { apply } = host.namespace;
const OPTIMIZE = "/api/dsh-prompt-scatter";
const STOP = `${OPTIMIZE}/stop`;

function post(routes, path, body) {
	const req = Object.assign(new EventEmitter(), {
		method: "POST",
		headers: { host: "127.0.0.1" },
		socket: { remoteAddress: "127.0.0.1" }
	});
	const ended = Promise.withResolvers();
	const res = Object.assign(new EventEmitter(), {
		writableEnded: false,
		destroyed: false,
		status: null,
		text: "",
		writeHead(status) { this.status = status; },
		flushHeaders() {},
		write(chunk) { this.text += chunk; },
		end(chunk = "") {
			this.text += chunk;
			this.writableEnded = true;
			ended.resolve();
		}
	});
	const handled = Promise.resolve(routes.get(path).handler(req, res));
	// Keep a failed handler observable without an unrelated unhandled rejection.
	handled.catch(() => {});
	queueMicrotask(() => {
		req.emit("data", Buffer.from(JSON.stringify(body)));
		req.emit("end");
	});
	return { req, res, handled, ended: ended.promise };
}

function createHost(t) {
	const routes = new Map();
	const requests = [];
	const pending = new Set();
	let nextCall = Promise.withResolvers();
	let dispose;
	const llm = {
		async *stream({ signal }) {
			const finished = Promise.withResolvers();
			const call = { signal, finish: () => finished.resolve(true) };
			const onAbort = () => finished.resolve(false);
			pending.add(call);
			signal.addEventListener("abort", onAbort, { once: true });
			if (signal.aborted) onAbort();
			const started = nextCall;
			nextCall = Promise.withResolvers();
			started.resolve(call);
			try {
				yield { type: "text-delta", text: "optimized prompt" };
				if (!(await finished.promise)) throw new Error("aborted");
				yield { type: "finish", reason: { kind: "stop" } };
			} finally {
				signal.removeEventListener("abort", onAbort);
				pending.delete(call);
			}
		}
	};
	apply({
		effect(callback) { dispose = callback(); },
		webServer: {
			register(route) {
				routes.set(route.path, route);
				return () => routes.delete(route.path);
			}
		},
		get(service) { return service === "llm" ? llm : undefined; }
	}, { probe: { enabled: false }, context: { enabled: false } });
	const request = (path, body) => {
		const result = post(routes, path, body);
		requests.push(result);
		return result;
	};
	t.after(async () => {
		dispose();
		for (const call of pending) call.finish();
		await Promise.allSettled(requests.map(({ handled }) => handled));
	});
	return {
		routes,
		dispose: () => dispose(),
		request,
		async start(sessionId) {
			const started = nextCall.promise;
			const result = request(OPTIMIZE, { provider: "test", model: "test", text: "draft", sessionId });
			return { ...result, call: await started };
		},
		async stop(sessionId) {
			const result = request(STOP, { sessionId });
			await result.handled;
			await result.ended;
			return JSON.parse(result.res.text);
		}
	};
}

test("POST completion does not abort a live SSE response", { timeout: 2_000 }, async (t) => {
	const request = await createHost(t).start("session");
	request.req.emit("close");
	assert.equal(request.call.signal.aborted, false);
	request.call.finish();
	await request.handled;
	assert.match(request.res.text, /"type":"done"/);
	request.res.emit("close");
	assert.equal(request.call.signal.aborted, false, "normal completion removes its close listener");
});

test("disconnecting the SSE response cancels the model", { timeout: 2_000 }, async (t) => {
	const request = await createHost(t).start("session");
	request.res.destroyed = true;
	request.res.emit("close");
	assert.equal(request.call.signal.aborted, true);
	await request.handled;
});

test("stop cancels every request for its session, not a different session", { timeout: 2_000 }, async (t) => {
	const scope = createHost(t);
	const first = await scope.start("A");
	const second = await scope.start("A");
	const other = await scope.start("B");
	assert.deepEqual(await scope.stop("A"), { ok: true, stopped: true });
	assert.equal(first.call.signal.aborted, true);
	assert.equal(second.call.signal.aborted, true);
	assert.equal(other.call.signal.aborted, false);
	await Promise.all([first.handled, second.handled]);
	other.call.finish();
	await other.handled;
	assert.deepEqual(await scope.stop("A"), { ok: true, stopped: false });
});

test("completing one request preserves the remaining session registration", { timeout: 2_000 }, async (t) => {
	const scope = createHost(t);
	const first = await scope.start("A");
	const second = await scope.start("A");
	second.call.finish();
	await second.handled;
	assert.deepEqual(await scope.stop("A"), { ok: true, stopped: true });
	assert.equal(first.call.signal.aborted, true);
	await first.handled;
});

test("route scopes cannot stop another scope's matching session id", { timeout: 2_000 }, async (t) => {
	const left = createHost(t);
	const right = createHost(t);
	const first = await left.start("same-id");
	const second = await right.start("same-id");
	await left.stop("same-id");
	assert.equal(first.call.signal.aborted, true);
	assert.equal(second.call.signal.aborted, false);
	await first.handled;
	second.call.finish();
	await second.handled;
});

test("disposing routes cancels named and anonymous requests", { timeout: 2_000 }, async (t) => {
	const scope = createHost(t);
	const first = await scope.start("session");
	const second = await scope.start("");
	scope.dispose();
	assert.equal(scope.routes.size, 0);
	assert.equal(first.call.signal.aborted, true);
	assert.equal(second.call.signal.aborted, true);
	await Promise.all([first.handled, second.handled]);
});

test("both POST routes reject non-object JSON with a completed 400 response", { timeout: 2_000 }, async (t) => {
	const scope = createHost(t);
	for (const path of [OPTIMIZE, STOP]) {
		for (const body of [null, [], true, 1, "text"]) {
			const request = scope.request(path, body);
			await request.handled;
			await request.ended;
			assert.equal(request.res.status, 400);
			assert.equal(JSON.parse(request.res.text).ok, false);
		}
	}
});

test("rollback creates a branch without losing an older version or its edits", () => {
	let state = appendRound(emptyState(), "first", null);
	state = appendRound(state, "second", "direction one");
	state = editVersion(state, "v2", "edited second");
	const previousVersions = state.versions;
	state = rollbackTo(state, "v1");
	assert.equal(state.versions, previousVersions);
	state = appendRound(state, "branch", "direction two");
	state = deserializeState(serializeState(state));
	assert.deepEqual(state.versions.map(({ id, baseId }) => [id, baseId]), [["v1", null], ["v2", "v1"], ["v3", "v1"]]);
	assert.equal(state.versions[1].raw, "second");
	assert.equal(state.versions[1].edited, "edited second");
	assert.equal(state.versions[2].rolledBackFrom, "v1");
	assert.equal(versionTree(state).length, 3);
});
