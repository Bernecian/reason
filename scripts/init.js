#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const args = process.argv.slice(2);
const heuristic = args.includes('--heuristic');
const rDir = path.join(cwd, '.r');
const claudeDir = path.join(cwd, '.claude');
fs.mkdirSync(rDir, { recursive: true });
fs.mkdirSync(path.join(rDir, 'cache'), { recursive: true });
fs.mkdirSync(claudeDir, { recursive: true });

const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const installedAsPlugin = !!process.env.CLAUDE_PLUGIN_ROOT
  && fs.existsSync(path.join(root, 'hooks', 'hooks.json'));

if (installedAsPlugin) {
  console.log('- installed as a Claude Code plugin — hooks are wired globally, skipping per-project hook setup.');
} else {
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
    catch (_) {
      console.error(`! could not parse ${settingsPath}; aborting hook wiring`);
      process.exit(1);
    }
  }
  const cmd = (script) => `node "${path.join(root, 'scripts', script)}"`;
  settings.hooks = settings.hooks || {};
  const ensure = (event, command) => {
    settings.hooks[event] = settings.hooks[event] || [];
    const exists = settings.hooks[event].some(h =>
      Array.isArray(h.hooks) && h.hooks.some(x => x.command === command)
    );
    if (exists) return false;
    settings.hooks[event].push({ hooks: [{ type: 'command', command }] });
    return true;
  };
  const wired = [];
  if (ensure('UserPromptSubmit', cmd('inject.js'))) wired.push('UserPromptSubmit');
  if (ensure('SessionStart', cmd('boot.js'))) wired.push('SessionStart');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  if (wired.length) console.log(`wired hooks (${wired.join(', ')}) into ${path.relative(cwd, settingsPath)}`);
  else console.log(`- hooks already wired in ${path.relative(cwd, settingsPath)}`);
}

const rulesPath = path.join(rDir, 'rules.yaml');
const rulesExists = fs.existsSync(rulesPath);

if (heuristic) {
  if (rulesExists) {
    console.log(`- kept existing ${path.relative(cwd, rulesPath)}`);
  } else {
    fs.writeFileSync(rulesPath, starterRules(detectSignals(cwd)));
    console.log(`wrote ${path.relative(cwd, rulesPath)} (heuristic)`);
  }
  console.log('\nDone. Restart Claude Code in this directory.');
  process.exit(0);
}

if (rulesExists) {
  console.log(`- kept existing ${path.relative(cwd, rulesPath)}`);
  console.log('\nDone. Restart Claude Code in this directory.');
  process.exit(0);
}

const signals = detectSignals(cwd);
const pack = pickStarterPack(signals);
const packsDir = path.join(root, 'starter-packs');
const pick = {
  pack,
  packs_dir: packsDir,
  signals,
  rules_path: rulesPath,
};
console.log(JSON.stringify(pick, null, 2));
console.log('\nnext: scan the project and write tailored rules to .r/rules.yaml (see /r:init command body).');

function detectSignals(cwd) {
  const s = {
    hasClaudeMd: fs.existsSync(path.join(cwd, 'CLAUDE.md')),
    hasDocs: fs.existsSync(path.join(cwd, 'docs')),
    hasReact: false,
    hasReactNative: false,
    hasNext: false,
    hasFastapi: false,
    hasRust: fs.existsSync(path.join(cwd, 'Cargo.toml')),
    hasMonorepo: fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(cwd, 'turbo.json')),
    hasTests: false,
    hasGit: fs.existsSync(path.join(cwd, '.git')),
  };
  const pkg = path.join(cwd, 'package.json');
  if (fs.existsSync(pkg)) {
    try {
      const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
      const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
      if (deps.react) s.hasReact = true;
      if (deps['react-native'] || deps.expo) s.hasReactNative = true;
      if (deps.next) s.hasNext = true;
      if (deps.vitest || deps.jest || deps.mocha) s.hasTests = true;
    } catch (_) {}
  }
  const pyproject = path.join(cwd, 'pyproject.toml');
  if (fs.existsSync(pyproject)) {
    try {
      const txt = fs.readFileSync(pyproject, 'utf8');
      if (/fastapi/i.test(txt)) s.hasFastapi = true;
    } catch (_) {}
  }
  return s;
}

function pickStarterPack(s) {
  if (s.hasNext) return 'nextjs';
  if (s.hasReactNative) return 'react-native';
  if (s.hasFastapi) return 'fastapi';
  if (s.hasRust) return 'rust';
  if (s.hasMonorepo) return 'monorepo';
  if (s.hasReact) return 'nextjs';
  return 'node-api';
}

function starterRules(s) {
  const lines = [
    '# .r/rules.yaml — Reason rules',
    '# A rule fires when ANY keyword or path-glob in `match` hits, and NONE in `exclude`.',
    '# `load:` inlines the matched docs. `run:` executes shell commands (requires `trust: true`).',
    '',
    'rules:',
  ];
  if (s.hasClaudeMd) {
    lines.push(
      '  - name: project-conventions',
      '    match:',
      '      keywords: [convention, commit, rule, workflow, style]',
      '    load:',
      '      - CLAUDE.md',
      '    reason: Project conventions live in CLAUDE.md.',
      '',
    );
  }
  if (s.hasReact || s.hasReactNative) {
    lines.push(
      '  - name: ui-changes',
      '    match:',
      '      keywords: [component, screen, button, style, layout, font, color]',
      '      paths: ["**/*.tsx", "**/*.jsx"]',
      '    load:',
      s.hasDocs ? '      - "docs/design*.md"' : '      - CLAUDE.md',
      '    reason: UI changes should follow the project design system.',
      '',
    );
  }
  if (s.hasTests) {
    lines.push(
      '  - name: tests',
      '    match:',
      '      keywords: [test, spec, mock, fixture]',
      '    load:',
      s.hasDocs ? '      - "docs/testing*.md"' : '      - CLAUDE.md',
      '    reason: Test conventions are project-specific.',
      '',
    );
  }
  if (s.hasGit) {
    lines.push(
      '  # Example pre-flight command (disabled — flip `trust: true` to enable).',
      '  # - name: recent-work',
      '  #   match:',
      '  #     keywords: [recent, last, since]',
      '  #   run:',
      '  #     - cmd: "git log --oneline -10"',
      '  #       timeout: 2000',
      '  #       max_bytes: 4096',
      '  #   trust: true',
      '  #   reason: Surface recent commits when the prompt references them.',
      '',
    );
  }
  if (lines.length === 5) {
    lines.push(
      '  - name: example',
      '    match:',
      '      keywords: [example, placeholder]',
      '    load:',
      '      - README.md',
      '    reason: Replace with rules tailored to this project.',
      '',
    );
  }
  return lines.join('\n');
}
