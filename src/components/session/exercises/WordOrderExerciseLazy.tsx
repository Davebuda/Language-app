import dynamic from 'next/dynamic';

const WordOrderExercise = dynamic(
  () => import('./WordOrderExercise').then((m) => ({ default: m.WordOrderExercise })),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 animate-pulse rounded-2xl bg-[#1a1a26]" />
    ),
  }
);

export default WordOrderExercise;
