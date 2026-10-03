import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Starfield } from './Background/Starfield'
import { ParallaxRig } from './Background/ParallaxRig'
import { CelebrationRig } from './Background/CelebrationRig'
import { GameScene } from './Game/GameScene'

export function Scene({ wordVisible, finished, steady }: { wordVisible: boolean; finished: boolean; steady: boolean }) {
  return <Canvas camera={{ position: [0, 0.4, 10.5], fov: 55 }} dpr={[1, 1.5]}>
    <Starfield />
    {finished ? <CelebrationRig /> : <ParallaxRig strength={steady ? 0 : 0.6} />}
    <Suspense fallback={null}>{wordVisible && <GameScene />}</Suspense>
    <EffectComposer><Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.4} mipmapBlur /></EffectComposer>
  </Canvas>
}
