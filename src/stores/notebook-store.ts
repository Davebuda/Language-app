'use client';

import { create } from 'zustand';
import type { NotebookItem } from '@/types/notebook';

interface NotebookSlice {
  items: NotebookItem[];
  status: 'loading' | 'ready';
  setItems: (items: NotebookItem[]) => void;
  setStatus: (status: 'loading' | 'ready') => void;
  upsertItem: (item: NotebookItem) => void;
  removeItem: (id: string) => void;
}

export const useNotebookStore = create<NotebookSlice>()((set) => ({
  items: [],
  status: 'loading',
  setItems: (items) => set({ items }),
  setStatus: (status) => set({ status }),
  upsertItem: (item) =>
    set((state) => {
      const exists = state.items.some((i) => i.id === item.id);
      if (exists) {
        return { items: state.items.map((i) => (i.id === item.id ? item : i)) };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));
