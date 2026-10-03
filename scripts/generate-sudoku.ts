import { writeFileSync } from 'node:fs'
import { countSolutions, isComplete } from '../src/games/sudoku/logic.ts'
import { gradePuzzle } from './sudoku-grading.ts'

let seed = 20261002
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
const bank: { id: string; difficulty: string; givens: number[]; solution: number[]; techniques: string[] }[] = []
const counts = [0, 0, 0]
for (let attempt = 0; attempt < 12000 && counts.some(n => n < 20); attempt++) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const rows = shuffle([0, 1, 2]).flatMap(b => shuffle([0, 1, 2]).map(r => b * 3 + r))
  const cols = shuffle([0, 1, 2]).flatMap(b => shuffle([0, 1, 2]).map(c => b * 3 + c))
  const solution = rows.flatMap(r => cols.map(c => digits[(r * 3 + Math.floor(r / 3) + c) % 9]))
  const givens = [...solution]
  const target = 24 + Math.floor(random() * 14)
  let clues = 81
  for (const cell of shuffle(Array.from({ length: 81 }, (_, i) => i))) {
    const old = givens[cell]; givens[cell] = 0
    if (countSolutions(givens) !== 1) givens[cell] = old
    else clues--
    if (clues <= target) break
  }
  const grade = gradePuzzle(givens)
  if (!grade.solved || counts[grade.level] >= 20) continue
  if (!isComplete(grade.board) || grade.board.some((n, i) => n !== solution[i])) throw Error('Invalid logical solve')
  const difficulty = ['novice', 'beginner', 'expert'][grade.level]
  const id = `${difficulty}-${String(++counts[grade.level]).padStart(2, '0')}`
  bank.push({ id, difficulty, givens, solution, techniques: [...new Set(grade.trace.map(s => s.technique))] })
  console.log(id, 'clues', clues, 'attempt', attempt)
}
if (counts.some(n => n < 20)) throw Error(`Insufficient graded puzzles: ${counts}`)
writeFileSync(new URL('../src/games/sudoku/puzzle-bank.json', import.meta.url), JSON.stringify(bank, null, 0) + '\n')
console.log('Created', counts, 'puzzles by difficulty')
