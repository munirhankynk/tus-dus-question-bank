import { create } from 'zustand';

export type FilterId = 'all' | 'favorite' | 'failed' | 'skipped' | 'solved';

interface QuestionStoreState {
  activeFilters: FilterId[];
  selectedCourseId: string | null;
  setFilters: (filters: FilterId[]) => void;
  toggleFilter: (filterId: FilterId) => void;
  setSelectedCourseId: (id: string | null) => void;
  refreshCounter: number;
  triggerRefresh: () => void;
}

export const useQuestionStore = create<QuestionStoreState>((set) => ({
  activeFilters: ['all'],
  selectedCourseId: null,
  setFilters: (filters) => set({ activeFilters: filters }),
  toggleFilter: (filterId) => set((state) => {
    if (filterId === 'all') return { activeFilters: ['all'] };
    let next = state.activeFilters.filter((f) => f !== 'all');
    if (next.includes(filterId)) next = next.filter((f) => f !== filterId);
    else next.push(filterId);
    return { activeFilters: next.length === 0 ? ['all'] : next };
  }),
  setSelectedCourseId: (id) => set({ selectedCourseId: id }),
  refreshCounter: 0,
  triggerRefresh: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
}));