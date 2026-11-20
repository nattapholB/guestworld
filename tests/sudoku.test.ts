import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGameStorage, type StorageLike } from '../src/app/storage'
import { conflicts, countSolutions, isComplete, PEERS, UNITS } from '../src/games/sudoku/logic'
import { PUZZLES, pickPuzzle } from '../src/games/sudoku/puzzles'
import { gradePuzzle } from '../scripts/sudoku-grading'
import {
  createDefaultPrefsStorage,
  createDefaultRoundStorage,
  createSudokuStore,
  elapsedAt,
  isValidSavedSudokuRound,
  isValidSudokuPrefs,
  type SudokuPrefs,
} from '../src/games/sudoku/store'
import type { Puzzle, SavedSudokuRound } from '../src/games/sudoku/types'
import { computeFeedback } from '../src/game/logic'
import { computeScore } from '../src/game/scoring'

const solution = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9]
function fixture(empty = [0, 1, 2]): Puzzle {
  return { id: 'fixture', difficulty: 'novice', solution, givens: solution.map((v, i) => empty.includes(i) ? 0 : v), techniques: ['Naked single'] }
}
function memoryStorage(throwOnAccess = false): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem(k) {
      if (throwOnAccess) throw new Error('blocked')
      return map.get(k) ?? null
    },
    setItem(k, v) {
      if (throwOnAccess) throw new Error('quota')
      map.set(k, v)
    },
    removeItem(k) {
      if (throwOnAccess) throw new Error('blocked')
      map.delete(k)
    },
  }
}
function setup(
  puzzle = fixture(),
  backends: { roundBackend?: StorageLike; prefsBackend?: StorageLike } = {},
) {
  let time = 1000
  let wins = 0
  const noop = () => {}
  const lookupPuzzle = (id: string) => (id === puzzle.id ? puzzle : PUZZLES.find(p => p.id === id) ?? null)
  const roundBackend = backends.roundBackend ?? memoryStorage()
  const prefsBackend = backends.prefsBackend ?? memoryStorage()
  const roundStorage = createGameStorage<SavedSudokuRound>({
    key: 'test:sudoku:round',
    version: 1,
    validate: (v): v is SavedSudokuRound => isValidSavedSudokuRound(v, lookupPuzzle),
    storage: roundBackend,
  })
  const prefsStorage = createGameStorage<SudokuPrefs>({
    key: 'test:sudoku:prefs',
    version: 1,
    validate: isValidSudokuPrefs,
    storage: prefsBackend,
  })
  const store = createSudokuStore({
    now: () => time,
    choose: () => puzzle,
    sound: { keyPress: noop, flip: noop, error: noop, win: () => { wins++ }, lose: noop },
    lookupPuzzle,
    roundStorage,
    prefsStorage,
  })
  return {
    store,
    roundStorage,
    prefsStorage,
    roundBackend,
    prefsBackend,
    lookupPuzzle,
    advance: (ms: number) => { time += ms },
    elapsed: () => elapsedAt(store.getState(), time),
    wins: () => wins,
  }
}

test('peer topology has exactly 20 peers per cell and symmetric relationships', () => {
  for (let i = 0; i < 81; i++) { assert.equal(PEERS[i].length, 20); assert.ok(!PEERS[i].includes(i)); for (const j of PEERS[i]) assert.ok(PEERS[j].includes(i)) }
})
test('conflicts mark every duplicate, including givens, but never empty cells', () => {
  for (const unit of UNITS) {
    const board = Array(81).fill(0); board[unit[0]] = 7; board[unit[1]] = 7
    assert.deepEqual([...conflicts(board)].sort((a,b)=>a-b), [unit[0],unit[1]].sort((a,b)=>a-b))
  }
  assert.equal(conflicts(Array(81).fill(0)).size, 0)
})
test('only a full valid board completes; inconsistent and ambiguous puzzles are rejected', () => {
  assert.equal(isComplete(solution), true)
  assert.equal(isComplete(fixture().givens), false)
  assert.equal(isComplete(Array(81).fill(1)), false)
  assert.equal(countSolutions(Array(81).fill(1)), 0)
  assert.equal(countSolutions(Array(81).fill(0)), 2)
  assert.equal(countSolutions(fixture().givens), 1)
})
test('all 60 puzzle fixtures are distinct, unique, solvable, and correctly graded', () => {
  assert.equal(PUZZLES.length, 60)
  assert.equal(new Set(PUZZLES.map(p=>p.givens.join(''))).size, 60)
  for (const [rank, difficulty] of ['novice', 'beginner', 'expert'].entries()) {
    const puzzles = PUZZLES.filter(p=>p.difficulty===difficulty)
    assert.equal(puzzles.length, 20)
    for (const p of puzzles) {
      assert.ok(p.givens.every((n,i)=>n===0||n===p.solution[i]), p.id)
      assert.equal(countSolutions(p.givens), 1, p.id)
      const result = gradePuzzle(p.givens)
      assert.equal(result.solved, true, p.id)
      assert.equal(result.level, rank, p.id)
      assert.deepEqual(result.board, p.solution, p.id)
      if (rank > 0) assert.equal(gradePuzzle(p.givens, rank-1).solved, false, p.id)
      // Independently check every claimed deduction against the unique solution.
      for (const step of result.trace) {
        if (step.cell !== undefined) assert.equal(step.digit, p.solution[step.cell], p.id)
        for (const [cell, mask] of step.removed ?? []) assert.equal(mask & (1 << p.solution[cell]), 0, p.id)
      }
    }
  }
})
test('new puzzles stay in the selected tier and avoid the preceding puzzle', () => {
  for (const p of PUZZLES) { const next = pickPuzzle(p.difficulty,p.id,()=>0); assert.notEqual(next.id,p.id); assert.equal(next.difficulty,p.difficulty) }
})
test('intro and help dialogs pause time and block all mutations', () => {
  const c = setup(), get = c.store.getState
  get().start('novice'); c.advance(4000)
  get().enter(1); get().hint(); get().toggleNotes(); assert.equal(get().entries[0], 0); assert.equal(c.elapsed(), 0)
  get().begin(); c.advance(2000); get().openDialog('help'); c.advance(5000)
  get().enter(5); get().hint(); get().select(20); assert.equal(get().entries[0], 0); assert.equal(get().selected, 0)
  assert.equal(get().dialog, 'help'); assert.equal(c.elapsed(), 2000)
  assert.equal(c.roundStorage.load()?.elapsedMs, 2000)
  get().closeDialog(); get().closeDialog(); c.advance(3000); assert.equal(c.elapsed(), 5000)
})
test('givens are immutable; invalid indices and values cannot corrupt the board', () => {
  const { store }=setup(), get=store.getState; get().start('novice',true); get().select(3)
  get().enter(7); get().erase(); get().hint(); assert.equal(get().entries[3],6); assert.equal(get().hintsUsed,0)
  get().select(-1); assert.equal(get().selected,3)
  get().select(100); assert.equal(get().selected,3)
  get().select(0); for(const n of [0,10,1.5,NaN])get().enter(n); assert.equal(get().entries[0],0)
})
test('notes, entry and erase undo together while peer notes are preserved', () => {
  const { store }=setup(), get=store.getState; get().start('novice',true)
  get().toggleNotes(); get().enter(2); get().enter(5); assert.equal(get().notes[0],(1<<2)|(1<<5))
  get().enter(2); assert.equal(get().notes[0],1<<5)
  get().select(1); get().enter(5); get().select(0); get().toggleNotes(); get().enter(5)
  assert.equal(get().notes[0],0); assert.equal(get().notes[1],1<<5)
  get().undo(); assert.equal(get().entries[0],0); assert.equal(get().notes[0],1<<5)
  get().erase(); assert.equal(get().notes[0],0); get().undo(); assert.equal(get().notes[0],1<<5)
})
test('hints increment once per successful reveal and undo cannot refund them', () => {
  const { store }=setup(), get=store.getState; get().start('novice',true)
  get().enter(9); get().hint(); assert.equal(get().entries[0],5); assert.equal(get().hintsUsed,1)
  get().hint(); assert.equal(get().hintsUsed,1)
  get().undo(); assert.equal(get().entries[0],9); assert.equal(get().hintsUsed,1)
  get().hint(); assert.equal(get().hintsUsed,2)
})
test('normal input does not flag solution disagreement without a duplicate', () => {
  const p=fixture(Array.from({length:81},(_,i)=>i)); const {store}=setup(p), get=store.getState
  get().start('novice',true); get().enter(1)
  assert.equal(conflicts(get().entries).size,0); assert.equal(get().announcement,'1 entered.')
})
test('final move completes once, freezes time/editing, clears saved round; replay resets the round', () => {
  const c=setup(fixture([0])), get=c.store.getState; get().start('novice',true); c.advance(2500)
  assert.ok(c.roundStorage.load() !== null); assert.ok(get().savedSummary !== null)
  get().enter(5)
  assert.equal(get().phase,'completed'); assert.equal(c.wins(),1); c.advance(2000); assert.equal(c.elapsed(),2500)
  assert.equal(c.roundStorage.load(), null); assert.equal(get().savedSummary, null)
  get().enter(3); get().erase(); get().undo(); get().hint(); assert.equal(get().entries[0],5)
  get().start('novice',true); assert.equal(get().phase,'playing'); assert.equal(get().entries[0],0); assert.equal(get().hintsUsed,0); assert.equal(get().history.length,0); assert.equal(c.elapsed(),0)
  assert.ok(c.roundStorage.load() !== null)
})
test('a final hint completes and clears saved round; discard clears active state and saved round', () => {
  const c=setup(fixture([0, 1])), get=c.store.getState; get().start('novice',true); get().enter(5)
  assert.ok(c.roundStorage.load() !== null)
  get().select(1); get().hint()
  assert.equal(get().phase,'completed'); assert.equal(get().hintsUsed,1)
  assert.equal(c.roundStorage.load(), null); assert.equal(get().savedSummary, null)
  get().start('novice',true); assert.ok(c.roundStorage.load() !== null)
  get().discard()
  assert.equal(get().phase,'idle'); assert.equal(get().puzzle,null); assert.equal(get().entries.length,0); assert.equal(get().runningSince,null)
  assert.equal(c.roundStorage.load(), null); assert.equal(get().savedSummary, null)
})
test('saveAndLeave persists unfinished progress and resume restores board while resetting history and notesMode', () => {
  const p = fixture([0, 1, 2])
  const roundBackend = memoryStorage()
  const prefsBackend = memoryStorage()
  const c1 = setup(p, { roundBackend, prefsBackend })
  const get1 = c1.store.getState

  get1().start('novice', true)
  c1.advance(1500)
  get1().enter(5) // cell 0 filled -> 79/81 filled
  get1().select(1)
  get1().toggleNotes()
  get1().enter(3)
  get1().enter(7) // notes on cell 1: bits 3 & 7
  get1().select(2)
  get1().toggleNotes()
  get1().hint() // cell 2 hinted -> 80/81 filled, hintsUsed = 1
  get1().select(1)
  get1().toggleNotes() // leave notesMode ON before saving
  assert.equal(get1().notesMode, true)
  assert.ok(get1().history.length > 0)

  c1.advance(2700) // total elapsed = 4200
  get1().flushSave()
  assert.equal(c1.roundStorage.load()?.elapsedMs, 4200)

  c1.advance(800) // total elapsed = 5000
  get1().saveAndLeave()
  assert.equal(get1().phase, 'idle')
  assert.equal(get1().puzzle, null)
  assert.deepEqual(get1().savedSummary, { difficulty: 'novice', filledCount: 80, elapsedMs: 5000 })

  // Simulate full reload with fresh store sharing the same backing storage
  const c2 = setup(p, { roundBackend, prefsBackend })
  const get2 = c2.store.getState
  assert.deepEqual(get2().savedSummary, { difficulty: 'novice', filledCount: 80, elapsedMs: 5000 })
  assert.equal(get2().resume(), true)
  assert.equal(get2().phase, 'playing')
  assert.equal(get2().puzzle?.id, p.id)
  assert.equal(get2().difficulty, 'novice')
  assert.equal(get2().entries[0], 5)
  assert.equal(get2().entries[1], 0)
  assert.equal(get2().entries[2], 4)
  assert.equal(get2().notes[1], (1 << 3) | (1 << 7))
  assert.equal(get2().selected, 1)
  assert.equal(get2().hintsUsed, 1)
  assert.equal(c2.elapsed(), 5000)
  // Undo history and notesMode are intentionally not persisted
  assert.deepEqual(get2().history, [])
  assert.equal(get2().notesMode, false)

  // Subsequent undo/erase/select auto-save updates persisted snapshot
  get2().erase()
  assert.equal(c2.roundStorage.load()?.notes[1], 0)
  get2().undo()
  assert.equal(c2.roundStorage.load()?.notes[1], (1 << 3) | (1 << 7))
  get2().select(0)
  assert.equal(c2.roundStorage.load()?.selected, 0)
})
test('discardSaved clears saved round without affecting active prefs', () => {
  const p = fixture([0, 1])
  const roundBackend = memoryStorage()
  const prefsBackend = memoryStorage()
  const c = setup(p, { roundBackend, prefsBackend })
  const get = c.store.getState

  get().setShowHowTo(false)
  get().start('novice')
  assert.equal(get().phase, 'playing')
  get().enter(5)
  get().saveAndLeave()
  assert.ok(get().savedSummary !== null)
  assert.ok(c.roundStorage.load() !== null)

  get().discardSaved()
  assert.equal(get().savedSummary, null)
  assert.equal(c.roundStorage.load(), null)
  assert.equal(get().resume(), false)
  assert.equal(c.prefsStorage.load()?.showHowTo, false)
})
test('showHowTo preference persists across fresh store reload', () => {
  const p = fixture([0, 1])
  const prefsBackend = memoryStorage()
  const c1 = setup(p, { prefsBackend })
  assert.equal(c1.store.getState().showHowTo, true)

  c1.store.getState().setShowHowTo(false)
  assert.equal(c1.store.getState().showHowTo, false)

  const c2 = setup(p, { prefsBackend })
  assert.equal(c2.store.getState().showHowTo, false)
  c2.store.getState().start('novice')
  assert.equal(c2.store.getState().phase, 'playing')

  c2.store.getState().setShowHowTo(true)
  const c3 = setup(p, { prefsBackend })
  assert.equal(c3.store.getState().showHowTo, true)
  c3.store.getState().start('novice')
  assert.equal(c3.store.getState().phase, 'intro')
})
test('isValidSavedSudokuRound strictly rejects invalid, tampered, and completed snapshots and handles storage failures', () => {
  const p = fixture([0, 1, 2])
  const lookup = (id: string) => (id === p.id ? p : null)
  const valid = (): SavedSudokuRound => ({
    puzzleId: p.id,
    difficulty: 'novice',
    entries: [...p.givens],
    notes: Array(81).fill(0),
    selected: 0,
    hintsUsed: 1,
    elapsedMs: 1234,
  })

  // Default storage keys/versions and real bank lookup
  assert.equal(createDefaultRoundStorage().key, 'guestworld:sudoku:round:v1')
  assert.equal(createDefaultRoundStorage().version, 1)
  assert.equal(createDefaultPrefsStorage().key, 'guestworld:sudoku:prefs:v1')
  assert.equal(createDefaultPrefsStorage().version, 1)
  const bankPuzzle = PUZZLES[0]
  assert.equal(isValidSavedSudokuRound({
    puzzleId: bankPuzzle.id,
    difficulty: bankPuzzle.difficulty,
    entries: [...bankPuzzle.givens],
    notes: Array(81).fill(0),
    selected: bankPuzzle.givens.indexOf(0),
    hintsUsed: 0,
    elapsedMs: 0,
  }), true)

  assert.equal(isValidSavedSudokuRound(valid(), lookup), true)
  assert.equal(isValidSavedSudokuRound(null, lookup), false)
  assert.equal(isValidSavedSudokuRound('bad', lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), puzzleId: 'missing' }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), difficulty: 'expert' }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), entries: valid().entries.slice(0, 80) }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), notes: valid().notes.slice(0, 80) }, lookup), false)

  // Tampered immutable given cell (index 3 has given 6)
  const tamperedGiven = valid()
  tamperedGiven.entries[3] = 0
  assert.equal(isValidSavedSudokuRound(tamperedGiven, lookup), false)
  tamperedGiven.entries[3] = 7
  assert.equal(isValidSavedSudokuRound(tamperedGiven, lookup), false)

  // Out-of-range / non-integer entry
  const badEntry = valid()
  badEntry.entries[0] = 10
  assert.equal(isValidSavedSudokuRound(badEntry, lookup), false)
  badEntry.entries[0] = 1.5
  assert.equal(isValidSavedSudokuRound(badEntry, lookup), false)

  // Invalid note bitmasks: bit 0, bit 10, negative, float, 32-bit overflow, note on filled cell
  for (const badMask of [1, 1 << 10, -2, 2.5, 2 ** 32]) {
    const badNote = valid()
    badNote.notes[0] = badMask
    assert.equal(isValidSavedSudokuRound(badNote, lookup), false, `expected mask ${badMask} to fail`)
  }
  const noteOnFilled = valid()
  noteOnFilled.entries[0] = 5
  noteOnFilled.notes[0] = 1 << 2
  assert.equal(isValidSavedSudokuRound(noteOnFilled, lookup), false)

  // Valid note bitmask on empty cell passes
  const goodNote = valid()
  goodNote.notes[0] = (1 << 1) | (1 << 9)
  assert.equal(isValidSavedSudokuRound(goodNote, lookup), true)

  // Invalid selected / hintsUsed / elapsedMs
  assert.equal(isValidSavedSudokuRound({ ...valid(), selected: -1 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), selected: 81 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), selected: 1.5 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), hintsUsed: -1 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), hintsUsed: 0.5 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), elapsedMs: -1 }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), elapsedMs: Number.NaN }, lookup), false)
  assert.equal(isValidSavedSudokuRound({ ...valid(), elapsedMs: Number.POSITIVE_INFINITY }, lookup), false)

  // Already-completed board must be rejected
  assert.equal(isValidSavedSudokuRound({ ...valid(), entries: [...solution] }, lookup), false)

  // Prefs validation
  assert.equal(isValidSudokuPrefs({ showHowTo: true }), true)
  assert.equal(isValidSudokuPrefs({ showHowTo: false }), true)
  assert.equal(isValidSudokuPrefs({ showHowTo: 'yes' }), false)
  assert.equal(isValidSudokuPrefs(null), false)

  // Corrupted JSON and blocked storage degrade safely without throwing
  const corruptBackend = memoryStorage()
  corruptBackend.setItem('test:sudoku:round', '{not-valid-json')
  const corruptCtx = setup(p, { roundBackend: corruptBackend })
  assert.equal(corruptCtx.store.getState().savedSummary, null)
  assert.equal(corruptCtx.store.getState().resume(), false)

  const blockedCtx = setup(p, { roundBackend: memoryStorage(true), prefsBackend: memoryStorage(true) })
  assert.doesNotThrow(() => {
    blockedCtx.store.getState().start('novice', true)
    blockedCtx.store.getState().enter(5)
    blockedCtx.store.getState().setShowHowTo(false)
    blockedCtx.store.getState().flushSave()
    blockedCtx.store.getState().saveAndLeave()
    blockedCtx.store.getState().discardSaved()
  })
  assert.equal(blockedCtx.store.getState().savedSummary, null)
})
test('Orbit Word duplicate feedback and timer scores retain their rules', () => {
  assert.deepEqual(computeFeedback('allee','apple'), ['correct','present','absent','absent','correct'])
  assert.deepEqual(computeFeedback('speed','abide'), ['absent','absent','present','absent','present'])
  assert.deepEqual(computeFeedback('apple','apple'), Array(5).fill('correct'))
  assert.equal(computeScore(1,0),1500); assert.equal(computeScore(5,50),200); assert.equal(computeScore(3,20),900)
})
