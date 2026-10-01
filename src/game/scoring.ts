import { MAX_GUESSES } from './logic'

const BASE_PER_SLOT_SAVED = 200
const SPEED_BONUS_MAX = 500
const SPEED_DECAY_PER_SECOND = 10

/**
 * Rewards accuracy (fewer guesses used) and speed (less elapsed time),
 * so a fast-but-wasteful guesser doesn't automatically beat a careful one.
 */
export function computeScore(guessesUsed: number, elapsedSeconds: number): number {
  const slotsSaved = MAX_GUESSES - guessesUsed + 1
  const base = slotsSaved * BASE_PER_SLOT_SAVED
  const speedBonus = Math.max(0, SPEED_BONUS_MAX - elapsedSeconds * SPEED_DECAY_PER_SECOND)
  return Math.round(base + speedBonus)
}
