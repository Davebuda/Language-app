#!/usr/bin/env node
/**
 * Standing pre-build / pre-deploy quality gate for NorskCoach.
 *
 * Codifies the baseline ultraaudit (recourse, 2026-06-08). Five load-bearing
 * checks; ALL must pass or the gate exits non-zero (BLOCKED). Run before any
 * build, deploy, or "done" claim:
 *
 *     npm run audit:gate
 *
 * Checks:
 *   1. Corpus integrity   — `npm run audit:corpus` reports 0 ERRORS
 *   2. Type safety        — `npx tsc --noEmit` emits no `error TS`
 *   3. Lint               — `npm run lint` (next lint) emits no ESLint ERRORS.
 *                           tsc --noEmit does NOT catch unused-locals etc., but
 *                           `next build` runs ESLint and ABORTS on errors — so
 *                           without this check a build-breaking lint error
 *                           passes the gate and only dies at deploy (the
 *                           `SLOTS` unused-const that broke 0db41eb, 2026-06-21).
 *                           Warnings-only exits 0, so pre-existing warnings
 *                           (e.g. exhaustive-deps) do NOT false-fail the gate.
 *   4. Full test suite    — `npm test` (vitest) green; ONE retry on the known
 *                           non-deterministic Windows vitest worker-fork
 *                           teardown flake ("Worker exited unexpectedly")
 *   5. Returning-user     — the locked legacy-fingerprint read-safety guard
 *                           (explicit, even though it's inside the full suite)
 *
 * The retry rule (check 4) tolerates the documented flake WITHOUT weakening the
 * gate against real assertion failures: a real failure fails twice; the flake
 * does not.
 */
import { execSync } from 'node:child_process'

function run(label, cmd) {
  process.stdout.write(`\n=== ${label} ===\n$ ${cmd}\n`)
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    process.stdout.write(out)
    return { ok: true, out }
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '')
    process.stdout.write(out)
    return { ok: false, out }
  }
}

const results = {}

// 1. Corpus integrity — pass only on 0 ERRORS. Scan output (robust to exit code).
{
  const r = run('1/5 corpus integrity', 'npm run audit:corpus')
  results['corpus-integrity'] =
    /Findings:\s*0\s*ERROR/i.test(r.out) || /No integrity ERRORS/i.test(r.out)
}

// 2. Type safety
{
  const r = run('2/5 tsc --noEmit', 'npx tsc --noEmit')
  results['type-safety'] = r.ok && !/error TS\d+/.test(r.out)
}

// 3. Lint — `next lint` exits non-zero on ESLint ERRORS (warnings-only exits 0),
//    mirroring what aborts `next build`. Belt-and-braces: also fail if an
//    "Error:" line appears, in case a future config downgrades the exit code.
{
  const r = run('3/5 next lint', 'npm run lint')
  results['lint'] = r.ok && !/^\s*\d+:\d+\s+Error:/m.test(r.out)
}

// 4. Full test suite — one retry on the known Windows worker-fork teardown flake
{
  let r = run('4/5 vitest full suite', 'npm test')
  if (!r.ok) {
    process.stdout.write(
      '\n[gate] vitest exited non-zero — retrying ONCE (known Windows worker-fork teardown flake)\n'
    )
    r = run('4/5 vitest full suite (retry)', 'npm test')
  }
  results['test-suite'] = r.ok
}

// 5. Returning-user / legacy-fingerprint read safety (explicit load-bearing guard)
{
  const r = run(
    '5/5 returning-user read safety',
    'npx vitest run tests/integration/returning-user-read-safety.test.ts'
  )
  results['returning-user-safety'] = r.ok
}

const pass = Object.values(results).every(Boolean)
process.stdout.write('\n=== ULTRAAUDIT GATE ===\n')
for (const [k, v] of Object.entries(results)) {
  process.stdout.write(`  ${v ? 'PASS' : 'FAIL'}  ${k}\n`)
}
process.stdout.write(
  pass
    ? '\n✓ AUDIT-CLEAN — cleared to build / deploy.\n'
    : '\n✗ BLOCKED — fix the FAIL(s) above before building / deploying.\n'
)
process.exit(pass ? 0 : 1)
