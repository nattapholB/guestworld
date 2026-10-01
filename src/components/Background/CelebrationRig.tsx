import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const RADIUS = 10.5
const MAX_ANGLE = 0.55

/** Sways the camera along a front-facing arc so letters on the board stay readable. */
export function CelebrationRig() {
  const { camera } = useThree()
  const startRef = useRef(performance.now())

  useFrame(() => {
    const t = (performance.now() - startRef.current) / 1000
    const angle = Math.sin(t * 0.45) * MAX_ANGLE
    const targetX = Math.sin(angle) * RADIUS
    const targetZ = Math.cos(angle) * RADIUS
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (0.9 - camera.position.y) * 0.05
    camera.position.z += (targetZ - camera.position.z) * 0.05
    camera.lookAt(0, 0.4, 0)
  })

  return null
}
