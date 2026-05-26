# truth-audit — Multi-Agent Truth Verification Skill

**Date:** 2026-05-26
**Status:** Design approved, pending implementation
**Location:** `~/.claude/plugins/oh-my-claudecode/skills/truth-audit/SKILL.md`

---

## 1. Problem

Most apps have a gap between what is documented and what actually works. Features can be fake (render UI but write nothing to the engine), disconnected (work in isolation but never propagate), broken (crash silently), or drifted (exist in docs but not code, or vice versa). Manual testing misses these because humans test the golden path. CI tests miss these because they test what developers wrote tests for, not what the product claims to do.

truth-audit closes this gap by reading the project's own documentation, auto-discovering its surfaces, and proving — with evidence — whether each one actually does what it claims.

## 2. Identity

- **Skill name:** `truth-audit`
- **Plugin:** oh-my-claudecode
- **Triggers:** `/truth-audit`, `/ta`, keyword `"truth audit"`, `"reality check"`
- **Scope:** Any Next.js / React web app (not NorskCoach-specific)

## 3. Three Tiers

| Invocation | Tier | What runs | Estimated time |
|---|---|---|---|
| `/truth-audit quick` or `/ta quick` | Quick | Discovery + deterministic Playwright checks, no AI analysis | 1-2 min |
| `/truth-audit` or `/ta` | Standard | Discovery + checks + sonnet analysis of findings | 3-5 min |
| `/truth-audit deep` or `/ta deep` | Deep | Full pipeline: opus analysis + behavioral tracing + auto-fix proposals + GitHub issues | 8-15 min |

## 4. Multi-Agent Architecture

Five specialized agents orchestrated by the skill coordinator:

### Phase 1: DISCOVER (1 agent, haiku)

**Inputs:** Project file tree, `src/app/**/page.tsx`, CLAUDE.md, `docs/`, `package.json`

**Outputs:** Surface manifest — a structured list of every route, its documented purpose, claimed engine connections, and expected behaviors.

**How it works:**
1. Reads `src/app/**/page.tsx` (or `pages/`) to enumerate all routes
2. Reads CLAUDE.md and docs/ to extract documented features and claims
3. Reads `package.json` to identify the tech stack and framework version
4. Cross-references routes with docs to detect drift (routes without docs, docs without routes)
5. Outputs a JSON manifest that drives all subsequent phases

**Manifest structure:**
```typescript
interface SurfaceManifest {
  projectName: string
  framework: string           // 'nextjs' | 'react' | 'remix' | etc.
  frameworkVersion: string
  surfaces: Surface[]
  undocumentedRoutes: string[] // routes with no CLAUDE.md mention
  undocumentedFeatures: string[] // documented features with no route
}

interface Surface {
  route: string               // '/session', '/conversation', etc.
  name: string                // human-readable name
  documented: boolean         // mentioned in CLAUDE.md/docs
  claims: string[]            // what the docs say it does
  engineConnections: string[] // documented writes to state/engine
  pageComponent: string       // file path to the page component
  isClientComponent: boolean
  hasAuth: boolean
}
```

### Phase 2: PROBE (N agents in parallel, sonnet)

One agent per surface cluster. Surfaces that are independent run in true parallel.

**Each probe agent:**
1. Takes its assigned surface(s) from the manifest
2. Navigates to the route via Chrome DevTools MCP
3. Runs deterministic checks:
   - Page loads without console errors
   - Page renders visible content (not blank)
   - Content is in the expected language
   - Interactive elements are present (buttons, inputs)
   - No horizontal overflow at 375px viewport
   - Touch targets >= 44px
   - Navigation (BottomNav or equivalent) is visible
   - axe-core WCAG 2.1 AA accessibility scan
4. Runs behavioral checks (standard + deep tiers):
   - Screenshots at 375px, 768px, 1280px, 1920px
   - Interacts with the surface (clicks, types, submits)
   - Reads store state before and after interaction via `page.evaluate()`
   - Captures network requests to verify backend writes
5. Collects all findings as structured `Finding` objects

**Probe parallelism:** Each surface is probed by its own agent. For a 9-surface app, 9 probe agents run simultaneously.

### Phase 3: ANALYZE (1 agent, opus — standard/deep only)

The brain of the system. Takes ALL findings from ALL probes.

**Standard tier analysis:**
- Classifies each finding into categories (broken, fake, disconnected, a11y-fail, mobile-fail, drift)
- Identifies cross-surface disconnections
- Produces root cause analysis for each failure
- Uses sequential-thinking MCP for complex reasoning chains

**Deep tier analysis (all of standard plus):**
- Reads the source code of failing components
- Proposes concrete auto-fix diffs with file paths
- Assigns confidence and risk ratings to each fix
- Correlates with Sentry production errors via MCP
- Validates framework best practices via Context7 MCP

### Phase 4: REPORT (1 agent, haiku)

**Always produces:**
- Terminal output: verdict + summary table + top findings
- Markdown report: `reports/truth-audit-YYYY-MM-DD.md`
- JSON report: `reports/truth-audit-YYYY-MM-DD.json`

**Deep tier extras:**
- GitHub issues via MCP with labels and screenshots
- Fix branch in worktree with proposed changes
- Sentry correlation data embedded in findings

## 5. External Tool Integration

| MCP Tool | Phase | Purpose |
|---|---|---|
| Chrome DevTools | Probe | Screenshots at multiple viewports, DOM snapshots, network log, Lighthouse scores |
| Playwright | Probe | Interactive flow testing: click, type, submit, navigate, verify state changes |
| Sequential Thinking | Analyze | Structured multi-step reasoning for ambiguous findings |
| GitHub | Report (deep) | Auto-create issues with labels (`truth-audit:broken`, `:fake`, `:a11y`) |
| Sentry | Analyze (deep) | Correlate findings with production error frequency and stack traces |
| Context7 | Discover | Validate app follows current framework best practices |

**Tool availability is graceful.** If a MCP tool is not connected, the skill degrades rather than fails. Probe agents prefer Chrome DevTools MCP but fall back to Playwright MCP, then to raw Playwright test execution. At minimum, the skill needs a running dev server and a browser — everything else enhances but doesn't block.

## 6. Finding Categories

Six categories, each with specific detection logic:

### broken
Feature exists but crashes or errors.
**Detection:** Console errors, network failures, blank renders (< 20 chars of content), unhandled exceptions, HTTP 500 responses.

### fake
Feature looks real but does nothing meaningful.
**Detection:** UI renders but store state is unchanged after interaction. Audio buttons exist but no `Audio()` calls or `<audio>` elements. Exercise submissions that don't update mastery scores. Placeholder text detected ("coming soon", "todo", "placeholder").

### disconnected
Feature works in isolation but doesn't feed the broader system.
**Detection:** Store writes don't propagate to other surfaces. Activity on surface A is not reflected on surface B when it should be. Engine connections claimed in docs but not traceable in runtime.

### a11y-fail
Accessibility violation per WCAG 2.1 AA.
**Detection:** axe-core scan. Categorized by impact: critical, serious, moderate, minor. Critical and serious are fails; moderate and minor are warns.

### mobile-fail
Layout breaks on mobile viewport.
**Detection:** Horizontal overflow (scrollWidth > clientWidth at 375px). Touch targets under 44px. Missing navigation elements. Overlapping content.

### drift
Feature exists in documentation but not in code, or exists in code but not in documentation.
**Detection:** Routes found in `src/app/**/page.tsx` with no mention in CLAUDE.md or docs/. Features documented in CLAUDE.md with no corresponding route or component.

## 7. Auto-Fix Proposals (Deep Mode)

When the Analyze agent finds failures, it proposes concrete fixes:

```typescript
interface FixProposal {
  finding: Finding
  diagnosis: string               // root cause analysis
  fix: {
    file: string                  // exact file path
    description: string           // what to change and why
    diff: string                  // proposed code change (unified diff)
    confidence: 'high' | 'medium' | 'low'
    risk: 'safe' | 'needs-review' | 'architectural'
  }
  verification: string            // how to verify the fix works
}
```

**Auto-applicable (high confidence, safe risk):**
- Missing `aria-label` on interactive elements
- Color contrast violations (adjusting opacity/color values)
- Undersized touch targets (adding min-height/padding)
- Missing navigation components on pages
- Missing `<meta>` tags

**Proposed but not auto-applied (needs review):**
- Disconnected engine writes (adding state persistence calls)
- Fake feature wiring (connecting UI to real data flows)
- Drift resolution (docs updates or route additions)
- Architectural issues (component restructuring)

## 8. Report Format

### Verdict logic
- **PASS**: Zero fails, zero warns
- **PARTIAL**: Zero fails, some warns
- **FAIL**: Any fails present

### Markdown report structure
```markdown
# Truth Audit — [Project] — [Date]

**Verdict: [PASS|PARTIAL|FAIL]** | Tier: [quick|standard|deep] | Duration: Xs

| Status | Count |
|--------|-------|
| Pass   | N     |
| Fail   | N     |
| Warn   | N     |

## Surface Manifest
[Auto-discovered surfaces and their documented claims]

## Failures
[Each failure with category, evidence, screenshot, and fix proposal]

## Warnings
[Each warning with category and evidence]

## Drift Report
[Undocumented routes and unimplemented features]

## Passes
[Bullet list of everything that checked out]

## Fix Proposals (deep only)
[Concrete diffs organized by confidence level]
```

### JSON report
Machine-readable version with the same data, suitable for CI/CD pipelines, dashboards, or downstream automation.

## 9. Skill File Structure

```
~/.claude/plugins/oh-my-claudecode/skills/truth-audit/
  SKILL.md              # Skill definition and orchestration logic
```

The skill uses Claude Code's native Agent tool for multi-agent orchestration — no additional runtime files needed. Probe agents generate Playwright specs on-the-fly in temporary directories.

**Project-side artifacts (generated per run):**
```
reports/
  truth-audit-YYYY-MM-DD.json
  truth-audit-YYYY-MM-DD.md
  screenshots/
    [surface]-[check]-[timestamp].png
```

## 10. Design Constraints

1. **Zero config.** The skill reads the project and figures out what to audit. No manifest to write, no config to maintain.
2. **Graceful degradation.** Missing MCP tools reduce capability but don't block execution. Chrome DevTools is the only hard requirement.
3. **Framework-aware.** The discover phase reads the tech stack and adjusts probes accordingly (App Router vs Pages Router, client vs server components).
4. **Non-destructive.** The skill never modifies the codebase unless in deep mode with auto-fix, and even then it works in a worktree branch.
5. **Deterministic base.** The quick tier produces the same results every run. AI analysis adds intelligence on top of, not instead of, reliable checks.
6. **Project-agnostic.** Works on any Next.js/React app, not hardcoded to NorskCoach. The NorskCoach harness is the reference implementation, not the template.

## 11. Success Criteria

The skill is successful when:
- Running `/ta quick` on any Next.js project produces a useful report in under 2 minutes
- The skill correctly identifies at least one fake or disconnected feature in a project that has them
- The skill catches all WCAG 2.1 AA violations that axe-core can detect
- The skill catches mobile layout failures at 375px
- Deep mode produces fix proposals that are correct and applicable at least 70% of the time
- The manifest auto-discovery correctly identifies all routes and maps them to documentation
