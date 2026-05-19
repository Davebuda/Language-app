'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
