#!/usr/bin/env node
// Reads .council/reports/playwright-raw.json
// Writes structured markdown report to .council/reports/[timestamp]-[task].md
// Usage: node .council/scripts/format-report.js <task-name>

const fs = require('fs');
const path = require('path');

const taskName = process.argv[2] || 'unknown-task';
const rawPath = path.join(process.cwd(), '.council', 'reports', 'playwright-raw.json');

if (!fs.existsSync(rawPath)) {
  console.error('No playwright-raw.json found at', rawPath);
  console.error('Run playwright tests first: npm run council:verify');
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse playwright-raw.json:', e.message);
  process.exit(1);
}

const now = new Date();
const timestamp = now.toISOString()
  .replace('T', '-')
  .replace(/:/g, '-')
  .slice(0, 16);
const outPath = path.join(process.cwd(), '.council', 'reports', `${timestamp}-${taskName}.md`);

// Count results
let totalTests = 0;
let passed = 0;
let failed = 0;
const testRows = [];

function processSpec(spec, suiteName) {
  for (const test of spec.tests || []) {
    totalTests++;
    const result = test.results?.[0];
    const ok = result?.status === 'passed';
    if (ok) passed++;
    else failed++;
    const error = result?.error?.message?.split('\n')[0] || '';
    testRows.push({
      name: `${suiteName} > ${spec.title}`,
      ok,
      error: error.slice(0, 120),
    });
  }
}

function processSuite(suite, parentName = '') {
  const name = parentName ? `${parentName} > ${suite.title}` : suite.title;
  for (const spec of suite.specs || []) {
    processSpec(spec, name);
  }
  for (const child of suite.suites || []) {
    processSuite(child, name);
  }
}

for (const suite of raw.suites || []) {
  processSuite(suite);
}

const overallResult = failed === 0 ? 'PASS' : 'FAIL';
const resultEmoji = overallResult === 'PASS' ? '✅' : '❌';

const lines = [
  `# Playwright Report: ${taskName}`,
  `**Date:** ${now.toISOString()}`,
  `**Result:** ${resultEmoji} ${overallResult}`,
  `**Tests:** ${totalTests} run | ${passed} passed | ${failed} failed`,
  '',
  '## Test Results',
  '',
  '| Test | Result | Error |',
  '|------|--------|-------|',
];

for (const row of testRows) {
  const icon = row.ok ? '✅' : '❌';
  const err = row.error ? row.error.replace(/\|/g, '\\|') : '';
  lines.push(`| ${row.name} | ${icon} | ${err} |`);
}

lines.push('');
lines.push('## Verdict for Opus');
lines.push('');
if (overallResult === 'PASS') {
  lines.push('**PASS** — all tests passed. Proceed to post-execution review.');
} else {
  lines.push(`**FAIL** — ${failed} test(s) failed. CORRECT verdict required.`);
  lines.push('');
  lines.push('Failed tests:');
  for (const row of testRows.filter(r => !r.ok)) {
    lines.push(`- ${row.name}: ${row.error}`);
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n') + '\n');

console.log(`Report written to ${outPath}`);
console.log(`Verdict: ${overallResult}`);
process.exit(overallResult === 'PASS' ? 0 : 1);
