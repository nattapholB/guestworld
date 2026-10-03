export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const ROWS = Array.from({ length: 9 }, (_, r) => DIGITS.map((_, c) => r * 9 + c))
export const COLUMNS = Array.from({ length: 9 }, (_, c) => DIGITS.map((_, r) => r * 9 + c))
export const BOXES = Array.from({ length: 9 }, (_, b) => DIGITS.map((_, i) =>
  (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + i % 3))
export const UNITS = [...ROWS, ...COLUMNS, ...BOXES]
export const PEERS = Array.from({ length: 81 }, (_, i) => [...new Set(UNITS.filter(u => u.includes(i)).flat())].filter(j => j !== i))
export const ALL_DIGITS = 0b1111111110
export const maskDigits = (mask: number) => DIGITS.filter(d => mask & (1 << d))

export function conflicts(board: readonly number[]): Set<number> {
  const result = new Set<number>()
  for (const unit of UNITS) {
    for (const digit of DIGITS) {
      const matches = unit.filter(i => board[i] === digit)
      if (matches.length > 1) matches.forEach(i => result.add(i))
    }
  }
  return result
}

export function isComplete(board: readonly number[]): boolean {
  return board.length === 81 && board.every(n => Number.isInteger(n) && n >= 1 && n <= 9) && conflicts(board).size === 0
}

export function candidateMask(board: readonly number[], cell: number): number {
  if (board[cell]) return 0
  return PEERS[cell].reduce((mask, i) => mask & ~(1 << board[i]), ALL_DIGITS)
}

/** Bounded search verifies uniqueness; it is not the logical difficulty grader. */
export function countSolutions(input: readonly number[], limit = 2): number {
  if (input.length !== 81 || input.some(n => !Number.isInteger(n) || n < 0 || n > 9) || conflicts(input).size) return 0
  const board = [...input]
  let count = 0
  function search() {
    if (count >= limit) return
    let selected = -1
    let candidates: number[] = []
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue
      const digits = maskDigits(candidateMask(board, i))
      if (!digits.length) return
      if (selected === -1 || digits.length < candidates.length) { selected = i; candidates = digits }
      if (digits.length === 1) break
    }
    if (selected === -1) { count++; return }
    for (const digit of candidates) {
      board[selected] = digit
      search()
      if (count >= limit) break
    }
    board[selected] = 0
  }
  search()
  return count
}
