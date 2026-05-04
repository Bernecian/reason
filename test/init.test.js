const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INIT = path.resolve(__dirname, '..', 'scripts', 'init.js');

function runInit(cwd, args = []) {
  return spawnSync('node', [INIT, ...args], { cwd, encoding: 'utf8' });
}

test('init default mode creates .r/ and .r/cache without writing rules.yaml', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-init-'));
  const r = runInit(tmp);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(tmp, '.r')));
  assert.ok(fs.existsSync(path.join(tmp, '.r', 'cache')));
  assert.ok(!fs.existsSync(path.join(tmp, '.r', 'rules.yaml')), 'default mode must not write rules.yaml');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('init default mode prints a suggested starter pack', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-init-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ dependencies: { next: '14.0.0' } }));
  const r = runInit(tmp);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /"pack":\s*"nextjs"/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('init --heuristic writes a rules.yaml', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-init-h-'));
  fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '# project rules\n');
  const r = runInit(tmp, ['--heuristic']);
  assert.equal(r.status, 0, r.stderr);
  const rules = fs.readFileSync(path.join(tmp, '.r', 'rules.yaml'), 'utf8');
  assert.match(rules, /rules:/);
  assert.match(rules, /project-conventions/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('init leaves existing rules.yaml alone', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-init-k-'));
  fs.mkdirSync(path.join(tmp, '.r'));
  fs.writeFileSync(path.join(tmp, '.r', 'rules.yaml'), 'rules: []\n# custom\n');
  const r = runInit(tmp);
  assert.equal(r.status, 0);
  const kept = fs.readFileSync(path.join(tmp, '.r', 'rules.yaml'), 'utf8');
  assert.match(kept, /# custom/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
