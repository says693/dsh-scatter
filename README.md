# dsh-prompt-scatter

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A prompt optimizer for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) composer.

> Renamed from `dsh-prompt-optimizer` in 0.2.0. Package name, plugin id, routes
> (`/api/dsh-prompt-scatter`), style prefix (`dsh-ps-*`) and storage keys all
> moved together, so the two cannot be installed side by side.

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
dsh plugin --profile <name> add file:/absolute/path/to/dsh-prompt-scatter
```

Or install from the plugin UI: **Settings → Plugins → Add plugin**, and enter an
absolute path (or a git/registry spec once published).

By hand: add `"dsh-prompt-scatter"` to the profile's `dependencies`, append it
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
| `POST /api/dsh-prompt-scatter` | SSE stream of `{type:"delta"\|"candidate"\|"done"\|"error"}` frames |
| `POST /api/dsh-prompt-scatter/stop` | Aborts the active optimization for a session |

It calls `ctx.llm.stream({ provider, model, messages, system, maxTokens })`
through the kernel's provider-neutral LLM seam, so it works with every adapter
the deployment has configured.

**Client** (`lib/client.js`) registers into the `conversation.input.right` slot
with `order: 5`, reads the draft through the session standard kit's `useInput`
hook, and writes back only through `inputActions.setDraft` — the single public
write path. It never touches the editor DOM.

Guardrails: loopback-only (non-loopback callers get 403), POST-only (405),
4 MB request bodies, 200 000 character prompts, and a configurable timeout.

## Output-quality probe

Before optimizing, the host inspects the draft for three failure modes that
language models reproduce when asked to "improve" a prompt:

| Issue | What it looks for |
| --- | --- |
| `repetition` | the same substring repeated over and over, or the same line repeated (leading numbering stripped, so `1. x` / `2. x` / `3. x` still trips) |
| `useless-detail` | density of incidental detail: timestamps, IPs, absolute paths, long digit runs, version numbers, URLs, quoted blobs |
| `filler` | density of padding phrases ("please note", "it is important to", "in conclusion", and their Chinese equivalents) |

Each detected issue appends one corrective rule to the system prompt, so the
instruction set is chosen from the input instead of being fixed. The preview
card reports which issues were defended against.

Detection is pure text analysis — it never spends a second model call.

## Configuration

The bundle patch carries a `config` block, validated against the plugin's
exported `Config` (schemastery) at activation:

```yaml
- insert:
    - id: dsh-prompt-scatter
      name: dsh-prompt-scatter
      config:
        probe:
          enabled: true          # false = fixed instruction set, no probing
          detailDensity: 0.55    # 0..1, lower = stricter
          fillerDensity: 0.5     # 0..1, lower = stricter
          repetitionRepeats: 4   # 2..20, lower = stricter
        maxTokens: 4096          # 256..32768
        timeoutMs: 90000         # 5000..600000
```

Every key is optional. Out-of-range values are clamped, and unknown shapes fall
back to the defaults above rather than failing the plugin.

How to read the densities: each is "hits per 1000 characters" normalized to
0..1, saturating at 8 hits/1000 chars for detail and 12 for filler. A short
prompt with one stray "please note" lands near 0.05, not near the threshold.

### Overriding without touching the package

Don't edit the patch inside `node_modules` — a reinstall overwrites it. Put an
override in the profile's own patch layer (`<profile>/cordis.patch.yml`), which
is applied after every bundle layer and wins by `id`:

```yaml
- id: dsh-prompt-scatter
  name: dsh-prompt-scatter
  config:
    probe:
      enabled: true
      detailDensity: 0.55
      fillerDensity: 0.5
      repetitionRepeats: 6   # only this changed
    maxTokens: 4096
    timeoutMs: 90000
```

Two behaviours worth knowing:

- **A config block replaces, it does not merge.** Writing only
  `config: { probe: { repetitionRepeats: 6 } }` drops `detailDensity` and
  `fillerDensity` entirely. The plugin's `normalizeConfig` then fills them from
  the defaults above, so nothing breaks — but you are silently back at the
  default values rather than inheriting whatever the bundle declared. Restate
  every key you care about, as in the example.
- **Restart is required.** The generated `cordis.yml` is rebuilt at startup, so
  an edited patch layer changes nothing until the app is restarted.

## Compatibility

Built and verified against DSH `0.2.0-rc.2` on Windows.

This plugin implements a feature that previously existed only as a
string-patch on a third-party WebUI bundle. It is written against the official
DSH plugin contract instead, so it installs, upgrades and uninstalls like any
other bundle. The interesting API differences it had to bridge:

| Third-party bundle | Here | Why |
| --- | --- | --- |
| `PromptOptimizeButton({ input, … })` reading `input.draft` | `useInput((state) => state.draft)` | the session standard kit exposes `useInput` + `inputActions`, not an `input` object |
| `source: { kind: "plugin", … }` | `source: { kind: "user" }` | `MessageSourceMap` has no catch-all `plugin` kind |
| `IconSparkle16` / `IconLoadingOutline16` | `IconSparkleRegular` / `IconLoadingOutlineRegular` | the primitives package exports the `Regular`/`Medium` variants |
| `webui-po-*` classes, `/api/dsh-webui-prompt-optimizer` | `dsh-ps-*`, `/api/dsh-prompt-scatter` | drops the third-party namespace |

The prompt-engineering system prompts, the SSE protocol, the abort path, the
`<<< >>>` injection guard and the "restore the draft if untouched" rule are
carried over unchanged.

## Layout

```
lib/index.js           host half — routes, SSE, llm.stream, guardrails
lib/probe.js           output-quality detector (repetition / detail / filler)
lib/config.js          Config schema + normalization
lib/client.js          browser half — composer button, panel, candidates
cordis.patch.yml       bundle patch (one insert row)
icon.svg               plugin icon shown by the plugin list
package.json           dsh.bundle / dsh.client declarations
```

## Author

says693 — <https://github.com/says693>

## License

MIT.
