---
description: One-shot install — scan the project and write tailored Reason rules
---

Install Reason (R) in this project with rules tailored to what's actually here.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init.js"`. This creates `.r/`, wires the `UserPromptSubmit` + `SessionStart` hooks (skipped if the plugin is globally installed), and prints a JSON block with a suggested starter pack + detected signals.

2. If `.r/rules.yaml` already exists, stop — do not overwrite it. Tell the user it's already configured and suggest `/r:status`.

3. Otherwise, generate tailored rules:
   - Read the suggested pack at `${CLAUDE_PLUGIN_ROOT}/starter-packs/<pack>.yaml` as a reference skeleton.
   - Briefly scan the repo (top-level layout, key directories like `apps/`, `packages/`, `docs/`, `src/`). You already have a lot of context — don't over-grep. 30 seconds of scanning, not 5 minutes.
   - Write `.r/rules.yaml` with 3–6 rules tailored to this codebase. Each rule must:
     - Have a clear `name` and one-line `reason`.
     - Use real `keywords` that match how this project's contributors would phrase prompts.
     - Use real `paths` globs that match this project's actual file layout.
     - Use real `load:` paths that exist (verify each file you reference).
   - Keep **all** `run:` examples **commented out** with `trust: true` omitted. The user opts in per command.

4. Tell the user:
   - What rules you wrote (one line each).
   - That they should restart Claude Code in this directory for hooks to take effect.
   - That they can run `/r:status` to verify, `/r:dryrun "some prompt"` to preview, `/r:lint` before enabling any `run:` command.

5. If the user would rather have a generic heuristic scaffold without the scan, they can run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init.js" --heuristic` — but don't do this unless they ask.
