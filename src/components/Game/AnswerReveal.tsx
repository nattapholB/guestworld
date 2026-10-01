import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '../../game/theme'

const START_Y = -1.5
const END_Y = 1.15
const SPACING = 0.78

export function AnswerReveal({ answer }: { answer: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const lettersRef = useRef<THREE.Group>(null)
  const startRef = useRef(performance.now())

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const elapsed = (performance.now() - startRef.current) / 1000
    const t = Math.min(elapsed / 1.2, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    group.position.y = START_Y + eased * (END_Y - START_Y)
    lettersRef.current?.children.forEach((child, i) => {
      child.position.y = Math.sin(elapsed * 1.5 + i) * 0.05
    })
  })

  const letters = answer.toUpperCase().split('')
  const width = (letters.length - 1) * SPACING

  return (
    <group ref={groupRef} position={[0, START_Y, 1.2]}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[width + 1.2, 1.2]} />
        <meshBasicMaterial color={PALETTE.background} transparent opacity={0.8} />
      </mesh>
      <group ref={lettersRef}>
        {letters.map((letter, i) => (
          <Text
            key={i}
            position={[i * SPACING - width / 2, 0, 0]}
            fontSize={0.72}
            color={PALETTE.danger}
            outlineWidth={0.025}
            outlineColor={PALETTE.background}
            anchorX="center"
            anchorY="middle"
          >
            {letter}
          </Text>
        ))}
      </group>
    </group>
  )
}
