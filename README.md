# R (Reason)

Pre-flight grounding for Claude Code. Declarative rules match the prompt at `UserPromptSubmit`, inline matched docs, and run trusted shell commands — all before the model reasons. Claude starts thinking already in context.

- Zero-dep runtime (one dep: `yaml`). Pure Node. Works on Node 18+.
- Deterministic. No LLM in the matching loop, no embeddings, no network.
- Safe by default. Commands don't execute unless the rule has `trust: true`.
- Silent on failure. A broken hook never blocks a session.

## 60-second demo

`.r/rules.yaml`:

```yaml
rules:
  - name: auth-touchpoints
    match:
      keywords: [auth, login, session, token]
    load:
      - docs/auth.md
    run:
      - cmd: "grep -rn 'SECRET\\|API_KEY' src/ || true"
        timeout: 2000
        max_bytes: 2048
    trust: true
    reason: Ground auth work in the current secret-handling surface.
```

Now when you ask *"fix the login redirect bug"*, R fires before Claude reasons. The injected context already contains `docs/auth.md` and the live grep output. Claude opens the conversation already knowing where secrets live and what the doc says.

## Why this exists

Claude Code already has `CLAUDE.md` (always-on, bloats every session) and Skills (model decides when to load). Neither covers:

- **Deterministic** injection — you know the doc/command will fire on those keywords.
- **Path-aware** triggers — "when the prompt mentions `apps/mobile/**/*.tsx`, load the mobile design spec."
- **Pre-flight tool runs** — grep, git log, a schema dump — executed automatically so the model starts grounded in current facts, not stale training data or a round-trip tool call.

R fills that gap.

## Install

### As a Claude Code plugin (recommended)

In Claude Code, run:

```
/plugin marketplace add Bernecian/reason
/plugin install r@r
```

Then, in any project where you want Reason active:

```
/r:init
```

That's it. `/r:init` wires hooks, then Claude scans the project — package manifests, directory layout, existing docs — picks the closest starter pack as a skeleton, and writes `.r/rules.yaml` tailored to this codebase. All `run:` examples are written commented out with `trust` omitted; you opt in per command.

Idempotent. If `.r/rules.yaml` already exists, `/r:init` leaves it alone.

Prefer a quick no-LLM scaffold? Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init.js" --heuristic` instead. It writes a generic rules file from detected signals (CLAUDE.md, React, tests, git).

### Manually (no plugin system)

Merge `hooks/hooks.json` into your `.claude/settings.json`, or add these two hooks yourself:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node /abs/path/to/r/scripts/inject.js" }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node /abs/path/to/r/scripts/boot.js" }] }
    ]
  }
}
```

## Rule shape

```yaml
config:
  cache_ttl_ms: 60000      # default TTL for run: outputs (per-command override available)

rules:
  - name: my-rule
    match:
      keywords: [foo, bar]           # case-insensitive substring match
      paths:    ["src/**/*.tsx"]     # matches path-like tokens in the prompt
      exclude:                       # optional — any hit here blocks the rule
        keywords: [skip]
        paths:    ["**/*.spec.ts"]
    load:
      - CLAUDE.md                    # literal file
      - "docs/design*.md"            # glob, expanded at match time
    run:
      - cmd: "git log --oneline -10"
        timeout: 2000                # ms, default 2000
        max_bytes: 4096              # bytes, default 4096
        cache_ttl_ms: 30000          # per-command override (0 = no cache)
    trust: true                      # REQUIRED to execute run: commands
    reason: One-line explanation shown with the injected block.
```

A rule fires when **any** `match.keywords` or `match.paths` hits and **no** `match.exclude.*` blocks it.

## Commands

| Command        | What it does                                                      |
|----------------|-------------------------------------------------------------------|
| `/r:init`      | Scaffold `.r/rules.yaml` + wire hooks. Idempotent.                |
| `/r:status`    | List loaded rules with their match/load/run counts.               |
| `/r:why`       | Rebuild context for the last prompt (or one you pass). Debug aid. |
| `/r:dryrun`    | Preview what R would inject for a prompt — runs real commands.    |
| `/r:lint`      | Validate `rules.yaml` + flag dangerous commands.                  |

## Defaults and budgets

| Setting               | Default | Overridable          |
|-----------------------|---------|----------------------|
| Per-command timeout   | 2000 ms | per-rule `timeout:`  |
| Per-command max bytes | 4096    | per-rule `max_bytes:` |
| Per-doc max bytes     | 4096    | —                     |
| Total injected budget | 16384   | —                     |
| Cache TTL             | 60000 ms | `config.cache_ttl_ms` / per-command `cache_ttl_ms:` |

Rules are matched in file order. When the total budget is exhausted, remaining matched rules are omitted and a `(budget exhausted; N rule(s) omitted)` line is appended.

## Security

- **`trust: true` is required** to execute `run:` commands. Without it, commands are listed as "skipped" in injected context and never run.
- **No template interpolation** from the user prompt into commands (yet). Commands run exactly as written in `rules.yaml`.
- **`/r:lint` flags** known-bad patterns: `rm -rf /`, `curl | sh`, `sudo`.
- **Stdout only**. `stderr` is captured to the internal result but not injected.
- **Working directory** for commands is the project root (`cwd`). Commands do not inherit extra env beyond what the hook process has.

## Starter packs

See [`starter-packs/`](starter-packs/) for drop-in `.r/rules.yaml` templates for:

- Next.js
- React Native (Expo or bare)
- FastAPI
- Node + TypeScript API
- Rust
- pnpm/turbo monorepo

All `run:` examples ship commented out. Review each command, flip `trust: true`, then uncomment.

## How this differs from CLAUDE.md / Skills / MCP

| | CLAUDE.md | Skills | MCP | R |
|---|---|---|---|---|
| When it runs | Session start | Model decides | Model decides | UserPromptSubmit |
| Triggering | Always | Model-interpreted | Model-offered | Deterministic (keyword/path) |
| Can run commands pre-model | ❌ | ❌ | ❌ | ✅ |
| Conditional doc loading | ❌ (all or imports) | ✅ | ❌ | ✅ |
| Config format | Markdown | Markdown + metadata | JSON manifest | YAML |

R is not a replacement for CLAUDE.md or Skills. It handles the thin slice where you want **deterministic, pre-reasoning grounding** that neither can do cleanly.

## FAQ

**Does R phone home?** No. No network. Everything stays local.

**What if a command hangs?** Each run has a timeout (default 2s) and is SIGKILLed on expiry. The result is marked `(timeout)` and injection continues.

**Can I disable the cache?** Set `config.cache_ttl_ms: 0` globally, or `cache_ttl_ms: 0` per command.

**Can I run a rule without any docs or commands?** Yes, but it won't inject anything useful. `/r:lint` will flag rules with no effect.

**Does it work with non-Node projects?** Yes. R is a hook layer — the project under it can be anything.

## Publishing this package as its own public repo (maintainers)

This package lives in a monorepo but is published as a standalone public repo. The helper script has two modes:

- **`publish`** — takes a snapshot of `packages/r` and force-pushes it as a single commit. Downstream users see one clean commit per release, no monorepo churn. This is the default mode.
- **`push`** — classic `git subtree push`, preserving per-commit history.

First time:

```bash
# 1. create an empty public repo (e.g., github.com/<you>/reason)
# 2. from the monorepo root:
git remote add r-public git@github.com:<you>/reason.git
./packages/r/scripts/subtree.sh publish "Initial release"
```

For subsequent releases:

```bash
./packages/r/scripts/subtree.sh publish "v0.3.0 — <what changed>"
./packages/r/scripts/subtree.sh pull                                  # pull downstream changes back
./packages/r/scripts/subtree.sh split                                 # debug: inspect the split history
```

Overrides via env: `R_SUBTREE_REMOTE` (default `r-public`), `R_SUBTREE_BRANCH` (default `main`), `R_SUBTREE_PREFIX` (default `packages/r`).

## License

MIT
