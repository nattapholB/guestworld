import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export function ParallaxRig({ strength = 0.6 }: { strength?: number }) {
  const pointer = useRef({ x: 0, y: 0 })
  const { camera } = useThree()

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handlePointer)
    return () => window.removeEventListener('pointermove', handlePointer)
  }, [])

  useFrame(() => {
    const targetX = -pointer.current.x * strength
    const targetY = pointer.current.y * strength * 0.6
    camera.position.x += (targetX - camera.position.x) * 0.04
    camera.position.y += (targetY + 0.4 - camera.position.y) * 0.04
    camera.position.z += (10.5 - camera.position.z) * 0.06
    camera.lookAt(0, 0.2, 0)
  })

  return null
}
