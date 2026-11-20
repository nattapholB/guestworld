import { LEXICON } from './lexicon'
import { extractSlots, type SlotInfo } from './logic'
import { PATTERNS } from './patterns'
import type { ClueEntry, CrosswordPuzzle, CrosswordTier, GridPattern, LexiconEntry } from './types'

interface WordEntryIndexed {
  entry: LexiconEntry
  idx: number
}

interface LexiconIndex {
  byLength: Map<number, WordEntryIndexed[]>
  byLengthPosChar: Map<number, Map<string, WordEntryIndexed[]>>
}

let cachedIndex: LexiconIndex | null = null

function getLexiconIndex(): LexiconIndex {
  if (cachedIndex) return cachedIndex
  const byLength = new Map<number, WordEntryIndexed[]>()
  const byLengthPosChar = new Map<number, Map<string, WordEntryIndexed[]>>()

  LEXICON.forEach((entry, idx) => {
    const len = entry.word.length
    const item: WordEntryIndexed = { entry, idx }

    let list = byLength.get(len)
    if (!list) {
      list = []
      byLength.set(len, list)
    }
    list.push(item)

    let posMap = byLengthPosChar.get(len)
    if (!posMap) {
      posMap = new Map()
      byLengthPosChar.set(len, posMap)
    }
    for (let pos = 0; pos < len; pos++) {
      const key = `${pos}:${entry.word[pos]}`
      let bucket = posMap.get(key)
      if (!bucket) {
        bucket = []
        posMap.set(key, bucket)
      }
      bucket.push(item)
    }
  })

  cachedIndex = { byLength, byLengthPosChar }
  return cachedIndex
}

interface Crossing {
  selfPos: number
  otherSlot: number
  otherPos: number
}

function buildCrossings(slots: SlotInfo[]): Crossing[][] {
  const crossings: Crossing[][] = slots.map(() => [])
  const cellToSlots = new Map<number, { slotIdx: number; pos: number }[]>()

  slots.forEach((slot, slotIdx) => {
    slot.cells.forEach((cell, pos) => {
      let list = cellToSlots.get(cell)
      if (!list) {
        list = []
        cellToSlots.set(cell, list)
      }
      list.push({ slotIdx, pos })
    })
  })

  for (const entries of cellToSlots.values()) {
    if (entries.length !== 2) continue
    const [a, b] = entries
    crossings[a.slotIdx].push({ selfPos: a.pos, otherSlot: b.slotIdx, otherPos: b.pos })
    crossings[b.slotIdx].push({ selfPos: b.pos, otherSlot: a.slotIdx, otherPos: a.pos })
  }

  return crossings
}

function shuffleInPlace<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function candidatesForSlot(
  slotLen: number,
  constraints: (string | null)[],
  usedWords: Set<string>,
  index: LexiconIndex,
): WordEntryIndexed[] {
  const posMap = index.byLengthPosChar.get(slotLen)
  const fullList = index.byLength.get(slotLen) ?? []
  if (!posMap || fullList.length === 0) return []

  // Pick the tightest constrained position bucket first
  let baseBucket: WordEntryIndexed[] | null = null
  const checks: { pos: number; ch: string }[] = []

  for (let pos = 0; pos < slotLen; pos++) {
    const ch = constraints[pos]
    if (!ch) continue
    checks.push({ pos, ch })
    const bucket = posMap.get(`${pos}:${ch}`) ?? []
    if (!baseBucket || bucket.length < baseBucket.length) {
      baseBucket = bucket
    }
  }

  const source = baseBucket ?? fullList
  if (source.length === 0) return []

  const result: WordEntryIndexed[] = []
  for (const item of source) {
    const w = item.entry.word
    if (usedWords.has(w)) continue
    let ok = true
    for (const c of checks) {
      if (w[c.pos] !== c.ch) {
        ok = false
        break
      }
    }
    if (ok) result.push(item)
  }
  return result
}

export function solvePattern(
  pattern: GridPattern,
  random: () => number = Math.random,
  maxSteps = 8000,
): CrosswordPuzzle | null {
  const extracted = extractSlots(pattern.rows)
  const slots: SlotInfo[] = [...extracted.slots.across, ...extracted.slots.down]
  if (slots.length === 0) return null

  const crossings = buildCrossings(slots)
  const index = getLexiconIndex()
  const assigned: (WordEntryIndexed | null)[] = new Array(slots.length).fill(null)
  const cellChars: (string | null)[] = new Array(pattern.size * pattern.size).fill(null)
  const usedWords = new Set<string>()
  let steps = 0

  function getConstraints(slotIdx: number): (string | null)[] {
    return slots[slotIdx].cells.map(c => cellChars[c])
  }

  function forwardCheck(slotIdx: number, word: string): boolean {
    for (const cross of crossings[slotIdx]) {
      if (assigned[cross.otherSlot] !== null) continue
      const otherConstraints = getConstraints(cross.otherSlot)
      otherConstraints[cross.otherPos] = word[cross.selfPos]
      const cands = candidatesForSlot(
        slots[cross.otherSlot].length,
        otherConstraints,
        usedWords,
        index,
      )
      if (cands.length === 0) return false
    }
    return true
  }

  function backtrack(): boolean {
    if (++steps > maxSteps) return false

    // MRV: choose unassigned slot with smallest candidate count
    let bestSlot = -1
    let bestCandidates: WordEntryIndexed[] = []

    for (let i = 0; i < slots.length; i++) {
      if (assigned[i] !== null) continue
      const cands = candidatesForSlot(slots[i].length, getConstraints(i), usedWords, index)
      if (cands.length === 0) return false
      if (bestSlot === -1 || cands.length < bestCandidates.length) {
        bestSlot = i
        bestCandidates = cands
        if (cands.length === 1) break
      }
    }

    if (bestSlot === -1) return true

    // Randomize order among candidates (pick a bounded shuffled view for speed)
    const ordered = bestCandidates.length > 1 ? shuffleInPlace([...bestCandidates], random) : bestCandidates
    const slot = slots[bestSlot]

    for (const candidate of ordered) {
      const word = candidate.entry.word
      const savedChars = slot.cells.map(c => cellChars[c])

      assigned[bestSlot] = candidate
      usedWords.add(word)
      for (let p = 0; p < slot.cells.length; p++) {
        cellChars[slot.cells[p]] = word[p]
      }

      if (forwardCheck(bestSlot, word) && backtrack()) {
        return true
      }

      // Undo placement
      usedWords.delete(word)
      assigned[bestSlot] = null
      for (let p = 0; p < slot.cells.length; p++) {
        cellChars[slot.cells[p]] = savedChars[p]
      }

      if (steps > maxSteps) return false
    }

    return false
  }

  if (!backtrack()) return null

  const across: ClueEntry[] = []
  const down: ClueEntry[] = []

  slots.forEach((slot, i) => {
    const chosen = assigned[i]!.entry
    const clue: ClueEntry = {
      number: slot.number,
      direction: slot.direction,
      row: slot.row,
      col: slot.col,
      length: slot.length,
      cells: [...slot.cells],
      answer: chosen.word,
      en: chosen.en,
      th: chosen.th,
    }
    if (slot.direction === 'across') across.push(clue)
    else down.push(clue)
  })

  const suffix = Math.floor(random() * 1e9)
    .toString(36)
    .padStart(6, '0')

  return {
    id: `${pattern.id}-${suffix}`,
    patternId: pattern.id,
    tier: pattern.tier,
    size: pattern.size,
    layout: extracted.layout,
    solution: cellChars,
    cellNumbers: extracted.cellNumbers,
    clues: { across, down },
  }
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function generatePuzzle(
  tier: CrosswordTier,
  options: { previousPatternId?: string; random?: () => number } = {},
): CrosswordPuzzle {
  const random = options.random ?? Math.random
  const pool = PATTERNS.filter(p => p.tier === tier)
  const others = pool.filter(p => p.id !== options.previousPatternId)
  const preferred = pool.filter(p => p.id === options.previousPatternId)
  const ordered = [...shuffleInPlace([...others], random), ...preferred]

  for (const pattern of ordered) {
    const solved = solvePattern(pattern, random, 8000)
    if (solved) return solved
  }

  // Deterministic fallback guaranteed to solve using fixed PRNG
  for (let i = 0; i < pool.length; i++) {
    const solved = solvePattern(pool[i], seededRandom(1337 + i), 20000)
    if (solved) return solved
  }

  throw new Error(`Unable to generate crossword puzzle for tier "${tier}"`)
}
