const { test } = require('node:test');
const assert = require('node:assert');
const { runCommand } = require('../lib/exec');

test('runCommand captures stdout from a fast command', async () => {
  const r = await runCommand('echo hello');
  assert.equal(r.ok, true);
  assert.match(r.stdout, /hello/);
});

test('runCommand enforces the timeout', async () => {
  const r = await runCommand('sleep 5', { timeout: 150 });
  assert.equal(r.timedOut, true);
  assert.equal(r.ok, false);
});

test('runCommand enforces max_bytes', async () => {
  const r = await runCommand(`node -e "process.stdout.write('a'.repeat(10000))"`, { maxBytes: 100 });
  assert.equal(r.truncated, true);
  assert.ok(r.stdout.length <= 100);
});

test('runCommand reports non-zero exit codes', async () => {
  const r = await runCommand('exit 3');
  assert.equal(r.ok, false);
  assert.equal(r.code, 3);
});
