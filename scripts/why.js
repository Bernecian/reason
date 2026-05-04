#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { build } = require('../lib/inject');

const cwd = process.cwd();
const argPrompt = process.argv.slice(2).join(' ').trim();
let prompt = argPrompt;
if (!prompt) {
  try {
    prompt = fs.readFileSync(path.join(cwd, '.r', '.last-prompt'), 'utf8');
  } catch (_) { /* no last prompt */ }
}
if (!prompt) {
  console.log('No prompt on hand. Pass one: /r:why "your prompt"');
  process.exit(0);
}

(async () => {
  const preview = prompt.replace(/\s+/g, ' ').slice(0, 200);
  console.log(`Prompt: ${preview}${prompt.length > 200 ? '…' : ''}\n`);
  const t0 = Date.now();
  const ctx = await build(cwd, prompt);
  const ms = Date.now() - t0;
  console.log(ctx || '(no rules matched)');
  console.log(`\n(built in ${ms}ms)`);
})();
