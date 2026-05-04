const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { get, set, clear, keyFor } = require('../lib/cache');

test('set then get round-trips within the TTL', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-c-'));
  set(tmp, 'echo x', { stdout: 'x' });
  assert.deepEqual(get(tmp, 'echo x', 60000), { stdout: 'x' });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('get returns null after the TTL expires', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-c2-'));
  set(tmp, 'echo y', { stdout: 'y' });
  const file = path.join(tmp, '.r', 'cache', keyFor('echo y', tmp) + '.json');
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  record.ts = Date.now() - 999999;
  fs.writeFileSync(file, JSON.stringify(record));
  assert.equal(get(tmp, 'echo y', 1000), null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('get returns null when ttlMs is 0', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-c3-'));
  set(tmp, 'echo z', { stdout: 'z' });
  assert.equal(get(tmp, 'echo z', 0), null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('clear removes cache files and reports count', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-c4-'));
  set(tmp, 'a', { v: 1 });
  set(tmp, 'b', { v: 2 });
  assert.equal(clear(tmp), 2);
  assert.equal(get(tmp, 'a', 60000), null);
  fs.rmSync(tmp, { recursive: true, force: true });
});
