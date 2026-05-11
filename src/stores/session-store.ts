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
  startSession: (session: Session) => void;
  advanceItem: () => void;
  recordResult: (result: ExerciseResult) => void;
  enterRepair: (plan: RepairPlan) => void;
  updateRepairExplanation: (text: string) => void;
  exitRepair: () => void;
  endSession: () => void;
  injectRepairItems: (items: SessionItem[], afterIndex: number) => void;
}

const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: null,
  currentItemIndex: 0,
  results: [],
  isInRepair: false,
  repairPlan: null,
  startSession: (session) =>
    set({ session, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null }),
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
    set({ session: null, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null }),
  injectRepairItems: (items, afterIndex) =>
    set((s) => ({
      session: s.session
        ? {
            ...s.session,
            items: [
              ...s.session.items.slice(0, afterIndex + 1),
              ...items,
              ...s.session.items.slice(afterIndex + 1),
            ],
          }
        : null,
    })),
});

export const useSessionStore = create<SessionSlice>()(createSessionSlice);
