import { useGameStore } from '../../game/store'
import { TileGrid } from './TileGrid'
import { Keyboard3D } from './Keyboard3D'
import { WinBurst } from './WinBurst'
import { AnswerReveal } from './AnswerReveal'

export function GameScene() {
  const phase = useGameStore((s) => s.phase)
  const answer = useGameStore((s) => s.answer)
  const gameId = useGameStore((s) => s.gameId)

  return (
    <>
      <TileGrid key={gameId} />
      <Keyboard3D />
      {phase === 'won' && <WinBurst />}
      {phase === 'lost' && <AnswerReveal answer={answer} />}
    </>
  )
}
