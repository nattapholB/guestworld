import { lazy, Suspense, useEffect } from 'react'
import { GameSelection } from './components/Menu/GameSelection'
import { MenuOverlay } from './components/Menu/MenuOverlay'
import { HUDOverlay } from './components/UI/HUDOverlay'
import { EndOverlay } from './components/UI/EndOverlay'
import { HowToPlay } from './components/UI/HowToPlay'
import { useGameStore } from './game/store'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { useAppStore } from './app/store'
import { SudokuSetup } from './games/sudoku/SudokuSetup'
import { SudokuGame } from './games/sudoku/SudokuGame'
import { CrosswordSetup } from './games/crossword/CrosswordSetup'
import { CrosswordGame } from './games/crossword/CrosswordGame'
import { SceneBoundary } from './components/SceneBoundary'
import { PwaUpdateToast } from './components/UI/PwaUpdateToast'

const Scene = lazy(() => import('./components/Scene').then(module => ({ default: module.Scene })))
function WordGame() {
  useKeyboardInput()
  const phase = useGameStore(s => s.phase)
  return <>{phase !== 'howto' && <HUDOverlay />}<EndOverlay /><HowToPlay /></>
}
export function App() {
  const screen = useAppStore(s => s.screen)
  const phase = useGameStore(s => s.phase)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])
  return <div className={`app screen-${screen}`}>
    <div className="scene-layer" aria-hidden="true"><SceneBoundary><Suspense fallback={null}>
      <Scene wordVisible={screen === 'word'} finished={screen === 'word' && (phase === 'won' || phase === 'lost')} steady={screen === 'sudoku' || screen === 'crossword'} />
    </Suspense></SceneBoundary></div>
    {screen === 'games' && <GameSelection />}
    {screen === 'word-setup' && <MenuOverlay />}
    {screen === 'word' && <WordGame />}
    {screen === 'sudoku-setup' && <SudokuSetup />}
    {screen === 'sudoku' && <SudokuGame />}
    {screen === 'crossword-setup' && <CrosswordSetup />}
    {screen === 'crossword' && <CrosswordGame />}
    <PwaUpdateToast />
  </div>
}
