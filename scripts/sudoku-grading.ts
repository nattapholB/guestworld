import { ROWS, COLUMNS, UNITS, PEERS, DIGITS, candidateMask, maskDigits, conflicts, isComplete } from '../src/games/sudoku/logic.ts'

/** Deterministic logical deductions only: no search and no access to a solution. */
export function gradePuzzle(input: number[], maxLevel = 2) {
  const board = [...input]
  const candidates = board.map((_, i) => candidateMask(board, i))
  const trace: { technique: string; cell?: number; digit?: number; removed?: [number, number][] }[] = []
  let level = 0
  if (board.length !== 81 || conflicts(board).size) return { solved: false, board, level, trace }
  function place(cell: number, digit: number, technique: string, rank: number) {
    board[cell] = digit
    candidates[cell] = 0
    for (const peer of PEERS[cell]) candidates[peer] &= ~(1 << digit)
    level = Math.max(level, rank)
    trace.push({ technique, cell, digit })
  }
  function remove(cells: number[], mask: number, technique: string, rank: number) {
    const removed: [number, number][] = []
    for (const cell of cells) {
      const hit = candidates[cell] & mask
      if (hit) { candidates[cell] &= ~mask; removed.push([cell, hit]) }
    }
    if (!removed.length) return false
    level = Math.max(level, rank)
    trace.push({ technique, removed })
    return true
  }
  for (let step = 0; step < 1000; step++) {
    if (isComplete(board)) return { solved: true, board, level, trace }
    if (board.some((n, i) => !n && !candidates[i])) break
    let progress = false
    for (let i = 0; i < 81; i++) {
      const digits = maskDigits(candidates[i])
      if (digits.length === 1) { place(i, digits[0], 'Naked single', 0); progress = true; break }
    }
    if (progress) continue
    if (maxLevel < 1) break
    outerHidden: for (const unit of UNITS) for (const digit of DIGITS) {
      const cells = unit.filter(i => candidates[i] & (1 << digit))
      if (cells.length === 1) { place(cells[0], digit, 'Hidden single', 1); progress = true; break outerHidden }
    }
    if (progress) continue
    outerLocked: for (const unit of UNITS) for (const digit of DIGITS) {
      const cells = unit.filter(i => candidates[i] & (1 << digit))
      if (cells.length < 2) continue
      for (const other of UNITS) {
        if (other === unit || !cells.every(i => other.includes(i))) continue
        if (remove(other.filter(i => !unit.includes(i)), 1 << digit, 'Locked candidates', 1)) { progress = true; break outerLocked }
      }
    }
    if (progress) continue
    if (maxLevel < 2) break
    outerPairs: for (const unit of UNITS) for (const cell of unit) {
      const mask = candidates[cell]
      if (maskDigits(mask).length !== 2) continue
      const pair = unit.filter(i => candidates[i] === mask)
      if (pair.length === 2 && remove(unit.filter(i => !pair.includes(i)), mask, 'Naked pair', 2)) { progress = true; break outerPairs }
    }
    if (progress) continue
    outerWing: for (const lines of [ROWS, COLUMNS]) for (const digit of DIGITS) {
      const bit = 1 << digit
      for (let a = 0; a < 8; a++) {
        const pos = lines[a].map((cell, index) => candidates[cell] & bit ? index : -1).filter(i => i >= 0)
        if (pos.length !== 2) continue
        for (let b = a + 1; b < 9; b++) {
          const other = lines[b].map((cell, index) => candidates[cell] & bit ? index : -1).filter(i => i >= 0)
          if (other.length !== 2 || other[0] !== pos[0] || other[1] !== pos[1]) continue
          const targets = lines.flatMap((line, i) => i === a || i === b ? [] : pos.map(p => line[p]))
          if (remove(targets, bit, 'X-Wing', 2)) { progress = true; break outerWing }
        }
      }
    }
    if (!progress) break
  }
  return { solved: false, board, level, trace }
}
