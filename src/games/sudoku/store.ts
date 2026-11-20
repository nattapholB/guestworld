import { create } from 'zustand'
import { createGameStorage, type GameStorage } from '../../app/storage'
import { sfx } from '../../audio/sfx'
import { conflicts, isComplete } from './logic'
import { PUZZLES, pickPuzzle } from './puzzles'
import type { Difficulty, Puzzle, SavedSudokuRound } from './types'

type Snapshot = { entries: number[]; notes: number[] }

export interface SudokuPrefs {
  showHowTo: boolean
}

export interface SavedSudokuSummary {
  difficulty: Difficulty
  filledCount: number
  elapsedMs: number
}

export interface SudokuState extends Snapshot {
  phase: 'idle' | 'intro' | 'playing' | 'completed'
  difficulty: Difficulty
  puzzle: Puzzle | null
  selected: number
  notesMode: boolean
  history: Snapshot[]
  hintsUsed: number
  elapsedMs: number
  runningSince: number | null
  dialog: 'none' | 'help'
  showHowTo: boolean
  announcement: string
  savedSummary: SavedSudokuSummary | null
  start: (difficulty: Difficulty, skipIntro?: boolean) => void
  begin: () => void
  resume: () => boolean
  discardSaved: () => void
  saveAndLeave: () => void
  flushSave: () => void
  select: (cell: number) => void
  enter: (digit: number) => void
  toggleNotes: () => void
  erase: () => void
  undo: () => void
  hint: () => void
  openDialog: (dialog: 'help') => void
  closeDialog: () => void
  setShowHowTo: (show: boolean) => void
  discard: () => void
}

export const elapsedAt = (s: Pick<SudokuState, 'elapsedMs' | 'runningSince'>, now: number) =>
  s.elapsedMs + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince))

const defaultLookupPuzzle = (id: string): Puzzle | null =>
  PUZZLES.find(p => p.id === id) ?? null

function summarizeSavedRound(saved: SavedSudokuRound | null): SavedSudokuSummary | null {
  if (!saved) return null
  let filledCount = 0
  for (let i = 0; i < saved.entries.length; i++) {
    if (saved.entries[i] !== 0) filledCount++
  }
  return {
    difficulty: saved.difficulty,
    filledCount,
    elapsedMs: saved.elapsedMs,
  }
}

export function isValidSavedSudokuRound(
  value: unknown,
  lookupPuzzle: (id: string) => Puzzle | null = defaultLookupPuzzle,
): value is SavedSudokuRound {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SavedSudokuRound>
  if (typeof v.puzzleId !== 'string' || !v.puzzleId) return false
  const puzzle = lookupPuzzle(v.puzzleId)
  if (!puzzle) return false
  if (v.difficulty !== 'novice' && v.difficulty !== 'beginner' && v.difficulty !== 'expert') return false
  if (v.difficulty !== puzzle.difficulty) return false

  if (!Array.isArray(v.entries) || v.entries.length !== 81) return false
  if (!Array.isArray(v.notes) || v.notes.length !== 81) return false

  for (let i = 0; i < 81; i++) {
    const entry = v.entries[i]
    if (!Number.isInteger(entry) || entry < 0 || entry > 9) return false
    if (puzzle.givens[i] !== 0 && entry !== puzzle.givens[i]) return false

    const note = v.notes[i]
    if (!Number.isInteger(note) || note < 0 || note > 0x3fe || (note & ~0x3fe) !== 0) return false
    if (entry !== 0 && note !== 0) return false
  }

  if (!Number.isInteger(v.selected) || v.selected! < 0 || v.selected! >= 81) return false
  if (!Number.isInteger(v.hintsUsed) || v.hintsUsed! < 0) return false
  if (typeof v.elapsedMs !== 'number' || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0) return false

  // Completed puzzles should never sit as resumable rounds.
  if (isComplete(v.entries)) return false

  return true
}

export function isValidSudokuPrefs(value: unknown): value is SudokuPrefs {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SudokuPrefs>
  return typeof v.showHowTo === 'boolean'
}

export function createDefaultRoundStorage(lookupPuzzle: (id: string) => Puzzle | null = defaultLookupPuzzle) {
  return createGameStorage<SavedSudokuRound>({
    key: 'guestworld:sudoku:round:v1',
    version: 1,
    validate: (value): value is SavedSudokuRound => isValidSavedSudokuRound(value, lookupPuzzle),
  })
}

export function createDefaultPrefsStorage() {
  return createGameStorage<SudokuPrefs>({
    key: 'guestworld:sudoku:prefs:v1',
    version: 1,
    validate: isValidSudokuPrefs,
  })
}

export function createSudokuStore(options: {
  now?: () => number
  choose?: typeof pickPuzzle
  sound?: typeof sfx
  lookupPuzzle?: (id: string) => Puzzle | null
  roundStorage?: GameStorage<SavedSudokuRound>
  prefsStorage?: GameStorage<SudokuPrefs>
} = {}) {
  const now = options.now ?? (() => performance.now())
  const choose = options.choose ?? pickPuzzle
  const sound = options.sound ?? sfx
  const lookupPuzzle = options.lookupPuzzle ?? defaultLookupPuzzle
  const roundStorage = options.roundStorage ?? createDefaultRoundStorage(lookupPuzzle)
  const prefsStorage = options.prefsStorage ?? createDefaultPrefsStorage()

  const initialPrefs = prefsStorage.load() ?? { showHowTo: true }
  const rawSaved = roundStorage.load()
  const initialSaved = rawSaved && isValidSavedSudokuRound(rawSaved, lookupPuzzle) ? rawSaved : null
  const initialSummary = summarizeSavedRound(initialSaved)

  return create<SudokuState>((set, get) => {
    const canEdit = () => get().phase === 'playing' && get().dialog === 'none'
    const editable = () => canEdit() && get().selected >= 0 && !get().puzzle?.givens[get().selected]

    function buildRoundSnapshot(state: SudokuState, elapsedOverride?: number): SavedSudokuRound | null {
      if (!state.puzzle) return null
      if (state.selected < 0 || state.selected >= 81) return null
      return {
        puzzleId: state.puzzle.id,
        difficulty: state.difficulty,
        entries: state.entries,
        notes: state.notes,
        selected: state.selected,
        hintsUsed: state.hintsUsed,
        elapsedMs: elapsedOverride ?? elapsedAt(state, now()),
      }
    }

    function persistCurrent(elapsedOverride?: number) {
      const s = get()
      if (!s.puzzle || s.phase === 'completed' || s.phase === 'idle') return
      const snap = buildRoundSnapshot(s, elapsedOverride)
      if (!snap) return
      const saved = roundStorage.save(snap)
      set({ savedSummary: saved ? summarizeSavedRound(snap) : null })
    }

    function commit(entries: number[], notes: number[], announcement: string, hinted = false) {
      const s = get()
      const complete = isComplete(entries)
      if (complete) {
        roundStorage.clear()
        set({
          entries,
          notes,
          history: [...s.history, { entries: s.entries, notes: s.notes }],
          hintsUsed: s.hintsUsed + (hinted ? 1 : 0),
          announcement: 'Sudoku solved. Well done!',
          phase: 'completed',
          elapsedMs: elapsedAt(s, now()),
          runningSince: null,
          savedSummary: null,
        })
        sound.win()
        return
      }
      set({
        entries,
        notes,
        history: [...s.history, { entries: s.entries, notes: s.notes }],
        hintsUsed: s.hintsUsed + (hinted ? 1 : 0),
        announcement,
      })
      sound.keyPress()
      persistCurrent()
    }

    return {
      phase: 'idle',
      difficulty: 'novice',
      puzzle: null,
      entries: [],
      notes: [],
      selected: -1,
      notesMode: false,
      history: [],
      hintsUsed: 0,
      elapsedMs: 0,
      runningSince: null,
      dialog: 'none',
      showHowTo: initialPrefs.showHowTo,
      announcement: '',
      savedSummary: initialSummary,

      start: (difficulty, skipIntro = false) => {
        const puzzle = choose(difficulty, get().puzzle?.id)
        const intro = get().showHowTo && !skipIntro
        set({
          puzzle,
          difficulty,
          entries: [...puzzle.givens],
          notes: Array(81).fill(0),
          selected: Math.max(0, puzzle.givens.indexOf(0)),
          phase: intro ? 'intro' : 'playing',
          notesMode: false,
          history: [],
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: intro ? null : now(),
          dialog: 'none',
          announcement: 'New puzzle ready.',
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
        if (!saved || !isValidSavedSudokuRound(saved, lookupPuzzle)) {
          set({ savedSummary: null })
          return false
        }
        const puzzle = lookupPuzzle(saved.puzzleId)
        if (!puzzle) {
          set({ savedSummary: null })
          return false
        }
        set({
          phase: 'playing',
          difficulty: saved.difficulty,
          puzzle,
          entries: [...saved.entries],
          notes: [...saved.notes],
          selected: saved.selected,
          notesMode: false,
          history: [],
          hintsUsed: saved.hintsUsed,
          elapsedMs: saved.elapsedMs,
          runningSince: now(),
          dialog: 'none',
          announcement: 'Saved puzzle resumed.',
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
            const saved = roundStorage.save(snap)
            summary = saved ? summarizeSavedRound(snap) : null
          }
        }
        set({
          phase: 'idle',
          puzzle: null,
          entries: [],
          notes: [],
          selected: -1,
          notesMode: false,
          history: [],
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: null,
          dialog: 'none',
          announcement: '',
          savedSummary: summary,
        })
      },

      flushSave: () => {
        const s = get()
        if (!s.puzzle || (s.phase !== 'playing' && s.phase !== 'intro')) return
        persistCurrent()
      },

      select: cell => {
        const s = get()
        if (!canEdit() || !Number.isInteger(cell) || cell < 0 || cell >= 81) return
        if (cell === s.selected) return
        set({ selected: cell })
        persistCurrent()
      },

      enter: digit => {
        if (!editable() || !Number.isInteger(digit) || digit < 1 || digit > 9) return
        const s = get(), cell = s.selected
        if (s.notesMode) {
          if (s.entries[cell]) return
          const notes = [...s.notes]; notes[cell] ^= 1 << digit
          commit(s.entries, notes, `Note ${digit} ${notes[cell] & (1 << digit) ? 'added' : 'removed'}.`)
        } else {
          if (s.entries[cell] === digit) return
          const entries = [...s.entries], notes = [...s.notes]
          entries[cell] = digit; notes[cell] = 0
          commit(entries, notes, conflicts(entries).has(cell) ? `${digit} entered. Duplicate in this row, column, or box.` : `${digit} entered.`)
        }
      },

      toggleNotes: () => {
        if (canEdit()) set(s => ({ notesMode: !s.notesMode, announcement: `Notes ${s.notesMode ? 'off' : 'on'}.` }))
      },

      erase: () => {
        if (!editable()) return
        const s = get(), cell = s.selected
        if (!s.entries[cell] && !s.notes[cell]) return
        const entries = [...s.entries], notes = [...s.notes]
        entries[cell] = 0; notes[cell] = 0
        commit(entries, notes, 'Cell cleared.')
      },

      undo: () => {
        if (!canEdit()) return
        const s = get(), previous = s.history[s.history.length - 1]
        if (!previous) return
        set({ ...previous, history: s.history.slice(0, -1), announcement: 'Last edit undone. Hints used are still counted.' })
        persistCurrent()
      },

      hint: () => {
        if (!editable()) return
        const s = get(), cell = s.selected, digit = s.puzzle!.solution[cell]
        if (s.entries[cell] === digit) return
        const entries = [...s.entries], notes = [...s.notes]
        entries[cell] = digit; notes[cell] = 0
        commit(entries, notes, `Hint revealed ${digit}.`, true)
      },

      openDialog: dialog => {
        const s = get()
        if (!canEdit()) return
        const elapsed = elapsedAt(s, now())
        set({ dialog, elapsedMs: elapsed, runningSince: null })
        persistCurrent(elapsed)
      },

      closeDialog: () => {
        if (get().phase === 'playing' && get().dialog !== 'none') set({ dialog: 'none', runningSince: now() })
      },

      setShowHowTo: showHowTo => {
        set({ showHowTo })
        prefsStorage.save({ showHowTo })
      },

      discard: () => {
        roundStorage.clear()
        set({
          phase: 'idle',
          puzzle: null,
          entries: [],
          notes: [],
          selected: -1,
          history: [],
          notesMode: false,
          hintsUsed: 0,
          elapsedMs: 0,
          runningSince: null,
          dialog: 'none',
          announcement: '',
          savedSummary: null,
        })
      },
    }
  })
}

export const useSudokuStore = createSudokuStore()
