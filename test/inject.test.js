const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { build } = require('../lib/inject');

function scaffold(rulesYaml, files = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-i-'));
  fs.mkdirSync(path.join(tmp, '.r'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.r', 'rules.yaml'), rulesYaml);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return tmp;
}

test('build returns null when no rules match', async () => {
  const tmp = scaffold('rules:\n  - name: a\n    match: { keywords: [xyz] }\n');
  assert.equal(await build(tmp, 'hello'), null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('build inlines matched docs', async () => {
  const tmp = scaffold(
    'rules:\n  - name: a\n    match: { keywords: [foo] }\n    load: [readme.md]\n',
    { 'readme.md': 'hello world\n' },
  );
  const ctx = await build(tmp, 'fix foo');
  assert.match(ctx, /readme\.md/);
  assert.match(ctx, /hello world/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('untrusted run commands are skipped with a note', async () => {
  const yaml = 'rules:\n  - name: a\n    match: { keywords: [go] }\n    run:\n      - cmd: "echo nope"\n';
  const tmp = scaffold(yaml);
  const ctx = await build(tmp, 'go');
  assert.match(ctx, /skipped/);
  assert.doesNotMatch(ctx, /nope/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('trusted run commands execute and appear in the output', async () => {
  const yaml = 'rules:\n  - name: a\n    match: { keywords: [go] }\n    run:\n      - cmd: "echo yup"\n    trust: true\n';
  const tmp = scaffold(yaml);
  const ctx = await build(tmp, 'go');
  assert.match(ctx, /yup/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('docs above docBudget get a truncated marker', async () => {
  const big = 'A'.repeat(6000);
  const tmp = scaffold(
    'rules:\n  - name: a\n    match: { keywords: [foo] }\n    load: [big.md]\n',
    { 'big.md': big },
  );
  const ctx = await build(tmp, 'foo', { docBudget: 2048 });
  assert.match(ctx, /truncated/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
