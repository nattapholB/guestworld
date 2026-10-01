import { Stars } from '@react-three/drei'
import { PALETTE } from '../../game/theme'

export function Starfield() {
  return (
    <>
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.background, 16, 45]} />
      <Stars radius={60} depth={40} count={4000} factor={3} saturation={0} fade speed={0.4} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 8]} intensity={1.4} color="#dfe6ff" />
      <pointLight position={[-6, 4, -4]} intensity={40} color={PALETTE.nebula1} distance={20} />
      <pointLight position={[6, -3, -6]} intensity={40} color={PALETTE.nebula2} distance={20} />
      <pointLight position={[0, 2, 6]} intensity={8} color={PALETTE.accent} distance={15} />
    </>
  )
}
