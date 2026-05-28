'use client';

import { create, type StateCreator } from 'zustand';
import type { Session, ExerciseResult, SessionItem } from '@/types/session';
import type { RepairPlan } from '@/engine/repair-loop';

interface SessionSlice {
  session: Session | null;
  currentItemIndex: number;
  results: ExerciseResult[];
  isInRepair: boolean;
  repairPlan: RepairPlan | null;
  usedSentenceIds: Set<string>;
  originalItemCount: number;
  startSession: (session: Session) => void;
  advanceItem: () => void;
  recordResult: (result: ExerciseResult) => void;
  enterRepair: (plan: RepairPlan) => void;
  updateRepairExplanation: (text: string) => void;
  exitRepair: () => void;
  endSession: () => void;
  injectRepairItems: (items: SessionItem[], afterIndex: number) => void;
  markSentenceUsed: (id: string) => void;
}

const EMPTY_USED_SENTENCES: Set<string> = new Set();

const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: null,
  currentItemIndex: 0,
  results: [],
  isInRepair: false,
  repairPlan: null,
  usedSentenceIds: EMPTY_USED_SENTENCES,
  originalItemCount: 0,
  startSession: (session) =>
    set({ session, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null, usedSentenceIds: new Set(), originalItemCount: session.items.length }),
  advanceItem: () => set((s) => ({ currentItemIndex: s.currentItemIndex + 1 })),
  recordResult: (result) => set((s) => ({ results: [...s.results, result] })),
  enterRepair: (plan) => set({ isInRepair: true, repairPlan: plan }),
  updateRepairExplanation: (text) =>
    set((s) =>
      // Intentional silent discard: if the learner exits repair before the async
      // AI explanation resolves, repairPlan is null and the update is dropped — correct.
      s.repairPlan ? { repairPlan: { ...s.repairPlan, explanation: text } } : {}
    ),
  exitRepair: () => set({ isInRepair: false, repairPlan: null }),
  endSession: () =>
    set({ session: null, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null, usedSentenceIds: new Set(), originalItemCount: 0 }),
  injectRepairItems: (items, afterIndex) =>
    set((s) => {
      if (!s.session) return {};
      const cap = s.originalItemCount * 2;
      const currentTotal = s.session.items.length;
      const allowedCount = Math.max(0, cap - currentTotal);
      if (allowedCount === 0) return {};
      const capped = items.slice(0, allowedCount);
      return {
        session: {
          ...s.session,
          items: [
            ...s.session.items.slice(0, afterIndex + 1),
            ...capped,
            ...s.session.items.slice(afterIndex + 1),
          ],
        },
      };
    }),
  markSentenceUsed: (id) =>
    set((s) => ({ usedSentenceIds: new Set([...s.usedSentenceIds, id]) })),
});

export const useSessionStore = create<SessionSlice>()(createSessionSlice);
