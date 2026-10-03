import { useGameStore } from '../../game/store'
import { useAppStore } from '../../app/store'
import { SelectionCard } from './SelectionCard'

export function MenuOverlay() {
  const startGame = useGameStore(s => s.startGame)
  const navigate = useAppStore(s => s.navigate)
  return <main className="selection-page setup-page">
    <button className="back-link" onClick={() => navigate('games')}>← Back to games</button>
    <header className="selection-heading">
      <p className="eyebrow">FIVE LETTERS. FIVE CHANCES.</p>
      <h1 className="menu-title">ORBIT WORD</h1>
      <p className="menu-subtitle">Find the hidden word. Choose your pace.</p>
    </header>
    <div className="mode-buttons">
      <SelectionCard title="Classic" description="No clock. Take your time and think through every guess." onClick={() => { startGame('classic'); navigate('word') }} />
      <SelectionCard title="Timer" description="Same five guesses, but speed earns you a bonus score." onClick={() => { startGame('timer'); navigate('word') }} />
    </div>
    <p className="setup-footnote">A fresh word every round. How to play is available before you begin.</p>
  </main>
}
