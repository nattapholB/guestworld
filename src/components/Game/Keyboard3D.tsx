import { BOARD_FONT } from '../../game/fonts'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../../game/store'
import { sfx } from '../../audio/sfx'
import { COLORS, EMISSIVE } from '../../game/theme'
import type { LetterState } from '../../game/logic'

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
]

const KEY_W = 0.56
const KEY_GAP = 0.07
const WIDE_KEY_W = 0.95
const ROW_GAP = 0.72

function Key({
  label,
  keyState,
  width,
  position,
  onActivate,
}: {
  label: string
  keyState: LetterState | 'default'
  width: number
  position: [number, number, number]
  onActivate: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const baseColor = keyState === 'default' ? '#232a4d' : COLORS[keyState]
  const emissive = keyState === 'default' ? '#0c0f24' : EMISSIVE[keyState]

  useFrame(() => {
    if (!meshRef.current) return
    const targetScale = pressed ? 0.85 : hovered ? 1.06 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.35)
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onClick={onActivate}
      >
        <boxGeometry args={[width, 0.56, 0.16]} />
        <meshStandardMaterial color={baseColor} emissive={emissive} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <Text font={BOARD_FONT}
        position={[0, 0, 0.1]}
        fontSize={label.length > 1 ? 0.16 : 0.24}
        color="#f4f6ff"
        anchorX="center"
        anchorY="middle"
      >
        {label === 'BACK' ? 'BACK' : label === 'ENTER' ? 'ENTER' : label}
      </Text>
    </group>
  )
}

export function Keyboard3D() {
  const letterStates = useGameStore((s) => s.letterStates)
  const addLetter = useGameStore((s) => s.addLetter)
  const removeLetter = useGameStore((s) => s.removeLetter)
  const submitGuess = useGameStore((s) => s.submitGuess)

  const handleActivate = (label: string) => {
    if (label === 'ENTER') {
      submitGuess()
    } else if (label === 'BACK') {
      sfx.keyPress()
      removeLetter()
    } else {
      sfx.keyPress()
      addLetter(label)
    }
  }

  return (
    <group position={[0, -1.75, 0]}>
      {ROWS.map((row, rowIndex) => {
        const rowWidth = row.reduce((sum, key) => sum + (key.length > 1 ? WIDE_KEY_W : KEY_W) + KEY_GAP, -KEY_GAP)
        let cursor = -rowWidth / 2
        return row.map((label) => {
          const width = label.length > 1 ? WIDE_KEY_W : KEY_W
          const x = cursor + width / 2
          cursor += width + KEY_GAP
          const keyState: LetterState | 'default' = letterStates[label.toLowerCase()] ?? 'default'
          return (
            <Key
              key={label}
              label={label}
              keyState={keyState}
              width={width}
              position={[x, -rowIndex * ROW_GAP, 0]}
              onActivate={() => handleActivate(label)}
            />
          )
        })
      })}
    </group>
  )
}
