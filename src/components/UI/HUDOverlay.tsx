import { useEffect, useState } from 'react'
import { useGameStore } from '../../game/store'
import { MAX_GUESSES } from '../../game/logic'

export function HUDOverlay() {
  const mode = useGameStore((s) => s.mode)
  const phase = useGameStore((s) => s.phase)
  const guessesUsed = useGameStore((s) => s.guesses.length)
  const startedAt = useGameStore((s) => s.startedAt)
  const finishedAt = useGameStore((s) => s.finishedAt)
  const goToMenu = useGameStore((s) => s.goToMenu)
  const setHelpOpen = useGameStore((s) => s.setHelpOpen)

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (phase !== 'playing' || mode !== 'timer') return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [phase, mode])

  const elapsed = startedAt ? Math.max(0, (finishedAt ?? now) - startedAt) / 1000 : 0

  return (
    <div className="overlay hud">
      <div className="hud-bar">
        <div className="hud-item">
          <span className="hud-label">Guess</span>
          <span className="hud-value">
            {Math.min(guessesUsed + (phase === 'playing' ? 1 : 0), MAX_GUESSES)}/{MAX_GUESSES}
          </span>
        </div>
        {mode === 'timer' && (
          <div className="hud-item">
            <span className="hud-label">Time</span>
            <span className="hud-value">{elapsed.toFixed(1)}s</span>
          </div>
        )}
        {phase === 'playing' && (
          <button className="hud-menu-link" onClick={() => setHelpOpen(true)}>
            How to play
          </button>
        )}
        <button className="hud-menu-link" onClick={goToMenu}>
          Modes
        </button>
      </div>
    </div>
  )
}
