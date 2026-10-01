import { useEffect } from 'react'
import { useGameStore } from '../../game/store'
import { COLORS } from '../../game/theme'
import { MAX_GUESSES, WORD_LENGTH, type LetterState } from '../../game/logic'

const EXAMPLE: { letter: string; state: LetterState }[] = [
  { letter: 'S', state: 'correct' },
  { letter: 'T', state: 'absent' },
  { letter: 'O', state: 'present' },
  { letter: 'N', state: 'absent' },
  { letter: 'E', state: 'absent' },
]

function Tile({ letter, state }: { letter: string; state: LetterState }) {
  return (
    <span className="howto-tile" style={{ background: COLORS[state] }}>
      {letter}
    </span>
  )
}

export function HowToPlay() {
  const phase = useGameStore((s) => s.phase)
  const mode = useGameStore((s) => s.mode)
  const helpOpen = useGameStore((s) => s.helpOpen)
  const showHowTo = useGameStore((s) => s.showHowTo)
  const beginPlay = useGameStore((s) => s.beginPlay)
  const setHelpOpen = useGameStore((s) => s.setHelpOpen)
  const setShowHowTo = useGameStore((s) => s.setShowHowTo)

  const isIntro = phase === 'howto'
  const open = isIntro || helpOpen
  const close = isIntro ? beginPlay : () => setHelpOpen(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      // Capture phase + stopImmediatePropagation so the game's Enter handler can't also submit a guess.
      e.stopImmediatePropagation()
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, close])

  if (!open) return null

  return (
    <div className="overlay howto-overlay">
      <div className="howto-card" role="dialog" aria-modal="true" aria-labelledby="howto-title">
        <h2 id="howto-title">HOW TO PLAY</h2>
        <p className="howto-lead">
          Find the hidden {WORD_LENGTH}-letter word in {MAX_GUESSES} guesses. Every guess must be a real English word.
        </p>

        <div className="howto-example">
          {EXAMPLE.map((t) => (
            <Tile key={t.letter} {...t} />
          ))}
        </div>
        <ul className="howto-legend">
          <li>
            <Tile letter="S" state="correct" />
            <span>
              <b>S</b> is in the word, in the right spot.
            </span>
          </li>
          <li>
            <Tile letter="O" state="present" />
            <span>
              <b>O</b> is in the word, but in a different spot.
            </span>
          </li>
          <li>
            <Tile letter="T" state="absent" />
            <span>
              <b>T</b>, <b>N</b>, <b>E</b> are not in the word. You can still type them again.
            </span>
          </li>
        </ul>

        <p className="howto-mode">
          {mode === 'timer' ? (
            <>
              <b>Timer mode:</b> {isIntro ? 'the clock starts when you close this.' : 'the clock keeps running.'} Solve
              in fewer guesses, and faster, for a higher score. The clock never ends the game.
            </>
          ) : (
            <>
              <b>Classic mode:</b> no clock. Take your time.
            </>
          )}
        </p>
        <p className="howto-keys">Type on your keyboard or click the 3D keys. Enter submits, Backspace deletes.</p>

        <div className="howto-footer">
          <label className="toggle">
            <input type="checkbox" checked={showHowTo} onChange={(e) => setShowHowTo(e.target.checked)} />
            <span className="toggle-track" aria-hidden="true">
              <span className="toggle-thumb" />
            </span>
            Show before each game
          </label>
          <button className="btn" onClick={close} autoFocus>
            {isIntro ? 'Start' : 'Back to game'}
          </button>
        </div>
      </div>
    </div>
  )
}
