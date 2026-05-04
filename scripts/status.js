#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadRules } = require('../lib/rules');

const cwd = process.cwd();
const { rules, path: rp, error } = loadRules(cwd);

if (!fs.existsSync(rp)) {
  console.log('R is not configured in this project. Run /r:init to scaffold.');
  process.exit(0);
}
if (error) {
  console.log(`R config error in ${path.relative(cwd, rp)}: ${error}`);
  process.exit(0);
}

console.log(`R config: ${path.relative(cwd, rp)}`);
console.log(`Rules: ${rules.length}`);
for (const r of rules) {
  const name = r.name || '(unnamed)';
  const m = r.match || {};
  const keywords = (m.keywords || []).length;
  const paths = (m.paths || []).length;
  const loads = (r.load || []).length;
  const runs = (r.run || []).length;
  const trust = r.trust ? ' [trust]' : '';
  console.log(`  • ${name}${trust} — keywords:${keywords} paths:${paths} load:${loads} run:${runs}`);
}
