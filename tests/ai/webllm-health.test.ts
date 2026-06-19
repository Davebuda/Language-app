/**
 * Tests for WebLLMService generation-health tracking.
 *
 * We test the service's state machine in isolation. The actual WebGPU engine
 * is mocked — we care about: when does the service set 'unavailable', when does
 * it reset the failure counter, and does init() allow re-attempts from unavailable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Minimal mock of the store so _updateStore doesn't blow up in jsdom ────────
vi.mock('@/stores/ai-status-store', () => ({
  useAIStatusStore: {
    getState: () => ({
      setState: vi.fn(),
      setLoadingPct: vi.fn(),
    }),
  },
}));

// ── Import the real service class after the mock is in place ──────────────────
import { WebLLMService } from '@/ai/webllm';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Force the service into 'ready' state with a mock engine. */
function makeReadyService(engine: Record<string, unknown>): WebLLMService {
  const svc = new WebLLMService();
  // Reach into private fields via any-cast — test-only
  (svc as unknown as Record<string, unknown>).engine = engine;
  (svc as unknown as Record<string, unknown>).state = 'ready';
  return svc;
}

/** A mock engine whose complete() always resolves with the given content. */
function mockEngine(content: string | null) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content } }],
        }),
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WebLLMService — generation health tracking', () => {
  it('isReady() returns false when state is unavailable', () => {
    const svc = new WebLLMService();
    (svc as unknown as Record<string, unknown>).state = 'unavailable';
    expect(svc.isReady()).toBe(false);
  });

  it('init() no-ops when state is ready (model already loaded)', async () => {
    const svc = makeReadyService(mockEngine('ok'));
    const loadSpy = vi.spyOn(svc as unknown as Record<string, () => Promise<void>>, '_load');
    await svc.init();
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('init() allows re-attempt when state is unavailable', async () => {
    const svc = new WebLLMService();
    (svc as unknown as Record<string, unknown>).state = 'unavailable';
    // Calling init() should not early-return — it should attempt _load() again.
    // In jsdom, _load() will hit the '!gpu in navigator' check and set unavailable again,
    // which is fine — we just verify it does NOT no-op.
    const loadSpy = vi.spyOn(svc as unknown as Record<string, () => Promise<void>>, '_load');
    await svc.init();
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('two consecutive empty responses set state to unavailable', async () => {
    const engine = mockEngine(null); // always returns null content
    const svc = makeReadyService(engine);

    // detectErrors calls complete(), which records a failure on empty content and
    // throws (caught). (explainMistake no longer calls the model — the 1B is gated
    // off — so health tracking is exercised through a method that still calls it.)
    await svc.detectErrors('Jeg går', 'A1');
    expect(svc.isReady()).toBe(true); // one failure — not yet at threshold

    await svc.detectErrors('Jeg går', 'A1');
    expect(svc.isReady()).toBe(false); // second consecutive failure → unavailable
    expect((svc as unknown as Record<string, unknown>).state).toBe('unavailable');
  });

  it('successful response resets the failure counter', async () => {
    // One failure, then a success, then one more failure — should not hit threshold
    const engine = {
      chat: {
        completions: {
          create: vi.fn()
            .mockResolvedValueOnce({ choices: [{ message: { content: null } }] }) // fail
            .mockResolvedValueOnce({ choices: [{ message: { content: 'good response' } }] }) // success
            .mockResolvedValueOnce({ choices: [{ message: { content: null } }] }), // fail
        },
      },
    };
    const svc = makeReadyService(engine);

    await svc.detectErrors('x', 'A1'); // failure 1 → counter = 1
    await svc.detectErrors('x', 'A1'); // success in complete() → counter = 0
    await svc.detectErrors('x', 'A1'); // failure 1 again → counter = 1 (below threshold of 2)

    expect(svc.isReady()).toBe(true); // threshold not hit — counter was reset
  });

  it('explainMistake never returns AI source on the local 1B (gibberish gate-off)', async () => {
    // Even when the model is "ready", the 1B explanation path is gated off — it
    // produces fluent Norwegian gibberish no cheap validator catches (2026-06-19).
    const svc = makeReadyService(mockEngine('en plausibel-men-kanskje-tøvete forklaring'));
    const result = await svc.explainMistake({
      wrong: 'x', correct: 'y', errorTag: 'word-order', conceptId: 'c', level: 'B1',
    });
    expect(result.source).toBe('template'); // 1B explanations are not shown
  });

  it('explainMistake returns template when service is unavailable', async () => {
    const svc = new WebLLMService();
    (svc as unknown as Record<string, unknown>).state = 'unavailable';
    const result = await svc.explainMistake({
      wrong: 'x', correct: 'y', errorTag: 'word-order', conceptId: 'c', level: 'A1',
    });
    expect(result.source).toBe('template');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('generateContent returns null when service is unavailable', async () => {
    const svc = new WebLLMService();
    (svc as unknown as Record<string, unknown>).state = 'unavailable';
    const result = await svc.generateContent({
      conceptId: 'v2-word-order', exerciseType: 'translation-to-norwegian',
      level: 'A1', purpose: 'new-material',
    });
    expect(result).toBeNull();
  });
});
