import type { ClueEntry, CrosswordPuzzle, Direction, GridPattern } from './types'

export interface SlotInfo {
  number: number
  direction: Direction
  row: number
  col: number
  length: number
  cells: number[]
}

export interface ExtractedGrid {
  size: number
  layout: boolean[]
  cellNumbers: (number | null)[]
  slots: {
    across: SlotInfo[]
    down: SlotInfo[]
  }
}

export function extractSlots(rows: string[]): ExtractedGrid {
  const size = rows.length
  const layout = new Array<boolean>(size * size).fill(false)
  const cellNumbers = new Array<number | null>(size * size).fill(null)
  const across: SlotInfo[] = []
  const down: SlotInfo[] = []

  const isWhite = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && rows[r]?.[c] === '#'

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      layout[r * size + c] = isWhite(r, c)
    }
  }

  let nextNumber = 1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isWhite(r, c)) continue
      const startsAcross = !isWhite(r, c - 1) && isWhite(r, c + 1)
      const startsDown = !isWhite(r - 1, c) && isWhite(r + 1, c)
      if (!startsAcross && !startsDown) continue

      const number = nextNumber++
      cellNumbers[r * size + c] = number

      if (startsAcross) {
        const cells: number[] = []
        let cc = c
        while (isWhite(r, cc)) {
          cells.push(r * size + cc)
          cc++
        }
        across.push({ number, direction: 'across', row: r, col: c, length: cells.length, cells })
      }

      if (startsDown) {
        const cells: number[] = []
        let rr = r
        while (isWhite(rr, c)) {
          cells.push(rr * size + c)
          rr++
        }
        down.push({ number, direction: 'down', row: r, col: c, length: cells.length, cells })
      }
    }
  }

  return { size, layout, cellNumbers, slots: { across, down } }
}

export function validatePattern(pattern: GridPattern): {
  valid: boolean
  errors: string[]
  extracted: ExtractedGrid
} {
  const errors: string[] = []
  if (pattern.rows.length !== pattern.size) {
    errors.push(`Expected ${pattern.size} rows, got ${pattern.rows.length}`)
  }
  for (let r = 0; r < pattern.rows.length; r++) {
    const row = pattern.rows[r]
    if (row.length !== pattern.size) {
      errors.push(`Row ${r} has length ${row.length}, expected ${pattern.size}`)
    }
    if (!/^[#.]+$/.test(row)) {
      errors.push(`Row ${r} contains invalid characters`)
    }
  }

  const extracted = extractSlots(pattern.rows)
  const { across, down } = extracted.slots
  const allSlots = [...across, ...down]

  if (across.length === 0 || down.length === 0) {
    errors.push('Pattern must have both Across and Down slots')
  }

  const covered = new Set<number>()
  for (const slot of allSlots) {
    if (slot.length < 4 || slot.length > 7) {
      errors.push(`Slot ${slot.number} ${slot.direction} has invalid length ${slot.length} (must be 4–7)`)
    }
    for (const c of slot.cells) covered.add(c)
  }

  const whiteCells: number[] = []
  for (let i = 0; i < extracted.layout.length; i++) {
    if (extracted.layout[i]) {
      whiteCells.push(i)
      if (!covered.has(i)) {
        errors.push(`Orphan white cell at index ${i}`)
      }
    }
  }

  if (whiteCells.length === 0) {
    errors.push('Pattern has no playable white cells')
  } else {
    const visited = new Set<number>([whiteCells[0]])
    const queue = [whiteCells[0]]
    const size = pattern.size
    while (queue.length > 0) {
      const cur = queue.shift()!
      const r = Math.floor(cur / size)
      const c = cur % size
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        const nIdx = nr * size + nc
        if (extracted.layout[nIdx] && !visited.has(nIdx)) {
          visited.add(nIdx)
          queue.push(nIdx)
        }
      }
    }
    if (visited.size !== whiteCells.length) {
      errors.push(`White cells form multiple disconnected components (${visited.size}/${whiteCells.length} reachable)`)
    }
  }

  return { valid: errors.length === 0, errors, extracted }
}

export function isSolved(puzzle: CrosswordPuzzle, entries: string[]): boolean {
  const total = puzzle.size * puzzle.size
  if (entries.length !== total) return false
  for (let i = 0; i < total; i++) {
    if (puzzle.layout[i] && entries[i] !== puzzle.solution[i]) return false
  }
  return true
}

export function isFilled(puzzle: CrosswordPuzzle, entries: string[]): boolean {
  const total = puzzle.size * puzzle.size
  if (entries.length !== total) return false
  for (let i = 0; i < total; i++) {
    if (puzzle.layout[i] && !entries[i]) return false
  }
  return true
}

export function getCellClues(
  puzzle: CrosswordPuzzle,
  cell: number,
): { across?: ClueEntry; down?: ClueEntry } {
  if (cell < 0 || cell >= puzzle.layout.length || !puzzle.layout[cell]) return {}
  return {
    across: puzzle.clues.across.find(clue => clue.cells.includes(cell)),
    down: puzzle.clues.down.find(clue => clue.cells.includes(cell)),
  }
}

export function getClueAtCell(
  puzzle: CrosswordPuzzle,
  cell: number,
  preferredDir: Direction,
): ClueEntry | null {
  const { across, down } = getCellClues(puzzle, cell)
  return preferredDir === 'across' ? (across ?? down ?? null) : (down ?? across ?? null)
}

export function moveByArrow(
  puzzle: CrosswordPuzzle,
  cell: number,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
): number {
  const size = puzzle.size
  if (cell < 0 || cell >= size * size) return cell
  const deltas: Record<typeof key, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }
  const [dr, dc] = deltas[key]
  let r = Math.floor(cell / size) + dr
  let c = (cell % size) + dc
  while (r >= 0 && r < size && c >= 0 && c < size) {
    const idx = r * size + c
    if (puzzle.layout[idx]) return idx
    r += dr
    c += dc
  }
  return cell
}

export function nextClue(
  puzzle: CrosswordPuzzle,
  current: ClueEntry | null,
  delta: 1 | -1,
): ClueEntry | null {
  const all = [...puzzle.clues.across, ...puzzle.clues.down]
  if (all.length === 0) return null
  if (!current) return all[0]
  const index = all.findIndex(c => c.number === current.number && c.direction === current.direction)
  if (index === -1) return all[0]
  return all[(index + delta + all.length) % all.length]
}

export function isClueFilled(clue: ClueEntry, entries: string[]): boolean {
  return clue.cells.every(cell => Boolean(entries[cell]))
}

export function findNextEditableInClue(
  clue: ClueEntry,
  entries: string[],
  revealed: boolean[],
  afterCell: number,
): number {
  const startIdx = clue.cells.indexOf(afterCell)
  if (startIdx === -1) return afterCell
  // First pass: look forward for an empty unlocked cell
  for (let i = startIdx + 1; i < clue.cells.length; i++) {
    const cell = clue.cells[i]
    if (!revealed[cell] && !entries[cell]) return cell
  }
  // Second pass: wrap around in the same clue for an earlier empty unlocked cell
  for (let i = 0; i < startIdx; i++) {
    const cell = clue.cells[i]
    if (!revealed[cell] && !entries[cell]) return cell
  }
  // Third pass: advance to next unlocked cell even if filled
  for (let i = startIdx + 1; i < clue.cells.length; i++) {
    const cell = clue.cells[i]
    if (!revealed[cell]) return cell
  }
  return afterCell
}

export function findPrevEditableInClue(
  clue: ClueEntry,
  revealed: boolean[],
  beforeCell: number,
): number | null {
  const startIdx = clue.cells.indexOf(beforeCell)
  if (startIdx <= 0) return null
  for (let i = startIdx - 1; i >= 0; i--) {
    const cell = clue.cells[i]
    if (!revealed[cell]) return cell
  }
  return null
}
