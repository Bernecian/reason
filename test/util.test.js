const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { expandGlob, globToRegex, isGlob } = require('../lib/util');

test('isGlob detects glob chars', () => {
  assert.equal(isGlob('foo.md'), false);
  assert.equal(isGlob('foo/*.md'), true);
  assert.equal(isGlob('?.md'), true);
});

test('globToRegex handles ** and *', () => {
  assert.match('a/b/c.md', globToRegex('**/*.md'));
  assert.match('foo.md', globToRegex('*.md'));
  assert.doesNotMatch('a/b.md', globToRegex('*.md'));
});

test('expandGlob returns a literal for non-glob when the file exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-u-'));
  fs.writeFileSync(path.join(tmp, 'a.md'), 'x');
  assert.deepEqual(expandGlob(tmp, 'a.md'), ['a.md']);
  assert.deepEqual(expandGlob(tmp, 'missing.md'), []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('expandGlob walks directories for glob patterns', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-g-'));
  fs.mkdirSync(path.join(tmp, 'docs'));
  fs.writeFileSync(path.join(tmp, 'docs', 'one.md'), 'x');
  fs.writeFileSync(path.join(tmp, 'docs', 'two.md'), 'y');
  fs.writeFileSync(path.join(tmp, 'docs', 'skip.txt'), 'z');
  const results = expandGlob(tmp, 'docs/*.md').sort();
  assert.deepEqual(results, ['docs/one.md', 'docs/two.md']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('expandGlob ignores node_modules and dot-dirs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r-i-'));
  fs.mkdirSync(path.join(tmp, 'node_modules', 'x'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'node_modules', 'x', 'a.md'), '');
  fs.mkdirSync(path.join(tmp, '.secret'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.secret', 'a.md'), '');
  fs.writeFileSync(path.join(tmp, 'visible.md'), '');
  const results = expandGlob(tmp, '**/*.md');
  assert.deepEqual(results, ['visible.md']);
  fs.rmSync(tmp, { recursive: true, force: true });
});
