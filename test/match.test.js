const { test } = require('node:test');
const assert = require('node:assert');
const { matchRule, pickRules } = require('../lib/match');

test('keyword match is case-insensitive', () => {
  assert.equal(matchRule({ match: { keywords: ['Auth'] } }, 'fix the auth bug'), true);
});

test('keyword that does not appear returns false', () => {
  assert.equal(matchRule({ match: { keywords: ['auth'] } }, 'frontend rewrite'), false);
});

test('path glob matches path-like tokens in the prompt', () => {
  assert.equal(matchRule({ match: { paths: ['src/**/*.tsx'] } }, 'edit src/components/Button.tsx'), true);
  assert.equal(matchRule({ match: { paths: ['src/**/*.tsx'] } }, 'no path here'), false);
});

test('exclude.keywords blocks a keyword match', () => {
  const rule = { match: { keywords: ['test'], exclude: { keywords: ['skip'] } } };
  assert.equal(matchRule(rule, 'run the tests'), true);
  assert.equal(matchRule(rule, 'skip the tests for now'), false);
});

test('exclude.paths blocks a path match', () => {
  const rule = { match: { paths: ['src/**'], exclude: { paths: ['**/*.spec.ts'] } } };
  assert.equal(matchRule(rule, 'edit src/foo.ts'), true);
  assert.equal(matchRule(rule, 'edit src/foo.spec.ts'), false);
});

test('pickRules filters correctly', () => {
  const rules = [
    { name: 'a', match: { keywords: ['foo'] } },
    { name: 'b', match: { keywords: ['bar'] } },
  ];
  const picked = pickRules(rules, 'fix the foo bug');
  assert.equal(picked.length, 1);
  assert.equal(picked[0].name, 'a');
});

test('empty match object does not match anything', () => {
  assert.equal(matchRule({ match: {} }, 'anything'), false);
});
