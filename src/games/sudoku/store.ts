import { create } from 'zustand'
import { conflicts, isComplete } from './logic'
import { pickPuzzle } from './puzzles'
import type { Difficulty, Puzzle } from './types'
import { sfx } from '../../audio/sfx'

type Snapshot = { entries: number[]; notes: number[] }
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
  dialog: 'none' | 'help' | 'leave'
  showHowTo: boolean
  announcement: string
  start: (difficulty: Difficulty, skipIntro?: boolean) => void
  begin: () => void
  select: (cell: number) => void
  enter: (digit: number) => void
  toggleNotes: () => void
  erase: () => void
  undo: () => void
  hint: () => void
  openDialog: (dialog: 'help' | 'leave') => void
  closeDialog: () => void
  setShowHowTo: (show: boolean) => void
  discard: () => void
}
export const elapsedAt = (s: Pick<SudokuState, 'elapsedMs' | 'runningSince'>, now: number) =>
  s.elapsedMs + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince))

export function createSudokuStore(options: {
  now?: () => number
  choose?: typeof pickPuzzle
  sound?: typeof sfx
} = {}) {
  const now = options.now ?? (() => performance.now())
  const choose = options.choose ?? pickPuzzle
  const sound = options.sound ?? sfx
  return create<SudokuState>((set, get) => {
    const canEdit = () => get().phase === 'playing' && get().dialog === 'none'
    const editable = () => canEdit() && get().selected >= 0 && !get().puzzle?.givens[get().selected]
    function commit(entries: number[], notes: number[], announcement: string, hinted = false) {
      const s = get()
      const complete = isComplete(entries)
      set({
        entries, notes, history: [...s.history, { entries: s.entries, notes: s.notes }],
        hintsUsed: s.hintsUsed + (hinted ? 1 : 0),
        announcement: complete ? 'Sudoku solved. Well done!' : announcement,
        ...(complete ? { phase: 'completed' as const, elapsedMs: elapsedAt(s, now()), runningSince: null } : {}),
      })
      if (complete) sound.win()
      else sound.keyPress()
    }
    return {
      phase: 'idle', difficulty: 'novice', puzzle: null, entries: [], notes: [], selected: -1,
      notesMode: false, history: [], hintsUsed: 0, elapsedMs: 0, runningSince: null,
      dialog: 'none', showHowTo: true, announcement: '',
      start: (difficulty, skipIntro = false) => {
        const puzzle = choose(difficulty, get().puzzle?.id)
        const intro = get().showHowTo && !skipIntro
        set({ puzzle, difficulty, entries: [...puzzle.givens], notes: Array(81).fill(0),
          selected: puzzle.givens.indexOf(0), phase: intro ? 'intro' : 'playing',
          notesMode: false, history: [], hintsUsed: 0, elapsedMs: 0,
          runningSince: intro ? null : now(), dialog: 'none', announcement: 'New puzzle ready.' })
      },
      begin: () => { if (get().phase === 'intro') set({ phase: 'playing', runningSince: now() }) },
      select: cell => { if (canEdit() && Number.isInteger(cell) && cell >= 0 && cell < 81) set({ selected: cell }) },
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
      toggleNotes: () => { if (canEdit()) set(s => ({ notesMode: !s.notesMode, announcement: `Notes ${s.notesMode ? 'off' : 'on'}.` })) },
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
        if (previous) set({ ...previous, history: s.history.slice(0, -1), announcement: 'Last edit undone. Hints used are still counted.' })
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
        set({ dialog, elapsedMs: elapsedAt(s, now()), runningSince: null })
      },
      closeDialog: () => {
        if (get().phase === 'playing' && get().dialog !== 'none') set({ dialog: 'none', runningSince: now() })
      },
      setShowHowTo: showHowTo => set({ showHowTo }),
      discard: () => set({ phase: 'idle', entries: [], notes: [], selected: -1, history: [],
        notesMode: false, hintsUsed: 0, elapsedMs: 0, runningSince: null, dialog: 'none', announcement: '' }),
    }
  })
}
export const useSudokuStore = createSudokuStore()
