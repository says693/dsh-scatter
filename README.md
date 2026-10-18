# dsh-prompt-optimizer

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A prompt optimizer for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) composer.

A small sparkle button appears in the composer. Click it and the session's
**current model** rewrites your draft into a better prompt — streaming the
result straight back into the input box as it is generated. Or switch on
multi-round mode and get several candidates (balanced / concise / detailed) to
pick from.

## Features

- **Streams into the input** — the rewrite replaces the draft token by token,
  so you watch it form and keep typing when it lands.
- **Uses your current model** — no separate API key, no second provider config.
  Whatever provider/model the session has selected is what optimizes.
- **Multi-round candidates** — generate 2–5 distinct variants, pick one, then
  optimize again on top of it. The original wording stays pinned at the top.
- **Optional wrapping** — turn the result into a `/goal` command, or append an
  AI-browser verification request.
- **Stops cleanly** — a real abort path; stopping restores your original draft
  if the optimizer had already started overwriting it.
- **Local only** — the HTTP routes reject anything that is not a loopback
  request, are POST-only, and are capped on body and prompt size.

## Install

Requires DSH kernel `>= 0.2.0-rc.2`.

```sh
dsh plugin --profile <name> add file:/absolute/path/to/dsh-prompt-optimizer
```

Or install from the plugin UI: **Settings → Plugins → Add plugin**, and enter an
absolute path (or a git/registry spec once published).

By hand: add `"dsh-prompt-optimizer"` to the profile's `dependencies`, append it
to `dsh.profile.bundles`, then run `pnpm install` inside the profile directory.

The package is a DSH bundle — it declares `dsh.bundle.patch` for the host half
and a `dsh.client` browser half, so it loads and unloads like any marketplace
plugin.

## Usage

| Action | Result |
| --- | --- |
| Click the sparkle button | Optimizes the current draft in place |
| Hover the button | Shows the panel: model in use, the three toggles, live progress |
| **Multi-round** on | Produces candidates instead of streaming; click one to adopt it |
| **Set target** on | Asks the model for a measurable goal, then wraps the result as `/goal …` |
| **Browser verify** on | Appends a request to verify the prompt with the AI browser |
| Stop button | Aborts the in-flight optimization and restores the untouched draft |

## How it works

Two halves, both plain modules:

**Host** (`lib/index.js`) registers two exact routes on the local web server:

| Route | Purpose |
| --- | --- |
| `POST /api/dsh-prompt-optimizer` | SSE stream of `{type:"delta"\|"candidate"\|"done"\|"error"}` frames |
| `POST /api/dsh-prompt-optimizer/stop` | Aborts the active optimization for a session |

It calls `ctx.llm.stream({ provider, model, messages, system, maxTokens })`
through the kernel's provider-neutral LLM seam, so it works with every adapter
the deployment has configured.

**Client** (`lib/client.js`) registers into the `conversation.input.right` slot
with `order: 5`, reads the draft through the session standard kit's `useInput`
hook, and writes back only through `inputActions.setDraft` — the single public
write path. It never touches the editor DOM.

Guardrails: loopback-only (non-loopback callers get 403), POST-only (405),
4 MB request bodies, 200 000 character prompts, and a 90-second timeout.

## Compatibility

Built and verified against DSH `0.2.0-rc.2` on Windows.

Porting note: this package began as a port of the prompt-optimizer module that
ships inside `@dsh-external/dsh-webui` (as used by EAC-Desktop), rebuilt as a
standalone plugin against the official contract rather than string-patching a
third-party bundle. The substantive API changes were:

| Third-party bundle | Here | Why |
| --- | --- | --- |
| `PromptOptimizeButton({ input, … })` reading `input.draft` | `useInput((state) => state.draft)` | the session standard kit exposes `useInput` + `inputActions`, not an `input` object |
| `source: { kind: "plugin", … }` | `source: { kind: "user" }` | `MessageSourceMap` has no catch-all `plugin` kind |
| `IconSparkle16` / `IconLoadingOutline16` | `IconSparkleRegular` / `IconLoadingOutlineRegular` | the primitives package exports the `Regular`/`Medium` variants |
| `webui-po-*` classes, `/api/dsh-webui-prompt-optimizer` | `dsh-po-*`, `/api/dsh-prompt-optimizer` | drops the third-party namespace |

The prompt-engineering system prompts, the SSE protocol, the abort path, the
`<<< >>>` injection guard and the "restore the draft if untouched" rule are
unchanged.

## Layout

```
lib/index.js           host half — routes, SSE, llm.stream, guardrails
lib/client.js          browser half — composer button, panel, candidates
cordis.patch.yml       bundle patch (one insert row)
icon.svg               plugin icon shown by the plugin list
package.json           dsh.bundle / dsh.client declarations
```

## License

MIT.
