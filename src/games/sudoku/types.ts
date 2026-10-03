export type Difficulty = 'novice' | 'beginner' | 'expert'
export interface Puzzle {
  id: string
  difficulty: Difficulty
  givens: number[]
  solution: number[]
  techniques: string[]
}
export const DIFFICULTIES: { id: Difficulty; title: string; description: string }[] = [
  { id: 'novice', title: 'Novice', description: 'An easy start with straightforward placements.' },
  { id: 'beginner', title: 'Beginner', description: 'Build confidence with a little more deduction.' },
  { id: 'expert', title: 'Expert', description: 'A deeper challenge requiring several steps of reasoning.' },
]
