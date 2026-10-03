import { create } from 'zustand'
export type Screen = 'games' | 'word-setup' | 'word' | 'sudoku-setup' | 'sudoku'
export const useAppStore = create<{ screen: Screen; navigate: (screen: Screen) => void }>(set => ({
  screen: 'games', navigate: screen => set({ screen }),
}))
