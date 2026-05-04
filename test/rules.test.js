const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadRules } = require('../lib/rules');

test('loadRules returns empty when .r/rules.yaml is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-r1-'));
  assert.deepEqual(loadRules(tmp).rules, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('loadRules parses a rules list', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-r2-'));
  fs.mkdirSync(path.join(tmp, '.r'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.r', 'rules.yaml'), 'rules:\n  - name: a\n  - name: b\n');
  const { rules } = loadRules(tmp);
  assert.equal(rules.length, 2);
  assert.equal(rules[0].name, 'a');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('loadRules surfaces a parse error on malformed yaml', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-r3-'));
  fs.mkdirSync(path.join(tmp, '.r'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.r', 'rules.yaml'), 'rules: [unterminated');
  const { error } = loadRules(tmp);
  assert.ok(error, 'expected error to be set');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('loadRules reads top-level config', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-r4-'));
  fs.mkdirSync(path.join(tmp, '.r'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.r', 'rules.yaml'), 'config:\n  cache_ttl_ms: 5000\nrules: []\n');
  const { config } = loadRules(tmp);
  assert.equal(config.cache_ttl_ms, 5000);
  fs.rmSync(tmp, { recursive: true, force: true });
});
