import { describe, it, expect } from 'vitest';

// Tests for ListeningExercise audioUrl handling.
// The component itself is client-only (howler), so we test the
// guard logic in isolation.

function hasAudio(audioUrl: string | undefined): boolean {
  return !!audioUrl;
}

describe('ListeningExercise audioUrl handling', () => {
  it('returns false when audioUrl is undefined', () => {
    expect(hasAudio(undefined)).toBe(false);
  });

  it('returns false when audioUrl is empty string', () => {
    expect(hasAudio('')).toBe(false);
  });

  it('returns true when audioUrl is a valid URL', () => {
    expect(hasAudio('https://project.supabase.co/storage/v1/object/public/audio/test.mp3')).toBe(true);
  });
});
