import { create } from 'zustand';

interface RepoState {
  currentRepoId: number | null;
  setCurrentRepoId: (id: number | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isInspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
}

export const useStore = create<RepoState>((set) => ({
  currentRepoId: null,
  setCurrentRepoId: (id) => set({ currentRepoId: id }),
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id, isInspectorOpen: !!id }),
  isInspectorOpen: false,
  setInspectorOpen: (open) => set({ isInspectorOpen: open }),
}));
