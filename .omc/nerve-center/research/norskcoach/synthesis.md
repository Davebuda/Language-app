# NorskCoach — Strategic Synthesis (2026-05-26)

Produced by Nerve Center full orchestration from 6 parallel research agents covering: Norwegian competitors (10 apps), global language apps (14 apps), adaptive learning research (40+ papers), audio infrastructure (TTS/ASR/pronunciation), AI architecture patterns, and full project vision extraction.

---

## The Competitive Truth (Updated)

### NorskCoach has TWO genuinely unclaimed moats

**1. Root-cause error diagnosis** — No commercial language learning app (of 14+ surveyed) does persistent per-concept error taxonomy with longitudinal root-cause analysis. Duolingo Max's "Explain My Answer" is the closest — but it's one-shot (not cross-session), not available for Norwegian, and doesn't track patterns. Enverson AI claims cross-modal error memory but is English-only and unverified independently. NorskCoach's 4-rule diagnostic engine is at or ahead of the consumer production frontier.

**2. Pedagogically-motivated weekly sprint** — Lingoda has a sprint structure, but it's attendance-based and disconnected from diagnosis. Duolingo has leagues, but they're XP gamification. NorskCoach's sprint biases the remediation pool toward focus concepts — the sprint and diagnosis are coupled. No competitor does this.

### What competitors DO have that NorskCoach doesn't (yet)

| Capability | Who has it | NorskCoach status |
|---|---|---|
| Real-time AI voice conversation | Speak ($1B), Duolingo Max, Praktika | Text-only conversation with Kari |
| Phoneme-level pronunciation scoring | ELSA Speak | Not viable at zero cost; heuristic table only |
| Video/avatar immersion | Praktika, Memrise | Not planned |
| 50+ languages | Duolingo, TalkPal | Norwegian only (by design) |
| FSRS-class adaptive SRS | Anki, Migaku | Fixed 1→3→7→14→30 ladder (v2) |
| Human community corrections | Busuu | Not planned |
| Native audio content library | Pimsleur, Mjolnir | Not built (audio infra required) |

### The primary competitive risk

Not a direct clone — indirect substitution. ChatGPT voice, Claude voice, and Gemini Live offer free AI conversation practice. NorskCoach's defense: **a conversation partner and a coach are different things**. One talks with you; one diagnoses your patterns and fixes them systematically. That distinction must be legible to users.

---

## The Architecture That Works

Research confirms NorskCoach's architecture split is correct:

| Component | Should be AI? | Should be rules? | NorskCoach status |
|---|---|---|---|
| Mastery scoring | No | EMA + slip detection | ✅ Correct |
| Session scheduling | No | Recipe + SRS + decay | ✅ Correct |
| Error diagnosis | No (rules first) | 4-rule pattern matching | ✅ Correct |
| Content generation | Yes (gated) | Template fallback | ✅ Correct |
| Conversation | Yes (gated) | No fallback possible | ✅ Correct |
| Error explanation | Yes (gated) | Template fallback | ✅ Correct |
| Norwegian validity | No | Heuristic rules | ✅ Correct |
| Pronunciation scoring | Not viable free | Heuristic table | ✅ Correct scope |

Key research validations:
- 7-day sprint cycle matches habit formation research (66 days to automaticity, 7-day natural scheduling)
- Queue-only repair for conversation (don't interrupt free production) is research-backed
- Cross-surface concept mastery (one score per KC regardless of exercise surface) matches ITS literature
- WebGPU now at 84%+ browser support — local AI is production-viable, not experimental
- FSRS-7 gives 20-30% review efficiency gain over fixed ladders — correctly deferred to v2

---

## Audio Infrastructure Path (Confirmed Viable)

| Component | Recommended | License | Ready? |
|---|---|---|---|
| TTS (batch) | edge-tts (nb-NO-PernilleNeural) | Microsoft ToS (free) | Yes |
| TTS (quality) | chatterbox-tts-norwegian (0.5B) | Non-commercial edu (confirm) | Yes on GPU |
| ASR (browser) | Web Speech API | Browser-native | Yes (Chrome) |
| ASR (server) | NB-Whisper Tiny (8.1% WER) | Apache 2.0 | Yes |
| Pronunciation | Self-listening + heuristic table | N/A | Built |
| Audio format | Opus/WebM 32kbps | Open standard | Yes |
| Content seed | NoCoLA (144K sentences) | Unconfirmed — verify | Pending |

---

## Sources Index

150+ sources across all 6 research agents. Full source lists in individual research outputs. Key highlights:
- BEA 2025 Shared Task on Pedagogical Ability (arXiv:2507.10579)
- Duolingo Birdbrain architecture (buildmvpfast.com)
- FSRS-5 benchmark on 700M reviews (migaku.com, github.com/open-spaced-repetition)
- WebLLM in-browser inference (arXiv:2412.15803)
- NB-Whisper Norwegian ASR (arXiv:2402.01917)
- Shadowing systematic review 2025 (tandfonline.com)
- Cross-modal vocabulary learning (sagepub.com, doi:10.1177/13621688211053525)
- Corrective feedback timing systematic review (PMC:9995700)
