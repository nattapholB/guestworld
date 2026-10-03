import { useAppStore } from '../../app/store'
import { SelectionCard } from '../../components/Menu/SelectionCard'
import { useSudokuStore } from './store'
import { DIFFICULTIES } from './types'

export function SudokuSetup() {
  const navigate = useAppStore(s => s.navigate)
  const start = useSudokuStore(s => s.start)
  return <main className="selection-page setup-page">
    <button className="back-link" onClick={() => navigate('games')}>← Back to games</button>
    <header className="selection-heading">
      <p className="eyebrow">NINE DIGITS. A WORLD OF POSSIBILITIES.</p>
      <h1 className="menu-title">SUDOKU</h1>
      <p className="menu-subtitle">Find your rhythm. Choose a challenge.</p>
    </header>
    <div className="mode-buttons difficulty-cards">
      {DIFFICULTIES.map((d, i) => <SelectionCard key={d.id} title={d.title} description={d.description} index={`0${i + 1}`}
        onClick={() => { start(d.id); navigate('sudoku') }} />)}
    </div>
    <p className="setup-footnote">9×9 grid · Unlimited corrections · Notes and hints at every level</p>
  </main>
}
