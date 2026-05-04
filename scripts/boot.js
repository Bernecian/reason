#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadRules } = require('../lib/rules');

try {
  const cwd = process.cwd();
  const { path: rp, error } = loadRules(cwd);
  if (!fs.existsSync(rp)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          'R (Reason) plugin is installed here but has no `.r/rules.yaml` yet. ' +
          'Run `/r:init` once and Claude will scan this project and write tailored rules. ' +
          'Until then, R injects nothing.',
      },
    }));
  } else if (error) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `R (Reason) config error in ${path.relative(cwd, rp)}: ${error}`,
      },
    }));
  }
} catch (_) { /* silent */ }
