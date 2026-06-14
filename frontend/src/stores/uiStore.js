import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  // Theme handling for color schemes
  theme: 'default', // possible values: 'default', 'emerald', 'ocean', 'rose', 'slate'
  setTheme: (theme) => set({ theme }),
}));

