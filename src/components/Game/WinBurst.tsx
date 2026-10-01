import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../../game/theme'

const PARTICLE_COUNT = 220

export function WinBurst() {
  const pointsRef = useRef<THREE.Points>(null)
  const startRef = useRef(performance.now())

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0.6
      positions[i * 3 + 2] = 0

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const speed = 1.5 + Math.random() * 2.5
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + 1.2
      velocities[i * 3 + 2] = Math.cos(phi) * speed * 0.5
    }
    return { positions, velocities }
  }, [])

  useFrame(() => {
    const points = pointsRef.current
    if (!points) return
    const elapsed = (performance.now() - startRef.current) / 1000
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const gravity = -1.4 * elapsed
      posAttr.setXYZ(
        i,
        velocities[i * 3] * elapsed,
        0.6 + velocities[i * 3 + 1] * elapsed + 0.5 * gravity * elapsed,
        velocities[i * 3 + 2] * elapsed,
      )
    }
    posAttr.needsUpdate = true
    const material = points.material as THREE.PointsMaterial
    material.opacity = Math.max(0, 1 - elapsed / 2.2)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={PALETTE.accent} transparent opacity={1} sizeAttenuation />
    </points>
  )
}
