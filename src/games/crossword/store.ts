import { create } from 'zustand'
import { createGameStorage, type GameStorage } from '../../app/storage'
import { sfx } from '../../audio/sfx'
import { generatePuzzle } from './generator'
import {
  findNextEditableInClue,
  findPrevEditableInClue,
  getCellClues,
  getClueAtCell,
  isFilled,
  isSolved,
  moveByArrow,
  nextClue,
} from './logic'
import type {
  ClueEntry,
  ClueLang,
  CrosswordPuzzle,
  CrosswordTier,
  Direction,
  SavedCrosswordRound,
} from './types'

export interface CrosswordPrefs {
  showHowTo: boolean
  clueLang: ClueLang
}

export interface SavedRoundSummary {
  tier: CrosswordTier
  size: number
  filledCount: number
  totalCount: number
  elapsedMs: number
}

export interface CrosswordState {
  phase: 'idle' | 'intro' | 'playing' | 'completed'
  tier: CrosswordTier
  puzzle: CrosswordPuzzle | null
  entries: string[]
  revealed: boolean[]
  checkedErrors: boolean[]
  selected: number
  direction: Direction
  hintsUsed: number
  elapsedMs: number
  runningSince: number | null
  dialog: 'none' | 'help'
  showHowTo: boolean
  clueLang: ClueLang
  lastCheckMessage: string
  announcement: string
  savedSummary: SavedRoundSummary | null
  start: (tier: CrosswordTier, skipIntro?: boolean) => void
  begin: () => void
  resume: () => boolean
  discardSaved: () => void
  saveAndLeave: () => void
  flushSave: () => void
  selectCell: (cell: number) => void
  selectClue: (number: number, direction: Direction) => void
  toggleDirection: () => void
  stepClue: (delta: 1 | -1) => void
  moveArrow: (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void
  typeLetter: (letter: string) => void
  erase: (stepBackIfEmpty?: boolean) => void
  checkWord: () => void
  hintCell: () => void
  revealWord: () => void
  toggleClueLang: () => void
  setClueLang: (lang: ClueLang) => void
  openHelp: () => void
  closeHelp: () => void
  setShowHowTo: (show: boolean) => void
  discard: () => void
}

export const elapsedAt = (s: Pick<CrosswordState, 'elapsedMs' | 'runningSince'>, now: number) =>
  s.elapsedMs + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince))

function summarizeSavedRound(saved: SavedCrosswordRound | null): SavedRoundSummary | null {
  if (!saved) return null
  const { puzzle, entries, elapsedMs } = saved
  let filledCount = 0
  let totalCount = 0
  for (let i = 0; i < puzzle.layout.length; i++) {
    if (!puzzle.layout[i]) continue
    totalCount++
    if (entries[i]) filledCount++
  }
  return {
    tier: puzzle.tier,
    size: puzzle.size,
    filledCount,
    totalCount,
    elapsedMs,
  }
}

function isValidClueList(list: unknown, totalCells: number, dir: Direction): list is ClueEntry[] {
  if (!Array.isArray(list)) return false
  return list.every(item => {
    if (!item || typeof item !== 'object') return false
    const c = item as Partial<ClueEntry>
    return (
      Number.isInteger(c.number) &&
      (c.number as number) >= 1 &&
      c.direction === dir &&
      Number.isInteger(c.row) &&
      Number.isInteger(c.col) &&
      Number.isInteger(c.length) &&
      Array.isArray(c.cells) &&
      c.cells.length === c.length &&
      c.cells.every(idx => Number.isInteger(idx) && idx >= 0 && idx < totalCells) &&
      typeof c.answer === 'string' &&
      c.answer.length === c.length &&
      typeof c.en === 'string' &&
      typeof c.th === 'string'
    )
  })
}

export function isValidSavedRound(value: unknown): value is SavedCrosswordRound {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SavedCrosswordRound>
  if (!v.puzzle || typeof v.puzzle !== 'object') return false
  const p = v.puzzle as Partial<CrosswordPuzzle>
  if (p.tier !== 'mini' && p.tier !== 'classic' && p.tier !== 'grand') return false
  if (p.size !== 5 && p.size !== 7 && p.size !== 9) return false
  const total = p.size * p.size
  if (!Array.isArray(p.layout) || p.layout.length !== total) return false
  if (!Array.isArray(p.solution) || p.solution.length !== total) return false
  if (!Array.isArray(p.cellNumbers) || p.cellNumbers.length !== total) return false
  if (!p.clues || typeof p.clues !== 'object') return false
  if (!isValidClueList(p.clues.across, total, 'across')) return false
  if (!isValidClueList(p.clues.down, total, 'down')) return false

  if (!Array.isArray(v.entries) || v.entries.length !== total) return false
  if (!Array.isArray(v.revealed) || v.revealed.length !== total) return false
  if (!Array.isArray(v.checkedErrors) || v.checkedErrors.length !== total) return false
  for (let i = 0; i < total; i++) {
    const entry = v.entries[i]
    if (typeof entry !== 'string') return false
    if (p.layout[i]) {
      if (entry !== '' && !/^[A-Z]$/.test(entry)) return false
      if (typeof p.solution[i] !== 'string' || !/^[A-Z]$/.test(p.solution[i]!)) return false
    } else {
      if (entry !== '' || p.solution[i] !== null) return false
    }
    if (typeof v.revealed[i] !== 'boolean' || typeof v.checkedErrors[i] !== 'boolean') return false
  }
  if (!Number.isInteger(v.selected) || v.selected! < 0 || v.selected! >= total || !p.layout[v.selected!]) {
    return false
  }
  if (v.direction !== 'across' && v.direction !== 'down') return false
  if (!Number.isInteger(v.hintsUsed) || v.hintsUsed! < 0) return false
  if (typeof v.elapsedMs !== 'number' || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0) return false

  // Already solved puzzles should never sit as resumable rounds.
  if (isSolved(v.puzzle as CrosswordPuzzle, v.entries)) return false

  return true
}

export function isValidPrefs(value: unknown): value is CrosswordPrefs {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<CrosswordPrefs>
  return typeof v.showHowTo === 'boolean' && (v.clueLang === 'en' || v.clueLang === 'th')
}

export function createDefaultRoundStorage() {
  return createGameStorage<SavedCrosswordRound>({
    key: 'guestworld:crossword:round:v1',
    version: 1,
    validate: isValidSavedRound,
  })
}

export function createDefaultPrefsStorage() {
  return createGameStorage<CrosswordPrefs>({
    key: 'guestworld:crossword:prefs:v1',
    version: 1,
    validate: isValidPrefs,
  })
}

export function createCrosswordStore(options: {
  now?: () => number
  generate?: typeof generatePuzzle
  sound?: typeof sfx
  roundStorage?: GameStorage<SavedCrosswordRound>
  prefsStorage?: GameStorage<CrosswordPrefs>
} = {}) {
  const now = options.now ?? (() => performance.now())
  const generate = options.generate ?? generatePuzzle
  const sound = options.sound ?? sfx
  const roundStorage = options.roundStorage ?? createDefaultRoundStorage()
  const prefsStorage = options.prefsStorage ?? createDefaultPrefsStorage()

  const initialPrefs = prefsStorage.load() ?? { showHowTo: true, clueLang: 'en' as ClueLang }
  const initialSummary = summarizeSavedRound(roundStorage.load())

  return create<CrosswordState>((set, get) => {
    const canEdit = () => get().phase === 'playing' && get().dialog === 'none'

    function buildRoundSnapshot(state: CrosswordState, elapsedOverride?: number): SavedCrosswordRound | null {
      if (!state.puzzle) return null
      return {
        puzzle: state.puzzle,
        entries: state.entries,
        revealed: state.revealed,
        checkedErrors: state.checkedErrors,
        selected: state.selected,
        direction: state.direction,
        hintsUsed: state.hintsUsed,
        elapsedMs: elapsedOverride ?? elapsedAt(state, now()),
      }
    }

    function persistCurrent(elapsedOverride?: number) {
      const s = get()
      if (!s.puzzle || s.phase === 'completed' || s.phase === 'idle') return
      const snap = buildRoundSnapshot(s, elapsedOverride)
      if (!snap) return
      roundStorage.save(snap)
      set({ savedSummary: summarizeSavedRound(snap) })
    }

    function persistPrefs(next: CrosswordPrefs) {
      prefsStorage.save(next)
    }

    function commitGridEdit(
      entries: string[],
      revealed: boolean[],
      checkedErrors: boolean[],
      nextSelected: number,
      hintsDelta: number,
      announcement: string,
      lastCheckMessage = '',
    ) {
      const s = get()
      const puzzle = s.puzzle!
      const solved = isSolved(puzzle, entries)
      if (solved) {
        const finalElapsed = elapsedAt(s, now())
        roundStorage.clear()
        set({
          entries,
          revealed,
          checkedErrors: new Array<boolean>(entries.length).fill(false),
          selected: nextSelected,
          hintsUsed: s.hintsUsed + hintsDelta,
          phase: 'completed',
          elapsedMs: finalElapsed,
          runningSince: null,
          lastCheckMessage: '',
          announcement: 'Crossword solved. Well done!',
          savedSummary: null,
        })
        sound.win()
        return
      }

      const full = isFilled(puzzle, entries)
      const checkNotice = full
        ? 'All squares are filled, though something is off. Use Check to spot mistakes.'
        : lastCheckMessage
      const msg = full ? 'Board is full with mistakes. Use Check to inspect.' : announcement

      set({
        entries,
        revealed,
        checkedErrors,
        selected: nextSelected,
        hintsUsed: s.hintsUsed + hintsDelta,
        lastCheckMessage: checkNotice,
        announcement: msg,
      })
      sound.keyPress()
      persistCurrent()
    }

    return {
      phase: 'idle',
      tier: 'mini',
      puzzle: null,
      entries: [],
      revealed: [],
      checkedErrors: [],
      selected: -1,
      direction: 'across',
      hintsUsed: 0,
      elapsedMs: 0,
      runningSince: null,
      dialog: 'none',
      showHowTo: initialPrefs.showHowTo,
      clueLang: initialPrefs.clueLang,
      lastCheckMessage: '',
      announcement: '',
      savedSummary: initialSummary,

      start: (tier, skipIntro = false) => {
        const puzzle = generate(tier, { previousPatternId: get().puzzle?.patternId })
        const firstClue = puzzle.clues.across[0] ?? puzzle.clues.down[0]
        const selected = firstClue ? firstClue.cells[0] : puzzle.layout.indexOf(true)
        const direction: Direction = firstClue ? firstClue.direction : 'across'
        const total = puzzle.size * puzzle.size
        const intro = get().showHowTo && !skipIntro
        set({
          phase: intro ? 'intro' : 'playing',
          tier,
          puzzle,
          entries: new Array<string>(total).fill(''),
          revealed: new Array<boolean>(total).fill(false),
          checkedErrors: new Array<boolean>(total).fill(false),
          selected,
          direction,
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: intro ? null : now(),
          dialog: 'none',
          lastCheckMessage: '',
          announcement: 'New crossword ready.',
        })
        persistCurrent(0)
      },

      begin: () => {
        if (get().phase !== 'intro') return
        set({ phase: 'playing', runningSince: now() })
        persistCurrent(0)
      },

      resume: () => {
        const saved = roundStorage.load()
        if (!saved) {
          set({ savedSummary: null })
          return false
        }
        set({
          phase: 'playing',
          tier: saved.puzzle.tier,
          puzzle: saved.puzzle,
          entries: [...saved.entries],
          revealed: [...saved.revealed],
          checkedErrors: [...saved.checkedErrors],
          selected: saved.selected,
          direction: saved.direction,
          hintsUsed: saved.hintsUsed,
          elapsedMs: saved.elapsedMs,
          runningSince: now(),
          dialog: 'none',
          lastCheckMessage: '',
          announcement: 'Saved crossword resumed.',
          savedSummary: summarizeSavedRound(saved),
        })
        return true
      },

      discardSaved: () => {
        roundStorage.clear()
        set({ savedSummary: null })
      },

      saveAndLeave: () => {
        const s = get()
        let summary = s.savedSummary
        if (s.puzzle && (s.phase === 'playing' || s.phase === 'intro')) {
          const snap = buildRoundSnapshot(s)
          if (snap) {
            roundStorage.save(snap)
            summary = summarizeSavedRound(snap)
          }
        }
        set({
          phase: 'idle',
          puzzle: null,
          entries: [],
          revealed: [],
          checkedErrors: [],
          selected: -1,
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: null,
          dialog: 'none',
          lastCheckMessage: '',
          announcement: '',
          savedSummary: summary,
        })
      },

      flushSave: () => {
        const s = get()
        if (!s.puzzle || (s.phase !== 'playing' && s.phase !== 'intro')) return
        persistCurrent()
      },

      selectCell: cell => {
        const s = get()
        if (!canEdit() || !s.puzzle) return
        if (!Number.isInteger(cell) || cell < 0 || cell >= s.puzzle.layout.length || !s.puzzle.layout[cell]) {
          return
        }
        const clues = getCellClues(s.puzzle, cell)
        let nextDir = s.direction
        if (cell === s.selected) {
          if (s.direction === 'across' && clues.down) nextDir = 'down'
          else if (s.direction === 'down' && clues.across) nextDir = 'across'
        } else {
          if (s.direction === 'across' && !clues.across && clues.down) nextDir = 'down'
          else if (s.direction === 'down' && !clues.down && clues.across) nextDir = 'across'
        }
        set({ selected: cell, direction: nextDir })
        persistCurrent()
      },

      selectClue: (number, direction) => {
        const s = get()
        if (!canEdit() || !s.puzzle) return
        const clue = s.puzzle.clues[direction].find(c => c.number === number)
        if (!clue) return
        const target =
          clue.cells.find(c => !s.revealed[c] && !s.entries[c]) ??
          clue.cells.find(c => !s.revealed[c]) ??
          clue.cells[0]
        set({ selected: target, direction })
        persistCurrent()
      },

      toggleDirection: () => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0) return
        const clues = getCellClues(s.puzzle, s.selected)
        if (s.direction === 'across' && clues.down) {
          set({ direction: 'down' })
          persistCurrent()
        } else if (s.direction === 'down' && clues.across) {
          set({ direction: 'across' })
          persistCurrent()
        }
      },

      stepClue: delta => {
        const s = get()
        if (!canEdit() || !s.puzzle) return
        const current = getClueAtCell(s.puzzle, s.selected, s.direction)
        const target = nextClue(s.puzzle, current, delta)
        if (!target) return
        get().selectClue(target.number, target.direction)
      },

      moveArrow: key => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0) return
        const next = moveByArrow(s.puzzle, s.selected, key)
        if (next === s.selected) return
        const clues = getCellClues(s.puzzle, next)
        let nextDir = s.direction
        if (nextDir === 'across' && !clues.across && clues.down) nextDir = 'down'
        else if (nextDir === 'down' && !clues.down && clues.across) nextDir = 'across'
        set({ selected: next, direction: nextDir })
        persistCurrent()
      },

      typeLetter: letter => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0 || !s.puzzle.layout[s.selected]) return
        const ch = letter.toUpperCase()
        if (!/^[A-Z]$/.test(ch)) return
        const active = getClueAtCell(s.puzzle, s.selected, s.direction)

        if (s.revealed[s.selected]) {
          if (active) {
            const next = findNextEditableInClue(active, s.entries, s.revealed, s.selected)
            if (next !== s.selected) {
              set({ selected: next })
              persistCurrent()
            }
          }
          return
        }

        const entries = [...s.entries]
        const checkedErrors = [...s.checkedErrors]
        entries[s.selected] = ch
        checkedErrors[s.selected] = false
        const nextSelected = active
          ? findNextEditableInClue(active, entries, s.revealed, s.selected)
          : s.selected
        commitGridEdit(entries, s.revealed, checkedErrors, nextSelected, 0, `${ch} entered.`)
      },

      erase: (stepBackIfEmpty = true) => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0) return
        const active = getClueAtCell(s.puzzle, s.selected, s.direction)

        if (!s.revealed[s.selected] && s.entries[s.selected]) {
          const entries = [...s.entries]
          const checkedErrors = [...s.checkedErrors]
          entries[s.selected] = ''
          checkedErrors[s.selected] = false
          set({ entries, checkedErrors, lastCheckMessage: '', announcement: 'Letter cleared.' })
          sound.keyPress()
          persistCurrent()
          return
        }

        if (!stepBackIfEmpty || !active) return
        const prev = findPrevEditableInClue(active, s.revealed, s.selected)
        if (prev === null) return

        if (s.entries[prev]) {
          const entries = [...s.entries]
          const checkedErrors = [...s.checkedErrors]
          entries[prev] = ''
          checkedErrors[prev] = false
          set({
            entries,
            checkedErrors,
            selected: prev,
            lastCheckMessage: '',
            announcement: 'Moved back and cleared letter.',
          })
          sound.keyPress()
        } else {
          set({ selected: prev })
        }
        persistCurrent()
      },

      checkWord: () => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0) return
        const active = getClueAtCell(s.puzzle, s.selected, s.direction)
        if (!active) return

        const checkedErrors = [...s.checkedErrors]
        let wrong = 0
        let filledCount = 0

        for (const cell of active.cells) {
          if (s.entries[cell]) {
            filledCount++
            if (s.entries[cell] !== s.puzzle.solution[cell]) {
              checkedErrors[cell] = true
              wrong++
            } else {
              checkedErrors[cell] = false
            }
          } else {
            checkedErrors[cell] = false
          }
        }

        let msg: string
        if (filledCount === 0) {
          msg = 'Type letters in this word before checking.'
        } else if (wrong > 0) {
          msg = `${wrong} ${wrong === 1 ? 'letter looks' : 'letters look'} off in ${active.number} ${active.direction}.`
        } else if (filledCount < active.length) {
          msg = `Letters so far in ${active.number} ${active.direction} look right.`
        } else {
          msg = `${active.number} ${active.direction} is completely right!`
        }

        set({ checkedErrors, lastCheckMessage: msg, announcement: msg })
        if (wrong > 0) sound.error()
        else sound.keyPress()
        persistCurrent()
      },

      hintCell: () => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0 || !s.puzzle.layout[s.selected]) return
        if (s.revealed[s.selected]) return
        const solutionChar = s.puzzle.solution[s.selected]
        if (!solutionChar) return

        const entries = [...s.entries]
        const revealed = [...s.revealed]
        const checkedErrors = [...s.checkedErrors]
        entries[s.selected] = solutionChar
        revealed[s.selected] = true
        checkedErrors[s.selected] = false

        const active = getClueAtCell(s.puzzle, s.selected, s.direction)
        const nextSelected = active
          ? findNextEditableInClue(active, entries, revealed, s.selected)
          : s.selected
        commitGridEdit(entries, revealed, checkedErrors, nextSelected, 1, `Hint revealed ${solutionChar}.`)
      },

      revealWord: () => {
        const s = get()
        if (!canEdit() || !s.puzzle || s.selected < 0) return
        const active = getClueAtCell(s.puzzle, s.selected, s.direction)
        if (!active) return

        const entries = [...s.entries]
        const revealed = [...s.revealed]
        const checkedErrors = [...s.checkedErrors]
        let count = 0

        for (const cell of active.cells) {
          if (!revealed[cell]) {
            entries[cell] = s.puzzle.solution[cell] ?? ''
            revealed[cell] = true
            checkedErrors[cell] = false
            count++
          }
        }

        if (count === 0) return
        commitGridEdit(
          entries,
          revealed,
          checkedErrors,
          s.selected,
          count,
          `Revealed ${active.number} ${active.direction}.`,
        )
      },

      toggleClueLang: () => {
        const nextLang: ClueLang = get().clueLang === 'en' ? 'th' : 'en'
        set({ clueLang: nextLang })
        persistPrefs({ showHowTo: get().showHowTo, clueLang: nextLang })
      },

      setClueLang: clueLang => {
        set({ clueLang })
        persistPrefs({ showHowTo: get().showHowTo, clueLang })
      },

      openHelp: () => {
        const s = get()
        if (!canEdit()) return
        const elapsed = elapsedAt(s, now())
        set({ dialog: 'help', elapsedMs: elapsed, runningSince: null })
        persistCurrent(elapsed)
      },

      closeHelp: () => {
        if (get().phase === 'playing' && get().dialog === 'help') {
          set({ dialog: 'none', runningSince: now() })
        }
      },

      setShowHowTo: showHowTo => {
        set({ showHowTo })
        persistPrefs({ showHowTo, clueLang: get().clueLang })
      },

      discard: () => {
        roundStorage.clear()
        set({
          phase: 'idle',
          puzzle: null,
          entries: [],
          revealed: [],
          checkedErrors: [],
          selected: -1,
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: null,
          dialog: 'none',
          lastCheckMessage: '',
          announcement: '',
          savedSummary: null,
        })
      },
    }
  })
}

export const useCrosswordStore = createCrosswordStore()
