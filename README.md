# dsh-prompt-scatter

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**English** · [简体中文](README.zh-CN.md)

A prompt optimizer for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) composer.

> Renamed from `dsh-prompt-optimizer` in 0.2.0. Package name, plugin id, routes
> (`/api/dsh-prompt-scatter`), style prefix (`dsh-ps-*`) and storage keys all
> moved together, so the two cannot be installed side by side.

A small sparkle button appears in the composer. Click it and the session's
**current model** rewrites your draft into a better prompt. The result lands in
a preview card first — nothing touches your input until you accept it. Turn on
multi-round mode and each round also proposes three directions for what to
improve next, plus a box to write your own.

## Features

- **Preview before replace** — the rewrite streams into a card; the composer is
  only written when you press Replace, and never before.
- **Uses your current model** — no separate API key, no second provider config.
  Whatever provider/model the session has selected is what optimizes.
- **Multi-round with a version chain** — each round builds on the previous one.
  Every version is kept; you can roll back to any of them and continue from
  there, which forks the chain without deleting anything.
- **Three directions per round, from different dimensions** — constraints,
  output format, role, success criteria, input handling, edge cases. Directions
  already used in earlier rounds are excluded, so consecutive rounds do not
  repeat the same advice. Write your own if none fit.
- **Editable result** — the result area is a real textarea. What gets written
  back is what you edited, not what the model produced.
- **Session-aware** — the optimization reads the session's recent conversation
  as background, so the rewrite fits what you are working on instead of judging
  the draft in isolation. Default: last 3 turns, ~2000 characters, configurable.
- **Optional interaction habits** — a switch folds five working habits
  (narrate while working, speak up when you need a human, how to ask, budget
  your verification, plain speech) into the rewritten prompt. Off by default,
  and when on it applies to that one optimization only.
- **Output-quality probe** — before optimizing, the draft is checked for
  repetition loops, useless-detail padding and filler phrasing; each detected
  issue appends one corrective rule to the system prompt.
- **Stops cleanly** — a real abort path; stopping restores your original draft.
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

## Usage

| Action | Result |
| --- | --- |
| Click the sparkle button | Optimizes the current draft and shows the result in a preview card |
| **Replace input** | Writes the preview (or your edits) into the composer |
| **Multi-round** on | Opens the multi-round panel; each round keeps a version |
| Pick a direction | Starts the next round on top of the current version |
| **Write your own direction** | Same, with a direction you type |
| **History** | Lists every version; roll back to any of them |
| **Replace input** in multi-round | Collapses the editor, keeps the direction list |
| **Expand** | Brings the editor back after accepting |
| **End multi-round** | Clears the chain and the session cache |

Multi-round state is kept in `sessionStorage` per session, so a page reload
keeps the chain. It is cleared once the prompt is actually sent — detected as
"the chat gained a message and the draft is empty" — because the chain belongs
to the prompt that was just consumed.

## How it works

Two halves, both plain modules:

**Host** (`lib/index.js`) registers two exact routes on the local web server:

| Route | Purpose |
| --- | --- |
| `POST /api/dsh-prompt-scatter` | SSE stream; `mode` selects `optimize`, `continue` or `directions` |
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

### Where the session context comes from

The `conversation.input.right` slot receives a `SessionSnapshot` that carries
only lifecycle state (`running`, `openState`, `blank`, …) — no message bodies.
The browser half therefore cannot assemble the conversation, so the context is
read on the host through `sessions.deriveMessages()`, keeping the last N turns,
dropping system messages and tool calls, and truncating by character budget from
the most recent turn backwards.

## Interaction habits (prompt-level, not system-level)

`dsh-chatterbox` injects a similar protocol into the **system prompt** of every
turn through `systemPrompt.section` — it is always on, and you cannot choose per
message. This plugin takes the other position: the same idea becomes an **opt-in
prompt fragment** behind a switch in the panel, applied only to the one
optimization you are running.

The two are deliberately not interchangeable:

| | `dsh-chatterbox` | this switch |
| --- | --- | --- |
| Where it lands | system prompt section, every turn | the rewritten prompt text, once |
| Who chooses | whoever edits the profile | whoever flips the switch |
| Scope | all conversation | one optimization |
| Text shape | five standing rules | five rules, each with *when it applies / what to do / how far to go* |

Because it is prompt-level, it composes with whatever the draft is asking for
instead of competing with it — and it survives being copied out of DSH.

Rule ids: `narrate`, `ask`, `question`, `verify`, `speech`. Configure which ones
the switch inserts with `habits.sections` (empty = all), and append free text
with `habits.extra`.

## Output-quality probe

Detection is pure text analysis — it never spends a second model call.

| Issue | What it looks for |
| --- | --- |
| `repetition` | the same substring repeated, or the same line repeated (leading numbering stripped, so `1. x` / `2. x` / `3. x` still trips) |
| `useless-detail` | density of incidental detail: timestamps, IPs, absolute paths, long digit runs, version numbers, URLs, quoted blobs |
| `filler` | density of padding phrases ("please note", "it is important to", "in conclusion", and their Chinese equivalents) |

Reported issue ids are surfaced in the preview card so you can see which rules
were added.

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
        context:
          enabled: true          # false = draft only, no session background
          maxTurns: 3            # 1..10 recent turns
          maxChars: 2000         # 200..20000 background budget
        habits:
          sections: []           # empty = all five rule ids
          extra: ""              # appended verbatim
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
    context:
      enabled: true
      maxTurns: 3
      maxChars: 2000
    habits:
      sections: []
      extra: ""
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

The prompt-engineering system prompts, the SSE protocol, the abort path and the
`<<< >>>` injection guard are carried over unchanged.

## Layout

```
lib/index.js           host half — routes, SSE, llm.stream, guardrails
lib/directions.js      direction dimensions: classify, audit, diversify
lib/probe.js           output-quality detector (repetition / detail / filler)
lib/habits.js          interaction-habits prompt fragment (opt-in)
lib/config.js          Config schema + normalization
lib/versions.js        version-chain model (append-only, rollback by cursor)
lib/client.js          browser half — composer button, panels, version chain
cordis.patch.yml       bundle patch (one insert row)
icon.png               plugin icon shown by the plugin list
package.json           dsh.bundle / dsh.client declarations
```

## Development

```sh
node scripts/sync-profile.mjs <profile-dir>          # copy into a profile
node scripts/sync-profile.mjs <profile-dir> --check  # verify both copies match
```

The client half inlines a copy of the version model because
`window.__ModuleLoader__` only resolves modules registered in the boot graph —
it cannot `import "./versions.js"`. Keep the two in sync; the model is small and
`lib/versions.js` stays the reference for the host and tests.

## Author

says693 — <https://github.com/says693>

## License

MIT.
