import { useState } from 'react'
import { useAppStore } from '../../app/store'
import { SelectionCard } from '../../components/Menu/SelectionCard'
import { Modal } from '../../components/UI/Modal'
import { formatTime } from './SudokuGame'
import { useSudokuStore } from './store'
import { DIFFICULTIES, type Difficulty } from './types'

export function SudokuSetup() {
  const navigate = useAppStore(s => s.navigate)
  const savedSummary = useSudokuStore(s => s.savedSummary)
  const start = useSudokuStore(s => s.start)
  const resume = useSudokuStore(s => s.resume)
  const discardSaved = useSudokuStore(s => s.discardSaved)
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null)

  const savedDifficultyInfo = savedSummary
    ? DIFFICULTIES.find(d => d.id === savedSummary.difficulty)
    : null

  const chooseDifficulty = (difficulty: Difficulty) => {
    if (savedSummary) {
      setPendingDifficulty(difficulty)
      return
    }
    start(difficulty)
    navigate('sudoku')
  }

  const confirmNewPuzzle = () => {
    if (!pendingDifficulty) return
    const difficulty = pendingDifficulty
    setPendingDifficulty(null)
    start(difficulty)
    navigate('sudoku')
  }

  return (
    <main className="selection-page setup-page">
      <button className="back-link" onClick={() => navigate('games')}>
        ← Back to games
      </button>
      <header className="selection-heading">
        <p className="eyebrow">NINE DIGITS. A WORLD OF POSSIBILITIES.</p>
        <h1 className="menu-title">SUDOKU</h1>
        <p className="menu-subtitle">Find your rhythm. Choose a challenge.</p>
      </header>

      {savedSummary && savedDifficultyInfo && (
        <section className="resume-banner" aria-label="Saved sudoku puzzle">
          <div className="resume-banner-info">
            <span className="eyebrow">IN PROGRESS</span>
            <p className="resume-banner-title">
              {savedDifficultyInfo.title} · {savedSummary.filledCount}/81 filled ·{' '}
              {formatTime(savedSummary.elapsedMs)}
            </p>
          </div>
          <div className="resume-banner-actions">
            <button
              className="btn"
              onClick={() => {
                if (resume()) navigate('sudoku')
              }}
            >
              Resume puzzle
            </button>
            <button className="btn secondary" onClick={discardSaved}>
              Discard
            </button>
          </div>
        </section>
      )}

      <div className="mode-buttons difficulty-cards">
        {DIFFICULTIES.map((d, i) => (
          <SelectionCard
            key={d.id}
            title={d.title}
            description={d.description}
            index={`0${i + 1}`}
            onClick={() => chooseDifficulty(d.id)}
          />
        ))}
      </div>
      <p className="setup-footnote">
        9×9 grid · Unlimited corrections · Notes and hints · Progress saves automatically
      </p>

      {pendingDifficulty && savedDifficultyInfo && (
        <Modal titleId="replace-sudoku-title" onClose={() => setPendingDifficulty(null)}>
          <div className="howto-card leave-card">
            <p className="eyebrow">SAVED PUZZLE FOUND</p>
            <h2 id="replace-sudoku-title">Start a new puzzle?</h2>
            <p>Your in-progress {savedDifficultyInfo.title} puzzle will be replaced.</p>
            <div className="end-actions">
              <button className="btn" data-initial-focus onClick={() => setPendingDifficulty(null)}>
                Keep saved
              </button>
              <button className="btn secondary" onClick={confirmNewPuzzle}>
                Start new puzzle
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
