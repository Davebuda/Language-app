import type { GenerateParams, ExplainParams } from './types';
import type { ExerciseType } from '@/types/session';

// Human-readable labels for each concept ID — used in generation prompts
const CONCEPT_LABELS: Record<string, string> = {
  'noun-gender': 'Norwegian noun gender (en/ei/et)',
  'indefinite-articles': 'indefinite articles (en, ei, et)',
  'definite-articles-singular': 'definite article suffixes (-en, -a, -et)',
  'v2-word-order': 'V2 word order — verb must be in position 2',
  'svo-word-order': 'basic Subject-Verb-Object sentence structure',
  'negation-placement': '"ikke" after the verb in main clauses, before in subordinate',
  'present-tense-verbs': 'present tense — infinitive stem + -r',
  'past-tense-regular': 'regular past tense (-et/-te/-de patterns)',
  'modal-verbs': 'modal verbs (kan, vil, skal, må) + bare infinitive',
  'adjective-agreement': 'adjective agreement with noun gender and definiteness',
  'personal-pronouns': 'personal pronouns (jeg, du, han, hun, det, vi, dere, de)',
  'prepositions-place': 'prepositions of place (i, på, til, fra, ved)',
  'numbers-1-20': 'Norwegian numbers 1 through 20',
  'question-formation': 'question word order — inversion of subject and verb',
};

const TOPIC_DESCRIPTIONS: Record<string, string> = {
  'daily-routine': 'daily morning or evening routine at home',
  'food': 'eating, cooking, or ordering at a café or restaurant',
  'transport': 'commuting, buses, trains, or driving',
  'family': 'family members and everyday home life',
  'shopping': 'buying things, errands, or a market',
  'work': 'office, colleagues, or a work task',
  'weather': 'weather, seasons, or outdoor activities',
  'health': 'feeling well or unwell, exercise, or a doctor visit',
};

function difficultyInstruction(masteryScore?: number): string {
  if (!masteryScore || masteryScore < 40)
    return 'Short sentence (5–7 words). Simple, high-frequency vocabulary. Single main clause only.';
  if (masteryScore < 70)
    return 'Moderate length (7–10 words). Natural everyday vocabulary. One clause.';
  return 'Longer sentence (9–13 words). May include a subordinate clause or adverbial phrase.';
}

const SYSTEM = `You are a Norwegian Bokmål language exercise generator.
You produce grammatically perfect, natural Norwegian sentences for A1–B2 learners.
Output valid JSON matching the schema exactly — no markdown, no prose, no extra keys.
Never use Nynorsk. Sentences must sound like something a native Norwegian would say.`;

// ── Fill-in-blank ──────────────────────────────────────────────────────────

function fillInBlankPrompt(p: GenerateParams): string {
  const concept = CONCEPT_LABELS[p.conceptId] ?? p.conceptId;
  const topic = p.scenario ? (TOPIC_DESCRIPTIONS[p.scenario] ?? p.scenario) : 'everyday Norwegian life';
  const difficulty = difficultyInstruction(p.masteryScore);
  const errorNote = p.recentErrors?.length
    ? `Learner recently made these errors: ${p.recentErrors.slice(0, 3).join(', ')}. Target that gap directly.`
    : '';

  return `Generate a Norwegian Bokmål fill-in-blank exercise.

Concept to test: ${concept}
CEFR level: ${p.level}
Topic: ${topic}
Difficulty: ${difficulty}
${errorNote}

Rules:
- Use exactly three underscores ___ to mark the one blank
- The blank must test the target concept
- Generate 3 distractors: plausible wrong answers that reflect real learner errors for this concept
- None of the distractors may equal the target word
- Sentence must be grammatically perfect with the blank filled

Examples:
{"norwegian":"Jeg spiser ___ frokost om morgenen.","english":"I do not eat breakfast in the morning.","targetWord":"ikke","distractors":["aldri","jo","vel"]}
{"norwegian":"___ boken er veldig interessant.","english":"The book is very interesting.","targetWord":"Den","distractors":["Det","Dei","De"]}

Output JSON only:
{"norwegian":"...","english":"...","targetWord":"...","distractors":["...","...","..."]}`;
}

// ── Word order ─────────────────────────────────────────────────────────────

function wordOrderPrompt(p: GenerateParams): string {
  const concept = CONCEPT_LABELS[p.conceptId] ?? p.conceptId;
  const topic = p.scenario ? (TOPIC_DESCRIPTIONS[p.scenario] ?? p.scenario) : 'everyday Norwegian life';
  const difficulty = difficultyInstruction(p.masteryScore);

  return `Generate a Norwegian Bokmål word-order exercise.

Concept to test: ${concept}
CEFR level: ${p.level}
Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Sentence must clearly use the target concept (V2 rule, negation position, etc.)
- "words" must be the sentence split on spaces — exactly as they appear in "norwegian"
- Sentence must be grammatically perfect

Examples:
{"norwegian":"I morgen skal vi gå på kino.","english":"Tomorrow we are going to the cinema.","words":["I","morgen","skal","vi","gå","på","kino."]}
{"norwegian":"Hun leser ikke avisen om kvelden.","english":"She does not read the newspaper in the evening.","words":["Hun","leser","ikke","avisen","om","kvelden."]}

Output JSON only:
{"norwegian":"...","english":"...","words":["..."]}`;
}

// ── Translation ────────────────────────────────────────────────────────────

function translationPrompt(p: GenerateParams): string {
  const concept = CONCEPT_LABELS[p.conceptId] ?? p.conceptId;
  const topic = p.scenario ? (TOPIC_DESCRIPTIONS[p.scenario] ?? p.scenario) : 'everyday Norwegian life';
  const difficulty = difficultyInstruction(p.masteryScore);
  const direction =
    p.exerciseType === 'translation-to-norwegian'
      ? 'Learner reads English, writes Norwegian'
      : 'Learner reads Norwegian, writes English';

  return `Generate a Norwegian Bokmål translation exercise.

Direction: ${direction}
Concept to test: ${concept}
CEFR level: ${p.level}
Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Norwegian sentence must clearly exercise the target concept
- Both sides must be natural — not word-for-word translations
- Sentence must be grammatically perfect Norwegian Bokmål

Examples:
{"norwegian":"Katten sover på sofaen.","english":"The cat is sleeping on the sofa."}
{"norwegian":"Vi spiser middag klokka seks.","english":"We eat dinner at six o'clock."}

Output JSON only:
{"norwegian":"...","english":"..."}`;
}

// ── Listening ──────────────────────────────────────────────────────────────

function listeningPrompt(p: GenerateParams): string {
  const concept = CONCEPT_LABELS[p.conceptId] ?? p.conceptId;
  const difficulty = difficultyInstruction(p.masteryScore);

  return `Generate a Norwegian Bokmål listening exercise sentence.

Concept: ${concept}
CEFR level: ${p.level}
Difficulty: ${difficulty}

Rules:
- Sentence must sound natural when spoken aloud at normal speed
- Avoid homophones or rare words that are hard to distinguish by ear
- Prefer clear consonant clusters and common vocabulary
- Sentence must be grammatically perfect Norwegian Bokmål

Examples:
{"norwegian":"Toget avgår om fem minutter.","english":"The train departs in five minutes."}
{"norwegian":"Kan du hjelpe meg med dette?","english":"Can you help me with this?"}

Output JSON only:
{"norwegian":"...","english":"..."}`;
}

// ── Speed round ────────────────────────────────────────────────────────────

function speedRoundPrompt(p: GenerateParams): string {
  const concept = CONCEPT_LABELS[p.conceptId] ?? p.conceptId;

  return `Generate a short Norwegian Bokmål sentence for a timed translation exercise.

Concept: ${concept}
CEFR level: ${p.level}

Rules:
- 4–7 words only — this is a speed exercise, brevity is critical
- Unambiguous Norwegian with a single clear English translation
- Grammatically perfect Norwegian Bokmål

Examples:
{"norwegian":"Bilen er rød.","english":"The car is red."}
{"norwegian":"Vi bor i Oslo.","english":"We live in Oslo."}

Output JSON only:
{"norwegian":"...","english":"..."}`;
}

// ── Public builders ────────────────────────────────────────────────────────

export function buildGenerationPrompt(
  params: GenerateParams
): { system: string; user: string } {
  const builders: Partial<Record<ExerciseType, (p: GenerateParams) => string>> = {
    'fill-in-blank': fillInBlankPrompt,
    'word-order': wordOrderPrompt,
    'translation-to-norwegian': translationPrompt,
    'translation-to-english': translationPrompt,
    'sentence-transformation': translationPrompt,
    'listening-comprehension': listeningPrompt,
    dictation: listeningPrompt,
    'speed-round': speedRoundPrompt,
  };

  const builder = builders[params.exerciseType] ?? translationPrompt;
  return { system: SYSTEM, user: builder(params) };
}

// ── Conversation turn ──────────────────────────────────────────────────────

export function buildConversationPrompt(
  messages: Array<{ role: string; content: string }>,
  level: string,
  topic: string,
): { system: string; messages: Array<{ role: string; content: string }> } {
  const topicLabel = TOPIC_DESCRIPTIONS[topic] ?? topic;
  const levelNote: Record<string, string> = {
    A1: 'very simple sentences, present tense only, max 6 words per sentence',
    A2: 'simple sentences, 2-3 tenses, everyday vocabulary',
    B1: 'natural sentences, varied grammar, can handle some complexity',
    B2: 'fluent natural Norwegian, complex grammar is fine',
  };
  const system = `You are Kari, a warm and encouraging Norwegian language tutor. You are having a spoken conversation with a learner about: ${topicLabel}.

Learner level: ${level} — ${levelNote[level] ?? 'adjust to their level'}

STRICT RULES:
1. Respond ONLY in Norwegian Bokmål — never switch to English in your response
2. Keep your response to 1–3 short sentences — this is a spoken conversation, not a lecture
3. Be warm and curious — always end with a follow-up question to keep the conversation going
4. If the learner made a clear grammar mistake, weave the correct form naturally into your own response without pointing it out explicitly
5. If the error is significant, add a correction note in [brackets] at the very end of your response: [merk: "their mistake" → "correct form"]
6. Never break character, never explain that you are AI

After your Norwegian response, if there was a grammar error, output this on a new line:
CORRECTION:{"original":"exact words they used wrong","correct":"the right form","tag":"error category","why":"one sentence English explanation"}

If no error, output nothing extra.`;

  return { system, messages };
}

// ── Writing feedback ───────────────────────────────────────────────────────

export function buildWritingFeedbackPrompt(
  text: string,
  level: string,
): { system: string; user: string } {
  return {
    system: `You are a Norwegian Bokmål grammar teacher giving constructive feedback.
Analyze the text and return ONLY valid JSON — no markdown, no prose outside the JSON.
Focus on the 1–3 most important errors only. Be encouraging.`,
    user: `Norwegian text from a ${level} learner:
"""
${text}
"""

Return JSON with this exact structure:
{
  "errors": [
    {
      "wrong": "the exact phrase from the text that is wrong",
      "correct": "the corrected version",
      "tag": "one of: word-order|verb-conjugation|noun-gender|article-use|negation-placement|adjective-agreement|modal-verb|preposition|spelling|other",
      "why": "brief English explanation of the rule",
      "start": <integer char offset in original text>,
      "end": <integer char offset in original text>
    }
  ],
  "praise": "one specific positive observation about the writing",
  "suggestion": "the single most important thing to work on next"
}`,
  };
}

export function buildExplanationPrompt(
  params: ExplainParams
): { system: string; user: string } {
  const repeatNote =
    params.errorCount && params.errorCount > 2
      ? `The learner has hit this error ${params.errorCount} times.`
      : '';

  return {
    system: `You are a Norwegian language tutor giving precise, encouraging feedback.
Be specific about the rule violated, reference the learner's exact answer, and keep it under 4 sentences.
Plain text only — no markdown, no headers.`,
    user: `Learner wrote: "${params.wrong}"
Correct answer: "${params.correct}"
Error type: ${params.errorTag}
Level: ${params.level}
${repeatNote}

Explain what went wrong and state the rule clearly. Reference their specific mistake by quoting it.`,
  };
}
