import dynamic from 'next/dynamic';

const WordOrderExercise = dynamic(
  () => import('./WordOrderExercise').then((m) => ({ default: m.WordOrderExercise })),
  {
    ssr: false,
    loading: () => <div className="h-24 animate-pulse rounded-2xl bg-surface" />,
  }
);

export default WordOrderExercise;
