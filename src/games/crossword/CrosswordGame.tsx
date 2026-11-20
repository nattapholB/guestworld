import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useAppStore } from '../../app/store'
import { Modal } from '../../components/UI/Modal'
import { formatTime } from '../sudoku/SudokuGame'
import { getCellClues, getClueAtCell, isClueFilled } from './logic'
import { elapsedAt, useCrosswordStore } from './store'
import { TIERS, type ClueEntry, type Direction } from './types'

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

function CrosswordClock() {
  const elapsedMs = useCrosswordStore(s => s.elapsedMs)
  const runningSince = useCrosswordStore(s => s.runningSince)
  const [now, setNow] = useState(performance.now())
  useEffect(() => {
    if (runningSince === null) return
    setNow(performance.now())
    const timer = window.setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(timer)
  }, [runningSince])
  return (
    <span className="hud-value" data-testid="crossword-clock">
      {formatTime(elapsedAt({ elapsedMs, runningSince }, now))}
    </span>
  )
}

export function CrosswordGame() {
  const s = useCrosswordStore()
  const navigate = useAppStore(state => state.navigate)
  const boardRef = useRef<HTMLDivElement>(null)
  const activeClueRef = useRef<HTMLButtonElement>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)

  useEffect(() => {
    const onHide = () => s.flushSave()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') s.flushSave()
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [s])

  useEffect(() => {
    if (s.phase === 'playing' && s.dialog === 'none') {
      const target = boardRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')
      if (target && (!document.activeElement || document.activeElement === document.body || boardRef.current?.contains(document.activeElement))) {
        target.focus({ preventScroll: true })
      }
    }
  }, [s.phase, s.dialog, s.selected])

  const puzzle = s.puzzle
  const activeClue = useMemo(
    () => (puzzle && s.selected >= 0 ? getClueAtCell(puzzle, s.selected, s.direction) : null),
    [puzzle, s.selected, s.direction],
  )

  useEffect(() => {
    activeClueRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeClue?.number, activeClue?.direction])

  if (!puzzle) {
    return (
      <main className="selection-page setup-page">
        <p className="menu-subtitle">No active crossword puzzle.</p>
        <button className="btn" onClick={() => navigate('crossword-setup')}>
          Choose a crossword
        </button>
      </main>
    )
  }

  const tierInfo = TIERS.find(t => t.id === puzzle.tier) ?? TIERS[0]
  const done = s.phase === 'completed'
  const active = s.phase === 'playing' && s.dialog === 'none'
  const closeHelp = s.phase === 'intro' ? s.begin : s.closeHelp

  const activeCells = new Set(activeClue?.cells ?? [])
  const cellClues = s.selected >= 0 ? getCellClues(puzzle, s.selected) : {}
  const canFlipDirection = Boolean(cellClues.across && cellClues.down)

  let filledCount = 0
  let totalWhite = 0
  for (let i = 0; i < puzzle.layout.length; i++) {
    if (!puzzle.layout[i]) continue
    totalWhite++
    if (s.entries[i]) filledCount++
  }

  const canCheck = active && Boolean(activeClue && activeClue.cells.some(c => Boolean(s.entries[c])))
  const canErase =
    active &&
    s.selected >= 0 &&
    ((!s.revealed[s.selected] && Boolean(s.entries[s.selected])) ||
      Boolean(activeClue && activeClue.cells.some(c => !s.revealed[c] && Boolean(s.entries[c]))))
  const canHint = active && s.selected >= 0 && !s.revealed[s.selected]
  const canRevealWord = active && Boolean(activeClue && activeClue.cells.some(c => !s.revealed[c]))

  const focusCell = (cell: number) => {
    window.requestAnimationFrame(() => {
      boardRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${cell}"]`)?.focus({ preventScroll: true })
    })
  }

  const handleClueClick = (clue: ClueEntry) => {
    s.selectClue(clue.number, clue.direction)
    const target =
      clue.cells.find(c => !s.revealed[c] && !s.entries[c]) ??
      clue.cells.find(c => !s.revealed[c]) ??
      clue.cells[0]
    focusCell(target)
  }

  const handleKey = (e: KeyboardEvent) => {
    if (!active || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return
    const target = e.target as HTMLElement
    if (target.closest('dialog, input, textarea, select')) return

    const isGridCell = Boolean(target.closest('[data-cell]'))
    const isOtherButton = Boolean(target.closest('button:not([data-cell])'))

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!isGridCell) return
      e.preventDefault()
      s.moveArrow(e.key)
      return
    }

    if (e.key === ' ') {
      if (isOtherButton) return
      e.preventDefault()
      s.toggleDirection()
      return
    }

    if (e.key === 'Enter') {
      if (isOtherButton) return
      e.preventDefault()
      s.stepClue(e.shiftKey ? -1 : 1)
      return
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      if (isOtherButton && !target.closest('[data-cw-key], [data-clue-item]')) return
      e.preventDefault()
      s.typeLetter(e.key)
      return
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (isOtherButton && !target.closest('[data-cw-key], [data-clue-item]')) return
      e.preventDefault()
      s.erase(e.key === 'Backspace')
    }
  }

  const leaveToGames = () => {
    s.saveAndLeave()
    navigate('games')
  }

  const renderClueGroup = (title: string, dir: Direction, clues: ClueEntry[]) => (
    <div className="cw-clue-group">
      <h3 className="eyebrow">{title}</h3>
      <ul className="cw-clue-list">
        {clues.map(clue => {
          const isCurrent =
            activeClue?.number === clue.number && activeClue?.direction === clue.direction
          const filled = isClueFilled(clue, s.entries)
          const text = s.clueLang === 'th' ? clue.th : clue.en
          return (
            <li key={`${dir}-${clue.number}`}>
              <button
                ref={isCurrent ? activeClueRef : undefined}
                type="button"
                data-clue-item={`${dir}-${clue.number}`}
                aria-current={isCurrent ? 'true' : undefined}
                disabled={done}
                onClick={() => handleClueClick(clue)}
                className={`cw-clue-btn${isCurrent ? ' active' : ''}${filled ? ' filled' : ''}`}
              >
                <span className="cw-clue-num">{clue.number}</span>
                <span className="cw-clue-text">{text}</span>
                <span className="cw-clue-len">({clue.length})</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <main className="sudoku-page crossword-page" onKeyDown={handleKey}>
      <header className="sudoku-header">
        <div>
          <p className="eyebrow">GUESTWORLD / WORD GRID</p>
          <h1>CROSSWORD</h1>
        </div>
        <div className="hud-bar sudoku-hud">
          <div className="hud-item">
            <span className="hud-label">Size</span>
            <span className="hud-value">{tierInfo.title}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Time</span>
            <CrosswordClock />
          </div>
          {!done && (
            <button className="hud-menu-link" onClick={s.openHelp}>
              How to play
            </button>
          )}
          <button
            className="hud-menu-link"
            onClick={() => {
              if (done) {
                s.discard()
                navigate('games')
              } else {
                leaveToGames()
              }
            }}
          >
            Games
          </button>
        </div>
      </header>

      <div className="sudoku-layout crossword-layout">
        <section className="sudoku-board-section" aria-label="Crossword puzzle">
          <div className="board-caption">
            <span>{done ? 'Every intersection complete.' : 'Weave the words together.'}</span>
            <span>
              {filledCount} / {totalWhite} filled
            </span>
          </div>

          <div className="crossword-active-clue" aria-label="Active clue">
            <div className="cw-active-top">
              <div className="cw-active-nav">
                <button
                  type="button"
                  className="cw-step-btn"
                  disabled={!active}
                  onClick={() => s.stepClue(-1)}
                  aria-label="Previous clue"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="cw-dir-badge"
                  disabled={!active || !canFlipDirection}
                  onClick={s.toggleDirection}
                  title={canFlipDirection ? 'Flip Across / Down (Space)' : undefined}
                >
                  {activeClue ? `${activeClue.number} ${activeClue.direction.toUpperCase()}` : 'CLUE'}
                  {canFlipDirection && <span aria-hidden="true"> ⇄</span>}
                </button>
                <button
                  type="button"
                  className="cw-step-btn"
                  disabled={!active}
                  onClick={() => s.stepClue(1)}
                  aria-label="Next clue"
                >
                  ›
                </button>
              </div>
              <div className="cw-lang-toggle" role="group" aria-label="Clue language">
                <button
                  type="button"
                  className={`cw-lang-btn${s.clueLang === 'en' ? ' active' : ''}`}
                  aria-pressed={s.clueLang === 'en'}
                  onClick={() => s.setClueLang('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`cw-lang-btn${s.clueLang === 'th' ? ' active' : ''}`}
                  aria-pressed={s.clueLang === 'th'}
                  onClick={() => s.setClueLang('th')}
                >
                  ไทย
                </button>
              </div>
            </div>
            <p className="cw-active-text" data-testid="active-clue-text">
              {activeClue
                ? `${s.clueLang === 'th' ? activeClue.th : activeClue.en} (${activeClue.length})`
                : 'Select a square to view its clue.'}
            </p>
          </div>

          <div
            ref={boardRef}
            className={`crossword-board${done ? ' is-complete' : ''}`}
            style={{ '--cw-size': puzzle.size } as CSSProperties}
            role="grid"
            aria-label={`${tierInfo.title} ${puzzle.size} by ${puzzle.size} crossword board`}
            aria-rowcount={puzzle.size}
            aria-colcount={puzzle.size}
          >
            {Array.from({ length: puzzle.size }, (_, row) => (
              <div role="row" key={row} className="crossword-row">
                {Array.from({ length: puzzle.size }, (_, col) => {
                  const cell = row * puzzle.size + col
                  const playable = puzzle.layout[cell]
                  if (!playable) {
                    return <div key={cell} className="cw-block" aria-hidden="true" />
                  }
                  const value = s.entries[cell]
                  const num = puzzle.cellNumbers[cell]
                  const selected = cell === s.selected
                  const inWord = activeCells.has(cell)
                  const isRevealed = s.revealed[cell]
                  const isError = s.checkedErrors[cell]
                  const description = `Row ${row + 1}, column ${col + 1}${num ? `, clue ${num}` : ''}, ${
                    value ? `${value}${isRevealed ? ', revealed' : ''}` : 'empty'
                  }${isError ? ', incorrect' : ''}`
                  return (
                    <button
                      key={cell}
                      type="button"
                      role="gridcell"
                      data-cell={cell}
                      aria-label={description}
                      aria-selected={selected}
                      aria-readonly={isRevealed || done}
                      aria-rowindex={row + 1}
                      aria-colindex={col + 1}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => s.selectCell(cell)}
                      className={`cw-cell${inWord ? ' in-word' : ''}${selected ? ' selected' : ''}${
                        isRevealed ? ' revealed' : ''
                      }${isError ? ' conflict' : ''}`}
                    >
                      {num !== null && (
                        <span className="cw-num" aria-hidden="true">
                          {num}
                        </span>
                      )}
                      <span className="cw-letter">{value}</span>
                      {isError && (
                        <span className="conflict-mark" aria-hidden="true">
                          !
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <p className={`board-status${s.lastCheckMessage ? ' has-notice' : ''}`}>
            {done
              ? 'Every word across and down is complete.'
              : s.lastCheckMessage || 'Type A–Z or use Check to inspect the active word.'}
          </p>

          {!done && (
            <div
              className={`crossword-keyboard${showKeyboard ? ' is-open' : ''}`}
              aria-label="On-screen keyboard"
            >
              {QWERTY_ROWS.map((rowKeys, rowIdx) => (
                <div key={rowIdx} className="cw-key-row">
                  {rowIdx === 2 && (
                    <button
                      type="button"
                      data-cw-key="flip"
                      className="digit-key cw-key cw-key-wide"
                      disabled={!active || !canFlipDirection}
                      onClick={s.toggleDirection}
                      aria-label="Flip Across or Down"
                    >
                      ⇄
                    </button>
                  )}
                  {rowKeys.map(letter => (
                    <button
                      key={letter}
                      type="button"
                      data-cw-key={letter}
                      className="digit-key cw-key"
                      disabled={!active}
                      onClick={() => s.typeLetter(letter)}
                    >
                      {letter}
                    </button>
                  ))}
                  {rowIdx === 2 && (
                    <button
                      type="button"
                      data-cw-key="back"
                      className="digit-key cw-key cw-key-wide"
                      disabled={!canErase}
                      onClick={() => s.erase(true)}
                      aria-label="Erase letter"
                    >
                      ⌫
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="sudoku-controls crossword-controls" aria-label="Crossword clues and tools">
          {done ? (
            <section className="sudoku-result end-card win" aria-labelledby="crossword-result-title">
              <span className="solved-star" aria-hidden="true">
                ✦
              </span>
              <p className="eyebrow">NICELY WOVEN</p>
              <h2 id="crossword-result-title">SOLVED</h2>
              <p>Every clue answered. Every intersection aligned.</p>
              <dl className="sudoku-result-stats">
                <div>
                  <dt>Size</dt>
                  <dd>
                    {tierInfo.title} ({puzzle.size}×{puzzle.size})
                  </dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{formatTime(s.elapsedMs)}</dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{s.hintsUsed}</dd>
                </div>
              </dl>
              <button className="btn" onClick={() => s.start(s.tier, true)}>
                Play Again
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  s.discard()
                  navigate('crossword-setup')
                }}
              >
                Change size
              </button>
              <button
                className="hud-menu-link"
                onClick={() => {
                  s.discard()
                  navigate('games')
                }}
              >
                Back to games
              </button>
            </section>
          ) : (
            <>
              <div className="control-heading cw-control-heading">
                <span className="eyebrow">YOUR NEXT CLUE</span>
                <div className="cw-heading-right">
                  <span className="hint-count">
                    Hints used <b>{s.hintsUsed}</b>
                  </span>
                  <button
                    type="button"
                    className={`cw-kbd-toggle${showKeyboard ? ' active' : ''}`}
                    aria-pressed={showKeyboard}
                    onClick={() => setShowKeyboard(v => !v)}
                  >
                    ⌨ Keys
                  </button>
                </div>
              </div>

              <div className="sudoku-tools">
                <button
                  type="button"
                  className="tool-button"
                  disabled={!canCheck}
                  onClick={s.checkWord}
                  title="Check the active word for mistakes."
                >
                  <span aria-hidden="true">✓</span>Check
                </button>
                <button
                  type="button"
                  className="tool-button"
                  disabled={!canErase}
                  onClick={() => s.erase(true)}
                  title="Erase the selected letter."
                >
                  <span aria-hidden="true">⌫</span>Erase
                </button>
                <button
                  type="button"
                  className="tool-button"
                  disabled={!canHint}
                  onClick={s.hintCell}
                  title="Reveal the selected square. Counts as one hint."
                >
                  <span aria-hidden="true">✦</span>Hint
                </button>
                <button
                  type="button"
                  className="tool-button"
                  disabled={!canRevealWord}
                  onClick={s.revealWord}
                  title="Reveal the entire active word."
                >
                  <span aria-hidden="true">★</span>Word
                </button>
              </div>

              <div className="crossword-clues" aria-label="Puzzle clues">
                {renderClueGroup('ACROSS', 'across', puzzle.clues.across)}
                {renderClueGroup('DOWN', 'down', puzzle.clues.down)}
              </div>

              <p className="keyboard-guide">
                Type A–Z · Space flips Across/Down
                <br />
                Arrows move · Enter next clue
              </p>
            </>
          )}
        </aside>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {s.announcement}
      </div>

      {(s.phase === 'intro' || s.dialog === 'help') && (
        <Modal titleId="crossword-help-title" onClose={closeHelp}>
          <div className="howto-card sudoku-help">
            <p className="eyebrow">A LITTLE GUIDANCE</p>
            <h2 id="crossword-help-title">HOW TO PLAY</h2>
            <p className="howto-lead">
              Fill every white square with familiar <b>4–7 letter</b> English words so Across and Down clues intersect cleanly.
            </p>
            <div className="howto-example" aria-hidden="true">
              {['O', 'R', 'B', 'I', 'T'].map((ch, idx) => (
                <span
                  key={ch}
                  className="howto-tile"
                  style={{
                    background: idx === 0 ? '#254b68' : '#17213a',
                    border: idx === 0 ? '2px solid #7cd3ff' : '1px solid rgba(124,211,255,.35)',
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>
            <ul className="sudoku-help-list">
              <li>
                <b>Select a clue or square</b>, then type letters. Click a cell again or press <b>Space</b> to switch Across and Down.
              </li>
              <li>
                <b>Bilingual clues:</b> toggle <b>EN / ไทย</b> anytime in the clue bar for Thai hints.
              </li>
              <li>
                <b>Check, Hint & Word:</b> Check highlights wrong letters in the active word; Hint and Word reveal locked letters and count toward Hints used.
              </li>
              <li>
                <b>Unlimited edits:</b> your unfinished puzzle saves automatically in this browser until solved or replaced.
              </li>
            </ul>
            <p className="howto-mode">
              {s.phase === 'intro' ? 'The clock starts when you begin.' : 'The clock is paused while you read.'}
            </p>
            <div className="howto-footer">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={s.showHowTo}
                  onChange={e => s.setShowHowTo(e.target.checked)}
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
                Show before each puzzle
              </label>
              <button className="btn" data-initial-focus onClick={closeHelp}>
                {s.phase === 'intro' ? 'Start puzzle' : 'Back to game'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
