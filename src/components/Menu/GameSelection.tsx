import wordCover from '../../assets/games/orbit-word-cover.webp'
import sudokuCover from '../../assets/games/sudoku-cover.webp'
import { useAppStore } from '../../app/store'

export function GameSelection() {
  const navigate = useAppStore(s => s.navigate)
  return (
    <main className="selection-page game-selection">
      <header className="selection-heading">
        <p className="eyebrow">A LITTLE SPACE TO THINK</p>
        <h1 className="menu-title">GUESTWORLD</h1>
        <p className="menu-subtitle">Two worlds. One curious mind. Choose your next puzzle.</p>
      </header>
      <div className="game-cards">
        <button className="game-card" aria-labelledby="word-card-title" aria-describedby="word-card-description" onClick={() => navigate('word-setup')}>
          <img src={wordCover} width={1254} height={1254} alt="" decoding="async" />
          <span className="game-card-caption">
            <span className="game-card-title" id="word-card-title">Orbit Word <span aria-hidden="true">↗</span></span>
            <span id="word-card-description">Guess the hidden word in five tries.</span>
            <span className="game-card-meta">WORD PUZZLE <span>CLASSIC · TIMER</span></span>
          </span>
        </button>
        <button className="game-card" aria-labelledby="sudoku-card-title" aria-describedby="sudoku-card-description" onClick={() => navigate('sudoku-setup')}>
          <img src={sudokuCover} width={1254} height={1254} alt="" decoding="async" />
          <span className="game-card-caption">
            <span className="game-card-title" id="sudoku-card-title">Sudoku <span aria-hidden="true">↗</span></span>
            <span id="sudoku-card-description">Fill the grid, one deduction at a time.</span>
            <span className="game-card-meta">NUMBER PUZZLE <span>3 DIFFICULTIES</span></span>
          </span>
        </button>
      </div>
      <footer className="selection-footer"><span>Take your time. Find your orbit.</span><span>v{__APP_VERSION__}</span></footer>
    </main>
  )
}
