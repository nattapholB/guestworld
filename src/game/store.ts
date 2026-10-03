import { create } from 'zustand'
import { ANSWERS, DICTIONARY } from './words'
import { computeFeedback, pickRandomWord, MAX_GUESSES, WORD_LENGTH, type LetterState } from './logic'
import { computeScore } from './scoring'
import { sfx } from '../audio/sfx'
import { useAppStore } from '../app/store'

export type Phase = 'menu' | 'howto' | 'playing' | 'won' | 'lost'
export type Mode = 'classic' | 'timer'

interface GameState {
  phase: Phase
  mode: Mode
  gameId: number
  answer: string
  guesses: string[]
  feedbacks: LetterState[][]
  currentGuess: string
  letterStates: Record<string, LetterState>
  shakeToken: number
  startedAt: number | null
  finishedAt: number | null
  score: number | null
  helpOpen: boolean
  showHowTo: boolean

  startGame: (mode: Mode, opts?: { skipHowTo?: boolean }) => void
  beginPlay: () => void
  setHelpOpen: (open: boolean) => void
  setShowHowTo: (show: boolean) => void
  addLetter: (letter: string) => void
  removeLetter: () => void
  submitGuess: () => void
  playAgain: () => void
  goToMenu: () => void
}

const SHOW_HOWTO_KEY = 'orbit-word:show-howto'

function loadShowHowTo(): boolean {
  try {
    return localStorage.getItem(SHOW_HOWTO_KEY) !== 'false'
  } catch {
    return true
  }
}

function saveShowHowTo(show: boolean) {
  try {
    localStorage.setItem(SHOW_HOWTO_KEY, String(show))
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this session.
  }
}

function canType(s: { phase: Phase; helpOpen: boolean }) {
  return s.phase === 'playing' && !s.helpOpen
}

function bestState(a: LetterState | undefined, b: LetterState): LetterState {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 }
  if (!a || rank[b] > rank[a]) return b
  return a
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  mode: 'classic',
  gameId: 0,
  answer: '',
  guesses: [],
  feedbacks: [],
  currentGuess: '',
  letterStates: {},
  shakeToken: 0,
  startedAt: null,
  finishedAt: null,
  score: null,
  helpOpen: false,
  showHowTo: loadShowHowTo(),

  startGame: (mode, opts) => {
    const showIntro = get().showHowTo && !opts?.skipHowTo
    set((s) => ({
      phase: showIntro ? 'howto' : 'playing',
      helpOpen: false,
      mode,
      gameId: s.gameId + 1,
      answer: pickRandomWord(ANSWERS),
      guesses: [],
      feedbacks: [],
      currentGuess: '',
      letterStates: {},
      shakeToken: 0,
      startedAt: showIntro ? null : Date.now(),
      finishedAt: null,
      score: null,
    }))
  },

  beginPlay: () => {
    if (get().phase !== 'howto') return
    set({ phase: 'playing', startedAt: Date.now() })
  },

  setHelpOpen: (open) => set({ helpOpen: open }),

  setShowHowTo: (show) => {
    saveShowHowTo(show)
    set({ showHowTo: show })
  },

  addLetter: (letter) => {
    const { currentGuess } = get()
    if (!canType(get())) return
    if (currentGuess.length >= WORD_LENGTH) return
    set({ currentGuess: currentGuess + letter.toLowerCase() })
  },

  removeLetter: () => {
    const { currentGuess } = get()
    if (!canType(get())) return
    set({ currentGuess: currentGuess.slice(0, -1) })
  },

  submitGuess: () => {
    const { currentGuess, answer, guesses, feedbacks, letterStates, mode, startedAt } = get()
    if (!canType(get())) return
    if (currentGuess.length !== WORD_LENGTH || !DICTIONARY.has(currentGuess)) {
      sfx.error()
      set((s) => ({ shakeToken: s.shakeToken + 1 }))
      return
    }

    sfx.flip()
    const feedback = computeFeedback(currentGuess, answer)
    const nextLetterStates = { ...letterStates }
    currentGuess.split('').forEach((letter, i) => {
      nextLetterStates[letter] = bestState(nextLetterStates[letter], feedback[i])
    })

    const nextGuesses = [...guesses, currentGuess]
    const nextFeedbacks = [...feedbacks, feedback]
    const won = currentGuess === answer
    const outOfGuesses = nextGuesses.length >= MAX_GUESSES

    if (won || outOfGuesses) {
      const finishedAt = Date.now()
      const elapsedSeconds = startedAt ? (finishedAt - startedAt) / 1000 : 0
      if (won) sfx.win()
      else sfx.lose()
      set({
        guesses: nextGuesses,
        feedbacks: nextFeedbacks,
        letterStates: nextLetterStates,
        currentGuess: '',
        phase: won ? 'won' : 'lost',
        finishedAt,
        score: mode === 'timer' && won ? computeScore(nextGuesses.length, elapsedSeconds) : null,
      })
    } else {
      set({
        guesses: nextGuesses,
        feedbacks: nextFeedbacks,
        letterStates: nextLetterStates,
        currentGuess: '',
      })
    }
  },

  playAgain: () => {
    get().startGame(get().mode, { skipHowTo: true })
  },

  goToMenu: () => {
    set({ phase: 'menu', helpOpen: false, answer: '', guesses: [], feedbacks: [], currentGuess: '', letterStates: {}, startedAt: null, finishedAt: null, score: null })
    useAppStore.getState().navigate('word-setup')
  },
}))
