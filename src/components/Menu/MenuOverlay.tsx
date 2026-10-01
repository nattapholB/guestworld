import { useGameStore } from '../../game/store'

export function MenuOverlay() {
  const startGame = useGameStore((s) => s.startGame)

  return (
    <div className="overlay menu">
      <h1 className="menu-title">ORBIT WORD</h1>
      <p className="menu-subtitle">Guess the 5-letter word in 5 tries — drifting somewhere in deep space.</p>
      <div className="mode-buttons">
        <button className="mode-card" onClick={() => startGame('classic')}>
          <h3>CLASSIC</h3>
          <p>No clock. Take your time and think through every guess.</p>
        </button>
        <button className="mode-card" onClick={() => startGame('timer')}>
          <h3>TIMER</h3>
          <p>Same 5 guesses, but speed earns you a bonus score.</p>
        </button>
      </div>
      <span className="app-version">v{__APP_VERSION__}</span>
    </div>
  )
}
