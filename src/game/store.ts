import { create } from 'zustand'
import { ANSWERS, DICTIONARY } from './words'
import { computeFeedback, pickRandomWord, MAX_GUESSES, WORD_LENGTH, type LetterState } from './logic'
import { computeScore } from './scoring'
import { sfx } from '../audio/sfx'

export type Phase = 'menu' | 'playing' | 'won' | 'lost'
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

  startGame: (mode: Mode) => void
  addLetter: (letter: string) => void
  removeLetter: () => void
  submitGuess: () => void
  playAgain: () => void
  goToMenu: () => void
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

  startGame: (mode) => {
    set((s) => ({
      phase: 'playing',
      mode,
      gameId: s.gameId + 1,
      answer: pickRandomWord(ANSWERS),
      guesses: [],
      feedbacks: [],
      currentGuess: '',
      letterStates: {},
      shakeToken: 0,
      startedAt: Date.now(),
      finishedAt: null,
      score: null,
    }))
  },

  addLetter: (letter) => {
    const { phase, currentGuess } = get()
    if (phase !== 'playing') return
    if (currentGuess.length >= WORD_LENGTH) return
    set({ currentGuess: currentGuess + letter.toLowerCase() })
  },

  removeLetter: () => {
    const { phase, currentGuess } = get()
    if (phase !== 'playing') return
    set({ currentGuess: currentGuess.slice(0, -1) })
  },

  submitGuess: () => {
    const { phase, currentGuess, answer, guesses, feedbacks, letterStates, mode, startedAt } = get()
    if (phase !== 'playing') return
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
    get().startGame(get().mode)
  },

  goToMenu: () => {
    set({ phase: 'menu' })
  },
}))
