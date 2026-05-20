import { describe, it, expect } from 'vitest';
import { deriveCorrectAnswer } from '@/lib/grade-utils';

const NO = 'Hvem er den mannen der borte?';
const EN = 'Who is that man over there?';
const NOTES = 'stor → stort';

describe('deriveCorrectAnswer — exercise type → answer field contract', () => {
  it('translation-to-norwegian → returns norwegian', () => {
    expect(deriveCorrectAnswer('translation-to-norwegian', NO, EN, undefined)).toBe(NO);
  });

  it('translation-to-english → returns english', () => {
    expect(deriveCorrectAnswer('translation-to-english', NO, EN, undefined)).toBe(EN);
  });

  // Critical: sentence-transformation renders as "Oversett til engelsk" in the UI
  // and expects English output. This case was previously mis-routed to Norwegian,
  // causing every sentence-transformation exercise to fail grading (P0 item 1/2).
  it('sentence-transformation → returns english (not norwegian)', () => {
    expect(deriveCorrectAnswer('sentence-transformation', NO, EN, undefined)).toBe(EN);
    expect(deriveCorrectAnswer('sentence-transformation', NO, EN, undefined)).not.toBe(NO);
  });

  it('speed-round → returns english', () => {
    expect(deriveCorrectAnswer('speed-round', NO, EN, undefined)).toBe(EN);
  });

  it('word-order → returns norwegian', () => {
    expect(deriveCorrectAnswer('word-order', NO, EN, undefined)).toBe(NO);
  });

  it('fill-in-blank → returns notes when present', () => {
    expect(deriveCorrectAnswer('fill-in-blank', NO, EN, NOTES)).toBe(NOTES);
  });

  it('fill-in-blank → returns empty string when notes absent', () => {
    expect(deriveCorrectAnswer('fill-in-blank', NO, EN, undefined)).toBe('');
  });

  it('listening-comprehension → returns norwegian', () => {
    expect(deriveCorrectAnswer('listening-comprehension', NO, EN, undefined)).toBe(NO);
  });

  it('dictation → returns norwegian', () => {
    expect(deriveCorrectAnswer('dictation', NO, EN, undefined)).toBe(NO);
  });
});
