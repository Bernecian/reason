#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { build } = require('../lib/inject');

(async () => {
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    const cwd = input.cwd || process.cwd();
    const prompt = String(input.prompt || '');
    try {
      fs.mkdirSync(path.join(cwd, '.r'), { recursive: true });
      fs.writeFileSync(path.join(cwd, '.r', '.last-prompt'), prompt);
    } catch (_) { /* silent */ }
    const ctx = await build(cwd, prompt);
    if (ctx) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx },
      }));
    }
  } catch (_) { /* silent */ }
})();
