# NorskCoach — Quality Standard & Acceptance Criteria

The definitive standard against which every feature is tested and audited. Derived from the vision, moat definition, north star, and ship-ready criteria in `vision-and-plan.md` and `CLAUDE.md`.

---

## Part 1: The Vision Standard

NorskCoach is a **free, AI-powered Norwegian coach** that:
- Knows exactly where each learner is weak (diagnosis)
- Explains why those weaknesses exist (root-cause rules)
- Fixes them with targeted practice across every surface (remediation)
- Unifies everything in a weekly rhythm (weekly sprint)

**The learner's experience:** "I have 5 concepts to lock in this week. Every feature helps me practice them. On Saturday I prove whether I've got them."

### Non-Negotiable Principles
1. **Norwegian dominates every learning screen** — English only on assessment surfaces
2. **AI powers the coaching but is never the headline** — template fallbacks everywhere
3. **Every feature feeds the diagnosis or is retired** — no decorative features
4. **Production fluency is the goal** — not recognition, not gamification
5. **Free per user** — zero marginal cost per learner

---

## Part 2: Feature-Level Acceptance Criteria

### F01 — Diagnostic Placement (`/onboarding`)
| Criterion | Standard |
|-----------|----------|
| Adaptive question selection | IRT-style — harder after correct, easier after wrong |
| Seeds fingerprint | rawScore, confidence, per-concept mastery initialized |
| Cold-start adaptation | First session after diagnostic is personalized, not generic |
| Honest level assignment | A1/A2/B1 based on actual performance |
| Norwegian UI | Questions in Norwegian, instructions may be English (assessment surface) |

### F02 — Adaptive Session (`/session`)
| Criterion | Standard |
|-----------|----------|
| Recipe composition | 40% remediation / 30% review / 20% new / 10% interleaving (±5pp) |
| Weekly focus bias | Remediation pool biases toward weeklyFocus concepts |
| Exercise types | translation-to-norwegian, fill-in-blank, word-order, speed-round, listening |
| No repeated sentences | Content dedup within session |
| Production guarantee | At least one production exercise per session |
| Repair loop triggers | Every wrong answer → explain → micro-drill → retry → SRS schedule |
| Mastery update | Every result updates fingerprint (rawScore, decayedScore, EMA, SRS) |
| Session cap | Max 2x original session size (F027) |
| Norwegian UI | Exercise labels, buttons, placeholders all Norwegian |

### F03 — Repair Loop
| Criterion | Standard |
|-----------|----------|
| Explanation | Template or AI explanation of the error |
| Micro-drills | 2 targeted practice items |
| Retry | Original question re-presented |
| SRS scheduling | Error scheduled on ladder: 1→3→7→14→30 days |
| Pipeline honesty | Repair results update fingerprint (traced, not assumed) |

### F04 — Journal (`/journal`)
| Criterion | Standard |
|-----------|----------|
| Focus-biased prompts | Prompts reference weekly focus concepts |
| AI writing review | Grammar correction with tagged errors (AI or template) |
| Error detection | Errors feed fingerprint via repairFromSurface |
| Lane completion | markLaneDone('journal') fires on feedback received |
| Norwegian UI | Prompts, buttons, feedback all Norwegian |

### F05 — Conversation (`/conversation`)
| Criterion | Standard |
|-----------|----------|
| AI tutor (Kari) | Real conversational responses, level-appropriate |
| Focus-biased topic | Topic derived from weekly focus concepts |
| Error correction | Inline corrections with errorTag |
| Constraint evaluation | Grammar constraints checked per turn |
| Speaking minutes tracked | speakingMinutesTotal updated |
| Pipeline honesty | Errors feed fingerprint via repairFromSurface |
| Lane completion | markLaneDone('conversation') on explicit end |
| Norwegian UI | All UI chrome in Norwegian |

### F06 — Roleplay (`/roleplay`)
| Criterion | Standard |
|-----------|----------|
| Focus-ranked scenarios | Scenarios sorted by weekly focus relevance |
| Speech recognition | Browser SpeechRecognition for spoken input |
| Turn-by-turn scoring | Each turn records ExerciseResult |
| Speaking minutes | Updated via fresh store read (not stale closure) |
| Lane completion | markLaneDone('roleplay') on scenario complete |
| Pipeline honesty | Results feed fingerprint |

### F07 — Reading (`/reading`)
| Criterion | Standard |
|-----------|----------|
| Concept-tagged texts | Each text linked to concepts |
| Exposure logging | logConceptExposure fires on text close |
| Level-appropriate | Texts filtered by current CEFR level |
| Lane completion | markLaneDone('reading') on text close with exposure |
| Norwegian UI | All Norwegian |

### F08 — Listen & Respond (`/listen`)
| Criterion | Standard |
|-----------|----------|
| Real audio | AudioPlayer with MP3 files (browser TTS fallback) |
| Focus-biased ordering | Questions sorted by weekly focus concept match |
| Speech recognition | 5-second timer, spoken answer evaluated |
| Fingerprint recording | ExerciseResult for each question |
| Lane completion | markLaneDone('listen') on all questions complete |
| Norwegian UI | All Norwegian |

### F09 — Pronunciation Drills (`/drills`)
| Criterion | Standard |
|-----------|----------|
| 4 sound groups | Targeted Norwegian phonemes difficult for English speakers |
| Real audio | AudioPlayer with MP3 files |
| Heuristic matching | Word-level match scoring |
| Fingerprint recording | ExerciseResult per word |
| Lane completion | markLaneDone('drills') on drill set complete |
| Norwegian UI | All Norwegian |

### F10 — Shadowing (`/shadow`)
| Criterion | Standard |
|-----------|----------|
| Level-filtered sentences | A1/A2/B1 based on fingerprint level |
| Listen + repeat | Audio plays, user repeats, words matched |
| 5-sentence sessions | Fisher-Yates shuffle, SESSION_SIZE = 5 |
| Fingerprint recording | ExerciseResult per sentence |
| Lane completion | markLaneDone('shadow') on session complete |
| Norwegian UI | All Norwegian |

### F11 — Weekly Check (`/uke`)
| Criterion | Standard |
|-----------|----------|
| Tests weekly focus concepts | Questions drawn from weeklyFocus |
| Honest retention measurement | Scores feed mastery pipeline |
| Graduation/demotion | closeWeek promotes or demotes concepts |
| Available Saturday+ | Shown as available on Saturday and Sunday |
| Pipeline honesty | Results feed identical mastery + SRS pipeline |

### F12 — Dashboard
| Criterion | Standard |
|-----------|----------|
| Coach hero card | Fingerprint-driven recommendation |
| 5 core lanes | Session, journal, conversation, roleplay, reading |
| 3 muntlig cards | Listen, drills, shadow |
| Lane completion tracking | Daily reset, checkmarks for completed lanes |
| Weekly timeline | 7-dot compact week view |
| Vitals bar | Streak, speaking minutes, accuracy, sessions |
| Weekly check link | Contextual (Saturday/Sunday vs weekday) |
| Norwegian UI | All labels, section headers Norwegian |

### F13 — Progress (`/progress`)
| Criterion | Standard |
|-----------|----------|
| Concept progress rows | Phase, score, attempts per concept |
| Phase distribution bar | Visual breakdown of locked/intro/practice/consolidation/maintenance |
| Weekly trajectory | 8-week bar chart with graduation badges |
| Norwegian UI | All Norwegian |

### F14 — Profile (`/profile`)
| Criterion | Standard |
|-----------|----------|
| Level display + change | LevelSelector with A1/A2/B1/B2 |
| Mastery stats | Concepts mastered, streak, sessions |
| Error patterns | Top 3 error tags displayed |
| Input/production preference | 3-way toggle affecting session composition |
| AI status | Shows current mode (Lokal/Sky/Maler) with Norwegian description |
| Auth state | Login/logout, guest banner |

### F15 — AI System (Hybrid)
| Criterion | Standard |
|-----------|----------|
| Desktop: WebLLM | 1B model loads via WebGPU in Web Worker |
| Mobile: Groq API | Server-side via /api/ai, Llama 3.1 8B |
| Fallback: templates | All 5 methods have template responses |
| Validation gate | validateNorwegianOutput on all AI responses |
| Prompt hardening | Norwegian-enforcement rules in all prompt builders |
| No data leakage | API key server-side only, no PII sent to Groq |

### F16 — Auth
| Criterion | Standard |
|-----------|----------|
| Email OTP login | Email → 6/8-digit code → `verifyOtp` → /dashboard |
| Fingerprint sync | IndexedDB → Supabase on auth |
| Guest mode | Full functionality without login |
| Auth redirect | Unauthenticated users can use app freely |

### F17 — Audio
| Criterion | Standard |
|-----------|----------|
| 784 MP3 files | A1 + A2 + B1 corpus + listen + drill content |
| AudioPlayer component | Real MP3 playback with browser TTS fallback |
| edge-tts voice | nb-NO-PernilleNeural (Norwegian female) |

---

## Part 3: Engine Integrity Standards

| System | Verification Standard |
|--------|----------------------|
| Mastery scoring | Phase-adaptive EMA with correct α per phase |
| Decay | Exponential, half-life 25 days, floor 35 |
| SRS ladder | 1→3→7→14→30 days, advances on correct, resets on wrong |
| Slip detection | Wrong after 4/5 recent correct counts at 30% weight |
| Weekly sprint | Focus selection, scheduler bias, graduation on close |
| Error taxonomy | 17 tags, real error_tags_detectable from sentences |
| Diagnosis | 4 root-cause rules on real error data |
| Content dedup | No repeated sentence within a session |
| Calibration window | First 5 sessions use 30/30/30/10 recipe |

---

## Part 4: Cross-Cutting Standards

| Standard | Requirement |
|----------|-------------|
| Norwegian dominance | >95% Norwegian on all learning surfaces |
| Accessibility | WCAG AA, aria-labels on all interactive elements, focus-visible |
| Typography | Schibsted Grotesk only (display 700 / body 400) |
| Performance | No layout-property animations, compositor props only |
| Mobile-first | min-h-dvh, safe-area-inset, touch targets ≥44px |
| No silent substitution | If a feature doesn't work, show honest banner |
| Pipeline honesty | Every "feeds the engine" claim must be traceable |
| Design system | nc-* CSS classes, no hard-coded colors outside tokens |
| Test coverage | 288+ tests passing, TypeScript strict, build clean |
| Deployment | Live at pandoai.no, PM2 managed, nginx proxied |
