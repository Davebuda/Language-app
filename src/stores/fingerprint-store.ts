'use client';

import { create } from 'zustand';
import type { MistakeFingerprint } from '@/types/fingerprint';

type FingerprintStatus = 'loading' | 'ready' | 'empty';

interface FingerprintSlice {
  fingerprint: MistakeFingerprint | null;
  status: FingerprintStatus;
  setFingerprint: (fp: MistakeFingerprint) => void;
  setStatus: (status: FingerprintStatus) => void;
}

export const useFingerprintStore = create<FingerprintSlice>()((set) => ({
  fingerprint: null,
  status: 'loading',
  setFingerprint: (fp) => set({ fingerprint: fp, status: 'ready' }),
  setStatus: (status) => set({ status }),
}));
