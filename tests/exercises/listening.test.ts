import { describe, it, expect } from 'vitest';
import { resolveSeedAudioUrl, getAudioUrl } from '@/lib/audio-utils';

// S4: session-listening must use the real pre-generated MP3 (one per seed
// sentence, named {id}.mp3) and only fall back to browser TTS when no MP3
// could exist. resolveSeedAudioUrl is the pure decision the component uses.

describe('resolveSeedAudioUrl', () => {
  it('keeps an explicit audioUrl when one is already set', () => {
    expect(resolveSeedAudioUrl('https://cdn/x.mp3', 'abc', 'seed')).toBe('https://cdn/x.mp3');
  });

  it('derives the deterministic MP3 path for seed content with no audioUrl', () => {
    expect(resolveSeedAudioUrl(undefined, 'b1-pp-001', 'seed')).toBe('/audio/sentences/b1-pp-001.mp3');
  });

  it('treats missing source as seed (legacy/most content) and derives the path', () => {
    expect(resolveSeedAudioUrl(undefined, '5a7195fa-e861-445c-8fd7-c2707f8c9e78')).toBe(
      '/audio/sentences/5a7195fa-e861-445c-8fd7-c2707f8c9e78.mp3',
    );
  });

  it('returns undefined for generated content (no MP3 exists) → caller uses TTS', () => {
    expect(resolveSeedAudioUrl(undefined, 'gen-123', 'generated')).toBeUndefined();
  });

  it('returns undefined when there is no id and nothing to derive from', () => {
    expect(resolveSeedAudioUrl(undefined, '', 'seed')).toBeUndefined();
  });
});

describe('getAudioUrl', () => {
  it('builds a root-relative path under /audio/sentences', () => {
    expect(getAudioUrl('abc')).toBe('/audio/sentences/abc.mp3');
  });

  it('returns undefined for an empty id', () => {
    expect(getAudioUrl('')).toBeUndefined();
  });
});
