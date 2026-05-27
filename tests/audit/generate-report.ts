/**
 * Audit Report Generator
 *
 * Run after the test suite to produce a structured Markdown + JSON report.
 * Usage: npx tsx tests/audit/generate-report.ts
 *
 * Reads vitest JSON output and classifies findings.
 */
import * as fs from 'fs';
import * as path from 'path';

interface VitestResult {
  testResults: Array<{
    name: string;
    status: string;
    assertionResults: Array<{
      fullName: string;
      status: 'passed' | 'failed';
      failureMessages?: string[];
    }>;
  }>;
  numPassedTests: number;
  numFailedTests: number;
  numTotalTests: number;
}

interface AuditFinding {
  id: string;
  category: 'broken' | 'fake' | 'disconnected' | 'random' | 'duplicated';
  severity: 'critical' | 'major' | 'minor';
  component: string;
  description: string;
  evidence: string;
  fix: string;
}

interface AuditReport {
  timestamp: string;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL';
  fingerprintChainIntact: boolean;
  dailyOppgaverLevelAware: boolean;
  passedItemsSuppressed: boolean;
  weeklyProgressReal: boolean;
  findings: AuditFinding[];
  suiteResults: {
    suite: string;
    passed: number;
    failed: number;
    tests: { name: string; status: 'pass' | 'fail'; evidence?: string }[];
  }[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    passRate: string;
  };
}

const KNOWN_FINDINGS: AuditFinding[] = [
  {
    id: 'F-001',
    category: 'broken',
    severity: 'critical',
    component: 'concept-graph-loader',
    description: 'B2 level falls through to A1 graph in getGraphForLevel — silent substitution',
    evidence: 'getGraphForLevel("B2") returns a1Graph via default case. B2 users see A1 content.',
    fix: 'Add explicit B2 case that either returns a B2 graph or throws. Make parameter type CEFRLevel, not string. Add exhaustive switch check.',
  },
  {
    id: 'F-002',
    category: 'disconnected',
    severity: 'major',
    component: 'fingerprint/productionGap',
    description: 'productionGap field is never written — always empty object',
    evidence: 'computeProductionGap exists but is never called by recordResult or any hook. productionGap stays as {} forever. Scheduler reads it but always gets 0.',
    fix: 'Call computeProductionGap in recordResult after error logging, or remove the field and scheduler references to avoid false advertising.',
  },
  {
    id: 'F-003',
    category: 'disconnected',
    severity: 'major',
    component: 'fingerprint/vocabularyMastery',
    description: 'vocabularyMastery field declared but never read or written',
    evidence: 'VocabularyClusterMastery type exists. createEmptyFingerprint initializes it as {}. No function in the engine touches it.',
    fix: 'Remove the field or implement vocabulary tracking. Dead schema creates false expectations.',
  },
  {
    id: 'F-004',
    category: 'disconnected',
    severity: 'minor',
    component: 'fingerprint/errorPatterns',
    description: 'ErrorPattern.rootCauseConceptId is never populated',
    evidence: 'aggregateErrorPatterns generates patterns but never sets rootCauseConceptId or rootCauseConfidence. Diagnosis engine runs separately but does not write back to patterns.',
    fix: 'Either wire diagnosis output into error patterns or remove the fields.',
  },
  {
    id: 'F-005',
    category: 'fake',
    severity: 'major',
    component: 'session/exerciseTypes',
    description: 'Three exercise types (dictation, reading-comprehension, free-writing) are declared but can never be scheduled',
    evidence: 'ExerciseType union includes them. No scheduler pool (PRODUCTION_EXERCISES, RECOGNITION_EXERCISES, etc.) contains them. They are dead variants.',
    fix: 'Remove from ExerciseType or add to appropriate scheduler pool.',
  },
  {
    id: 'F-006',
    category: 'disconnected',
    severity: 'minor',
    component: 'session/minNewVocabItems',
    description: 'SessionRecipe.minNewVocabItems is declared (default 3) but never enforced',
    evidence: 'DEFAULT_SESSION_RECIPE sets minNewVocabItems: 3. generateSession never reads this field.',
    fix: 'Enforce in scheduler or remove to avoid false documentation.',
  },
  {
    id: 'F-007',
    category: 'broken',
    severity: 'major',
    component: 'weekly-sprint/graduation',
    description: 'Three different graduation/mastery criteria exist — inconsistent gates',
    evidence: 'isMastered: rawScore+confidence+attempts+days. isGraduated: rawScore+attempts (no confidence). buildWeeklyCheckItems grad filter: endScore only (no attempts). A concept can graduate weekly sprint without meeting isMastered.',
    fix: 'Unify to a single mastery gate, or explicitly document why each gate differs.',
  },
  {
    id: 'F-008',
    category: 'disconnected',
    severity: 'minor',
    component: 'useFingerprint/levelProgression',
    description: 'Level progression only implemented for A1→A2 — no A2→B1 or B1→B2',
    evidence: 'checkA1Complete in useFingerprint.ts triggers A2 promotion. No equivalent for A2→B1 exists.',
    fix: 'Implement checkA2Complete and checkB1Complete, or document that level-up is manual only after A2.',
  },
];

function classifySuiteResults(jsonPath: string): AuditReport {
  let vitestData: VitestResult;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    vitestData = JSON.parse(raw);
  } catch {
    console.error(`Could not read vitest JSON at ${jsonPath}. Run: npx vitest run tests/audit --reporter=json --outputFile=test-results/audit.json`);
    process.exit(1);
  }

  const suiteResults: AuditReport['suiteResults'] = [];
  const suiteMap: Record<string, { passed: number; failed: number; tests: { name: string; status: 'pass' | 'fail'; evidence?: string }[] }> = {};

  for (const file of vitestData.testResults) {
    const suiteName = path.basename(file.name).replace('.test.ts', '');
    if (!suiteMap[suiteName]) suiteMap[suiteName] = { passed: 0, failed: 0, tests: [] };

    for (const test of file.assertionResults) {
      const status = test.status === 'passed' ? 'pass' : 'fail';
      suiteMap[suiteName].tests.push({
        name: test.fullName,
        status,
        evidence: test.failureMessages?.[0],
      });
      if (status === 'pass') suiteMap[suiteName].passed++;
      else suiteMap[suiteName].failed++;
    }
  }

  for (const [suite, data] of Object.entries(suiteMap)) {
    suiteResults.push({ suite, ...data });
  }

  const totalPassed = vitestData.numPassedTests;
  const totalFailed = vitestData.numFailedTests;
  const totalTests = vitestData.numTotalTests;

  // Determine chain verdicts from suite results
  const suiteA = suiteMap['A-fingerprint-contract'];
  const suiteB = suiteMap['B-scheduler-oppgaver'];
  const suiteC = suiteMap['C-weekly-progress'];
  const suiteD = suiteMap['D-end-to-end-proof'];

  const fingerprintChainIntact = (suiteA?.failed ?? 0) === 0;
  const dailyOppgaverLevelAware = (suiteB?.failed ?? 0) === 0;
  const passedItemsSuppressed = (suiteB?.tests.filter(t => t.name.includes('passed') || t.name.includes('suppress')).every(t => t.status === 'pass')) ?? false;
  const weeklyProgressReal = (suiteC?.failed ?? 0) === 0;

  const allCriticalPass = fingerprintChainIntact && dailyOppgaverLevelAware && passedItemsSuppressed && weeklyProgressReal;
  const anyFailed = totalFailed > 0;

  const verdict: 'PASS' | 'PARTIAL' | 'FAIL' = allCriticalPass && !anyFailed ? 'PASS' : anyFailed && totalFailed <= 3 ? 'PARTIAL' : totalFailed > 3 ? 'FAIL' : 'PASS';

  return {
    timestamp: new Date().toISOString(),
    verdict,
    fingerprintChainIntact,
    dailyOppgaverLevelAware,
    passedItemsSuppressed,
    weeklyProgressReal,
    findings: KNOWN_FINDINGS,
    suiteResults,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      passRate: `${Math.round((totalPassed / totalTests) * 100)}%`,
    },
  };
}

function generateMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Fingerprint-First Audit Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Verdict:** ${report.verdict}`);
  lines.push('');
  lines.push('## Chain Verification');
  lines.push('');
  lines.push(`| Chain Link | Status |`);
  lines.push(`|---|---|`);
  lines.push(`| Fingerprint chain intact | ${report.fingerprintChainIntact ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Daily oppgaver level-aware | ${report.dailyOppgaverLevelAware ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Passed items suppressed | ${report.passedItemsSuppressed ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Weekly progress real | ${report.weeklyProgressReal ? 'PASS' : 'FAIL'} |`);
  lines.push('');
  lines.push('## Test Summary');
  lines.push('');
  lines.push(`- **Total tests:** ${report.summary.totalTests}`);
  lines.push(`- **Passed:** ${report.summary.totalPassed}`);
  lines.push(`- **Failed:** ${report.summary.totalFailed}`);
  lines.push(`- **Pass rate:** ${report.summary.passRate}`);
  lines.push('');

  for (const suite of report.suiteResults) {
    lines.push(`### ${suite.suite}`);
    lines.push(`${suite.passed} passed / ${suite.failed} failed`);
    lines.push('');
    if (suite.failed > 0) {
      lines.push('**Failures:**');
      for (const test of suite.tests.filter(t => t.status === 'fail')) {
        lines.push(`- ${test.name}`);
        if (test.evidence) lines.push(`  > ${test.evidence.split('\n')[0]}`);
      }
      lines.push('');
    }
  }

  lines.push('## Known Findings (Static Analysis)');
  lines.push('');
  for (const f of report.findings) {
    lines.push(`### ${f.id}: ${f.description}`);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Severity:** ${f.severity}`);
    lines.push(`- **Component:** ${f.component}`);
    lines.push(`- **Evidence:** ${f.evidence}`);
    lines.push(`- **Fix:** ${f.fix}`);
    lines.push('');
  }

  lines.push('## Fix Plan (priority order)');
  lines.push('');
  const critical = report.findings.filter(f => f.severity === 'critical');
  const major = report.findings.filter(f => f.severity === 'major');
  const minor = report.findings.filter(f => f.severity === 'minor');
  lines.push('### Phase 1 — Critical (same day)');
  for (const f of critical) lines.push(`- [ ] ${f.id}: ${f.fix}`);
  lines.push('');
  lines.push('### Phase 2 — Major (this week)');
  for (const f of major) lines.push(`- [ ] ${f.id}: ${f.fix}`);
  lines.push('');
  lines.push('### Phase 3 — Minor (backlog)');
  for (const f of minor) lines.push(`- [ ] ${f.id}: ${f.fix}`);
  lines.push('');

  return lines.join('\n');
}

// Main
const jsonPath = path.join(process.cwd(), 'test-results', 'audit.json');
const report = classifySuiteResults(jsonPath);

const outDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'audit-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'audit-report.md'), generateMarkdownReport(report));

const critCount = report.findings.filter(f => f.severity === 'critical').length;
const majCount = report.findings.filter(f => f.severity === 'major').length;
const minCount = report.findings.filter(f => f.severity === 'minor').length;

console.log(`\n=== AUDIT VERDICT: ${report.verdict} ===`);
console.log(`Tests: ${report.summary.totalPassed}/${report.summary.totalTests} passed (${report.summary.passRate})`);
console.log(`Fingerprint chain: ${report.fingerprintChainIntact ? 'INTACT' : 'BROKEN'}`);
console.log(`Daily oppgaver level-aware: ${report.dailyOppgaverLevelAware ? 'YES' : 'NO'}`);
console.log(`Passed items suppressed: ${report.passedItemsSuppressed ? 'YES' : 'NO'}`);
console.log(`Weekly progress real: ${report.weeklyProgressReal ? 'YES' : 'NO'}`);
console.log(`Known findings: ${report.findings.length} (${critCount} critical, ${majCount} major, ${minCount} minor)`);
console.log(`\nReports written to: test-results/audit-report.{json,md}`);
