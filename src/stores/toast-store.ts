'use client';

import { create } from 'zustand';

// A lightweight global toast. Used to make otherwise-silent engine actions
// VISIBLE — chiefly a notebook save — across every surface with one wiring.
// Copy must stay HONEST (Operating Rule 8): a plain save says "lagret i
// notatboka"; only an actually-promoted item (the "Øv på dette" / promote
// path) may claim it "kommer tilbake i økta".

export interface Toast {
  id: string;
  message: string;
  /** Auto-dismiss delay in ms. Defaults to 3500 at the show site. */
  durationMs: number;
}

interface ToastSlice {
  toasts: Toast[];
  showToast: (message: string, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_DURATION_MS = 3500;

export const useToastStore = create<ToastSlice>()((set) => ({
  toasts: [],
  showToast: (message, durationMs = DEFAULT_DURATION_MS) =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, durationMs }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
