import { useGameStore } from '../../game/store'
import { DEFINITIONS } from '../../game/definitions'

export function EndOverlay() {
  const phase = useGameStore((s) => s.phase)
  const mode = useGameStore((s) => s.mode)
  const answer = useGameStore((s) => s.answer)
  const guessesUsed = useGameStore((s) => s.guesses.length)
  const score = useGameStore((s) => s.score)
  const startedAt = useGameStore((s) => s.startedAt)
  const finishedAt = useGameStore((s) => s.finishedAt)
  const playAgain = useGameStore((s) => s.playAgain)
  const goToMenu = useGameStore((s) => s.goToMenu)

  if (phase !== 'won' && phase !== 'lost') return null

  const elapsed = startedAt && finishedAt ? (finishedAt - startedAt) / 1000 : 0
  const meaning = DEFINITIONS[answer]

  return (
    <div className="overlay end-overlay">
      <div className={`end-card ${phase === 'won' ? 'win' : 'lose'}`}>
        <h2>{phase === 'won' ? 'SOLVED' : 'OUT OF GUESSES'}</h2>
        {phase === 'lost' && <p>The word was {answer.toUpperCase()}</p>}
        {meaning && (
          <p className="end-meaning">
            <span className="end-meaning-word">{answer.toUpperCase()}</span>
            <span className="end-meaning-pos">{meaning.pos}</span>
            <span className="end-meaning-def">{meaning.def}</span>
          </p>
        )}
        <div className="end-stats">
          <span>Guesses <b>{guessesUsed}</b></span>
          {mode === 'timer' && <span>Time <b>{elapsed.toFixed(1)}s</b></span>}
          {mode === 'timer' && score !== null && <span>Score <b>{score}</b></span>}
        </div>
        <div className="end-actions">
          <button className="btn" onClick={playAgain}>
            Play Again
          </button>
          <button className="btn secondary" onClick={goToMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
