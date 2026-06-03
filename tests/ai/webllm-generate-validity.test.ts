/**
 * Fix 2 (audit 2026-06-03): generateContent was the only AI surface with no
 * validateNorwegianOutput gate. validateGenerated checks structure + char set +
 * length, but NOT Norwegian-ness — so English-as-Norwegian (or gibberish that
 * still uses Latin chars) could ship to the learner as generated content.
 *
 * These tests prove the gate: content that passes validateGenerated but is not
 * coherent Norwegian must be dropped (→ retry → null), while valid Norwegian
 * still resolves.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/stores/ai-status-store', () => ({
  useAIStatusStore: {
    getState: () => ({ setState: vi.fn(), setLoadingPct: vi.fn() }),
  },
}));

import { WebLLMService } from '@/ai/webllm';

function makeReadyService(engine: Record<string, unknown>): WebLLMService {
  const svc = new WebLLMService();
  (svc as unknown as Record<string, unknown>).engine = engine;
  (svc as unknown as Record<string, unknown>).state = 'ready';
  return svc;
}

/** Engine whose every completion resolves with the given raw string. */
function mockEngine(raw: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: raw } }] }),
      },
    },
  };
}

describe('WebLLMService.generateContent — Norwegian validity gate', () => {
  const params = {
    conceptId: 'v2-word-order',
    exerciseType: 'translation-to-norwegian' as const,
    level: 'A1' as const,
    purpose: 'new-material' as const,
  };

  it('drops English-as-Norwegian content (passes structure, fails Norwegian gate) → null', async () => {
    // Valid JSON shape + valid char set + valid length, but the "norwegian"
    // field is actually English: >25% English function words → english-drift.
    const englishAsNorwegian = JSON.stringify({
      norwegian: 'The cat is on the table',
      english: 'The cat is on the table',
    });
    const svc = makeReadyService(mockEngine(englishAsNorwegian));
    const result = await svc.generateContent(params);
    expect(result).toBeNull();
  });

  it('still resolves coherent Norwegian content', async () => {
    const validNorwegian = JSON.stringify({
      norwegian: 'Jeg går til skolen i dag',
      english: 'I am going to school today',
    });
    const svc = makeReadyService(mockEngine(validNorwegian));
    const result = await svc.generateContent(params);
    expect(result).not.toBeNull();
    expect(result?.norwegian).toBe('Jeg går til skolen i dag');
  });
});
