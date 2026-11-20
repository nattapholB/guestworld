import { useState } from 'react'
import { useAppStore } from '../../app/store'
import { SelectionCard } from '../../components/Menu/SelectionCard'
import { Modal } from '../../components/UI/Modal'
import { formatTime } from '../sudoku/SudokuGame'
import { useCrosswordStore } from './store'
import { TIERS, type CrosswordTier } from './types'

export function CrosswordSetup() {
  const navigate = useAppStore(s => s.navigate)
  const savedSummary = useCrosswordStore(s => s.savedSummary)
  const start = useCrosswordStore(s => s.start)
  const resume = useCrosswordStore(s => s.resume)
  const discardSaved = useCrosswordStore(s => s.discardSaved)
  const [pendingTier, setPendingTier] = useState<CrosswordTier | null>(null)

  const savedTierInfo = savedSummary ? TIERS.find(t => t.id === savedSummary.tier) : null

  const chooseTier = (tier: CrosswordTier) => {
    if (savedSummary) {
      setPendingTier(tier)
      return
    }
    start(tier)
    navigate('crossword')
  }

  const confirmNewPuzzle = () => {
    if (!pendingTier) return
    const tier = pendingTier
    setPendingTier(null)
    start(tier)
    navigate('crossword')
  }

  return (
    <main className="selection-page setup-page">
      <button className="back-link" onClick={() => navigate('games')}>
        ← Back to games
      </button>
      <header className="selection-heading">
        <p className="eyebrow">INTERSECTING CLUES. ONE CLEAR GRID.</p>
        <h1 className="menu-title">CROSSWORD</h1>
        <p className="menu-subtitle">Follow the clues. Choose your board size.</p>
      </header>

      {savedSummary && savedTierInfo && (
        <section className="resume-banner" aria-label="Saved crossword">
          <div className="resume-banner-info">
            <span className="eyebrow">IN PROGRESS</span>
            <p className="resume-banner-title">
              {savedTierInfo.title} ({savedSummary.size}×{savedSummary.size}) ·{' '}
              {savedSummary.filledCount}/{savedSummary.totalCount} filled ·{' '}
              {formatTime(savedSummary.elapsedMs)}
            </p>
          </div>
          <div className="resume-banner-actions">
            <button
              className="btn"
              onClick={() => {
                if (resume()) navigate('crossword')
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
        {TIERS.map((tier, i) => (
          <SelectionCard
            key={tier.id}
            title={`${tier.title} · ${tier.size}×${tier.size}`}
            description={tier.description}
            index={`0${i + 1}`}
            onClick={() => chooseTier(tier.id)}
          />
        ))}
      </div>
      <p className="setup-footnote">
        4–7 letter words · Toggle EN / ไทย clues anytime · Progress saves automatically
      </p>

      {pendingTier && savedTierInfo && (
        <Modal titleId="replace-crossword-title" onClose={() => setPendingTier(null)}>
          <div className="howto-card leave-card">
            <p className="eyebrow">SAVED PUZZLE FOUND</p>
            <h2 id="replace-crossword-title">Start a new puzzle?</h2>
            <p>Your in-progress {savedTierInfo.title} puzzle will be replaced.</p>
            <div className="end-actions">
              <button className="btn" data-initial-focus onClick={() => setPendingTier(null)}>
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
