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

  const audioButtonClass = "min-h-[48px] rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)] px-5 py-3 font-semibold text-white/70 transition hover:border-nc-violet/45 hover:text-white disabled:opacity-40";

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        Lytt og skriv hva du hørte
      </p>

      {hasAudioFile ? (
        <div className="flex gap-3">
          <button onClick={() => howler.play()} disabled={!howler.isLoaded || submitted} className={`flex-1 ${audioButtonClass}`}>
            {howler.isPlaying ? '▶ Spiller…' : '▶ Spill av'}
          </button>
          <button onClick={() => howler.setRate(0.75)} disabled={!howler.isLoaded || submitted} className={audioButtonClass}>
            0.75×
          </button>
        </div>
      ) : tts.isSupported ? (
        <div className="flex gap-3">
          <button onClick={() => tts.speak(1)} disabled={submitted} className={`flex-1 ${audioButtonClass}`}>
            {tts.isPlaying ? '▶ Spiller…' : '▶ Spill av'}
          </button>
          <button onClick={() => tts.speak(0.75)} disabled={submitted} className={audioButtonClass}>
            0.75×
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
        placeholder="Skriv hva du hørte…"
        className="min-h-[48px] w-full rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-nc-violet/70 focus:ring-1 focus:ring-nc-violet/40 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={submit}
        disabled={submitted || !userInput.trim()}
        className="min-h-[48px] w-full rounded-xl bg-[linear-gradient(135deg,#D7CBFF_0%,#B7A7FF_60%,#EFE8FF_100%)] px-6 py-3 font-bold text-nc-dark transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
    </div>
  );
}
