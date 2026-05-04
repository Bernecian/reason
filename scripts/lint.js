#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadRules, rulesPath } = require('../lib/rules');
const { expandGlob, isGlob } = require('../lib/util');

const cwd = process.cwd();
const rp = rulesPath(cwd);

if (!fs.existsSync(rp)) {
  console.log('R is not configured. Run /r:init to scaffold.');
  process.exit(0);
}

const { rules, error } = loadRules(cwd);
if (error) {
  console.log(`✗ YAML parse error in ${path.relative(cwd, rp)}: ${error}`);
  process.exit(1);
}

const issues = [];
const seenNames = new Set();

for (let i = 0; i < rules.length; i++) {
  const r = rules[i];
  const ref = r.name || `rules[${i}]`;
  if (!r.name) issues.push(['warn', ref, 'no name']);
  else if (seenNames.has(r.name)) issues.push(['warn', ref, 'duplicate name']);
  else seenNames.add(r.name);

  const m = r.match || {};
  const keywords = m.keywords || [];
  const paths = m.paths || [];
  if (!keywords.length && !paths.length) {
    issues.push(['warn', ref, 'no match.keywords and no match.paths — rule will never fire']);
  }

  for (const entry of r.load || []) {
    const s = String(entry);
    if (isGlob(s)) {
      const files = expandGlob(cwd, s);
      if (!files.length) issues.push(['info', ref, `load glob matched zero files: ${s}`]);
    } else if (!fs.existsSync(path.resolve(cwd, s))) {
      issues.push(['warn', ref, `load target missing: ${s}`]);
    }
  }

  if (Array.isArray(r.run) && r.run.length) {
    if (!r.trust) {
      issues.push(['warn', ref, `${r.run.length} run command(s) defined but trust is not set — they will not execute`]);
    }
    for (const entry of r.run) {
      const cmd = typeof entry === 'string' ? entry : entry && entry.cmd;
      if (!cmd) { issues.push(['warn', ref, 'run entry missing cmd']); continue; }
      if (/\brm\s+-rf\s+\/($|[^a-zA-Z0-9_])/.test(cmd)) {
        issues.push(['danger', ref, `rm -rf / detected in: ${cmd}`]);
      }
      if (/\bcurl\b[^|]*\|\s*(ba)?sh\b/.test(cmd)) {
        issues.push(['danger', ref, `curl|sh pattern in: ${cmd}`]);
      }
      if (/\bsudo\b/.test(cmd)) {
        issues.push(['warn', ref, `sudo in: ${cmd}`]);
      }
    }
  }
}

console.log(`Rules: ${rules.length}  •  Issues: ${issues.length}`);
for (const [level, ref, msg] of issues) {
  const mark = level === 'danger' ? '✗' : level === 'warn' ? '!' : '·';
  console.log(`  ${mark} [${level}] ${ref}: ${msg}`);
}
process.exit(issues.some(([lvl]) => lvl === 'danger') ? 1 : 0);
