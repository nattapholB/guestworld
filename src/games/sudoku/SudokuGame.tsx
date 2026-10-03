import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useAppStore } from '../../app/store'
import { Modal } from '../../components/UI/Modal'
import { conflicts, DIGITS, maskDigits, PEERS } from './logic'
import { elapsedAt, useSudokuStore } from './store'
import { DIFFICULTIES } from './types'

export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function SudokuClock() {
  const elapsedMs = useSudokuStore(s => s.elapsedMs)
  const runningSince = useSudokuStore(s => s.runningSince)
  const [now, setNow] = useState(performance.now())
  useEffect(() => {
    if (runningSince === null) return
    setNow(performance.now())
    const timer = window.setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(timer)
  }, [runningSince])
  return <span className="hud-value" data-testid="sudoku-clock">{formatTime(elapsedAt({ elapsedMs, runningSince }, now))}</span>
}

export function SudokuGame() {
  const s = useSudokuStore()
  const navigate = useAppStore(state => state.navigate)
  const boardRef = useRef<HTMLDivElement>(null)
  const duplicateCells = useMemo(() => conflicts(s.entries), [s.entries])
  const level = DIFFICULTIES.find(d => d.id === s.difficulty)!
  const done = s.phase === 'completed'
  const active = s.phase === 'playing' && s.dialog === 'none'
  const given = s.selected >= 0 && !!s.puzzle?.givens[s.selected]
  const filled = s.entries.filter(Boolean).length
  const selectedDigit = s.entries[s.selected]
  const canHint = active && !given && s.selected >= 0 && selectedDigit !== s.puzzle?.solution[s.selected]
  const closeHelp = s.phase === 'intro' ? s.begin : s.closeDialog
  const leave = () => { s.discard(); navigate('games') }

  useEffect(() => {
    if (s.phase === 'playing' && s.dialog === 'none') {
      const target = boardRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')
      target?.focus({ preventScroll: true })
    }
  }, [s.phase])

  const handleKey = (e: KeyboardEvent) => {
    if (!active || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return
    const target = e.target as HTMLElement
    if (target.closest('dialog, input, textarea, select')) return
    if (!target.closest('[data-cell], [data-digit]')) return
    const offsets: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
    if (e.key in offsets) {
      e.preventDefault()
      let next = s.selected + offsets[e.key]
      if ((e.key === 'ArrowLeft' && s.selected % 9 === 0) || (e.key === 'ArrowRight' && s.selected % 9 === 8)) next = s.selected
      next = Math.max(0, Math.min(80, next))
      s.select(next)
      boardRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus()
    } else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); s.enter(Number(e.key)) }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); s.erase() }
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); s.toggleNotes() }
  }

  return <main className="sudoku-page" onKeyDown={handleKey}>
    <header className="sudoku-header">
      <div><p className="eyebrow">GUESTWORLD / NUMBER PUZZLE</p><h1>SUDOKU</h1></div>
      <div className="hud-bar sudoku-hud">
        <div className="hud-item"><span className="hud-label">Level</span><span className="hud-value">{level.title}</span></div>
        <div className="hud-item"><span className="hud-label">Time</span><SudokuClock /></div>
        {!done && <button className="hud-menu-link" onClick={() => s.openDialog('help')}>How to play</button>}
        <button className="hud-menu-link" onClick={() => done ? leave() : s.openDialog('leave')}>Games</button>
      </div>
    </header>
    <div className="sudoku-layout">
      <section className="sudoku-board-section" aria-label="Sudoku puzzle">
        <div className="board-caption"><span>{done ? 'A perfect constellation.' : 'A little focus. One cell at a time.'}</span><span>{filled} / 81 filled</span></div>
        <div className={`sudoku-board${done ? ' is-complete' : ''}`} ref={boardRef} role="grid" aria-label={`${level.title} Sudoku board`} aria-rowcount={9} aria-colcount={9}>
          {Array.from({ length: 9 }, (_, row) => <div role="row" key={row} className="sudoku-row">
            {Array.from({ length: 9 }, (_, col) => {
              const cell = row * 9 + col, value = s.entries[cell]
              const fixed = !!s.puzzle?.givens[cell], selected = cell === s.selected
              const conflict = duplicateCells.has(cell), notes = maskDigits(s.notes[cell] ?? 0)
              const peer = s.selected >= 0 && PEERS[s.selected].includes(cell)
              const match = !!value && value === selectedDigit
              const description = `Row ${row + 1}, column ${col + 1}, ${value ? `${value}${fixed ? ', given' : ''}` : notes.length ? `notes ${notes.join(', ')}` : 'empty'}${conflict ? ', duplicate' : ''}`
              return <button key={cell} type="button" role="gridcell" data-cell={cell}
                aria-label={description} aria-selected={selected} aria-readonly={fixed || done}
                aria-rowindex={row + 1} aria-colindex={col + 1}
                tabIndex={selected ? 0 : -1} onClick={() => s.select(cell)} onFocus={() => s.select(cell)}
                className={`sudoku-cell${fixed ? ' given' : ''}${peer ? ' peer' : ''}${match ? ' matching' : ''}${selected ? ' selected' : ''}${conflict ? ' conflict' : ''}${col === 2 || col === 5 ? ' box-right' : ''}${row === 2 || row === 5 ? ' box-bottom' : ''}`}>
                {value ? <span>{value}</span> : <span className="cell-notes" aria-hidden="true">{DIGITS.map(d => <span key={d}>{notes.includes(d) ? d : ''}</span>)}</span>}
                {conflict && <span className="conflict-mark" aria-hidden="true">!</span>}
              </button>
            })}
          </div>)}
        </div>
        <p className={`board-status${duplicateCells.size ? ' has-conflict' : ''}`}>
          {done ? 'Every row, column, and box is complete.' : duplicateCells.size ? 'Duplicate found. You can always correct it.' : 'Fill each row, column, and box with 1–9.'}
        </p>
      </section>
      <aside className="sudoku-controls" aria-label="Puzzle controls">
        {done ? <section className="sudoku-result end-card win" aria-labelledby="sudoku-result-title">
          <span className="solved-star" aria-hidden="true">✦</span>
          <p className="eyebrow">NICELY DEDUCED</p>
          <h2 id="sudoku-result-title">SOLVED</h2>
          <p>A little patience. A complete picture.</p>
          <dl className="sudoku-result-stats"><div><dt>Difficulty</dt><dd>{level.title}</dd></div><div><dt>Time</dt><dd>{formatTime(s.elapsedMs)}</dd></div><div><dt>Hints used</dt><dd>{s.hintsUsed}</dd></div></dl>
          <button className="btn" onClick={() => s.start(s.difficulty, true)}>Play Again</button>
          <button className="btn secondary" onClick={() => { s.discard(); navigate('sudoku-setup') }}>Change difficulty</button>
          <button className="hud-menu-link" onClick={leave}>Back to games</button>
        </section> : <>
          <div className="control-heading"><span className="eyebrow">YOUR NEXT MOVE</span><span className="hint-count">Hints used <b>{s.hintsUsed}</b></span></div>
          <p className="selected-cell-label">{given ? 'This is a given cell.' : `Row ${Math.floor(s.selected / 9) + 1} · Column ${s.selected % 9 + 1}`}<span>{given ? 'Select an empty cell to add a number.' : s.notesMode ? 'Notes are on. Add possible digits.' : 'Choose a number or type 1–9.'}</span></p>
          <div className="number-pad" aria-label="Number pad">{DIGITS.map(d => <button data-digit={d} key={d} disabled={!active || given || (s.notesMode && !!selectedDigit)}
            className="digit-key" aria-label={`Enter ${d}`} onClick={() => s.enter(d)}>{d}</button>)}</div>
          <div className="sudoku-tools">
            <button className={`tool-button${s.notesMode ? ' active' : ''}`} aria-pressed={s.notesMode} disabled={!active} onClick={s.toggleNotes}><span aria-hidden="true">✎</span>Notes <small>{s.notesMode ? 'ON' : 'OFF'}</small></button>
            <button className="tool-button" disabled={!active || !s.history.length} onClick={s.undo}><span aria-hidden="true">↶</span>Undo</button>
            <button className="tool-button" disabled={!active || given || (!selectedDigit && !s.notes[s.selected])} onClick={s.erase}><span aria-hidden="true">⌫</span>Erase</button>
            <button className="tool-button" disabled={!canHint} onClick={s.hint} title="Reveal the selected cell. Counts as one hint."><span aria-hidden="true">✦</span>Hint</button>
          </div>
          <div className="sudoku-tip"><span className="eyebrow">ROOM TO THINK</span><p>No mistake limit. Notes and hints are here whenever you need them.</p></div>
          <p className="keyboard-guide">Arrow keys to move · N for notes<br />Backspace to erase</p>
        </>}
      </aside>
    </div>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{s.announcement}</div>
    {(s.phase === 'intro' || s.dialog === 'help') && <Modal titleId="sudoku-help-title" onClose={closeHelp}>
      <div className="howto-card sudoku-help">
        <p className="eyebrow">A LITTLE GUIDANCE</p><h2 id="sudoku-help-title">HOW TO PLAY</h2>
        <p className="howto-lead">Fill the 9×9 grid with the digits <b>1–9</b>. Each digit appears once in every row, column, and 3×3 box.</p>
        <div className="help-digits" aria-hidden="true">{DIGITS.map(d => <span key={d}>{d}</span>)}</div>
        <ul className="sudoku-help-list"><li><b>Select a cell</b>, then type or choose a number. The starting numbers stay fixed.</li><li><b>Notes</b> hold possible digits. Use Undo or Erase to change your mind.</li><li><b>Hint</b> reveals the selected cell and counts toward hints used.</li><li><b>Duplicates are highlighted</b>. There is no mistake limit and no countdown.</li></ul>
        <p className="howto-mode">{s.phase === 'intro' ? 'The clock starts when you begin.' : 'The clock is paused while you read.'} Progress is not saved when you leave or reload.</p>
        <div className="howto-footer"><label className="toggle"><input type="checkbox" checked={s.showHowTo} onChange={e => s.setShowHowTo(e.target.checked)} /><span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>Show before each puzzle</label><button className="btn" data-initial-focus onClick={closeHelp}>{s.phase === 'intro' ? 'Start puzzle' : 'Back to game'}</button></div>
      </div>
    </Modal>}
    {s.dialog === 'leave' && <Modal titleId="leave-title" onClose={s.closeDialog}>
      <div className="howto-card leave-card"><p className="eyebrow">TAKING OFF?</p><h2 id="leave-title">Leave puzzle?</h2><p>Your progress will be lost.</p><p className="dialog-note">The clock is paused. You can keep playing right where you left off.</p><div className="end-actions"><button className="btn" data-initial-focus onClick={s.closeDialog}>Keep playing</button><button className="btn secondary" onClick={leave}>Leave puzzle</button></div></div>
    </Modal>}
  </main>
}
