import { config } from 'dotenv';
config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConceptNode {
  id: string;
  label: string;
  description: string;
  cefrLevel: string;
  prerequisites: string[];
  errorTags: string[];
  vocabularyClusters?: string[];
}

interface ConceptGraph {
  version: string;
  language: string;
  concepts: ConceptNode[];
}

interface SentenceRecord {
  id: string;
  norwegian: string;
  english: string;
  concept_ids: string[];
  vocab_clusters: string[];
  error_tags_detectable: string[];
  cefr_level: string;
  difficulty: 1 | 2 | 3;
  exercise_types: string[];
  notes?: string;
}

interface FillInBlankRaw {
  norwegian: string;
  english: string;
  notes: string;
  difficulty: number;
}

interface RegularRaw {
  norwegian: string;
  english: string;
  difficulty: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGULAR_EXERCISE_TYPES = [
  'translation-to-norwegian',
  'translation-to-english',
  'word-order',
  'speed-round',
  'listening-comprehension',
];

const SYSTEM_PROMPT = `You are a Norwegian Bokmål language exercise generator. You produce grammatically perfect, natural Norwegian sentences for A1-B2 learners.
Output valid JSON only — no markdown, no prose, no extra keys.
Never use Nynorsk. Sentences must sound like something a native Norwegian would naturally say.`;

const DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCLIArgs(): { level: string } {
  const levelIndex = process.argv.indexOf('--level');
  if (levelIndex === -1 || !process.argv[levelIndex + 1]) {
    console.error('Usage: npx tsx scripts/generate-content.ts --level A1');
    process.exit(1);
  }
  const level = process.argv[levelIndex + 1].toUpperCase();
  if (level !== 'A1' && level !== 'A2') {
    console.error('--level must be A1 or A2');
    process.exit(1);
  }
  return { level };
}

function loadConceptGraph(level: string): ConceptGraph {
  const graphPath = path.join(
    process.cwd(),
    'content',
    'concepts',
    `${level.toLowerCase()}-graph.json`
  );
  if (!fs.existsSync(graphPath)) {
    console.error(`Concept graph not found: ${graphPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(graphPath, 'utf-8');
  return JSON.parse(raw) as ConceptGraph;
}

function ensureOutputDir(level: string): string {
  const dir = path.join(process.cwd(), 'content', 'sentences');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `${level.toLowerCase()}.json`);
}

function validateDifficulty(d: unknown): 1 | 2 | 3 {
  if (d === 1 || d === 2 || d === 3) return d;
  return 1;
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// API call helpers
// ---------------------------------------------------------------------------

async function callClaude(
  client: Anthropic,
  userPrompt: string
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected non-text response block');
  }
  return block.text;
}

// ---------------------------------------------------------------------------
// Per-concept generation
// ---------------------------------------------------------------------------

async function generateFillInBlank(
  client: Anthropic,
  concept: ConceptNode,
  level: string
): Promise<SentenceRecord[]> {
  const prompt = `Generate 4 Norwegian Bokmål fill-in-blank sentences testing: ${concept.label}
Level: ${level}, Concept: ${concept.description}
Difficulty distribution: 2 × difficulty 1, 1 × difficulty 2, 1 × difficulty 3

Rules:
- Use exactly three underscores ___ for the one blank
- The blank must directly test the concept
- "notes" = the exact word that fills the blank
- Sentence with blank filled must be grammatically perfect

Output a JSON array of 4 objects:
[{"norwegian":"...___...","english":"...","notes":"targetWord","difficulty":1},...]`;

  const raw = stripMarkdownFences(await callClaude(client, prompt));
  const parsed = JSON.parse(raw) as FillInBlankRaw[];

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array for fill-in-blank');
  }

  return parsed.map((item) => {
    if (
      typeof item.norwegian !== 'string' ||
      typeof item.english !== 'string' ||
      typeof item.notes !== 'string' ||
      typeof item.difficulty !== 'number'
    ) {
      throw new Error(`Invalid fill-in-blank item: ${JSON.stringify(item)}`);
    }

    const record: SentenceRecord = {
      id: crypto.randomUUID(),
      norwegian: item.norwegian,
      english: item.english,
      concept_ids: [concept.id],
      vocab_clusters: [],
      error_tags_detectable: concept.errorTags ?? [],
      cefr_level: level,
      difficulty: validateDifficulty(item.difficulty),
      exercise_types: ['fill-in-blank'],
      notes: item.notes,
    };
    return record;
  });
}

async function generateRegular(
  client: Anthropic,
  concept: ConceptNode,
  level: string
): Promise<SentenceRecord[]> {
  const prompt = `Generate 5 Norwegian Bokmål sentences demonstrating: ${concept.label}
Level: ${level}, Concept: ${concept.description}
Difficulty distribution: 2 × difficulty 1, 2 × difficulty 2, 1 × difficulty 3

Rules:
- Full sentences, no blanks
- Each sentence must clearly demonstrate the target concept
- Natural, conversational Norwegian Bokmål

Output a JSON array of 5 objects:
[{"norwegian":"...","english":"...","difficulty":1},...]`;

  const raw = stripMarkdownFences(await callClaude(client, prompt));
  const parsed = JSON.parse(raw) as RegularRaw[];

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array for regular sentences');
  }

  return parsed.map((item) => {
    if (
      typeof item.norwegian !== 'string' ||
      typeof item.english !== 'string' ||
      typeof item.difficulty !== 'number'
    ) {
      throw new Error(`Invalid regular item: ${JSON.stringify(item)}`);
    }

    const record: SentenceRecord = {
      id: crypto.randomUUID(),
      norwegian: item.norwegian,
      english: item.english,
      concept_ids: [concept.id],
      vocab_clusters: [],
      error_tags_detectable: concept.errorTags ?? [],
      cefr_level: level,
      difficulty: validateDifficulty(item.difficulty),
      // Regular sentences work for all non-blank exercise types
      exercise_types: REGULAR_EXERCISE_TYPES,
    };
    return record;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set in environment');
    process.exit(1);
  }

  const { level } = parseCLIArgs();
  const graph = loadConceptGraph(level);
  const outputPath = ensureOutputDir(level);
  const client = new Anthropic({ apiKey });

  const allSentences: SentenceRecord[] = [];
  const skipped: string[] = [];
  let covered = 0;

  console.log(`Generating sentences for ${level} — ${graph.concepts.length} concepts`);
  console.log(`Output: ${outputPath}\n`);

  for (let i = 0; i < graph.concepts.length; i++) {
    const concept = graph.concepts[i];
    console.log(`[${i + 1}/${graph.concepts.length}] ${concept.id}`);

    try {
      const fillIn = await generateFillInBlank(client, concept, level);
      console.log(`  fill-in-blank: ${fillIn.length} sentences`);

      await sleep(DELAY_MS);

      const regular = await generateRegular(client, concept, level);
      console.log(`  regular:       ${regular.length} sentences`);

      allSentences.push(...fillIn, ...regular);
      covered++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  SKIPPED — ${message}`);
      skipped.push(concept.id);
    }

    if (i < graph.concepts.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(allSentences, null, 2), 'utf-8');

  console.log('\n--- Summary ---');
  console.log(`Sentences generated : ${allSentences.length}`);
  console.log(`Concepts covered    : ${covered} / ${graph.concepts.length}`);
  if (skipped.length > 0) {
    console.log(`Skipped concepts    : ${skipped.join(', ')}`);
  }
  console.log(`Output written to   : ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
