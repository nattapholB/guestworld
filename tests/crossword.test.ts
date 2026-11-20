import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGameStorage, type StorageLike } from '../src/app/storage'
import { generatePuzzle, solvePattern } from '../src/games/crossword/generator'
import { LEXICON } from '../src/games/crossword/lexicon'
import { extractSlots, isSolved, moveByArrow, validatePattern } from '../src/games/crossword/logic'
import { PATTERNS } from '../src/games/crossword/patterns'
import {
  createCrosswordStore,
  elapsedAt,
  isValidPrefs,
  isValidSavedRound,
  type CrosswordPrefs,
} from '../src/games/crossword/store'
import type { CrosswordPuzzle, SavedCrosswordRound } from '../src/games/crossword/types'

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

function makeFixturePuzzle(): CrosswordPuzzle {
  // 5x5 Mini grid:
  //   0 1 2 3 4
  // 0 S T A R S
  // 1 . . . . . (Wait: need vertical cross! Let's use mini-02: .#### / .#.#. / ##### / .#.#. / ####.)
  // Layout:
  //   . W O R D   (1 Across: WORD)
  //   . A . A .   (1 Down: WATER? No, col 1: W, A, R, M, S -> WARMS! col 3: R, A, I, N, S -> RAINS!)
  //   S A R I S   Wait let's pick valid real words:
  //   Row 0: .STAR (1 Across: STAR, cols 1..4)
  //   Row 2: ORBIT (4 Across: ORBIT, cols 0..4)
  //   Row 4: MINT. (5 Across: MINT, cols 0..3)
  //   Col 1 (rows 0..4): S, O, R, E, I -> Wait: S(0,1), P(1,1), R(2,1)? ORBIT has R at col 1!
  //   Let's check: Row 0 .STAR -> (0,1)=S, (0,2)=T, (0,3)=A, (0,4)=R
  //   Row 2 ORBIT -> (2,1)=R
  //   Row 4 MINT. -> (4,1)=I
  //   So Col 1 is S _ R _ I (let's change Row 4 to MOON. -> I->O: S _ R _ O).
  //   Even simpler: use mini-02 with:
  //   Row 0: .CARE (1A: CARE, cols 1..4 -> C at 1, R at 3)
  //   Row 2: SPACE (3A: SPACE, cols 0..4 -> P at 1, C at 3)
  //   Row 4: NOTE. (4A: NOTE, cols 0..3 -> O at 1, E at 3)
  //   Col 1: C _ P _ O -> wait: C A P O N? No, Row 4 NOTE has O at col 1! C, A, P, O, N? Wait 4A needs col 1 = N?
  //   Let's check:
  //   Col 1 = C A R E S (Row 0 . C A R E -> C at 1; Row 2 R -> O R B I T! Wait O at 0, R at 1 -> C A R E S -> E at 3?!)
  //   Let's construct directly cleanly:
  //   Row 0: . S T A R   (1A = STAR: S=1, T=2, A=3, R=4)
  //   Row 1: . T . R .
  //   Row 2: P A R T Y   (3A = PARTY: P=0, A=1, R=2, T=3, Y=4 -> wait Col 1: S, T, A, _, _ = STAMP -> Row 4: S M P .? Wait M at 1! Let's check!)
  //   Row 0: . S T A R  -> col1=S, col3=A
  //   Row 1: . T . R .
  //   Row 2: C A R E S  -> col1=A! Col1 = S,T,A,R,S (STARS)! So Row 4 col1 = S!
  //   Row 3: . R . E .  -> col3: A, R, E, A, S (AREAS)! So Row 4 col3 = S!
  //   Row 4: A S K S .  -> col0=A, col1=S, col2=K, col3=S (ASKS)!
  const rows = ['.####', '.#.#.', '#####', '.#.#.', '####.']
  const extracted = extractSlots(rows)
  const solution = [
    null, 'S', 'T', 'A', 'R',
    null, 'T', null, 'R', null,
    'C', 'A', 'R', 'E', 'S',
    null, 'R', null, 'A', null,
    'A', 'S', 'K', 'S', null,
  ]
  const across = [
    { number: 1, direction: 'across' as const, row: 0, col: 1, length: 4, cells: [1, 2, 3, 4], answer: 'STAR', en: 'Night sky light', th: 'ดวงดาวบนฟ้า' },
    { number: 3, direction: 'across' as const, row: 2, col: 0, length: 5, cells: [10, 11, 12, 13, 14], answer: 'CARES', en: 'Looks after warmly', th: 'ห่วงใยดูแล' },
    { number: 4, direction: 'across' as const, row: 4, col: 0, length: 4, cells: [20, 21, 22, 23], answer: 'ASKS', en: 'Poses a question', th: 'ถามคำถาม' },
  ]
  const down = [
    { number: 1, direction: 'down' as const, row: 0, col: 1, length: 5, cells: [1, 6, 11, 16, 21], answer: 'STARS', en: 'Cosmic points of light', th: 'หมู่ดาวในอวกาศ' },
    { number: 2, direction: 'down' as const, row: 0, col: 3, length: 5, cells: [3, 8, 13, 18, 23], answer: 'AREAS', en: 'Zones or regions', th: 'พื้นที่บริเวณต่างๆ' },
  ]
  return {
    id: 'fixture-mini',
    patternId: 'mini-02',
    tier: 'mini',
    size: 5,
    layout: extracted.layout,
    solution,
    cellNumbers: extracted.cellNumbers,
    clues: { across, down },
  }
}

function setupStore(puzzle = makeFixturePuzzle()) {
  let time = 1000
  let wins = 0
  let errors = 0
  const noop = () => {}
  const roundStorage = createGameStorage<SavedCrosswordRound>({
    key: 'test:round',
    version: 1,
    validate: isValidSavedRound,
    storage: memoryStorage(),
  })
  const prefsStorage = createGameStorage<CrosswordPrefs>({
    key: 'test:prefs',
    version: 1,
    validate: isValidPrefs,
    storage: memoryStorage(),
  })
  const store = createCrosswordStore({
    now: () => time,
    generate: () => puzzle,
    sound: { keyPress: noop, flip: noop, error: () => { errors++ }, win: () => { wins++ }, lose: noop },
    roundStorage,
    prefsStorage,
  })
  return {
    store,
    roundStorage,
    prefsStorage,
    advance: (ms: number) => { time += ms },
    elapsed: () => elapsedAt(store.getState(), time),
    wins: () => wins,
    errors: () => errors,
  }
}

test('createGameStorage handles versioning, validation, corrupted JSON, and storage failures', () => {
  const backend = memoryStorage()
  const storage = createGameStorage<{ count: number }>({
    key: 'k',
    version: 2,
    validate: (v): v is { count: number } =>
      Boolean(v && typeof v === 'object' && typeof (v as { count?: unknown }).count === 'number'),
    storage: backend,
  })

  assert.equal(storage.load(), null)
  assert.equal(storage.save({ count: 7 }), true)
  assert.deepEqual(storage.load(), { count: 7 })

  // Version mismatch returns null
  backend.setItem('k', JSON.stringify({ version: 1, savedAt: 1, data: { count: 7 } }))
  assert.equal(storage.load(), null)

  // Validation failure returns null
  backend.setItem('k', JSON.stringify({ version: 2, savedAt: 1, data: { count: 'bad' } }))
  assert.equal(storage.load(), null)

  // Malformed JSON returns null
  backend.setItem('k', '{not-json')
  assert.equal(storage.load(), null)

  storage.clear()
  assert.equal(storage.load(), null)

  // Restricted storage never throws
  const blocked = createGameStorage<{ count: number }>({
    key: 'k',
    version: 1,
    validate: (v): v is { count: number } => Boolean(v),
    storage: memoryStorage(true),
  })
  assert.equal(blocked.save({ count: 1 }), false)
  assert.equal(blocked.load(), null)
  assert.doesNotThrow(() => blocked.clear())
})

test('lexicon contains unique 4–7 letter English words with bilingual clues and zero leaks', () => {
  assert.ok(LEXICON.length >= 500)
  const counts = new Map<number, number>([[4, 0], [5, 0], [6, 0], [7, 0]])
  const words = new Set<string>()
  for (const entry of LEXICON) {
    assert.match(entry.word, /^[A-Z]{4,7}$/, entry.word)
    assert.ok(!words.has(entry.word), `Duplicate word ${entry.word}`)
    words.add(entry.word)
    counts.set(entry.word.length, (counts.get(entry.word.length) ?? 0) + 1)
    assert.ok(entry.en.trim().length >= 3, entry.word)
    assert.ok(/[\u0E00-\u0E7F]/.test(entry.th), `Missing Thai clue for ${entry.word}`)
    assert.equal(new RegExp(`\\b${entry.word}\\b`, 'i').test(entry.en), false, `EN clue leaks ${entry.word}`)
    assert.equal(entry.th.toUpperCase().includes(entry.word), false, `TH clue leaks ${entry.word}`)
  }
  for (const len of [4, 5, 6, 7]) {
    assert.ok((counts.get(len) ?? 0) >= 100, `Insufficient ${len}-letter words`)
  }
})

test('all 56 crossword patterns are distinct, geometrically valid, and solve cleanly', () => {
  assert.ok(PATTERNS.length >= 50)
  const sigs = new Set<string>()
  for (const tier of ['mini', 'classic', 'grand'] as const) {
    assert.ok(PATTERNS.filter(p => p.tier === tier).length >= 16, `Tier ${tier} needs >= 16 patterns`)
  }
  for (const pattern of PATTERNS) {
    const sig = pattern.rows.join('/')
    assert.ok(!sigs.has(sig), `Duplicate pattern ${pattern.id}`)
    sigs.add(sig)

    const validation = validatePattern(pattern)
    assert.equal(validation.valid, true, `${pattern.id}: ${validation.errors.join('; ')}`)

    const solved = solvePattern(pattern, Math.random, 8000)
    assert.ok(solved, `Failed to solve ${pattern.id}`)
    assert.equal(solved.size, pattern.size)

    const usedWords = new Set<string>()
    for (const clue of [...solved.clues.across, ...solved.clues.down]) {
      assert.ok(!usedWords.has(clue.answer), `Duplicate word ${clue.answer} in ${pattern.id}`)
      usedWords.add(clue.answer)
      assert.equal(clue.cells.length, clue.length)
      clue.cells.forEach((cell, idx) => {
        assert.equal(solved.solution[cell], clue.answer[idx], `${pattern.id} intersection mismatch`)
      })
    }
  }
})

test('generatePuzzle avoids repeating the preceding pattern within a tier', () => {
  const first = generatePuzzle('mini', { random: () => 0.25 })
  const second = generatePuzzle('mini', { previousPatternId: first.patternId, random: () => 0.25 })
  assert.notEqual(second.patternId, first.patternId)
})

test('intro and help dialogs pause time and block grid mutations', () => {
  const ctx = setupStore()
  const get = ctx.store.getState
  get().start('mini')
  assert.equal(get().phase, 'intro')
  ctx.advance(3000)
  get().typeLetter('S')
  get().hintCell()
  assert.equal(get().entries[1], '')
  assert.equal(ctx.elapsed(), 0)

  get().begin()
  assert.equal(get().phase, 'playing')
  ctx.advance(2500)
  get().openHelp()
  ctx.advance(5000)
  get().typeLetter('S')
  assert.equal(get().entries[1], '')
  assert.equal(ctx.elapsed(), 2500)

  get().closeHelp()
  ctx.advance(1500)
  assert.equal(ctx.elapsed(), 4000)
})

test('typing advances along the active word, skips revealed cells, and arrows skip blocks', () => {
  const ctx = setupStore()
  const get = ctx.store.getState
  get().start('mini', true)

  // Initial cell is 1 (1 Across: 1,2,3,4). Reveal cell 2 first so typing at 1 skips cell 2 to cell 3!
  get().selectCell(2)
  get().hintCell()
  assert.equal(get().revealed[2], true)
  assert.equal(get().entries[2], 'T')

  get().selectCell(1)
  get().typeLetter('s')
  assert.equal(get().entries[1], 'S')
  assert.equal(get().selected, 3)

  // ArrowDown from 3 moves down column 3 -> 8 -> 13 -> 18
  get().moveArrow('ArrowDown')
  assert.equal(get().selected, 8)
  // ArrowLeft from 8 jumps across black square at 7 to cell 6!
  get().moveArrow('ArrowLeft')
  assert.equal(get().selected, 6)

  // Re-clicking cell 11 (intersection of 3 Across and 1 Down) flips direction
  get().selectCell(11)
  const dirBefore = get().direction
  get().selectCell(11)
  assert.notEqual(get().direction, dirBefore)

  assert.equal(moveByArrow(get().puzzle!, 6, 'ArrowLeft'), 6)
})

test('checkWord flags only wrong filled cells in the active word and clears flags on edit', () => {
  const ctx = setupStore()
  const get = ctx.store.getState
  get().start('mini', true)

  // 1 Across is STAR (cells 1,2,3,4)
  get().selectClue(1, 'across')
  get().typeLetter('S')
  get().typeLetter('X') // wrong at cell 2
  get().typeLetter('A')
  get().typeLetter('R')
  get().checkWord()

  assert.equal(ctx.errors(), 1)
  assert.equal(get().checkedErrors[1], false)
  assert.equal(get().checkedErrors[2], true)
  assert.equal(get().checkedErrors[3], false)
  assert.equal(get().checkedErrors[4], false)

  // Editing cell 2 clears its error highlight
  get().selectCell(2)
  get().typeLetter('T')
  assert.equal(get().checkedErrors[2], false)
})

test('hintCell and revealWord lock letters, increment hintsUsed accurately, and cannot overwrite locked cells', () => {
  const ctx = setupStore()
  const get = ctx.store.getState
  get().start('mini', true)

  get().selectCell(1)
  get().hintCell()
  assert.equal(get().entries[1], 'S')
  assert.equal(get().revealed[1], true)
  assert.equal(get().hintsUsed, 1)

  // Selecting locked cell 1 and requesting hint again is a no-op; typing does not overwrite
  get().selectCell(1)
  get().hintCell()
  get().typeLetter('Z')
  get().erase(false)
  assert.equal(get().entries[1], 'S')
  assert.equal(get().hintsUsed, 1)

  // Reveal remaining 3 cells of 1 Across (cells 2, 3, 4) -> +3 hintsUsed (total 4)
  get().selectClue(1, 'across')
  get().revealWord()
  assert.equal(get().hintsUsed, 4)
  assert.equal(get().entries[2], 'T')
  assert.equal(get().entries[3], 'A')
  assert.equal(get().entries[4], 'R')
})

test('full board with mistake does not complete; fixing last cell completes and clears saved storage', () => {
  const ctx = setupStore()
  const get = ctx.store.getState
  const puzzle = get().puzzle
  assert.equal(puzzle, null)

  get().start('mini', true)
  const activePuzzle = get().puzzle!
  ctx.advance(2000)

  // Fill every white cell correctly EXCEPT cell 23 with 'X' instead of 'S'
  for (let i = 0; i < activePuzzle.layout.length; i++) {
    if (!activePuzzle.layout[i]) continue
    get().selectCell(i)
    get().typeLetter(i === 23 ? 'X' : activePuzzle.solution[i]!)
  }

  assert.equal(get().phase, 'playing')
  assert.equal(ctx.wins(), 0)
  assert.ok(get().lastCheckMessage.length > 0)
  assert.ok(ctx.roundStorage.load() !== null)

  // Fix final cell 23 -> auto-completes, freezes clock, clears saved round
  get().selectCell(23)
  get().typeLetter('S')
  assert.equal(isSolved(activePuzzle, get().entries), true)
  assert.equal(get().phase, 'completed')
  assert.equal(ctx.wins(), 1)
  assert.equal(ctx.roundStorage.load(), null)
  ctx.advance(5000)
  assert.equal(ctx.elapsed(), 2000)

  // Mutating after completion is blocked
  get().erase(false)
  assert.equal(get().entries[23], 'S')
})

test('saveAndLeave persists unfinished progress and resume restores board, time, and bilingual preference', () => {
  const backendRound = memoryStorage()
  const backendPrefs = memoryStorage()
  let time = 1000
  const noop = () => {}
  const puzzle = makeFixturePuzzle()

  const roundStorage1 = createGameStorage<SavedCrosswordRound>({
    key: 'r',
    version: 1,
    validate: isValidSavedRound,
    storage: backendRound,
  })
  const prefsStorage1 = createGameStorage<CrosswordPrefs>({
    key: 'p',
    version: 1,
    validate: isValidPrefs,
    storage: backendPrefs,
  })

  const store1 = createCrosswordStore({
    now: () => time,
    generate: () => puzzle,
    sound: { keyPress: noop, flip: noop, error: noop, win: noop, lose: noop },
    roundStorage: roundStorage1,
    prefsStorage: prefsStorage1,
  })

  store1.getState().start('mini', true)
  store1.getState().setClueLang('th')
  store1.getState().typeLetter('S')
  time += 4200
  store1.getState().saveAndLeave()

  assert.equal(store1.getState().phase, 'idle')
  assert.ok(store1.getState().savedSummary !== null)
  assert.equal(store1.getState().savedSummary?.filledCount, 1)

  // Simulate full reload with fresh store instances backed by the same storage
  const roundStorage2 = createGameStorage<SavedCrosswordRound>({
    key: 'r',
    version: 1,
    validate: isValidSavedRound,
    storage: backendRound,
  })
  const prefsStorage2 = createGameStorage<CrosswordPrefs>({
    key: 'p',
    version: 1,
    validate: isValidPrefs,
    storage: backendPrefs,
  })
  const store2 = createCrosswordStore({
    now: () => time,
    generate: () => puzzle,
    sound: { keyPress: noop, flip: noop, error: noop, win: noop, lose: noop },
    roundStorage: roundStorage2,
    prefsStorage: prefsStorage2,
  })

  assert.equal(store2.getState().clueLang, 'th')
  assert.equal(store2.getState().savedSummary?.filledCount, 1)
  assert.equal(store2.getState().resume(), true)
  assert.equal(store2.getState().phase, 'playing')
  assert.equal(store2.getState().entries[1], 'S')
  assert.equal(elapsedAt(store2.getState(), time), 4200)
})
