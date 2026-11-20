import { useState } from 'react'
import wordCover from '../../assets/games/orbit-word-cover.webp'
import sudokuCover from '../../assets/games/sudoku-cover.webp'
import crosswordCover from '../../assets/games/crossword-cover.jpg'
import { useAppStore } from '../../app/store'
import { getInstallMode, usePwaStore } from '../../app/pwa'
import { Modal } from '../UI/Modal'

export function GameSelection() {
  const navigate = useAppStore(s => s.navigate)
  const online = usePwaStore(s => s.online)
  const standalone = usePwaStore(s => s.standalone)
  const deferredPrompt = usePwaStore(s => s.deferredPrompt)
  const iosSafari = usePwaStore(s => s.iosSafari)
  const promptInstall = usePwaStore(s => s.promptInstall)
  const [iosGuideOpen, setIosGuideOpen] = useState(false)

  const installMode = getInstallMode({
    isStandalone: standalone,
    hasDeferredPrompt: Boolean(deferredPrompt),
    isIosSafari: iosSafari,
  })

  return (
    <main className="selection-page game-selection">
      <header className="selection-heading">
        <p className="eyebrow">A LITTLE SPACE TO THINK</p>
        <h1 className="menu-title">GUESTWORLD</h1>
        <p className="menu-subtitle">Three worlds. One curious mind. Choose your next puzzle.</p>
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
        <button className="game-card" aria-labelledby="crossword-card-title" aria-describedby="crossword-card-description" onClick={() => navigate('crossword-setup')}>
          <img src={crosswordCover} width={1024} height={1024} alt="" decoding="async" />
          <span className="game-card-caption">
            <span className="game-card-title" id="crossword-card-title">Crossword <span aria-hidden="true">↗</span></span>
            <span id="crossword-card-description">Weave words together, one clue at a time.</span>
            <span className="game-card-meta">WORD GRID <span>3 SIZES · EN/TH</span></span>
          </span>
        </button>
      </div>
      <footer className="selection-footer">
        <span>Take your time. Find your orbit.</span>
        <span className="selection-footer-meta">
          {!online && (
            <span className="pwa-offline-pill" role="status">
              <span className="pwa-offline-dot" aria-hidden="true" />
              Offline
            </span>
          )}
          {installMode !== 'hidden' && (
            <button
              type="button"
              className="pwa-install-btn"
              onClick={() => {
                if (installMode === 'prompt') void promptInstall()
                else setIosGuideOpen(true)
              }}
            >
              Install App
            </button>
          )}
          <span>v{__APP_VERSION__}</span>
        </span>
      </footer>
      {iosGuideOpen && (
        <Modal titleId="ios-install-title" onClose={() => setIosGuideOpen(false)}>
          <div className="howto-card ios-install-card">
            <p className="eyebrow">INSTALL ON IPHONE / IPAD</p>
            <h2 id="ios-install-title">Add to Home Screen</h2>
            <ol className="ios-install-steps">
              <li>
                Tap the <b>Share</b> button in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and choose <b>Add to Home Screen</b>.
              </li>
              <li>
                Tap <b>Add</b> — all three games play offline anytime.
              </li>
            </ol>
            <div className="end-actions">
              <button
                type="button"
                className="btn"
                data-initial-focus
                onClick={() => setIosGuideOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
