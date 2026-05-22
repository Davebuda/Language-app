# codex advisor artifact

- Provider: codex
- Exit code: 0
- Created at: 2026-05-11T13:12:13.202Z

## Original task

Technical architecture brainstorm for NorskCoach — a Next.js + Supabase + WebLLM (WebGPU in-browser) Norwegian language learning app. Current feature: adaptive daily session with mistake fingerprint and repair loop. Propose the technical architecture and data models for these new features: (1) Voice conversation mode — user speaks Norwegian, browser STT captures it, local WebLLM model plays tutor role, responds with corrections and continues conversation, TTS plays back response; (2) Reading mode — long-form Norwegian texts with inline AI annotations, difficulty adaptation, comprehension questions; (3) Writing/essay feedback — user writes Norwegian, local model gives grammar/style feedback; (4) Shadowing mode — audio plays, user repeats, phoneme comparison; (5) Spaced repetition system for vocabulary across all modes. For each: what browser APIs to use (Web Speech API, WebGPU, AudioContext, etc.), data schema additions needed in Supabase, how WebLLM fits in, performance risks, and implementation priority order. Also: what is the most efficient way to share one loaded WebLLM model instance across all these features simultaneously?

## Final prompt

Technical architecture brainstorm for NorskCoach — a Next.js + Supabase + WebLLM (WebGPU in-browser) Norwegian language learning app. Current feature: adaptive daily session with mistake fingerprint and repair loop. Propose the technical architecture and data models for these new features: (1) Voice conversation mode — user speaks Norwegian, browser STT captures it, local WebLLM model plays tutor role, responds with corrections and continues conversation, TTS plays back response; (2) Reading mode — long-form Norwegian texts with inline AI annotations, difficulty adaptation, comprehension questions; (3) Writing/essay feedback — user writes Norwegian, local model gives grammar/style feedback; (4) Shadowing mode — audio plays, user repeats, phoneme comparison; (5) Spaced repetition system for vocabulary across all modes. For each: what browser APIs to use (Web Speech API, WebGPU, AudioContext, etc.), data schema additions needed in Supabase, how WebLLM fits in, performance risks, and implementation priority order. Also: what is the most efficient way to share one loaded WebLLM model instance across all these features simultaneously?

## Raw output

```text
**Architecture**
This should extend your current split of local AI + local fingerprint + Supabase content, not replace it. Keep the heavy and privacy-sensitive parts in-browser: one shared WebLLM runtime, mic/audio pipelines, transcript/annotation caches, and an offline sync queue in IndexedDB. Use Supabase for authoritative content, normalized progress events, and SRS state.

Minimum Supabase additions I’d make first:
- `learning_sessions(id, user_id, mode, content_ref_type, content_ref_id, cefr_level, started_at, ended_at, summary jsonb)`
- `learning_events(id, session_id, user_id, mode, event_type, concept_ids text[], vocab_item_ids uuid[], error_tags text[], payload jsonb, created_at)` as the append-only spine all modes write to
- `user_vocab_srs(user_id, vocab_item_id, next_due_at, stability, difficulty, interval_days, reps, lapses, last_reviewed_at, source_modes text[], primary key(user_id, vocab_item_id))`
- `vocab_forms(id, vocab_item_id, surface_form, lemma, morph jsonb)` so reading/conversation/writing can map inflected Norwegian forms back to one SRS card
- `content_vocab_mentions(content_type, content_id, vocab_item_id, start_char, end_char, surface_form)` for inline annotations and cross-mode vocab attribution

**Feature Map**
- `Voice conversation`: use `getUserMedia`, `SpeechRecognition`/`webkitSpeechRecognition`, `SpeechRecognition.processLocally` where available, `AudioContext` + `AnalyserNode` or `AudioWorklet` for VAD/level meter, and `speechSynthesis` for TTS; WebLLM should do tutor turn generation, implicit correction/rephrasing, background error tagging, and end-of-session summary; add `conversation_sessions`, `conversation_turns`, and extend `scenarios` with persona/success criteria; biggest risks are STT support/privacy, context growth, and mobile battery. `SpeechRecognition` is still limited-availability and may use server-side recognition on some browsers, so treat STT as an adapter, not a hardwired assumption.
- `Reading mode`: use a worker-backed WebLLM plus `IntersectionObserver` for lazy paragraph annotation and simple char-offset anchoring for highlights; WebLLM should annotate one paragraph/chunk at a time, score difficulty, generate glossary notes, and produce comprehension questions/grades; add `reading_texts`, `reading_segments`, `reading_questions`, `reading_attempts`; biggest risks are long-context latency and annotation drift, so chunk aggressively and cache per segment.
- `Writing / essay feedback`: browser API needs are light beyond the shared WebLLM worker, `AbortController`, and local draft persistence; WebLLM should return structured span-based feedback, rewrite suggestions, and one prioritized improvement; add `writing_prompts`, `writing_submissions`, `writing_feedback` or store only derived events if you want local-first privacy; biggest risks are long essays, hallucinated corrections, and inconsistent JSON, so cap length and require span references.
- `Shadowing mode`: use `getUserMedia`, `AudioContext`, `AudioBufferSourceNode` for accurate playback, `AudioWorklet` for capture/feature extraction, `AnalyserNode` for live feedback, `OfflineAudioContext` for post-hoc comparison, and `MediaRecorder` only if you save attempts; WebLLM should not do phoneme scoring directly, it should explain the results from a separate acoustic/phoneme scorer and generate targeted retry prompts; add `shadowing_clips`, `shadowing_attempts`, `pronunciation_scores`; biggest risks are mic latency, echo, and the fact that phoneme comparison is a separate model/problem from LLM inference.
- `Spaced repetition across all modes`: browser-side needs are mostly IndexedDB and optional PWA reminders later; WebLLM is useful for example sentences, distractors, and mnemonics, but not for scheduling; the real foundation is `user_vocab_srs`, `learning_events`, `vocab_forms`, and `content_vocab_mentions`; biggest risks are bad lemma normalization and sync conflicts, so schedule from normalized vocab IDs only.

**Priority**
1. Build the event spine and vocab normalization first: `learning_events`, `user_vocab_srs`, `vocab_forms`.
2. Ship writing feedback next: highest value, lowest browser complexity, reuses your current `reviewWriting` path.
3. Ship reading mode after that: same text-first runtime, strong SRS feed, no audio risk.
4. Ship voice conversation once the shared broker and SRS ingestion are stable.
5. Ship shadowing last: it is the most technically different feature because it needs a real acoustic scoring path, not just WebLLM.

**One Shared WebLLM**
The efficient pattern is one worker-backed singleton engine plus a broker, not one engine per route/component. In practice: create one `CreateWebWorkerMLCEngine` instance for the live app, enable IndexedDB model caching, and expose feature-specific RPC methods like `conversationTurn`, `annotateReadingChunk`, `reviewWriting`, and `summarizeShadowing`. Put a priority queue in front of it: interactive turn generation first, short feedback second, background annotation/question generation last, with cancellation. Do not try to run multiple generations truly in parallel on the same loaded model; multiplex them through one broker. If you specifically want the loaded model to survive page refreshes, WebLLM’s `CreateServiceWorkerMLCEngine` is the next step, but it is less reliable because the browser can kill the service worker, so I’d start with a dedicated worker and use the service-worker backend only if cross-refresh persistence becomes worth the complexity.

References: [WebLLM basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html), [WebLLM workers/service workers](https://webllm.mlc.ai/docs/user/advanced_usage.html), [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [MDN SpeechRecognition.processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN speechSynthesis](https://developer.mozilla.org/docs/Web/API/Window/speechSynthesis), [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext), [MDN WorkerNavigator.gpu](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/gpu).


OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\daveb\Documents\GitHub\Language-app
model: gpt-5.4
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: xhigh
reasoning summaries: none
session id: 019e1725-cce4-7233-bd08-cb8982b53ed9
--------
user
Technical architecture brainstorm for NorskCoach — a Next.js + Supabase + WebLLM (WebGPU in-browser) Norwegian language learning app. Current feature: adaptive daily session with mistake fingerprint and repair loop. Propose the technical architecture and data models for these new features: (1) Voice conversation mode — user speaks Norwegian, browser STT captures it, local WebLLM model plays tutor role, responds with corrections and continues conversation, TTS plays back response; (2) Reading mode — long-form Norwegian texts with inline AI annotations, difficulty adaptation, comprehension questions; (3) Writing/essay feedback — user writes Norwegian, local model gives grammar/style feedback; (4) Shadowing mode — audio plays, user repeats, phoneme comparison; (5) Spaced repetition system for vocabulary across all modes. For each: what browser APIs to use (Web Speech API, WebGPU, AudioContext, etc.), data schema additions needed in Supabase, how WebLLM fits in, performance risks, and implementation priority order. Also: what is the most efficient way to share one loaded WebLLM model instance across all these features simultaneously?
2026-05-11T13:06:54.113209Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer realm=\"OAuth\", resource_metadata=\"https://mcp.sentry.dev/.well-known/oauth-protected-resource\", error=\"invalid_token\", error_description=\"Missing or invalid access token\", resource_metadata=\"https://mcp.sentry.dev/.well-known/oauth-protected-resource/mcp\"" })
2026-05-11T13:06:54.163869Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer error=\"invalid_request\", error_description=\"No access token was provided in this request\", resource_metadata=\"https://mcp.supabase.com/.well-known/oauth-protected-resource/mcp\"" })
codex
I’m going to inspect the current Next.js/Supabase app shape first, then I’ll map the new modes onto that structure and verify the browser/API recommendations against current primary docs.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-ChildItem -Force' in C:\Users\daveb\Documents\GitHub\Language-app
 succeeded in 200ms:
 M next.config.ts
 M package-lock.json
 M src/components/onboarding/OnboardingFlow.tsx
?? .omc/state/hud-stdin-cache.json
?? .omc/state/sessions/

 succeeded in 282ms:


    Directory: C:\Users\daveb\Documents\GitHub\Language-app


Mode                 LastWriteTime         Length Name                                                                 
----                 -------------         ------ ----                                                                 
d-----         5/11/2026   2:31 PM                .claude                                                              
d--h--         5/11/2026   2:37 PM                .git                                                                 
d-----         5/11/2026   2:49 PM                .next                                                                
d-----         5/11/2026   2:31 PM                .omc                                                                 
d-----         5/11/2026   2:31 PM                .planning                                                            
d-----         5/11/2026   2:31 PM                .superpowers                                                         
d-----         5/11/2026   2:31 PM                content                                                              
d-----         5/11/2026   2:31 PM                docs                                                                 
d-----         5/11/2026   2:43 PM                node_modules                                                         
d-----         5/11/2026   2:31 PM                scripts                                                              
d-----         5/11/2026   2:31 PM                src                                                                  
d-----         5/11/2026   2:31 PM                supabase                                                             
d-----         5/11/2026   2:31 PM                tests                                                                
-a----         5/11/2026   2:42 PM           1004 .env.local                                                           
-a----         5/11/2026   2:31 PM            996 .env.local.example                                                   
-a----         5/11/2026   2:31 PM            430 .eslintrc.json                                                       
-a----         5/11/2026   2:31 PM             68 .gitattributes                                                       
-a----         5/11/2026   2:31 PM             64 .gitignore                                                           
-a----         5/11/2026   2:31 PM           5741 CLAUDE.md                                                            
-a----         5/11/2026   2:31 PM            467 components.json                                                      
-a----         5/11/2026   2:31 PM            268 next-env.d.ts                                                        
-a----         5/11/2026   2:44 PM            340 next.config.ts                                                       
-a----         5/11/2026   2:43 PM         330510 package-lock.json                                                    
-a----         5/11/2026   2:31 PM           1603 package.json                                                         
-a----         5/11/2026   2:31 PM            164 postcss.config.mjs                                                   
-a----         5/11/2026   2:31 PM          19631 REVIEW.md                                                            
-a----         5/11/2026   2:31 PM           4398 tailwind.config.ts                                                   
-a----         5/11/2026   2:31 PM            656 tsconfig.json                                                        
-a----         5/11/2026   2:31 PM            393 vitest.config.ts                                                     



 succeeded in 524ms:
vitest.config.ts
tsconfig.json
tests\setup.ts
tests\hooks\useSession.test.ts
tests\hooks\useFingerprint.test.ts
tests\exercises\word-order.test.ts
components.json
CLAUDE.md
tests\exercises\translation.test.ts
tests\exercises\speed-round.test.ts
tests\exercises\listening.test.ts
tailwind.config.ts
tests\exercises\fill-in-blank.test.ts
package-lock.json
next.config.ts
next-env.d.ts
REVIEW.md
package.json
postcss.config.mjs
scripts\seed-content.ts
scripts\generate-content.ts
supabase\migrations\001_content_schema.sql
content\taxonomy\errors.json
docs\norwegian-app-brainstorm-v3.md
docs\norwegian-app-brainstorm-v2.md
docs\claude-code-environment-prep.md
docs\ai-layer-spec.md
docs\skills-and-subagents-plan.md
docs\norwegian-app-brainstorm.md
src\types\taxonomy.ts
src\types\session.ts
src\types\fingerprint.ts
src\types\content.ts
src\types\concepts.ts
content\sentences\a2.json
content\sentences\a1.json
content\concepts\a1-graph.json
content\concepts\a2-graph.json
docs\superpowers\specs\2026-05-11-norskcoach-frontend-design.md
src\middleware.ts
src\engine\scheduler.ts
src\engine\repair-loop.ts
src\engine\index.ts
src\engine\fingerprint.ts
src\engine\diagnosis.ts
src\stores\session-store.ts
src\stores\fingerprint-store.ts
src\stores\ai-status-store.ts
docs\superpowers\plans\2026-05-11-norskcoach-frontend.md
src\lib\utils.ts
src\storage\supabase.ts
src\storage\indexeddb.ts
src\lib\content-loader.ts
src\lib\concept-colors.ts
src\lib\answer.ts
src\ai\webllm.ts
src\ai\validate.ts
src\ai\types.ts
src\ai\stub.ts
src\ai\prompts.ts
src\ai\index.ts
src\app\layout.tsx
src\app\globals.css
src\lib\supabase\server.ts
src\lib\supabase\client.ts
src\lib\streak.ts
src\lib\mock-sentences.ts
src\lib\grammar-explainers.ts
src\hooks\useSession.ts
src\hooks\useFingerprint.ts
src\hooks\useExercise.ts
src\hooks\useAuth.ts
src\components\ui\button.tsx
src\components\layout\GuestBanner.tsx
src\components\layout\BottomNav.tsx
src\app\dashboard\page.tsx
src\app\session\page.tsx
src\components\concept\GrammarExplainerCard.tsx
src\components\session\SessionScreen.tsx
src\components\session\ScoreCircle.tsx
src\components\session\ProgressBar.tsx
src\components\session\ExplanationCard.tsx
src\components\landing\waitlist-form.tsx
src\components\landing\value-props.tsx
src\components\landing\StartButton.tsx
src\components\landing\diagnostic-hero.tsx
src\app\profile\page.tsx
src\app\page.tsx
src\components\session\ExerciseCard.tsx
src\app\auth\callback\route.ts
src\app\session\complete\page.tsx
src\components\ai\AIStatusBadge.tsx
src\app\onboarding\page.tsx
src\components\session\exercises\SpeedRound.tsx
src\components\session\exercises\ListeningExercise.tsx
src\components\session\exercises\FillInBlankExercise.tsx
src\components\session\exercises\WordOrderExercise.tsx
src\components\session\exercises\TranslationExercise.tsx
src\components\session\exercises\WordOrderExerciseLazy.tsx
src\app\login\page.tsx
src\components\progress\ConceptProgressRow.tsx
src\app\progress\page.tsx
src\components\onboarding\OnboardingFlow.tsx
src\components\onboarding\PlacementQuiz.tsx

codex
I’ve confirmed the app already has a local AI layer, IndexedDB storage, and a session engine. Next I’m reading those pieces plus the Supabase schema so the architecture proposal matches what already exists instead of inventing a parallel system.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content package.json' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\ai\\webllm.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\storage\\indexeddb.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content supabase\\migrations\\001_content_schema.sql" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\ai-layer-spec.md" in C:\Users\daveb\Documents\GitHub\Language-app
 succeeded in 210ms:
{
  "name": "norskcoach",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.95.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@mlc-ai/web-llm": "^0.2.83",
    "@radix-ui/react-slot": "^1.1.2",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.18.2",
    "howler": "^2.2.4",
    "idb": "^8.0.2",
    "lucide-react": "^0.511.0",
    "motion": "^11.18.2",
    "next": "^15.3.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tailwind-merge": "^3.3.0",
    "zod": "^3.24.4",
    "zustand": "^5.0.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/howler": "^2.2.12",
    "@types/node": "^22.15.17",
    "@types/react": "^19.1.4",
    "@types/react-dom": "^19.1.3",
    "@vitest/coverage-v8": "^4.1.5",
    "autoprefixer": "^10.4.21",
    "dotenv": "^17.4.2",
    "eslint": "^9.26.0",
    "eslint-config-next": "^15.3.2",
    "jsdom": "^29.1.1",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.21.0",
    "typescript": "^5.8.3",
    "vitest": "^4.1.5"
  }
}

 succeeded in 215ms:
// Local fingerprint persistence using IndexedDB (via idb library).
// The fingerprint lives on the device â€” it never leaves without user consent.

import { openDB, type IDBPDatabase } from 'idb';
import type { MistakeFingerprint } from '@/types/fingerprint';

const DB_NAME = 'norsk-coach';
const DB_VERSION = 1;
const FINGERPRINT_STORE = 'fingerprints';

async function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') throw new Error('IndexedDB unavailable on server');
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FINGERPRINT_STORE)) {
        db.createObjectStore(FINGERPRINT_STORE, { keyPath: 'userId' });
      }
    },
  });
}

export async function saveFingerprint(fingerprint: MistakeFingerprint): Promise<void> {
  const db = await getDB();
  await db.put(FINGERPRINT_STORE, fingerprint);
}

export async function loadFingerprint(userId: string): Promise<MistakeFingerprint | null> {
  const db = await getDB();
  const result = await db.get(FINGERPRINT_STORE, userId);
  return result ?? null;
}

export async function deleteFingerprint(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(FINGERPRINT_STORE, userId);
}

export async function getAllFingerprints(): Promise<MistakeFingerprint[]> {
  const db = await getDB();
  return db.getAll(FINGERPRINT_STORE);
}

 succeeded in 226ms:
import type {
  AIService,
  ExplainParams,
  Explanation,
  GenerateParams,
  TaggedError,
  ReviewParams,
  WritingFeedback,
} from './types';
import type { ResolvedContent } from '@/types/content';
import type { CEFRLevel } from '@/types/fingerprint';
import { buildGenerationPrompt, buildExplanationPrompt } from './prompts';
import { validateGenerated } from './validate';

// Primary model: 3B params, ~2 GB VRAM, good multilingual instruction following.
// Falls back gracefully to template responses until the model is loaded.
const MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
const MAX_RETRIES = 2;

type LoadState = 'idle' | 'loading' | 'ready' | 'unavailable';

// Typed subset of the WebLLM engine API we use
interface MLCEngine {
  chat: {
    completions: {
      create(opts: {
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: 'json_object' | 'text' };
        max_tokens?: number;
        temperature?: number;
      }): Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

function difficultyTier(masteryScore?: number): 1 | 2 | 3 {
  if (!masteryScore || masteryScore < 40) return 1;
  if (masteryScore < 70) return 2;
  return 3;
}

// Template explanation used when model is not ready â€” personalized by referencing
// the learner's actual wrong/correct answers and error count.
function templateExplanation(params: ExplainParams): string {
  const countNote =
    params.errorCount && params.errorCount > 2
      ? ` You've hit this ${params.errorCount} times â€” make this a focus point.`
      : '';

  const byTag: Partial<Record<string, string>> = {
    'word-order':
      `You wrote "${params.wrong}". Norwegian uses the V2 rule â€” the finite verb must sit in position 2 of the main clause. Correct: "${params.correct}".`,
    'negation-placement':
      `You wrote "${params.wrong}". "Ikke" follows the finite verb in main clauses: "${params.correct}". In subordinate clauses it comes before the verb.`,
    'noun-gender':
      `You wrote "${params.wrong}". Norwegian nouns have three genders (en/ei/et) that govern articles and adjective endings. Correct: "${params.correct}".`,
    'article-use':
      `You wrote "${params.wrong}". The definite article is a suffix in Norwegian: -en (en-words), -a or -en (ei-words), -et (et-words). Correct: "${params.correct}".`,
    'verb-conjugation':
      `You wrote "${params.wrong}". Norwegian verbs take the same form for all persons â€” present tense adds -r to the stem. Correct: "${params.correct}".`,
    'adjective-agreement':
      `You wrote "${params.wrong}". Adjectives must agree with noun gender: stor (en/ei), stort (et), store (definite or plural). Correct: "${params.correct}".`,
    'modal-verb':
      `You wrote "${params.wrong}". Modal verbs (kan, vil, skal, mÃ¥) take a bare infinitive â€” no "Ã¥". Correct: "${params.correct}".`,
    preposition:
      `You wrote "${params.wrong}". Norwegian prepositions don't map 1-to-1 to English: i (in/at enclosed places), pÃ¥ (on/at open places), til (direction). Correct: "${params.correct}".`,
  };

  const base =
    byTag[params.errorTag] ??
    `You wrote "${params.wrong}". The correct answer is "${params.correct}". Review this concept and try again.`;

  return base + countNote;
}

export class WebLLMService implements AIService {
  private engine: MLCEngine | null = null;
  private state: LoadState = 'idle';
  private loadPromise: Promise<void> | null = null;
  readonly onProgress?: (pct: number) => void;

  constructor(onProgress?: (pct: number) => void) {
    this.onProgress = onProgress;
  }

  async init(): Promise<void> {
    if (this.state === 'ready' || this.state === 'unavailable') return;
    if (this.loadPromise) return this.loadPromise;

    this.state = 'loading';
    this.loadPromise = this._load();
    return this.loadPromise;
  }

  private async _load(): Promise<void> {
    if (typeof window === 'undefined' || !('gpu' in navigator)) {
      this.state = 'unavailable';
      // Notify store asynchronously â€” store may not be imported in SSR
      import('@/stores/ai-status-store').then(({ useAIStatusStore }) => {
        useAIStatusStore.getState().setState('unavailable');
      }).catch(() => {});
      return;
    }
    try {
      const [{ CreateMLCEngine }, { useAIStatusStore }] = await Promise.all([
        import('@mlc-ai/web-llm'),
        import('@/stores/ai-status-store'),
      ]);
      useAIStatusStore.getState().setState('loading');
      this.engine = (await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report: { progress: number }) => {
          const pct = Math.round(report.progress * 100);
          this.onProgress?.(pct);
          useAIStatusStore.getState().setLoadingPct(pct);
        },
      })) as unknown as MLCEngine;
      this.state = 'ready';
      useAIStatusStore.getState().setState('ready');
    } catch (err) {
      console.warn('[WebLLM] Model load failed:', err);
      this.state = 'unavailable';
      import('@/stores/ai-status-store').then(({ useAIStatusStore }) => {
        useAIStatusStore.getState().setState('unavailable');
      }).catch(() => {});
    }
  }

  // isAvailable: the service could eventually produce output (not permanently failed).
  // isReady: the model is loaded and can produce output RIGHT NOW.
  // Callers that want to show a loading indicator should check !isReady() && isAvailable().
  isAvailable(): boolean {
    return this.state !== 'unavailable';
  }

  isReady(): boolean {
    return this.state === 'ready' && this.engine !== null;
  }

  private async complete(
    system: string,
    user: string,
    json: boolean,
  ): Promise<string> {
    if (!this.engine) throw new Error('engine not ready');
    const res = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: 400,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content ?? '';
  }

  async generateContent(params: GenerateParams): Promise<ResolvedContent | null> {
    if (!this.isReady()) return null;

    const { system, user } = buildGenerationPrompt(params);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await this.complete(system, user, true);
        const parsed: unknown = JSON.parse(raw);
        const result = validateGenerated(parsed, params);

        if (!result.valid) {
          console.warn(`[WebLLM] validation failed (attempt ${attempt + 1}): ${result.error}`);
          continue;
        }

        const { content } = result;
        return {
          id: crypto.randomUUID(),
          norwegian: content.norwegian,
          english: content.english,
          notes: content.notes,
          conceptIds: [params.conceptId],
          vocabularyClusters: [],
          errorTagsDetectable: params.recentErrors ?? [],
          cefrLevel: params.level,
          difficulty: difficultyTier(params.masteryScore),
          exerciseTypes: [params.exerciseType],
          audioUrl: undefined,
          scenarioId: content.scenarioId,
          source: 'generated',
          distractors: content.distractors,
        };
      } catch (err) {
        console.warn(`[WebLLM] generation error (attempt ${attempt + 1}):`, err);
      }
    }

    return null;
  }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    if (!this.isReady()) {
      return { text: templateExplanation(params), source: 'template' };
    }
    try {
      const { system, user } = buildExplanationPrompt(params);
      const text = await this.complete(system, user, false);
      return { text: text.trim(), source: 'ai' };
    } catch {
      return { text: templateExplanation(params), source: 'template' };
    }
  }

  async detectErrors(_text: string, _level: CEFRLevel): Promise<TaggedError[]> {
    return [];
  }

  async reviewWriting(_params: ReviewParams): Promise<WritingFeedback> {
    return {
      errors: [],
      praise: 'Good attempt! Keep writing in Norwegian.',
      suggestion: 'Focus on getting the word order right â€” verb second in main clauses.',
      source: 'template',
    };
  }
}

 succeeded in 226ms:
-- NorskCoach: Phase 2 content schema
-- Apply via: Supabase Dashboard â†’ SQL Editor â†’ paste and run

-- 1. scenarios (no FK deps â€” create first)
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  setting text not null,
  character_role text not null,
  target_concept_ids text[] not null default '{}',
  target_vocab_cluster_ids text[] not null default '{}',
  cefr_level_min text not null check (cefr_level_min in ('A1','A2','B1','B2')),
  cefr_level_max text not null check (cefr_level_max in ('A1','A2','B1','B2')),
  opening_line text,
  created_at timestamptz default now()
);

-- 2. vocab_clusters
create table if not exists vocab_clusters (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  word_count int not null default 0,
  created_at timestamptz default now()
);

-- 3. sentences (audio_url stores Supabase Storage public URLs)
create table if not exists sentences (
  id uuid primary key,                    -- stable UUID from seed JSON
  norwegian text not null,
  english text not null,
  concept_ids text[] not null default '{}',
  vocab_clusters text[] not null default '{}',
  error_tags_detectable text[] not null default '{}',
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  difficulty smallint not null check (difficulty in (1,2,3)),
  scenario_id uuid references scenarios(id),
  audio_url text,
  exercise_types text[] not null default '{}',
  notes text,
  created_at timestamptz default now()
);

create index if not exists sentences_cefr_level_idx on sentences(cefr_level);
create index if not exists sentences_concept_ids_idx on sentences using gin(concept_ids);
create index if not exists sentences_vocab_clusters_idx on sentences using gin(vocab_clusters);
create index if not exists sentences_exercise_types_idx on sentences using gin(exercise_types);

-- 4. vocab_items
create table if not exists vocab_items (
  id uuid primary key default gen_random_uuid(),
  norwegian text not null,
  english text not null,
  word_class text not null check (word_class in ('noun','verb','adjective','adverb','preposition','conjunction','pronoun','numeral','other')),
  gender text check (gender in ('en','ei','et')),
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  cluster_id uuid references vocab_clusters(id),
  frequency int not null,
  audio_url text,
  example_sentence_id uuid references sentences(id),
  created_at timestamptz default now()
);

create index if not exists vocab_items_cefr_level_idx on vocab_items(cefr_level);
create index if not exists vocab_items_cluster_id_idx on vocab_items(cluster_id);

-- 5. waitlist (idempotent â€” may already exist from Phase 1)
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

-- 6. fingerprint_sync (opt-in, Phase 3+)
create table if not exists fingerprint_sync (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table sentences enable row level security;
alter table vocab_items enable row level security;
alter table vocab_clusters enable row level security;
alter table scenarios enable row level security;
alter table waitlist enable row level security;
alter table fingerprint_sync enable row level security;

-- Public read for content tables
drop policy if exists "Public read" on sentences;
create policy "Public read" on sentences for select using (true);

drop policy if exists "Public read" on vocab_items;
create policy "Public read" on vocab_items for select using (true);

drop policy if exists "Public read" on vocab_clusters;
create policy "Public read" on vocab_clusters for select using (true);

drop policy if exists "Public read" on scenarios;
create policy "Public read" on scenarios for select using (true);

-- Waitlist: anonymous insert only
drop policy if exists "Anyone can join" on waitlist;
create policy "Anyone can join" on waitlist for insert with check (true);

-- fingerprint_sync: user owns their row
drop policy if exists "User owns fingerprint" on fingerprint_sync;
create policy "User owns fingerprint" on fingerprint_sync
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

 succeeded in 260ms:
# AI Layer Spec â€” The Local Model That Powers Everything

*The decision, the architecture, and the build plan for the on-device AI in the Norwegian app. Pair with brainstorm v3 and the skills/subagents plan. Ship to Claude Code.*

---

## 1. The Decision (Short Version)

**Primary model: Gemma 3n E4B (instruction-tuned, 4-bit quantized).**
**Fallback for older iPhones: Gemma 3n E2B.**
**Runtime: MLX Swift.**
**Comparison candidate to test against: Qwen 2.5 / 3 4B.**

One model powers everything â€” mistake explanations, sentence variations, free-writing feedback, error detection, and the conversation tutor. Different system prompts, same engine.

Why these choices, in detail below.

---

## 2. Why Gemma 3n E4B

Five reasons, in order of importance:

**Built for mobile from the architecture up.** Gemma 3n is Google DeepMind's mobile-first model family. It uses Per-Layer Embedding caching and selective parameter activation â€” so the E4B variant has 8B raw parameters but runs with the memory footprint of a ~4B model (roughly 3 GB after 4-bit quantization). This isn't a desktop model squeezed onto a phone; it's designed for the constraints we have.

**140+ language training, including Germanic.** Gemma 3n was trained on data spanning 140+ languages. Real-world testing on iPhone shows Gemma handling Dutch well â€” Dutch and Norwegian are close cousins (Germanic family, similar grammatical complexity, similar resource profile in training data). The probability of strong Norwegian performance is high. We still verify with testing, but the prior is good.

**MLX Swift native, battle-tested.** Multiple production iOS apps already ship Gemma 3n via MLX Swift. The plumbing exists, the quantizations exist, the issues are known. We don't need to be the team that figures out if it works at all.

**Apache 2.0 licensed.** Free for commercial use. No royalties, no usage caps, no licensing risk for the project's future commercial path.

**Smooth upgrade path to Gemma 4.** Google shipped Gemma 4 (also with E2B and E4B variants) in April 2026. Architecturally similar. When Gemma 4 has more iOS production miles, swap in. We don't need to bet on Gemma 4 yet, but we don't get locked out either.

---

## 3. Why MLX Swift (Not MediaPipe, Not llama.cpp)

**MLX Swift is Apple's own framework**, written specifically for Apple Silicon. It runs on the GPU via Metal, uses unified memory directly, and benchmarks faster than the alternatives on iOS for our exact use case.

**MediaPipe (Google's option)** also works on iOS but it's LiteRT â€” built primarily for Android NPUs and translated to Metal for iOS. That extra translation step costs performance and the iOS model selection on MediaPipe is smaller.

**llama.cpp via Swift bindings** works and is more universal across model formats (GGUF), but it's slower than MLX on Apple Silicon and the Swift wrappers are community-maintained rather than Apple-supported.

For an iOS-first app on Apple Silicon, MLX Swift is the obvious choice. Decision closed.

If we ever ship Android (Phase 4), MediaPipe becomes the equivalent answer there.

---

## 4. Why a Smaller Model Is Actually the Right Call

We're not trying to build ChatGPT. We're building a Norwegian coach. The tasks the model has to do are well-defined:

- Explain a single grammar mistake in plain language (50-token output)
- Generate a Norwegian sentence with constraints (15-token output)
- Identify errors in a Norwegian sentence and tag them (structured JSON output)
- Hold a basic conversation in Norwegian at a controlled level (50-100 token outputs, multiple turns)
- Review 1-3 sentences of free writing and flag errors (structured output)

None of these need GPT-4-level reasoning. They need solid Norwegian competence and reliable instruction following. Gemma 3n E4B is way past the threshold for these tasks. Going bigger costs us battery, RAM, latency, and download size â€” without buying us anything the user notices.

The honest framing: **constrain the model with great prompts and structured outputs; don't need a giant model to do small jobs.**

---

## 5. The Unified Architecture (One Model, Many Tasks)

The AI layer is a single Swift module: `AI/`. Inside it, one shared model serves all tasks. The structure:

```
ios/NorwegianCoach/AI/
â”œâ”€â”€ ModelService.swift         // Singleton: load, unload, infer
â”œâ”€â”€ DeviceCapability.swift     // Detect chip + RAM, pick variant
â”œâ”€â”€ PromptLibrary.swift        // All prompt templates, versioned
â”œâ”€â”€ Tasks/
â”‚   â”œâ”€â”€ MistakeExplainer.swift     // Task 1
â”‚   â”œâ”€â”€ SentenceGenerator.swift    // Task 2
â”‚   â”œâ”€â”€ ErrorDetector.swift        // Task 3
â”‚   â”œâ”€â”€ ConversationManager.swift  // Task 4 (multi-turn)
â”‚   â””â”€â”€ WritingReviewer.swift      // Task 5
â”œâ”€â”€ Fallbacks/
â”‚   â”œâ”€â”€ TemplateExplainer.swift    // Fallback for Task 1
â”‚   â”œâ”€â”€ PreGeneratedPool.swift     // Fallback for Task 2
â”‚   â””â”€â”€ RuleBasedDetector.swift    // Fallback for Task 3 (basic)
â””â”€â”€ Types/
    â”œâ”€â”€ Explanation.swift
    â”œâ”€â”€ Feedback.swift
    â”œâ”€â”€ TaggedError.swift
    â””â”€â”€ ConversationTurn.swift
```

**ModelService** holds the loaded model and exposes `infer(prompt:, params:)`. It handles:
- Loading the model on first use (not on app launch â€” too slow)
- Unloading when memory is tight
- Queueing concurrent calls (one inference at a time)
- KV-cache reuse for multi-turn conversation
- Streaming output for conversation, batch output for everything else

**Each Task class** wraps a specific use case with its own prompt template, generation parameters, and output parser. They depend on `ModelService` but don't know about each other. Adding a new AI feature later means adding a new Task â€” no changes elsewhere.

**Fallbacks** are concrete classes that implement the same protocol as the Task classes. If the model isn't available (low RAM device, model failed to load, inference timed out), the Task falls back automatically. The user gets a degraded but still functional experience.

**The PromptLibrary** is the single source of truth for prompts. Versioned. When a prompt changes, log the version with each interaction so we can correlate quality changes to prompt changes.

---

## 6. Each Task in Detail

### 6.1 Mistake Explainer

**Job:** Given a wrong answer and a correct answer plus the concept being practiced, write a one or two sentence explanation in plain language.

**Trigger:** Step 2 of the repair loop (every wrong answer).

**Prompt template (paraphrased):**
```
You are a Norwegian language tutor. The student is at level {level}.
They wrote: "{wrong}"
The correct version is: "{correct}"
The grammar concept being practiced: {concept}
The error type: {error_tag}

Write a one-sentence explanation of why their answer is wrong, in English.
Be specific about the rule. Be kind. Don't be condescending.
```

**Generation parameters:** temperature 0.2, max tokens 80, structured output (just text).

**Why these parameters:** low temperature for consistency. Short output because anything longer than 1-2 sentences breaks the repair loop's flow.

**Fallback:** A template library keyed on `(error_tag, concept)`. Pre-written explanations covering the common cases. Less personal but still clear.

**Latency target:** under 1 second on iPhone 15 Pro. The user is staring at the wrong-answer screen waiting for it.

### 6.2 Sentence Generator

**Job:** Given a concept, scenario, and level, generate a fresh Norwegian sentence the engine can use as an exercise.

**Trigger:** When the engine wants variety beyond pre-authored content.

**Prompt template:**
```
Generate one Norwegian sentence at level {level}.
The sentence must demonstrate the grammar concept: {concept}.
The sentence should fit the scenario: {scenario}.
Vocabulary should stay within the {level} word list.
Output only the sentence, nothing else.
```

**Generation parameters:** temperature 0.7 (we want variation), max tokens 30.

**Validation step:** After generation, run the ErrorDetector on the sentence. If it has errors, regenerate. If it passes 3 attempts and still has issues, fall back to pre-authored content.

**Fallback:** Pre-generated content pool. The engine never *needs* to generate live â€” it just gets richer variety when the model is available.

**Latency target:** under 2 seconds (generation can happen during the brief "loading next exercise" moment).

### 6.3 Error Detector

**Job:** Given a Norwegian sentence written by the user, identify all grammatical errors and tag them according to the error taxonomy.

**Trigger:** After every free-writing input and every conversation turn.

**Prompt template:**
```
The user is learning Norwegian. They wrote: "{sentence}"
Their level is {level}.

Identify any grammatical errors. For each error, output:
{
  "tag": "<one of: word_order, verb_tense, noun_gender, article, adjective_agreement, pronoun, preposition, modal, negation, compound, vocabulary, spelling>",
  "wrong": "<the wrong portion>",
  "correct": "<what it should be>",
  "brief_why": "<short reason in English>"
}

If no errors, output: []
Output only the JSON array. No prose.
```

**Generation parameters:** temperature 0.1, max tokens 250, JSON-mode if available.

**Critical:** The output must be parsed into typed Swift structs. If parsing fails, log it (we want to fix the prompt) and treat as "no errors detected" rather than crash.

**Fallback:** A simple rule-based checker for the most common errors (gender mismatches via dictionary, V2 word order via pattern matching). Catches less than the model but never misses obvious things.

**Latency target:** under 1.5 seconds.

### 6.4 Conversation Manager (The Tutor)

This is the big one. Detailed in Section 7.

### 6.5 Writing Reviewer

**Job:** Given a 1-3 sentence free-writing submission, review it holistically â€” errors, naturalness, vocabulary appropriateness â€” and return structured feedback.

**Trigger:** End of free-writing exercises.

**Prompt template:**
```
The user is learning Norwegian at level {level}. They wrote:
"{user_text}"

The prompt was: "{writing_prompt}"

Review the writing. Output JSON:
{
  "errors": [<error objects same as ErrorDetector output>],
  "praise": "<one short sentence in English about what they did well>",
  "suggestion": "<one short sentence in English with the most impactful improvement>"
}
```

**Generation parameters:** temperature 0.3, max tokens 400.

**Why two outputs (errors + praise + suggestion):** The repair loop handles the errors mechanically. The praise and suggestion give the user qualitative feedback that feels coach-like. Neither is necessary, both make the experience better.

**Fallback:** Run only the rule-based ErrorDetector. Skip praise and suggestion if no model available. Still useful, just less coach-y.

**Latency target:** under 3 seconds (user just finished writing, slight delay is acceptable).

---

## 7. Conversation Mode in Detail

The most architecturally interesting feature, and the one that needs the most care.

### 7.1 What It Is

The user picks a scenario ("ordering coffee at a cafÃ© in Oslo," "asking for directions," "introducing yourself at work"). The app puts them into a back-and-forth Norwegian conversation with a character. The character speaks at the user's level, gently corrects their mistakes by rephrasing what they meant, and stays in character. After the conversation ends, the app logs every error the user made against their mistake fingerprint.

### 7.2 What It Is Not

- It's not unconstrained chat. The scenarios are bounded so the model can't drift.
- It's not a replacement for human conversation. It's a low-stakes practice space.
- It's not pretending to be ChatGPT. Responses are short, focused, role-locked.

### 7.3 The Architecture

```
ConversationManager
â”œâ”€â”€ State
â”‚   â”œâ”€â”€ scenario: Scenario
â”‚   â”œâ”€â”€ level: CEFRLevel
â”‚   â”œâ”€â”€ history: [Message]
â”‚   â””â”€â”€ kvCache: ModelKVCache?  (for fast continuation)
â”œâ”€â”€ Methods
â”‚   â”œâ”€â”€ start(scenario, level) -> opening message
â”‚   â”œâ”€â”€ send(userMessage) -> assistantMessage (streaming)
â”‚   â”œâ”€â”€ end() -> ConversationSummary
â”‚   â””â”€â”€ reset()
â””â”€â”€ Parallel
    â””â”€â”€ ErrorDetector running on each user message in background
```

When the conversation starts, ConversationManager:
1. Builds the system prompt from the scenario and level
2. Calls ModelService for an opening line
3. Returns it to the UI to display

When the user sends a message:
1. Append user's message to history
2. Fire two concurrent tasks:
   - **Foreground:** Generate assistant response with full history + system prompt, stream tokens to UI
   - **Background:** Run ErrorDetector on user's message, get tagged errors, push to MistakeFingerprint
3. Append assistant's full response to history
4. Wait for ErrorDetector to finish (usually done before assistant response anyway)

When the conversation ends:
1. Generate a summary using a different prompt: "List the concepts the user practiced and how well they did. Output JSON."
2. Update mastery scores in the fingerprint based on summary + accumulated errors
3. Show a brief "you practiced X, struggled with Y, did great on Z" screen

### 7.4 The System Prompt for the Tutor

This is the most important piece. Sample structure:

```
You are {character_role} in {scenario_setting}. The user is a Norwegian learner at level {level}.

CONSTRAINTS:
- Speak only Norwegian (BokmÃ¥l).
- Use only vocabulary at level {level} or below. Approved word list will be your training; if unsure, prefer common words.
- Keep your responses to {max_words_per_response} words or fewer.
- Stay in character as {character_role}. Don't break frame.
- If the user makes a grammatical mistake, do not correct them directly. Instead, naturally rephrase what they meant in your next reply, using the correct form. Continue the conversation.
- If the user uses English, respond in Norwegian and gently encourage them to try in Norwegian.
- Do not teach grammar inside the conversation. Just have the conversation.
- Keep questions short. Don't lecture.

SCENARIO CONTEXT:
{scenario_setup}

Begin the conversation.
```

Per-level configuration:
- **A1:** max 8 words per response, vocab from top 500
- **A2:** max 12 words per response, vocab from top 1000
- **B1:** max 20 words per response, vocab from top 2000
- **B2:** max 30 words per response, full grammar, idioms allowed

### 7.5 Scenarios as Content

Scenarios are content, not code. They live in the content database with fields:
- `id`
- `title` (English)
- `setting` (e.g., "cafÃ© in Oslo, mid-afternoon")
- `character_role` (e.g., "barista named Kari")
- `character_personality` (e.g., "friendly but busy")
- `opening_line` (pre-written, in case the model is unavailable; otherwise model-generated)
- `target_concepts` (which grammar this scenario exercises)
- `target_vocab` (which vocab clusters)
- `level_range` (which CEFR levels it works for)
- `success_criteria` (what counts as the user "completing" the scenario)

This means scenarios are added through the content authoring pipeline like sentences. The `content-author` subagent generates them, the `norwegian-linguist` subagent reviews them, the `content-validator` subagent confirms they're complete.

### 7.6 Catching Errors During Conversation

The model in conversation mode is in *character*. We don't ask it to also be a grammar checker â€” that would split its attention and degrade both jobs.

Instead, error detection runs as a **separate inference call** in parallel. Same model, different prompt, fresh context. It just sees: "This user wrote X. Find errors. Output JSON."

This means each user turn triggers two inference calls. On a recent iPhone, both finish before the user reads the response. On older devices, the error detection might lag a turn behind â€” that's fine, it just queues.

The errors get tagged and pushed into MistakeFingerprint. From the fingerprint's perspective, conversation errors look the same as exercise errors. The engine doesn't care where they came from.

### 7.7 What Happens When The User Says Something Off-Script

Edge cases the system prompt + scenario design needs to handle:

- **User goes way off-topic:** Character gently steers back. "Det hÃ¸res interessant ut, men kan jeg fÃ¥ bestillingen din fÃ¸rst?" (Sounds interesting, but can I take your order first?)
- **User uses English:** Character responds in Norwegian, encourages trying in Norwegian. "PrÃ¸v Ã¥ si det pÃ¥ norsk?"
- **User asks for help/translation:** This is fine. Character can give a hint in simple Norwegian or repeat slowly. Not a teacher mode, but helpful.
- **User says something inappropriate:** Standard refusal patterns. Models are trained on this. Worst case the conversation ends gracefully.
- **User goes silent:** Timeout after N seconds, character prompts gently. "Hva tenker du?"

These are all handled by the system prompt design plus model capability. We don't need separate code paths.

### 7.8 Performance Targets

- **First-token latency:** under 800ms on iPhone 15 Pro for assistant response
- **Sustained generation:** 20+ tokens/sec on iPhone 15 Pro
- **Memory:** under 4 GB total app memory during conversation
- **Battery:** under 5% drain per 15-minute conversation

These are based on real-world measurements of Gemma 3n E4B on similar hardware. Older devices fall back to E2B (smaller, faster, slightly less capable) or to scripted dialogues.

---

## 8. Device Tiering

Not all iPhones can run a 3 GB model well. We need explicit tiers.

| Device class | Capability | What we ship |
|---|---|---|
| iPhone 15 Pro / 16 / 17, M-series iPad | Full | Gemma 3n E4B, all features |
| iPhone 14 Pro, 15 (non-Pro) | Tight | Gemma 3n E2B, all features |
| iPhone 13, 14 (non-Pro) | Limited | Gemma 3n E2B, conversation may be slower |
| iPhone 12 and older, SE | Fallback | No model. All features fall back to templates and rule-based. |
| Apple Intelligence-capable (iPhone 15 Pro+ on iOS 18+) | Optional | Apple Foundation Models for the simplest tasks (mistake explanations) when battery is low |

`DeviceCapability.swift` detects the device on first launch and writes the tier to user defaults. The user can override (e.g., choose smaller model to save battery), but the default is automatic.

---

## 9. Model Loading and Storage

**The model isn't bundled in the app binary** â€” it's too big (3 GB pushes us into App Store size limits and is wasteful for users on slower devices who'd never use AI features).

**On first launch:**
1. App boots, AI features are disabled with a "Set up AI" banner
2. User taps the banner
3. App shows: "Download the AI model? About 2.5 GB. Uses Wi-Fi by default."
4. Download with progress UI
5. Verify checksum
6. Mark AI features available

**On subsequent launches:**
1. Model file exists in app's documents directory
2. ModelService loads it on first AI feature invocation (lazy)
3. Subsequent calls are instant (model stays in memory)

**Memory management:**
- After 5 minutes of no AI calls, unload the model to free RAM
- App background â†’ unload immediately
- Foreground + AI call â†’ reload (takes 2-3 seconds, show subtle loading state)

**Updates:**
- Model versions are tracked. New version â†’ app shows update prompt, downloads in background, swaps on next session.

---

## 10. The Testing Protocol (Before Committing to Gemma 3n)

We don't ship the model we picked from a benchmark. We ship the model that passes our Norwegian battery.

The `mlx-model-evaluator` subagent runs this on Mac during dev:

**Battery components:**

1. **Translation quality (50 sentences):** Norwegian â†’ English and back. Compare to reference translations. Score on accuracy and naturalness.

2. **Grammar correction (30 sentences):** Pre-prepared sentences with known errors. Does the model spot them? Does it correctly tag the error type per our taxonomy?

3. **Sentence generation (10 prompts):** Concept + scenario + level. Generate. Run our validator. Does the output meet the constraints?

4. **Conversation simulation (5 scenarios):** Scripted user inputs. Does the model stay in character, stay at the level, gently correct mistakes?

5. **Mistake explanation (20 cases):** Wrong/correct pair + concept. Does the explanation make sense? Is it at the right level of language for the user?

6. **Norwegian-specific quirks (15 cases):** Compound words (sammensetninger), V2 word order edge cases, ei vs en (feminine forms), sin/sitt/seg reflexive pronouns. The hard parts.

**Models to test:**
- Gemma 3n E4B (it, 4-bit)
- Gemma 3n E2B (it, 4-bit)
- Gemma 4 E4B (it, 4-bit) â€” if stable
- Qwen 2.5 4B
- Qwen 3 4B (if available)

**Testing happens twice:**
- Phase 1 of testing: on Mac via Ollama (fast iteration, no app overhead)
- Phase 2 of testing: on actual iPhone via MLX Swift (real performance, real thermals)

**Decision criteria:**
- Pass rate over 85% on the battery
- Conversation feel test (subjective, by you, the actual learner)
- Latency on iPhone 15 Pro under targets
- No catastrophic failures (responding in English, hallucinating Norwegian, stuck loops)

If Gemma 3n passes, ship it. If it fails any criterion, fall back to the next candidate.

---

## 11. How This Integrates With The Rest of The System

The AI layer is one of the five system layers from brainstorm v3. It plugs in cleanly:

**Engine â†’ AI:**
- Engine asks AI for a sentence variation when it wants variety
- Engine asks AI for an explanation when triggering the repair loop
- Engine never *requires* AI â€” every call has a fallback

**AI â†’ Mistake Fingerprint:**
- ErrorDetector pushes tagged errors to the fingerprint
- ConversationManager pushes session summary to the fingerprint
- WritingReviewer pushes feedback errors to the fingerprint

**AI â†’ UI:**
- ConversationManager streams tokens for the typing-effect chat UI
- Other tasks return complete responses (no streaming needed)

**AI â†’ Storage:**
- Model file lives in `~/Library/AI/`
- Conversation history is ephemeral by default (optional save)
- AI never writes to the content database (read-only consumer)

**The fingerprint is the integration point.** All AI tasks ultimately flow into the fingerprint, which the engine reads to make decisions. The AI doesn't decide pedagogy â€” it's a tool the engine uses, then reports results to the fingerprint.

---

## 12. What This Means For Build Order

Even though AI is officially Phase 2 in brainstorm v3, **some prep starts now** because model evaluation has a long lead time (need to test, convert, optimize before integration).

**Phase 1A (engine skeleton, no AI integrated):**
- Stub `ModelService` with a test double that returns hardcoded responses
- Build all Task classes against the stub
- Build all Fallback classes (these are the "no model" experience)
- Run engine simulator using only fallbacks â€” verify the experience is still acceptable

**Phase 1B (content + exercises, still no AI):**
- Continue building features against the stub
- Start the model evaluation in parallel (Mac-only, doesn't block iOS work)
- Pick the model

**Phase 2 (AI layer turns on):**
- Replace the ModelService stub with the real MLX Swift integration
- Integrate the chosen model (download flow, loading, inference)
- Tasks already exist â€” they just start hitting a real model
- Tune prompts based on real outputs
- Write the conversation system prompt and scenario library

**Phase 3 (conversation mode):**
- ConversationManager already exists from Phase 1A as a stub
- Now it gets a real backing
- Build the conversation UI
- Author scenario content
- Real-device testing

This means **the AI layer's interface is built before the AI exists**. By the time we have a working model, the rest of the app is already designed to consume it. No retrofitting.

---

## 13. Open Questions That Stay Open Until Testing

Don't pretend these are answered. They're not. They get answered when we run the battery.

- Will Gemma 3n E4B's Norwegian be natural enough, or stilted?
- Can the model reliably stay at A1 vocabulary, or does it drift?
- Does error detection find subtle errors (like compound word formation) or only obvious ones?
- How does the model handle BokmÃ¥l vs Nynorsk? (We're going BokmÃ¥l, but does it know to stay there?)
- What's the actual battery cost during a 15-minute conversation? (Will users tolerate it?)
- Does conversation feel like a real exchange, or like a chatbot pretending?

These are the tests we run before committing. The spec gives us a structure to plug the answers into; testing produces the answers.

---

## 14. The One-Paragraph Summary For Claude Code

We're shipping Gemma 3n E4B (instruction-tuned, 4-bit quantized) via MLX Swift, on iPhone 14 Pro and newer; older devices get Gemma 3n E2B. The model powers five distinct AI tasks (mistake explanation, sentence generation, error detection, free-writing review, conversation tutor) through one shared `ModelService`, with each task having its own prompt template, parameters, and fallback. Every task has a non-AI fallback so the app stays useful on devices without the model. Conversation mode is multi-turn with parallel error detection feeding the mistake fingerprint. Build the AI layer's interface in Phase 1A as stubs and fallbacks, drop in the real model in Phase 2, light up conversation in Phase 3. Test the model on a Norwegian-specific battery before committing. Apache 2.0 means no licensing risk. Ship.

---

This is the spec. Ready for Claude Code.

codex
The repo already leans into “one local model, many tasks,” which is the right direction. I’m pulling the current type layer now so I can extend the existing fingerprint/session model instead of proposing a disconnected schema.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\ai\\types.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\types\\fingerprint.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\types\\session.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\engine\\scheduler.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\engine\\fingerprint.ts" in C:\Users\daveb\Documents\GitHub\Language-app
 succeeded in 214ms:
import type { CEFRLevel } from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { ExerciseType, SessionItem } from '@/types/session';
import type { ResolvedContent } from '@/types/content';

// All AI tasks implement these interfaces.
// Phase 1A: StubAIService with template explanations and null generation.
// Phase 2: WebLLMService replaces the stub transparently.

export interface ExplainParams {
  wrong: string;
  correct: string;
  errorTag: ErrorTag;
  conceptId: string;
  level: CEFRLevel;
  errorCount?: number; // how many times this learner has hit this exact tag
}

export interface Explanation {
  text: string;
  source: 'ai' | 'template';
}

export interface GenerateParams {
  conceptId: string;
  exerciseType: ExerciseType;
  level: CEFRLevel;
  purpose: SessionItem['purpose'];
  recentErrors?: ErrorTag[];    // last errors on this concept â€” what to target
  masteryScore?: number;        // 0-100 â€” calibrates within-level difficulty
  productionGap?: number;       // positive = struggles producing, negative = struggles recognising
  scenario?: string;            // topic context for variety across sessions
  avoidPhrases?: string[];      // prevent repeating the same surface forms
}

export interface TaggedError {
  tag: ErrorTag;
  wrong: string;
  correct: string;
  briefWhy: string;
}

export interface ReviewParams {
  userText: string;
  prompt: string;
  level: CEFRLevel;
}

export interface WritingFeedback {
  errors: TaggedError[];
  praise: string;
  suggestion: string;
  source: 'ai' | 'template';
}

// The unified AI service interface â€” one implementation per environment.
// WebLLMService degrades gracefully: generateContent returns null and
// explainMistake returns template text until the model is loaded.
export interface AIService {
  init(): Promise<void>;
  isAvailable(): boolean;
  isReady(): boolean;
  explainMistake(params: ExplainParams): Promise<Explanation>;
  generateContent(params: GenerateParams): Promise<ResolvedContent | null>;
  detectErrors(text: string, level: CEFRLevel): Promise<TaggedError[]>;
  reviewWriting(params: ReviewParams): Promise<WritingFeedback>;
}

 succeeded in 220ms:
import type { ErrorTag } from './taxonomy';
import type { ExerciseType } from './session';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface ErrorLogEntry {
  id: string;
  conceptId: string;
  errorTag: ErrorTag;
  exerciseType: ExerciseType;
  wrong: string;
  correct: string;
  timestamp: string; // ISO string (not Date for serialization)
  sentenceId?: string;
  scenarioId?: string;
}

export interface ConceptMastery {
  conceptId: string;
  rawScore: number;         // 0â€“100, unweighted accuracy
  confidenceScore: number;  // 0â€“1, how reliable the score is
  decayedScore: number;     // rawScore Ã— decay factor
  attemptCount: number;
  correctCount: number;
  uniqueDaysActive: number;  // # of calendar days practiced
  lastAttemptAt: string | null; // ISO string
  lastCorrectAt: string | null;
  streak: number;           // consecutive correct answers
}

export interface ErrorPattern {
  id: string;
  errorTags: ErrorTag[];
  frequency: number;        // occurrences in last 30 days
  rootCauseConceptId?: string; // derived by diagnosis engine
  rootCauseConfidence?: number; // 0â€“1
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VocabularyClusterMastery {
  clusterId: string;
  score: number; // 0â€“100
  knownWordCount: number;
  totalWordCount: number;
}

export interface MistakeFingerprint {
  userId: string;           // Supabase auth user ID or anonymous UUID
  createdAt: string;
  updatedAt: string;
  currentLevel: CEFRLevel;
  conceptMastery: Record<string, ConceptMastery>; // keyed by concept ID
  recentErrors: ErrorLogEntry[]; // capped at 200, newest first
  errorPatterns: ErrorPattern[];
  vocabularyMastery: Record<string, VocabularyClusterMastery>; // keyed by cluster ID
  productionGap: Record<string, number>; // conceptId â†’ gap between recognition and production (0â€“100)
  totalSessionsCompleted: number;
  lastSessionAt: string | null;
}

// Factory: create a new empty fingerprint
export function createEmptyFingerprint(userId: string): MistakeFingerprint {
  return {
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentLevel: 'A1',
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: [],
    vocabularyMastery: {},
    productionGap: {},
    totalSessionsCompleted: 0,
    lastSessionAt: null,
  };
}

 succeeded in 218ms:
import type { CEFRLevel } from './fingerprint';
import type { ErrorTag } from './taxonomy';
import type { ErrorLogEntry } from './fingerprint';

export type ExerciseType =
  | 'translation-to-norwegian'
  | 'translation-to-english'
  | 'sentence-transformation'
  | 'fill-in-blank'
  | 'word-order'            // drag-and-drop tiles
  | 'listening-comprehension'
  | 'dictation'
  | 'reading-comprehension'
  | 'free-writing'
  | 'speed-round';

export type RepairStep = 'explanation' | 'micro-drill' | 'retry' | 'review-scheduled';

export interface RepairContext {
  triggeredBy: ErrorLogEntry;
  step: RepairStep;
  explanationText?: string;
  microDrillConceptId?: string;
}

export interface SessionItem {
  id: string;
  exerciseType: ExerciseType;
  contentId: string;            // sentence ID, vocab item ID, etc.
  conceptIds: string[];         // concepts being practiced
  estimatedSeconds: number;
  isRepairItem: boolean;
  repairContext?: RepairContext;
  purpose: 'remediation' | 'review' | 'new-material' | 'interleaving' | 'new-vocab';
}

export interface SessionRecipe {
  remediationRatio: number;    // target ~0.40
  reviewRatio: number;         // target ~0.30
  newMaterialRatio: number;    // target ~0.20
  interleavingRatio: number;   // target ~0.10
  targetDurationSeconds: number; // default: 750 (12.5 min)
  minNewVocabItems: number;    // always include at least this many new words
}

export const DEFAULT_SESSION_RECIPE: SessionRecipe = {
  remediationRatio: 0.40,
  reviewRatio: 0.30,
  newMaterialRatio: 0.20,
  interleavingRatio: 0.10,
  targetDurationSeconds: 750,
  minNewVocabItems: 3,
};

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  userId: string;
  startedAt: string;            // ISO string
  completedAt?: string;
  status: SessionStatus;
  recipe: SessionRecipe;
  items: SessionItem[];
  completedItemIds: string[];
  level: CEFRLevel;
  primaryFocus?: string;        // e.g. "dative case" â€” main concept being targeted
}

export interface ExerciseResult {
  sessionId: string;
  itemId: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  timeTakenSeconds: number;
  errorTag?: ErrorTag;          // set if wrong answer
  conceptId: string;
}

 succeeded in 227ms:
import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Session, SessionItem, SessionRecipe, ExerciseType } from '@/types/session';
import { DEFAULT_SESSION_RECIPE } from '@/types/session';
import { isMastered } from './fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, runDiagnosis } from './diagnosis';
import { getUnlockedConcepts } from '@/types/concepts';

const AVG_EXERCISE_SECONDS = 45; // average exercise duration

// Exercise types by learning goal
const PRODUCTION_EXERCISES: ExerciseType[] = [
  'sentence-transformation',
  'translation-to-norwegian',
  'fill-in-blank',
  'word-order',
];
const RECOGNITION_EXERCISES: ExerciseType[] = [
  'translation-to-english',
  'listening-comprehension',
  'speed-round',
];

// Merged pools used when productionGap is neutral
const REMEDIATION_EXERCISES: ExerciseType[] = [...PRODUCTION_EXERCISES];
const REVIEW_EXERCISES: ExerciseType[] = [...RECOGNITION_EXERCISES];
const NEW_MATERIAL_EXERCISES: ExerciseType[] = [
  'translation-to-norwegian',
  'fill-in-blank',
];

// When the learner's productionGap > 30: push production exercises.
// When < -30: push recognition exercises. Otherwise use the default pool.
function resolvePool(
  defaultPool: ExerciseType[],
  productionGap: number,
): ExerciseType[] {
  if (productionGap > 30) return PRODUCTION_EXERCISES;
  if (productionGap < -30) return RECOGNITION_EXERCISES;
  return defaultPool;
}

function pickExerciseType(
  pool: ExerciseType[],
  recentlyUsed: ExerciseType[],
  productionGap = 0,
): ExerciseType {
  const adjusted = resolvePool(pool, productionGap);
  // Avoid repeating the same type more than twice in a row
  const lastTwo = recentlyUsed.slice(-2);
  const filtered = adjusted.filter((t) => !lastTwo.includes(t));
  const source = filtered.length > 0 ? filtered : adjusted;
  return source[Math.floor(Math.random() * source.length)];
}

function makeItem(
  id: string,
  conceptId: string,
  contentId: string,
  exerciseType: ExerciseType,
  purpose: SessionItem['purpose']
): SessionItem {
  return {
    id,
    exerciseType,
    contentId,
    conceptIds: [conceptId],
    estimatedSeconds: AVG_EXERCISE_SECONDS,
    isRepairItem: false,
    purpose,
  };
}

export interface SchedulerInput {
  fingerprint: MistakeFingerprint;
  graph: ConceptGraph;
  availableSentenceIds: Record<string, string[]>; // conceptId â†’ sentence IDs
  recipe?: Partial<SessionRecipe>;
}

export interface SchedulerOutput {
  session: Session;
  primaryFocus: string;
  weakConcepts: string[];
  decayingConcepts: string[];
  diagnosisResults: ReturnType<typeof runDiagnosis>;
}

export function generateSession(input: SchedulerInput): SchedulerOutput {
  const { fingerprint, graph } = input;
  const recipe: SessionRecipe = { ...DEFAULT_SESSION_RECIPE, ...input.recipe };

  const masteredIds = new Set(
    Object.entries(fingerprint.conceptMastery)
      .filter(([id, m]) => {
        const node = graph.concepts.find((c) => c.id === id);
        if (!node) return false;
        return isMastered(m, node.masteryThreshold, node.minAttempts, node.minDays);
      })
      .map(([id]) => id)
  );

  const inProgressIds = new Set(Object.keys(fingerprint.conceptMastery));
  const weakConcepts = getPrimaryWeakConcepts(fingerprint, 3);
  const decayingConcepts = getDecayingConcepts(fingerprint);
  const diagnosisResults = runDiagnosis(fingerprint);
  const unlockedConcepts = getUnlockedConcepts(graph, masteredIds);

  const totalItems = Math.round(recipe.targetDurationSeconds / AVG_EXERCISE_SECONDS);
  const counts = {
    remediation: Math.round(totalItems * recipe.remediationRatio),
    review: Math.round(totalItems * recipe.reviewRatio),
    newMaterial: Math.round(totalItems * recipe.newMaterialRatio),
    interleaving: Math.round(totalItems * recipe.interleavingRatio),
  };

  const items: SessionItem[] = [];
  const usedExerciseTypes: ExerciseType[] = [];
  let itemIndex = 0;

  function addItem(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose']
  ) {
    // Use 'placeholder' as contentId â€” content is resolved at render time by
    // the AI content resolution layer in useSession, not at session planning time.
    const contentId = `pending:${conceptId}`;
    const gap = fingerprint.productionGap[conceptId] ?? 0;
    const exerciseType = pickExerciseType(exercises, usedExerciseTypes, gap);
    usedExerciseTypes.push(exerciseType);
    items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose));
  }

  // Cap repeats of any single concept across all slots to avoid the same
  // concept dominating the session (especially for learners with few weak spots).
  const conceptRepeatCount = new Map<string, number>();
  const MAX_CONCEPT_REPEATS = 2;

  function addItemCapped(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose'],
    fallbackPool: string[],
  ) {
    const count = conceptRepeatCount.get(conceptId) ?? 0;
    const effectiveId =
      count < MAX_CONCEPT_REPEATS
        ? conceptId
        : (fallbackPool.find((id) => (conceptRepeatCount.get(id) ?? 0) < MAX_CONCEPT_REPEATS) ?? conceptId);
    conceptRepeatCount.set(effectiveId, (conceptRepeatCount.get(effectiveId) ?? 0) + 1);
    addItem(effectiveId, exercises, purpose);
  }

  // Remediation â€” weak spots first; fall back to unlocked concepts for cold-start users
  const remediationPool = weakConcepts.length > 0
    ? weakConcepts
    : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.remediation; i++) {
    const conceptId = remediationPool[i % Math.max(remediationPool.length, 1)];
    if (conceptId) addItemCapped(conceptId, REMEDIATION_EXERCISES, 'remediation', remediationPool);
  }

  // Review â€” decaying concepts; fall back to weak then unlocked
  const reviewPool = decayingConcepts.length > 0
    ? decayingConcepts
    : weakConcepts.length > 0
      ? weakConcepts
      : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.review; i++) {
    const conceptId = reviewPool[i % Math.max(reviewPool.length, 1)];
    if (conceptId) addItemCapped(conceptId, REVIEW_EXERCISES, 'review', reviewPool);
  }

  // New material â€” spread across the next unlocked concepts, not just the first
  const newMaterialConcepts = unlockedConcepts.slice(0, Math.max(counts.newMaterial, 3));
  for (let i = 0; i < counts.newMaterial; i++) {
    const concept = newMaterialConcepts[i % Math.max(newMaterialConcepts.length, 1)];
    if (concept) {
      conceptRepeatCount.set(concept.id, (conceptRepeatCount.get(concept.id) ?? 0) + 1);
      addItem(concept.id, NEW_MATERIAL_EXERCISES, 'new-material');
    }
  }

  // Interleaving â€” mix from in-progress concepts; fall back to unlocked concepts
  const inProgress = [...inProgressIds].filter((id) => !masteredIds.has(id));
  const interleavingPool = inProgress.length > 0 ? inProgress : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.interleaving; i++) {
    const conceptId = interleavingPool[Math.floor(Math.random() * interleavingPool.length)];
    if (conceptId)
      addItem(conceptId, [...REMEDIATION_EXERCISES, ...REVIEW_EXERCISES], 'interleaving');
  }

  // Shuffle: don't let all remediation items cluster at start
  // Keep first item as a warm-up review, then shuffle the rest with Fisher-Yates
  // (sort-based shuffle is statistically biased â€” certain orderings over-appear)
  function fisherYates<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const [first, ...rest] = items;
  const shuffled = first ? [first, ...fisherYates(rest)] : fisherYates(items);

  const primaryFocus = weakConcepts[0] ?? newMaterialConcepts[0]?.id ?? 'general-review';

  const session: Session = {
    id: crypto.randomUUID(),
    userId: fingerprint.userId,
    startedAt: new Date().toISOString(),
    status: 'active',
    recipe,
    items: shuffled,
    completedItemIds: [],
    level: fingerprint.currentLevel,
    primaryFocus,
  };

  return { session, primaryFocus, weakConcepts, decayingConcepts, diagnosisResults };
}

 succeeded in 237ms:
import type {
  MistakeFingerprint,
  ConceptMastery,
  ErrorLogEntry,
  ErrorPattern,
} from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { ExerciseType } from '@/types/session';

// â”€â”€ Mastery Scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DECAY_HALF_LIFE_DAYS = 30; // mastery halves after 30 days without practice
const MAX_RECENT_ERRORS = 200;
const ERROR_PATTERN_WINDOW_DAYS = 30;

function daysSince(isoString: string | null): number {
  if (!isoString) return Infinity;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function computeDecayFactor(lastAttemptAt: string | null): number {
  const days = daysSince(lastAttemptAt);
  if (days === Infinity) return 0;
  // Exponential decay: e^(-ln(2)/halfLife * days)
  return Math.exp((-Math.LN2 / DECAY_HALF_LIFE_DAYS) * days);
}

function computeConfidence(
  attemptCount: number,
  uniqueDays: number,
  minAttempts: number,
  minDays: number
): number {
  const attemptConfidence = Math.min(1, attemptCount / minAttempts);
  const dayConfidence = Math.min(1, uniqueDays / minDays);
  // Geometric mean â€” both must be high for confidence to be high
  return Math.sqrt(attemptConfidence * dayConfidence);
}

export function updateConceptMastery(
  existing: ConceptMastery | undefined,
  correct: boolean,
  minAttempts: number,
  minDays: number
): ConceptMastery {
  const now = new Date().toISOString();
  const today = new Date().toDateString();

  const prev: ConceptMastery = existing ?? {
    conceptId: '',
    rawScore: 0,
    confidenceScore: 0,
    decayedScore: 0,
    attemptCount: 0,
    correctCount: 0,
    uniqueDaysActive: 0,
    lastAttemptAt: null,
    lastCorrectAt: null,
    streak: 0,
  };

  // Check if this is a new active day
  const lastDay = prev.lastAttemptAt ? new Date(prev.lastAttemptAt).toDateString() : null;
  const isNewDay = lastDay !== today;

  const nextAttemptCount = prev.attemptCount + 1;
  const nextCorrectCount = prev.correctCount + (correct ? 1 : 0);
  const nextUniqueDays = prev.uniqueDaysActive + (isNewDay ? 1 : 0);
  const nextStreak = correct ? prev.streak + 1 : 0;

  // Raw score: weighted accuracy over all attempts (recent attempts weighted more heavily)
  // Simplified: correctCount / attemptCount with slight recency weight
  const rawScore = Math.round((nextCorrectCount / nextAttemptCount) * 100);

  const confidence = computeConfidence(nextAttemptCount, nextUniqueDays, minAttempts, minDays);
  const decayFactor = computeDecayFactor(now);
  const decayedScore = Math.round(rawScore * decayFactor);

  return {
    ...prev,
    rawScore,
    confidenceScore: Math.round(confidence * 100) / 100,
    decayedScore,
    attemptCount: nextAttemptCount,
    correctCount: nextCorrectCount,
    uniqueDaysActive: nextUniqueDays,
    lastAttemptAt: now,
    lastCorrectAt: correct ? now : prev.lastCorrectAt,
    streak: nextStreak,
  };
}

// â”€â”€ Decay Refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Call on app open to refresh decayed scores without adding attempts

export function refreshDecay(fingerprint: MistakeFingerprint): MistakeFingerprint {
  const updated = { ...fingerprint, conceptMastery: { ...fingerprint.conceptMastery } };
  for (const [id, mastery] of Object.entries(updated.conceptMastery)) {
    const decayFactor = computeDecayFactor(mastery.lastAttemptAt);
    updated.conceptMastery[id] = {
      ...mastery,
      decayedScore: Math.round(mastery.rawScore * decayFactor),
    };
  }
  updated.updatedAt = new Date().toISOString();
  return updated;
}

// â”€â”€ Error Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function logError(
  fingerprint: MistakeFingerprint,
  params: {
    conceptId: string;
    errorTag: ErrorTag;
    exerciseType: ExerciseType;
    wrong: string;
    correct: string;
    sentenceId?: string;
    scenarioId?: string;
  }
): MistakeFingerprint {
  const entry: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };

  const recentErrors = [entry, ...fingerprint.recentErrors].slice(0, MAX_RECENT_ERRORS);

  return {
    ...fingerprint,
    recentErrors,
    updatedAt: new Date().toISOString(),
  };
}

// â”€â”€ Error Pattern Aggregation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function aggregateErrorPatterns(fingerprint: MistakeFingerprint): ErrorPattern[] {
  const cutoff = Date.now() - ERROR_PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentErrors = fingerprint.recentErrors.filter(
    (e) => new Date(e.timestamp).getTime() > cutoff
  );

  // Count errors by tag
  const tagCounts = new Map<ErrorTag, ErrorLogEntry[]>();
  for (const error of recentErrors) {
    if (!tagCounts.has(error.errorTag)) tagCounts.set(error.errorTag, []);
    tagCounts.get(error.errorTag)?.push(error);
  }

  const patterns: ErrorPattern[] = [];
  for (const [tag, errors] of tagCounts.entries()) {
    if (errors.length < 2) continue; // Not a pattern until it repeats
    const sorted = errors.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    patterns.push({
      id: crypto.randomUUID(),
      errorTags: [tag],
      frequency: errors.length,
      firstSeenAt: sorted[0].timestamp,
      lastSeenAt: sorted[sorted.length - 1].timestamp,
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

// â”€â”€ Mastery Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function isMastered(
  mastery: ConceptMastery | undefined,
  threshold: number,
  minAttempts: number,
  minDays: number
): boolean {
  if (!mastery) return false;
  return (
    mastery.rawScore >= threshold &&
    mastery.confidenceScore >= 0.7 &&
    mastery.attemptCount >= minAttempts &&
    mastery.uniqueDaysActive >= minDays
  );
}

// â”€â”€ Production vs Recognition Gap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function computeProductionGap(
  errors: ErrorLogEntry[],
  conceptId: string
): number {
  const conceptErrors = errors.filter((e) => e.conceptId === conceptId);
  const writingErrors = conceptErrors.filter((e) =>
    ['translation-to-norwegian', 'sentence-transformation', 'free-writing', 'dictation'].includes(
      e.exerciseType
    )
  ).length;
  const recognitionErrors = conceptErrors.filter((e) =>
    ['translation-to-english', 'listening-comprehension', 'reading-comprehension'].includes(
      e.exerciseType
    )
  ).length;

  if (writingErrors + recognitionErrors === 0) return 0;
  // Positive gap = struggles more with production than recognition
  return Math.round(
    ((writingErrors - recognitionErrors) / (writingErrors + recognitionErrors)) * 100
  );
}

web search: 
web search: MLC WebLLM official docs worker service worker shared model engine CreateMLCEngine WebWorkerMLCEngine
web search: 
web search: site:webllm.mlc.ai/docs web worker WebWorkerMLCEngine service worker
web search: 
web search: MDN AudioWorklet official docs
web search: 
web search: site:webllm.mlc.ai SharedWorker webllm
web search: 
web search: MDN AudioContext official docs
web search: 
web search: MDN SpeechRecognition available install processLocally official docs
codex
I’ve got enough of the current app shape. I’m checking the repo’s own brainstorm/spec docs once so I can reuse any established constraints, then I’ll consolidate the architecture with the current browser/runtime reality.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "conversation|reading|writing|shadow|spaced repetition|SRS|speech|voice" docs src' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\norwegian-app-brainstorm-v3.md" in C:\Users\daveb\Documents\GitHub\Language-app
 succeeded in 161ms:
docs\norwegian-app-brainstorm-v2.md:21:**The moat is not AI conversation.** Conversation with AI is a feature — a nice one, but other apps will copy it within months. The moat is the combination of three things working together:
docs\norwegian-app-brainstorm-v2.md:27:If those three work, the app helps people improve faster than alternatives. That's the entire product. Everything else — AI feedback, conversation mode, audio, scenarios — is in service of that.
docs\norwegian-app-brainstorm-v2.md:78:- Reviewing free-writing exercises
docs\norwegian-app-brainstorm-v2.md:79:- Light conversation practice at the user's level
docs\norwegian-app-brainstorm-v2.md:121:- "User gets vocab right in writing but wrong in listening → comprehension issue, not knowledge issue; serve more listening exercises"
docs\norwegian-app-brainstorm-v2.md:139:8. **Free writing with feedback** — production task; recognition alone won't create fluency
docs\norwegian-app-brainstorm-v2.md:144:The engine picks based on what the learner needs *and* what keeps them engaged. Production tasks (writing, speaking) get prioritized once basics are in place — that's where real fluency forms.
docs\norwegian-app-brainstorm-v2.md:208:- Add free-writing exercises with model feedback
docs\norwegian-app-brainstorm-v2.md:258:The bet is this: **diagnosis + scheduling + remediation, done well, beats lesson-based apps for any motivated learner**. AI conversation, fancy graphics, gamification — none of those are the moat. The moat is whether the engine actually helps people improve faster on the exact things they keep failing.
docs\ai-layer-spec.md:14:One model powers everything — mistake explanations, sentence variations, free-writing feedback, error detection, and the conversation tutor. Different system prompts, same engine.
docs\ai-layer-spec.md:57:- Hold a basic conversation in Norwegian at a controlled level (50-100 token outputs, multiple turns)
docs\ai-layer-spec.md:58:- Review 1-3 sentences of free writing and flag errors (structured output)
docs\ai-layer-spec.md:96:- KV-cache reuse for multi-turn conversation
docs\ai-layer-spec.md:97:- Streaming output for conversation, batch output for everything else
docs\ai-layer-spec.md:162:**Trigger:** After every free-writing input and every conversation turn.
docs\ai-layer-spec.md:195:**Job:** Given a 1-3 sentence free-writing submission, review it holistically — errors, naturalness, vocabulary appropriateness — and return structured feedback.
docs\ai-layer-spec.md:197:**Trigger:** End of free-writing exercises.
docs\ai-layer-spec.md:204:The prompt was: "{writing_prompt}"
docs\ai-layer-spec.md:206:Review the writing. Output JSON:
docs\ai-layer-spec.md:220:**Latency target:** under 3 seconds (user just finished writing, slight delay is acceptable).
docs\ai-layer-spec.md:230:The user picks a scenario ("ordering coffee at a café in Oslo," "asking for directions," "introducing yourself at work"). The app puts them into a back-and-forth Norwegian conversation with a character. The character speaks at the user's level, gently corrects their mistakes by rephrasing what they meant, and stays in character. After the conversation ends, the app logs every error the user made against their mistake fingerprint.
docs\ai-layer-spec.md:235:- It's not a replacement for human conversation. It's a low-stakes practice space.
docs\ai-layer-spec.md:256:When the conversation starts, ConversationManager:
docs\ai-layer-spec.md:269:When the conversation ends:
docs\ai-layer-spec.md:286:- If the user makes a grammatical mistake, do not correct them directly. Instead, naturally rephrase what they meant in your next reply, using the correct form. Continue the conversation.
docs\ai-layer-spec.md:288:- Do not teach grammar inside the conversation. Just have the conversation.
docs\ai-layer-spec.md:294:Begin the conversation.
docs\ai-layer-spec.md:321:The model in conversation mode is in *character*. We don't ask it to also be a grammar checker — that would split its attention and degrade both jobs.
docs\ai-layer-spec.md:327:The errors get tagged and pushed into MistakeFingerprint. From the fingerprint's perspective, conversation errors look the same as exercise errors. The engine doesn't care where they came from.
docs\ai-layer-spec.md:336:- **User says something inappropriate:** Standard refusal patterns. Models are trained on this. Worst case the conversation ends gracefully.
docs\ai-layer-spec.md:345:- **Memory:** under 4 GB total app memory during conversation
docs\ai-layer-spec.md:346:- **Battery:** under 5% drain per 15-minute conversation
docs\ai-layer-spec.md:360:| iPhone 13, 14 (non-Pro) | Limited | Gemma 3n E2B, conversation may be slower |
docs\ai-layer-spec.md:483:- Write the conversation system prompt and scenario library
docs\ai-layer-spec.md:485:**Phase 3 (conversation mode):**
docs\ai-layer-spec.md:488:- Build the conversation UI
docs\ai-layer-spec.md:504:- What's the actual battery cost during a 15-minute conversation? (Will users tolerate it?)
docs\ai-layer-spec.md:505:- Does conversation feel like a real exchange, or like a chatbot pretending?
docs\ai-layer-spec.md:513:We're shipping Gemma 3n E4B (instruction-tuned, 4-bit quantized) via MLX Swift, on iPhone 14 Pro and newer; older devices get Gemma 3n E2B. The model powers five distinct AI tasks (mistake explanation, sentence generation, error detection, free-writing review, conversation tutor) through one shared `ModelService`, with each task having its own prompt template, parameters, and fallback. Every task has a non-AI fallback so the app stays useful on devices without the model. Conversation mode is multi-turn with parallel error detection feeding the mistake fingerprint. Build the AI layer's interface in Phase 1A as stubs and fallbacks, drop in the real model in Phase 2, light up conversation in Phase 3. Test the model on a Norwegian-specific battery before committing. Apache 2.0 means no licensing risk. Ship.
src\types\taxonomy.ts:23:  | 'reading-parsing'          // couldn't decode written sentence
src\types\taxonomy.ts:39:  'listening-recognition', 'reading-parsing', 'meaning-misunderstood',
docs\claude-code-environment-prep.md:202:5. Local AI (small on-device models — explanations, variations, conversation)
docs\claude-code-environment-prep.md:225:Phase 1A — Engine Skeleton. We are NOT writing UI polish, NOT generating production content, NOT integrating AI yet. Goal: prove the engine adapts.
docs\claude-code-environment-prep.md:248:- **TTS pipeline** — generates audio for new sentences. Multiple voice options. Saves audio files into `content/audio/`.
docs\claude-code-environment-prep.md:252:- **Model evaluation harness** — runs a battery of Norwegian tasks (translation, grammar correction, conversation) against multiple local models. Helps pick the right one.
src\types\session.ts:13:  | 'reading-comprehension'
src\types\session.ts:14:  | 'free-writing'
src\lib\grammar-explainers.ts:40:      { norwegian: 'Hun leser ei bok.', english: 'She is reading a book.' },
docs\norwegian-app-brainstorm-v3.md:27:Not AI conversation. Not gamification. The moat is three things working together:
docs\norwegian-app-brainstorm-v3.md:76:- User succeeds in writing exercises but fails the same content in listening → comprehension issue, not knowledge issue → serve more listening
docs\norwegian-app-brainstorm-v3.md:138:- Review free-writing exercises and surface errors
docs\norwegian-app-brainstorm-v3.md:139:- Run light conversation practice in Phase 3
docs\norwegian-app-brainstorm-v3.md:156:8. **Free writing with feedback** — production task; recognition alone won't create fluency
docs\norwegian-app-brainstorm-v3.md:253:- Free-writing exercises with model feedback
docs\skills-and-subagents-plan.md:32:**Description:** "Reference for Norwegian grammar rules — noun gender (en/ei/et), V2 word order, definite/indefinite articles, adjective agreement, verb conjugation patterns, tense formation, subordinate clause word order, modal verbs, common edge cases. Use whenever generating, reviewing, or writing logic about Norwegian sentences."
docs\skills-and-subagents-plan.md:46:**Description:** "The full error taxonomy used to tag every mistake the learner makes. Use when writing exercise scoring code, adding new exercise types, modifying the mistake fingerprint, or analyzing learner errors."
docs\skills-and-subagents-plan.md:50:- Comprehension error categories (listening, reading, meaning)
docs\skills-and-subagents-plan.md:86:- How to queue the scheduled review (spaced repetition integration)
docs\skills-and-subagents-plan.md:101:**Description:** "Swift coding conventions for this project: module boundaries, async/await usage, GRDB patterns for SQLite, naming, testing approach. Use when writing or reviewing Swift code."
docs\skills-and-subagents-plan.md:113:**Description:** "The SQLite schema for the content database (sentences, concepts, scenarios, audio refs) and the fingerprint database (mastery, errors, history). Use when writing storage code, queries, or migrations."
docs\skills-and-subagents-plan.md:163:**Description:** "How to generate Norwegian TTS audio: voice selection, text preprocessing, file naming conventions, quality checks. Use when generating new audio for sentences."
docs\skills-and-subagents-plan.md:165:- Approved TTS providers/voices (start TTS, plan for native recordings later)
docs\skills-and-subagents-plan.md:167:- File naming (`<sentence_id>_<voice>.mp3`)
docs\skills-and-subagents-plan.md:306:> 2. Score each on grammar correction, sentence variation, simple conversation, mistake explanation quality.
docs\norwegian-app-brainstorm.md:44:- Time-since-last-seen for every concept (for spaced repetition)
docs\norwegian-app-brainstorm.md:51:- What's overdue for review (spaced repetition)?
docs\norwegian-app-brainstorm.md:64:- Giving feedback on free-writing exercises ("you wrote *X*, but the verb should be in past tense because...")
docs\norwegian-app-brainstorm.md:65:- Light conversation practice — basic back-and-forth in Norwegian on a topic, with corrections
docs\norwegian-app-brainstorm.md:103:8. **Free writing** with AI feedback — "describe your morning in 3 sentences," local model gives gentle corrections
docs\norwegian-app-brainstorm.md:132:- **Free-writing review** — user writes 2 sentences, model spots errors and suggests fixes
docs\norwegian-app-brainstorm.md:153:1. 2 quick warm-up review items (spaced repetition)
docs\norwegian-app-brainstorm.md:156:4. 2 free-writing prompts using dative, with local model feedback
docs\norwegian-app-brainstorm.md:159:Session ends. Profile updates. Next time they open the app, the engine has already adjusted — maybe dative is closer to mastery, maybe a new weakness emerged in word order from their writing.
docs\norwegian-app-brainstorm.md:183:- Learner profile + adaptive engine + spaced repetition
docs\norwegian-app-brainstorm.md:190:- Add free-writing exercises with model feedback
docs\norwegian-app-brainstorm.md:194:- Add conversation mode with local model
docs\norwegian-app-brainstorm.md:210:- TTS quality — start with synthesized voices or invest in native speaker recordings?
docs\superpowers\plans\2026-05-11-norskcoach-frontend.md:386:    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
docs\superpowers\plans\2026-05-11-norskcoach-frontend.md:441:    <svg width={size} height={size} className="drop-shadow-sm">
docs\superpowers\plans\2026-05-11-norskcoach-frontend.md:1360:                    className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-nc-navy shadow-sm"
src\engine\diagnosis.ts:50:            'The learner recognizes correct forms but fails to produce them. This is a production gap, not a knowledge gap — more writing and speaking exercises needed, not more drilling.',
src\engine\diagnosis.ts:87:          ['reading-comprehension', 'free-writing', 'translation-to-norwegian'].includes(
src\engine\fingerprint.ts:194:  const writingErrors = conceptErrors.filter((e) =>
src\engine\fingerprint.ts:195:    ['translation-to-norwegian', 'sentence-transformation', 'free-writing', 'dictation'].includes(
src\engine\fingerprint.ts:200:    ['translation-to-english', 'listening-comprehension', 'reading-comprehension'].includes(
src\engine\fingerprint.ts:205:  if (writingErrors + recognitionErrors === 0) return 0;
src\engine\fingerprint.ts:208:    ((writingErrors - recognitionErrors) / (writingErrors + recognitionErrors)) * 100
src\ai\stub.ts:90:      praise: 'Good attempt! Keep writing in Norwegian.',
src\engine\repair-loop.ts:37:  'reading-parsing':
src\engine\repair-loop.ts:56:  'reading-parsing': ['reading-comprehension', 'translation-to-english'],
src\ai\webllm.ts:220:      praise: 'Good attempt! Keep writing in Norwegian.',
src\components\ui\button.tsx:12:          'bg-brand-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:brightness-110',
src\components\session\exercises\ListeningExercise.tsx:49:      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
src\components\session\exercises\ListeningExercise.tsx:50:      window.speechSynthesis.cancel();
src\components\session\exercises\ListeningExercise.tsx:57:      window.speechSynthesis.speak(utt);
src\components\session\exercises\ListeningExercise.tsx:62:  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
src\components\session\exercises\ListeningExercise.tsx:64:  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

 succeeded in 195ms:
# Norwegian Language Learning App â€” Brainstorm v3

*The sharpest version. This is the document to take into Claude Code.*

---

## 1. The One-Line Positioning

**A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.**

That's the product. Everything in this document serves that line.

---

## 2. The Core Philosophy: Coach, Not Course

The user does not open this app for "Lesson 12." They open it for *today's exact problem*.

Most language apps are courses â€” a fixed curriculum, delivered the same way to everyone, with progress measured by completion. This app is the opposite: a **coach** that knows what the learner needs *today*, generates a personal syllabus on the fly, and only advances them when they can actually do the language.

This shift â€” from course to coach â€” changes everything about how the product feels and works.

---

## 3. The Real Moat (What Makes This Defensible)

Not AI conversation. Not gamification. The moat is three things working together:

1. **Diagnosis** â€” knowing precisely what the learner is failing at, including the *root cause* underneath surface mistakes.
2. **Scheduling** â€” generating a personal syllabus daily that mixes remediation, review, new material, and new vocabulary.
3. **Remediation** â€” running every wrong answer through a structured repair loop until the gap is closed.

If these three work, the app helps people improve faster than alternatives. AI is a *power tool* that makes the coaching feel intelligent, precise, and cheap to run â€” but AI is not the product.

---

## 4. The Repair Loop (The Core Mechanic)

This is the single most important mechanic in the app. Every wrong answer triggers it:

**Wrong answer â†’ Explanation â†’ Micro-drill â†’ Retry â†’ Scheduled review**

In detail:
1. **Wrong answer** â€” the user gets something wrong. The mistake is logged with its error tag.
2. **Explanation** â€” short, plain-language reason *why* it was wrong. ("You used *en* but *jente* is feminine, so it's *ei jente*.")
3. **Micro-drill** â€” 2â€“4 quick targeted exercises on the exact concept, in varied formats.
4. **Retry** â€” the original problem comes back, often in a slightly different form.
5. **Scheduled review** â€” that concept gets queued for spaced reappearance over the next days/weeks.

This loop is what makes the app feel like coaching. It's also what builds genuine mastery â€” because mistakes become learning moments, not just red Xs.

---

## 5. The Mistake Fingerprint (The Heart of Diagnosis)

Every learner has a unique **mistake fingerprint** â€” a live profile of their patterns, weaknesses, and quirks. This is what the engine reads from and writes to constantly. It's the most important data structure in the app.

It includes:
- **Mastery score per concept** (0â€“100), with confidence intervals
- **Decay over time** â€” mastery erodes if not practiced; the model knows "shaky" vs "forgotten"
- **Error pattern history** â€” what they get wrong, in what contexts, with what frequency
- **Root-cause links** â€” derived patterns: "articles failing because of underlying gender uncertainty"
- **Vocabulary mastery** by cluster, separate from grammar
- **Production vs. recognition gap** â€” can they *use* it, not just recognize it?

The fingerprint is stored locally on the device. It's the learner's data, and it never leaves the phone unless they choose to sync.

---

## 6. Root-Cause Diagnosis

A great human tutor doesn't just see a wrong answer â€” they see *why* it was wrong. Building this in is what makes the app feel intelligent without needing a big AI model.

Examples of root-cause logic:
- User fails articles AND adjective agreement â†’ root cause: noun gender not memorized â†’ remediate gender first
- User succeeds in writing exercises but fails the same content in listening â†’ comprehension issue, not knowledge issue â†’ serve more listening
- User does well on isolated drills but fails the same grammar in dialogue â†’ can do mechanics but not application â†’ more contextual practice
- User's recent errors cluster around fast-spoken audio â†’ audio-processing weakness â†’ slow down audio in next session, build up speed

These are codified rules over good data. No LLM required. This is a major part of the moat.

---

## 7. The Concept Graph (Dependency-Ordered Grammar)

Norwegian grammar isn't a flat list of topics. It's a graph with dependencies. The app teaches in dependency order:

- Can't really teach **definite articles** before **noun gender** is solid
- Can't teach **adjective agreement** before **gender + definite/indefinite**
- Can't teach **subordinate clause word order** before **main clause V2** is internalized
- Can't teach **modal verbs in past tense** before **past tense basics**

Every concept has prerequisites. The engine never pushes a learner forward on a concept whose prerequisites are shaky. This is structural, not optional.

The graph also organizes content: when teaching a concept, the engine pulls sentences that *only* introduce that one new concept on top of stuff the learner already knows â€” minimizing cognitive load.

---

## 8. The Daily Session Recipe

Every session must contain certain ingredients so the learner always feels growth and never feels stuck:

- **New vocabulary** â€” at least a few new words every day, regardless of how heavy the remediation is. Growth has to be visible daily.
- **Weak-spot remediation** â€” targeted practice on what the fingerprint says is weakest (~40%)
- **Spaced review** â€” concepts going shaky get refreshed (~30%)
- **New material** â€” when the learner is ready, introduce the next concept in the graph (~20%)
- **Interleaving** â€” mixed practice so the brain has to actually parse, not pattern-match (~10%)

Default session length: 10â€“15 minutes. Better to come back daily than burn out.

Critical principle: **interleaving over pure drilling.** Pounding one weakness for 10 minutes straight is exhausting and backfires. Mix it.

---

## 9. System Architecture (Five Layers)

### Layer 1 â€” Content Foundation
- Sentences tagged by grammar concept(s), vocabulary cluster, scenario, difficulty
- Native-speaker audio (TTS first, real recordings later)
- Mini-dialogues and short stories that put grammar in real-life contexts
- Topic clusters (food, transport, work, family) mirroring real Norwegian life
- Short, visual grammar explainers
- All bundled or downloaded once. Zero ongoing cost.

### Layer 2 â€” The Mistake Fingerprint
The learner profile (Section 5). Lives on the device.

### Layer 3 â€” The Adaptive Engine
The personal syllabus generator. Reads the fingerprint, applies the concept graph, runs root-cause diagnosis, and assembles each daily session using the recipe in Section 8.

### Layer 4 â€” Exercise Variety + Repair Loop
The remediation layer. Multiple exercise types (Section 10). Every wrong answer triggers the repair loop (Section 4).

### Layer 5 â€” Local AI (A Power Tool)
Small on-device models (Apple Intelligence, Llama 3.2, Phi-3 mini) that *enhance* the coaching:
- Generate fresh sentence variations on demand (so content never feels finite)
- Write plain-language explanations of mistakes during the repair loop
- Review free-writing exercises and surface errors
- Run light conversation practice in Phase 3

Zero API cost. Works offline. Added *after* the non-AI engine is proven valuable.

---

## 10. Exercise Types

Same set, prioritized by what builds production ability:

1. Translation in both directions
2. **Sentence transformations** â€” change tense, swap pronouns, negate, change subject. Key for grammar mastery.
3. Fill-in-the-blank with grammar focus
4. Word order arrangement (drag tiles) â€” V2 word order practice
5. Listening comprehension
6. Dictation â€” hear it, write it
7. Reading comprehension
8. **Free writing with feedback** â€” production task; recognition alone won't create fluency
9. **Speaking prompts** (Phase 2+) â€” record yourself, get feedback
10. Conversation drills (Phase 3, with local AI)
11. Speed rounds for vocab recall

Every exercise is tagged with which concepts it teaches and which error types it can detect. Every mistake feeds the fingerprint.

---

## 11. The Error Taxonomy

Every mistake gets tagged consistently. Without this, the engine has no real data. Starting taxonomy:

**Grammar**
- Word order (especially V2 violations)
- Verb tense (present, past, perfect, future)
- Verb conjugation
- Noun gender (en/ei/et)
- Article use (definite/indefinite, single/plural)
- Adjective agreement
- Pronoun choice and case
- Preposition selection
- Modal verb usage
- Negation placement
- Compound word formation

**Vocabulary**
- Wrong word, right meaning category (false friends, near-synonyms)
- Wrong word, wrong category (didn't know it)
- Spelling

**Comprehension**
- Listening recognition
- Reading parsing
- Misunderstood meaning despite recognizing words

---

## 12. Real-Life Scenarios From Day One

Sentences live inside scenario clusters that matter:
- Ordering food and drinks
- Getting around (transport, directions)
- Talking about your day
- Meeting new people
- Work and study contexts
- Health and the body
- Shopping
- Norwegian culture and small talk

Every grammar concept gets practiced inside scenarios someone might actually use. This is how language sticks.

---

## 13. NorskprÃ¸ven Alignment

Concrete real-world hook: align the app's content and progression with **NorskprÃ¸ven**, the Norwegian proficiency test that matters for residency, work, and citizenship in Norway.

This gives the app a tangible goal beyond vague "fluency": *get the user to A2, B1, or B2 NorskprÃ¸ven readiness*. That's measurable, meaningful, and a real reason to keep using the app.

The CEFR levels (A1 â†’ A2 â†’ B1 â†’ B2) align directly with NorskprÃ¸ven's structure.

---

## 14. Tone & Experience Principles

The app helps; it doesn't punish.

- **Precise, not aggressive.** The repair loop should feel like a tutor patiently helping, not a system tracking failures.
- **Show progress on weaknesses, not just streaks.** "Dative case: 30% mastered last week â†’ 65% now." That's motivating.
- **Short sessions by default.** 10â€“15 minutes.
- **No fake gamification.** Streaks fine; cartoonish guilt-tripping no.
- **Honest about effort.** V2 word order is genuinely hard for English speakers â€” the app says so and shows that struggling is normal.
- **Daily growth visible.** New vocabulary every day. Always something to show for showing up.

---

## 15. Build Order

Build the brain before the body. Don't ship A1 content until the engine works.

**Phase 1A â€” The Engine Skeleton**
- Define the mistake fingerprint data structure
- Build the concept graph for A1 + A2 grammar with dependencies
- Define the error taxonomy
- Build the session scheduler that applies the daily recipe
- Build root-cause diagnosis rules
- Build the repair loop
- Test with a tiny content sample (50â€“100 sentences) â€” does it actually adapt?

**Phase 1B â€” Exercise Types + Real Content**
- Build 4â€“5 exercise types
- Author A1 content (~500 sentences with audio, properly tagged, organized into scenarios)
- Test with real learners â€” does the engine make people improve faster than a non-adaptive baseline? This is the validation.

**Phase 2 â€” The AI Layer**
- Add local model for plain-language mistake explanations in the repair loop
- Free-writing exercises with model feedback
- On-the-fly sentence variation

**Phase 3 â€” Production & B1/B2**
- Speaking prompts with feedback
- Conversation mode with local AI
- Expand content to B1, B2 with NorskprÃ¸ven alignment

**Phase 4 â€” Scale**
- Android
- Optional cloud sync
- Other languages (the engine is language-agnostic by design)

---

## 16. The Content Authoring Pipeline

Easy to underestimate, kills projects when it's slow.

Need:
- A simple internal tool for adding sentences with concept tags, scenario tags, difficulty
- AI-assisted generation that suggests tags and variations, reviewed by a Norwegian speaker
- Validation rules â€” every sentence has audio, every concept has minimum N sentences across difficulty levels
- Version control on content

---

## 17. Open Questions

- Which local model performs best on Norwegian? (Needs testing â€” Norwegian is smaller, model quality varies)
- TTS quality v1 vs. real recordings â€” what's good enough?
- How much A1 content does v1 need to feel substantial?
- Free, freemium, one-time purchase, or subscription?
- **The success metric:** time to mastery on a defined concept set, tested against learners using Duolingo or similar
- Onboarding â€” placement test to bootstrap the fingerprint, or learn from scratch?

---

## 18. Strategic Framing (For Later)

This isn't really a Norwegian app. It's an **adaptive language-learning engine** that happens to launch with Norwegian. If the engine works, it ports to any language. That's the platform play.

For v1: stay focused. Ship the Norwegian app. Prove the engine.

---

## 19. The Bet

**Diagnosis + scheduling + remediation, done well, beats lesson-based apps for any motivated learner.**

The app should be a diagnostic language coach, not a chatbot. AI should power the coaching, not define the product. Every mistake should run through the repair loop. Every day should bring visible growth. The mistake fingerprint should evolve with the learner so the app always knows what they need next.

If we can prove that with v1 â€” even with limited content, even with minimal AI â€” we have something real. Everything else builds on top.

Let's build it.

codex
Plan:
1. Map the new features onto the existing fingerprint/session/content model.
2. Separate what should stay local in the browser from what should sync to Supabase.
3. Propose the runtime architecture, per-feature browser APIs, schema additions, and rollout order.
4. Close with the WebLLM sharing strategy and the main risks/tradeoffs.
  ✓ Inspect current app architecture, AI layer, and storage model
  → Verify current WebLLM and browser API constraints from primary docs
  • Draft feature architecture, schemas, risks, and implementation order
web search: 
web search: 
web search: 
web search: site:webllm.mlc.ai/docs/user/advanced_usage.html WebLLM Using Workers Service Worker
web search: 
web search: site:developer.mozilla.org SpeechSynthesis MDN baseline widely available
web search: 
web search: site:developer.mozilla.org GPU WorkerNavigator.gpu MDN WebGPU available in workers
codex
The main design tension is clear now: WebLLM is a good shared text engine, but STT and phoneme scoring are separate problems. I’m drafting the proposal around a single local AI broker plus separate audio/STT adapters, which keeps the architecture honest and avoids forcing the LLM into jobs it’s not good at.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\types\\taxonomy.ts" in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\components\\session\\exercises\\ListeningExercise.tsx" in C:\Users\daveb\Documents\GitHub\Language-app
 succeeded in 196ms:
// The complete error taxonomy â€” every mistake gets exactly one tag

export type GrammarErrorTag =
  | 'word-order'           // V2 violation, SVO violation
  | 'verb-tense'           // wrong tense (present/past/perfect)
  | 'verb-conjugation'     // wrong verb form for person/number
  | 'noun-gender'          // en/ei/et gender error
  | 'article-use'          // definite/indefinite, wrong suffix
  | 'adjective-agreement'  // adjective not agreeing with noun gender/definiteness
  | 'pronoun-choice'       // wrong pronoun or case
  | 'preposition'          // wrong preposition
  | 'modal-verb'           // modal verb misuse
  | 'negation-placement'   // "ikke" in wrong position
  | 'compound-word';       // compound word formation error

export type VocabularyErrorTag =
  | 'wrong-word-same-category'    // false friend or near-synonym
  | 'wrong-word-different-category' // word not known at all
  | 'spelling';

export type ComprehensionErrorTag =
  | 'listening-recognition'    // couldn't parse spoken audio
  | 'reading-parsing'          // couldn't decode written sentence
  | 'meaning-misunderstood';   // recognized words but missed meaning

export type ErrorTag = GrammarErrorTag | VocabularyErrorTag | ComprehensionErrorTag;

export const GRAMMAR_ERROR_TAGS: GrammarErrorTag[] = [
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender',
  'article-use', 'adjective-agreement', 'pronoun-choice', 'preposition',
  'modal-verb', 'negation-placement', 'compound-word',
];

export const VOCABULARY_ERROR_TAGS: VocabularyErrorTag[] = [
  'wrong-word-same-category', 'wrong-word-different-category', 'spelling',
];

export const COMPREHENSION_ERROR_TAGS: ComprehensionErrorTag[] = [
  'listening-recognition', 'reading-parsing', 'meaning-misunderstood',
];

export const ALL_ERROR_TAGS: ErrorTag[] = [
  ...GRAMMAR_ERROR_TAGS,
  ...VOCABULARY_ERROR_TAGS,
  ...COMPREHENSION_ERROR_TAGS,
];

 succeeded in 202ms:
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { checkAnswer } from '@/lib/answer';

interface ListeningExerciseProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
}

interface HowlInstance {
  play: () => void;
  rate: (r: number) => void;
  unload: () => void;
}

function useHowlerAudio(audioUrl: string) {
  const howlRef = useRef<HowlInstance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    import('howler').then(({ Howl }) => {
      howlRef.current = new Howl({
        src: [audioUrl],
        html5: true,
        onload: () => setIsLoaded(true),
        onplay: () => setIsPlaying(true),
        onend: () => setIsPlaying(false),
      }) as unknown as HowlInstance;
    });
    return () => { howlRef.current?.unload(); };
  }, [audioUrl]);

  const play = () => howlRef.current?.play();
  const setRate = (r: number) => howlRef.current?.rate(r);
  return { play, setRate, isLoaded, isPlaying };
}

function useTTS(text: string) {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback(
    (rate = 1) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'nb-NO';
      utt.rate = rate;
      utt.onstart = () => setIsPlaying(true);
      utt.onend = () => setIsPlaying(false);
      utt.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utt);
    },
    [text],
  );

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  return { speak, isPlaying, isSupported };
}

export function ListeningExercise({ item, sentence, sessionId, onResult }: ListeningExerciseProps) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const startRef = useRef(Date.now());

  const hasAudioFile = !!sentence.audioUrl;
  const howler = useHowlerAudio(sentence.audioUrl ?? '');
  const tts = useTTS(sentence.norwegian);

  function submit() {
    if (submitted || !userInput.trim()) return;
    setSubmitted(true);
    const correct = checkAnswer(userInput, sentence.norwegian);
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userInput,
      correctAnswer: sentence.norwegian,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : 'listening-recognition',
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  const audioButtonClass = "min-h-[48px] rounded-xl border border-nc-border bg-[rgba(255,255,255,0.04)] px-5 py-3 font-semibold text-white/70 transition hover:border-nc-green/40 hover:text-white disabled:opacity-40";

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        Lytt og skriv hva du hÃ¸rte
      </p>

      {hasAudioFile ? (
        <div className="flex gap-3">
          <button onClick={() => howler.play()} disabled={!howler.isLoaded || submitted} className={`flex-1 ${audioButtonClass}`}>
            {howler.isPlaying ? 'â–¶ Spillerâ€¦' : 'â–¶ Spill av'}
          </button>
          <button onClick={() => howler.setRate(0.75)} disabled={!howler.isLoaded || submitted} className={audioButtonClass}>
            0.75Ã—
          </button>
        </div>
      ) : tts.isSupported ? (
        <div className="flex gap-3">
          <button onClick={() => tts.speak(1)} disabled={submitted} className={`flex-1 ${audioButtonClass}`}>
            {tts.isPlaying ? 'â–¶ Spillerâ€¦' : 'â–¶ Spill av'}
          </button>
          <button onClick={() => tts.speak(0.75)} disabled={submitted} className={audioButtonClass}>
            0.75Ã—
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-nc-border bg-[rgba(255,255,255,0.04)] px-5 py-4 text-sm text-white/30">
          Lyd ikke tilgjengelig i denne nettleseren
        </div>
      )}

      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        disabled={submitted}
        placeholder="Skriv hva du hÃ¸rteâ€¦"
        className="min-h-[48px] w-full rounded-xl border border-nc-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-nc-green/60 focus:ring-1 focus:ring-nc-green/40 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={submit}
        disabled={submitted || !userInput.trim()}
        className="min-h-[48px] w-full rounded-xl bg-nc-green px-6 py-3 font-bold text-[#0d0d14] transition-all hover:bg-nc-green/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
    </div>
  );
}

codex
**Architecture**
This should extend your current split of local AI + local fingerprint + Supabase content, not replace it. Keep the heavy and privacy-sensitive parts in-browser: one shared WebLLM runtime, mic/audio pipelines, transcript/annotation caches, and an offline sync queue in IndexedDB. Use Supabase for authoritative content, normalized progress events, and SRS state.

Minimum Supabase additions I’d make first:
- `learning_sessions(id, user_id, mode, content_ref_type, content_ref_id, cefr_level, started_at, ended_at, summary jsonb)`
- `learning_events(id, session_id, user_id, mode, event_type, concept_ids text[], vocab_item_ids uuid[], error_tags text[], payload jsonb, created_at)` as the append-only spine all modes write to
- `user_vocab_srs(user_id, vocab_item_id, next_due_at, stability, difficulty, interval_days, reps, lapses, last_reviewed_at, source_modes text[], primary key(user_id, vocab_item_id))`
- `vocab_forms(id, vocab_item_id, surface_form, lemma, morph jsonb)` so reading/conversation/writing can map inflected Norwegian forms back to one SRS card
- `content_vocab_mentions(content_type, content_id, vocab_item_id, start_char, end_char, surface_form)` for inline annotations and cross-mode vocab attribution

**Feature Map**
- `Voice conversation`: use `getUserMedia`, `SpeechRecognition`/`webkitSpeechRecognition`, `SpeechRecognition.processLocally` where available, `AudioContext` + `AnalyserNode` or `AudioWorklet` for VAD/level meter, and `speechSynthesis` for TTS; WebLLM should do tutor turn generation, implicit correction/rephrasing, background error tagging, and end-of-session summary; add `conversation_sessions`, `conversation_turns`, and extend `scenarios` with persona/success criteria; biggest risks are STT support/privacy, context growth, and mobile battery. `SpeechRecognition` is still limited-availability and may use server-side recognition on some browsers, so treat STT as an adapter, not a hardwired assumption.
- `Reading mode`: use a worker-backed WebLLM plus `IntersectionObserver` for lazy paragraph annotation and simple char-offset anchoring for highlights; WebLLM should annotate one paragraph/chunk at a time, score difficulty, generate glossary notes, and produce comprehension questions/grades; add `reading_texts`, `reading_segments`, `reading_questions`, `reading_attempts`; biggest risks are long-context latency and annotation drift, so chunk aggressively and cache per segment.
- `Writing / essay feedback`: browser API needs are light beyond the shared WebLLM worker, `AbortController`, and local draft persistence; WebLLM should return structured span-based feedback, rewrite suggestions, and one prioritized improvement; add `writing_prompts`, `writing_submissions`, `writing_feedback` or store only derived events if you want local-first privacy; biggest risks are long essays, hallucinated corrections, and inconsistent JSON, so cap length and require span references.
- `Shadowing mode`: use `getUserMedia`, `AudioContext`, `AudioBufferSourceNode` for accurate playback, `AudioWorklet` for capture/feature extraction, `AnalyserNode` for live feedback, `OfflineAudioContext` for post-hoc comparison, and `MediaRecorder` only if you save attempts; WebLLM should not do phoneme scoring directly, it should explain the results from a separate acoustic/phoneme scorer and generate targeted retry prompts; add `shadowing_clips`, `shadowing_attempts`, `pronunciation_scores`; biggest risks are mic latency, echo, and the fact that phoneme comparison is a separate model/problem from LLM inference.
- `Spaced repetition across all modes`: browser-side needs are mostly IndexedDB and optional PWA reminders later; WebLLM is useful for example sentences, distractors, and mnemonics, but not for scheduling; the real foundation is `user_vocab_srs`, `learning_events`, `vocab_forms`, and `content_vocab_mentions`; biggest risks are bad lemma normalization and sync conflicts, so schedule from normalized vocab IDs only.

**Priority**
1. Build the event spine and vocab normalization first: `learning_events`, `user_vocab_srs`, `vocab_forms`.
2. Ship writing feedback next: highest value, lowest browser complexity, reuses your current `reviewWriting` path.
3. Ship reading mode after that: same text-first runtime, strong SRS feed, no audio risk.
4. Ship voice conversation once the shared broker and SRS ingestion are stable.
5. Ship shadowing last: it is the most technically different feature because it needs a real acoustic scoring path, not just WebLLM.

**One Shared WebLLM**
The efficient pattern is one worker-backed singleton engine plus a broker, not one engine per route/component. In practice: create one `CreateWebWorkerMLCEngine` instance for the live app, enable IndexedDB model caching, and expose feature-specific RPC methods like `conversationTurn`, `annotateReadingChunk`, `reviewWriting`, and `summarizeShadowing`. Put a priority queue in front of it: interactive turn generation first, short feedback second, background annotation/question generation last, with cancellation. Do not try to run multiple generations truly in parallel on the same loaded model; multiplex them through one broker. If you specifically want the loaded model to survive page refreshes, WebLLM’s `CreateServiceWorkerMLCEngine` is the next step, but it is less reliable because the browser can kill the service worker, so I’d start with a dedicated worker and use the service-worker backend only if cross-refresh persistence becomes worth the complexity.

References: [WebLLM basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html), [WebLLM workers/service workers](https://webllm.mlc.ai/docs/user/advanced_usage.html), [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [MDN SpeechRecognition.processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN speechSynthesis](https://developer.mozilla.org/docs/Web/API/Window/speechSynthesis), [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext), [MDN WorkerNavigator.gpu](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/gpu).
2026-05-11T13:12:13.056484Z ERROR codex_core::session: failed to record rollout items: thread 019e1725-cce4-7233-bd08-cb8982b53ed9 not found
tokens used
192,405

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
