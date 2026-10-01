import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useGameStore } from '../game/store'
import { Starfield } from './Background/Starfield'
import { ParallaxRig } from './Background/ParallaxRig'
import { CelebrationRig } from './Background/CelebrationRig'
import { GameScene } from './Game/GameScene'

export function Scene() {
  const phase = useGameStore((s) => s.phase)
  const finished = phase === 'won' || phase === 'lost'
  const showGame = phase === 'playing' || finished

  return (
    <Canvas camera={{ position: [0, 0.4, 10.5], fov: 55 }} shadows>
      <Suspense fallback={null}>
        <Starfield />
        {finished ? <CelebrationRig /> : <ParallaxRig />}
        {showGame && <GameScene />}
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
