export type CrosswordTier = 'mini' | 'classic' | 'grand'
export type Direction = 'across' | 'down'
export type ClueLang = 'en' | 'th'

export const TIERS: { id: CrosswordTier; title: string; size: number; description: string }[] = [
  { id: 'mini', title: 'Mini', size: 5, description: 'A brisk 5×5 grid of 4–5 letter words.' },
  { id: 'classic', title: 'Classic', size: 7, description: 'Balanced 7×7 intersections with 4–7 letter words.' },
  { id: 'grand', title: 'Grand', size: 9, description: 'An expansive 9×9 web of interlocking clues.' },
]

export interface LexiconEntry {
  word: string
  en: string
  th: string
}

export interface GridPattern {
  id: string
  tier: CrosswordTier
  size: number
  rows: string[]
}

export interface ClueEntry {
  number: number
  direction: Direction
  row: number
  col: number
  length: number
  cells: number[]
  answer: string
  en: string
  th: string
}

export interface CrosswordPuzzle {
  id: string
  patternId: string
  tier: CrosswordTier
  size: number
  /** true = playable white cell, false = black block */
  layout: boolean[]
  /** Uppercase letter for playable cells, null for blocks */
  solution: (string | null)[]
  /** Clue start number at cell index, or null */
  cellNumbers: (number | null)[]
  clues: {
    across: ClueEntry[]
    down: ClueEntry[]
  }
}

export interface SavedCrosswordRound {
  puzzle: CrosswordPuzzle
  entries: string[]
  revealed: boolean[]
  checkedErrors: boolean[]
  selected: number
  direction: Direction
  hintsUsed: number
  elapsedMs: number
}
