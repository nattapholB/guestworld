import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conflicts, countSolutions, isComplete, PEERS, UNITS } from '../src/games/sudoku/logic'
import { PUZZLES, pickPuzzle } from '../src/games/sudoku/puzzles'
import { gradePuzzle } from '../scripts/sudoku-grading'
import { createSudokuStore, elapsedAt } from '../src/games/sudoku/store'
import type { Puzzle } from '../src/games/sudoku/types'
import { computeFeedback } from '../src/game/logic'
import { computeScore } from '../src/game/scoring'

const solution = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9]
function fixture(empty = [0, 1, 2]): Puzzle {
  return { id: 'fixture', difficulty: 'novice', solution, givens: solution.map((v, i) => empty.includes(i) ? 0 : v), techniques: ['Naked single'] }
}
function setup(puzzle = fixture()) {
  let time = 1000
  let wins = 0
  const noop = () => {}
  const store = createSudokuStore({ now: () => time, choose: () => puzzle, sound: { keyPress: noop, flip: noop, error: noop, win: () => { wins++ }, lose: noop } })
  return { store, advance: (ms: number) => { time += ms }, elapsed: () => elapsedAt(store.getState(), time), wins: () => wins }
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
test('intro, help, and leave dialogs pause time and block all mutations', () => {
  const c=setup(), get=c.store.getState
  get().start('novice'); c.advance(4000)
  get().enter(1); get().hint(); get().toggleNotes(); assert.equal(get().entries[0],0); assert.equal(c.elapsed(),0)
  get().begin(); c.advance(2000); get().openDialog('help'); c.advance(5000)
  get().enter(5); get().hint(); get().select(20); assert.equal(get().entries[0],0); assert.equal(get().selected,0)
  get().openDialog('leave'); assert.equal(get().dialog,'help'); assert.equal(c.elapsed(),2000)
  get().closeDialog(); get().closeDialog(); c.advance(3000); assert.equal(c.elapsed(),5000)
  get().openDialog('leave'); c.advance(1000); assert.equal(c.elapsed(),5000)
  get().closeDialog(); c.advance(1000); assert.equal(c.elapsed(),6000)
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
test('final move completes once and freezes time and editing; replay resets the round', () => {
  const c=setup(fixture([0])), get=c.store.getState; get().start('novice',true); c.advance(2500); get().enter(5)
  assert.equal(get().phase,'completed'); assert.equal(c.wins(),1); c.advance(2000); assert.equal(c.elapsed(),2500)
  get().enter(3); get().erase(); get().undo(); get().hint(); assert.equal(get().entries[0],5)
  get().start('novice',true); assert.equal(get().phase,'playing'); assert.equal(get().entries[0],0); assert.equal(get().hintsUsed,0); assert.equal(get().history.length,0); assert.equal(c.elapsed(),0)
})
test('a final hint completes and discard clears active state', () => {
  const c=setup(fixture([0])), get=c.store.getState; get().start('novice',true); get().hint()
  assert.equal(get().phase,'completed'); assert.equal(get().hintsUsed,1)
  get().discard(); assert.equal(get().phase,'idle'); assert.equal(get().entries.length,0); assert.equal(get().runningSince,null)
})
test('Orbit Word duplicate feedback and timer scores retain their rules', () => {
  assert.deepEqual(computeFeedback('allee','apple'), ['correct','present','absent','absent','correct'])
  assert.deepEqual(computeFeedback('speed','abide'), ['absent','absent','present','absent','present'])
  assert.deepEqual(computeFeedback('apple','apple'), Array(5).fill('correct'))
  assert.equal(computeScore(1,0),1500); assert.equal(computeScore(5,50),200); assert.equal(computeScore(3,20),900)
})
