import bank from './puzzle-bank.json'
import type { Difficulty, Puzzle } from './types'

export const PUZZLES = bank as Puzzle[]
export function pickPuzzle(difficulty: Difficulty, previousId?: string, random = Math.random): Puzzle {
  const candidates = PUZZLES.filter(p => p.difficulty === difficulty && p.id !== previousId)
  return candidates[Math.floor(random() * candidates.length)]
}
