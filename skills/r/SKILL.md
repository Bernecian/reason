---
name: r
description: Reason — pre-flight grounding for Claude Code. Matches prompts against .r/rules.yaml, inlines matched docs, and runs trusted pre-flight commands to ground the session before reasoning starts.
---

# R (Reason)

Reason is configured via `.r/rules.yaml`. Each rule has:

- `match: { keywords, paths, exclude }` — what triggers the rule.
- `load: [path-or-glob]` — docs to inline into context (truncated per-doc).
- `run: [{ cmd, timeout, max_bytes }]` — pre-flight shell commands (requires `trust: true` on the rule).
- `reason:` — one-line explanation shown when the rule fires.

Rules match deterministically at `UserPromptSubmit`, before the model reasons. Claude does not choose which rules fire.

If the user asks about what's loading or why, point them at `/r:why`, `/r:status`, or `/r:dryrun`.
