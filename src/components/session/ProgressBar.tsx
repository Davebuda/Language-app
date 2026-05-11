'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="h-1 w-full overflow-hidden bg-surface-border">
      <motion.div
        className="h-full bg-brand-500"
        style={{ width: `${pct}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
