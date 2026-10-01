export type LetterState = 'correct' | 'present' | 'absent'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 5

export function pickRandomWord(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * Wordle-style two-pass scoring so duplicate letters resolve correctly:
 * exact matches are claimed first, then remaining letters are matched
 * against whatever counts are left in the answer.
 */
export function computeFeedback(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = new Array(WORD_LENGTH).fill('absent')
  const answerLetters = answer.split('')
  const remaining: Record<string, number> = {}

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answerLetters[i]) {
      result[i] = 'correct'
    } else {
      remaining[answerLetters[i]] = (remaining[answerLetters[i]] ?? 0) + 1
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue
    const letter = guess[i]
    if (remaining[letter] > 0) {
      result[i] = 'present'
      remaining[letter] -= 1
    }
  }

  return result
}
