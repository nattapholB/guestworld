import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { getCameraDistance } from './cameraFraming'

export function ParallaxRig({ strength = 0.6 }: { strength?: number }) {
  const pointer = useRef({ x: 0, y: 0 })
  const initialized = useRef(false)
  const { camera, size } = useThree()

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handlePointer)
    return () => window.removeEventListener('pointermove', handlePointer)
  }, [])

  useFrame(() => {
    const aspect = size.height > 0 ? size.width / size.height : 1
    const targetZ = getCameraDistance(aspect)
    const effectiveStrength = strength * Math.min(1, aspect / 0.75)
    const targetX = -pointer.current.x * effectiveStrength
    const targetY = pointer.current.y * effectiveStrength * 0.6
    camera.position.x += (targetX - camera.position.x) * 0.04
    camera.position.y += (targetY + 0.4 - camera.position.y) * 0.04
    if (!initialized.current) {
      camera.position.z = targetZ
      initialized.current = true
    } else {
      camera.position.z += (targetZ - camera.position.z) * 0.08
    }
    camera.lookAt(0, 0.2, 0)
  })

  return null
}
