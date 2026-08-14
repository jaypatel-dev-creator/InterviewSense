import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Screen
  screen: 'setup', // 'setup' | 'interview' | 'report'

  // Recording state
  isRecording: false,
  isAISpeaking: false,
  isProcessing: false,

  // Sidebar
  sidebarOpen: false,

  // Error
  error: null,

  // Actions
  setScreen: (screen) => set({ screen }),
  setRecording: (val) => set({ isRecording: val }),
  setAISpeaking: (val) => set({ isAISpeaking: val }),
  setProcessing: (val) => set({ isProcessing: val }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))
