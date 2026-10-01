import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { COLORS, EMISSIVE } from '../../game/theme'
import type { LetterState } from '../../game/logic'

export type CellStatus = 'empty' | 'filled' | LetterState

const FLIP_DURATION_MS = 420
const DEPTH = 0.22

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function isRevealed(status: CellStatus): status is LetterState {
  return status === 'correct' || status === 'present' || status === 'absent'
}

export function Cube({
  letter,
  status,
  position,
  delay,
  shakeToken,
}: {
  letter: string
  status: CellStatus
  position: [number, number, number]
  delay: number
  shakeToken?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const frontTextRef = useRef<THREE.Object3D>(null)
  const backTextRef = useRef<THREE.Object3D>(null)

  const startTimeRef = useRef<number | null>(null)
  const swappedRef = useRef(false)
  const prevStatusRef = useRef<CellStatus>(status)
  const shakeStartRef = useRef<number | null>(null)

  useEffect(() => {
    const wasRevealed = isRevealed(prevStatusRef.current)
    if (isRevealed(status) && !wasRevealed) {
      startTimeRef.current = performance.now() + delay * 1000
      swappedRef.current = false
    }
    if (status === 'empty' || status === 'filled') {
      if (materialRef.current) {
        materialRef.current.color.set(status === 'filled' ? COLORS.filled : COLORS.empty)
        materialRef.current.emissive.set(status === 'filled' ? EMISSIVE.filled : EMISSIVE.empty)
      }
      if (groupRef.current) groupRef.current.rotation.x = 0
      if (frontTextRef.current) frontTextRef.current.visible = true
      if (backTextRef.current) backTextRef.current.visible = false
      startTimeRef.current = null
    }
    prevStatusRef.current = status
  }, [status, delay])

  useEffect(() => {
    if (shakeToken) shakeStartRef.current = performance.now()
  }, [shakeToken])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    if (startTimeRef.current !== null) {
      const elapsed = performance.now() - startTimeRef.current
      if (elapsed < 0) {
        group.rotation.x = 0
      } else {
        const t = Math.min(elapsed / FLIP_DURATION_MS, 1)
        group.rotation.x = easeInOutQuad(t) * Math.PI

        if (t >= 0.5 && !swappedRef.current) {
          swappedRef.current = true
          if (materialRef.current && isRevealed(status)) {
            materialRef.current.color.set(COLORS[status])
            materialRef.current.emissive.set(EMISSIVE[status])
          }
          if (frontTextRef.current) frontTextRef.current.visible = false
          if (backTextRef.current) backTextRef.current.visible = true
        }
        if (t >= 1) startTimeRef.current = null
      }
    }

    if (shakeStartRef.current !== null) {
      const elapsed = performance.now() - shakeStartRef.current
      const duration = 320
      if (elapsed < duration) {
        const t = elapsed / duration
        group.position.x = position[0] + Math.sin(t * Math.PI * 6) * 0.06 * (1 - t)
      } else {
        group.position.x = position[0]
        shakeStartRef.current = null
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.85, DEPTH]} />
        <meshStandardMaterial
          ref={materialRef}
          color={COLORS.empty}
          emissive={EMISSIVE.empty}
          emissiveIntensity={0.6}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>
      {letter && (
        <>
          <Text
            ref={frontTextRef}
            position={[0, 0, DEPTH / 2 + 0.02]}
            fontSize={0.42}
            color="#f4f6ff"
            anchorX="center"
            anchorY="middle"
          >
            {letter.toUpperCase()}
          </Text>
          <Text
            ref={backTextRef}
            position={[0, 0, -(DEPTH / 2 + 0.02)]}
            rotation={[Math.PI, 0, 0]}
            fontSize={0.42}
            color="#f4f6ff"
            anchorX="center"
            anchorY="middle"
            visible={false}
          >
            {letter.toUpperCase()}
          </Text>
        </>
      )}
    </group>
  )
}
