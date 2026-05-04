#!/usr/bin/env node
const { build } = require('../lib/inject');

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  console.log('Usage: /r:dryrun "your prompt"');
  process.exit(0);
}

(async () => {
  const t0 = Date.now();
  const ctx = await build(process.cwd(), prompt);
  const ms = Date.now() - t0;
  console.log(ctx || '(no rules matched)');
  console.log(`\n(built in ${ms}ms)`);
})();
