import { Scene } from './components/Scene'
import { MenuOverlay } from './components/Menu/MenuOverlay'
import { HUDOverlay } from './components/UI/HUDOverlay'
import { EndOverlay } from './components/UI/EndOverlay'
import { useGameStore } from './game/store'
import { useKeyboardInput } from './hooks/useKeyboardInput'

export function App() {
  const phase = useGameStore((s) => s.phase)
  useKeyboardInput()

  return (
    <div className="app">
      <Scene />
      {phase === 'menu' && <MenuOverlay />}
      {(phase === 'playing' || phase === 'won' || phase === 'lost') && <HUDOverlay />}
      <EndOverlay />
    </div>
  )
}
