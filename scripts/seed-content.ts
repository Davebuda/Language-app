import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load concept IDs from both A1 and A2 graph files
// ---------------------------------------------------------------------------

interface ConceptGraphShape {
  concepts: Array<{ id: string }>;
}

function loadConceptIds(level: string): string[] {
  const graphPath = path.join(
    process.cwd(),
    'content',
    'concepts',
    `${level.toLowerCase()}-graph.json`
  );
  if (!fs.existsSync(graphPath)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(graphPath, 'utf-8')) as ConceptGraphShape;
  return raw.concepts.map((c) => c.id);
}

const A1_CONCEPT_IDS = loadConceptIds('a1');
const A2_CONCEPT_IDS = loadConceptIds('a2');
const ALL_CONCEPT_IDS = Array.from(new Set([...A1_CONCEPT_IDS, ...A2_CONCEPT_IDS]));

if (ALL_CONCEPT_IDS.length === 0) {
  console.error('No concept IDs found — ensure content/concepts/a1-graph.json or a2-graph.json exists');
  process.exit(1);
}

const SentenceSchema = z.object({
  id: z.string().uuid(),
  norwegian: z.string().min(1),
  english: z.string().min(1),
  concept_ids: z.array(z.string()).min(1).refine(
    (ids) => ids.every((id) => ALL_CONCEPT_IDS.includes(id)),
    { message: 'concept_ids contains unknown concept IDs' }
  ),
  vocab_clusters: z.array(z.string()),
  error_tags_detectable: z.array(z.string()),
  cefr_level: z.enum(['A1', 'A2', 'B1', 'B2']),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  exercise_types: z.array(z.string()).min(1),
  audio_url: z.string().url().optional(),
  scenario_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

type ValidatedSentence = z.infer<typeof SentenceSchema>;

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');
const CONTENT_DIR = path.join(process.cwd(), 'content', 'sentences');

async function main() {
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  let files: string[] = [];
  if (fs.existsSync(CONTENT_DIR)) {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  }

  if (files.length === 0) {
    console.log('No content files found in content/sentences/ — nothing to seed.');
    if (DRY_RUN) console.log('(dry-run mode)');
    return;
  }

  const sentences: ValidatedSentence[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      errors.push(`${file}: invalid JSON`);
      continue;
    }

    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
      const result = SentenceSchema.safeParse(item);
      if (result.success) {
        sentences.push(result.data);
      } else {
        const id = (item as Record<string, unknown>)?.id ?? '?';
        const msgs = result.error.issues.map((i) => i.message).join(', ');
        errors.push(`${file}[${id}]: ${msgs}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s):`);
    errors.forEach((e) => console.error(' ✗', e));
    process.exit(1);
  }

  console.log(`Validated ${sentences.length} sentences from ${files.length} file(s).`);

  if (DRY_RUN) {
    console.log('(dry-run) Skipping database insert.');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
    const batch = sentences.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('sentences').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${sentences.length} inserted`);
  }

  // Per-concept row count validation
  const { data: rows, error: countError } = await supabase
    .from('sentences')
    .select('concept_ids');

  if (countError) {
    console.error('Failed to fetch row counts:', countError.message);
    process.exit(1);
  }

  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    for (const id of row.concept_ids as string[]) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  console.log('\nPer-concept sentence counts:');
  for (const conceptId of ALL_CONCEPT_IDS) {
    const count = counts[conceptId] ?? 0;
    const warn = count < 5 ? '  ⚠ WARNING: fewer than 5 sentences' : '';
    console.log(`  ${conceptId}: ${count}${warn}`);
  }

  console.log(`\nDone. ${inserted} sentences upserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
