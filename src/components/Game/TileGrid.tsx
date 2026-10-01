import { useGameStore } from '../../game/store'
import { MAX_GUESSES, WORD_LENGTH } from '../../game/logic'
import { Cube, type CellStatus } from './Cube'

const SPACING = 0.95
const ROW_SPACING = 0.95

export function TileGrid() {
  const guesses = useGameStore((s) => s.guesses)
  const feedbacks = useGameStore((s) => s.feedbacks)
  const currentGuess = useGameStore((s) => s.currentGuess)
  const shakeToken = useGameStore((s) => s.shakeToken)

  const activeRow = guesses.length

  const gridWidth = (WORD_LENGTH - 1) * SPACING
  const gridHeight = (MAX_GUESSES - 1) * ROW_SPACING

  const rows = []
  for (let row = 0; row < MAX_GUESSES; row++) {
    for (let col = 0; col < WORD_LENGTH; col++) {
      let letter = ''
      let status: CellStatus = 'empty'

      if (row < guesses.length) {
        letter = guesses[row][col]
        status = feedbacks[row][col]
      } else if (row === activeRow) {
        letter = currentGuess[col] ?? ''
        status = letter ? 'filled' : 'empty'
      }

      const x = col * SPACING - gridWidth / 2
      const y = gridHeight / 2 - row * ROW_SPACING

      rows.push(
        <Cube
          key={`${row}-${col}`}
          letter={letter}
          status={status}
          position={[x, y, 0]}
          delay={col * 0.15}
          shakeToken={row === activeRow ? shakeToken : undefined}
        />,
      )
    }
  }

  return <group position={[0, 1.15, 0]}>{rows}</group>
}
