export const COLORS = {
  empty: '#1e2650',
  filled: '#34408a',
  // Darkened so white letters reach WCAG AA (4.5:1); the old #2bd576 was 1.79:1.
  correct: '#1a8047',
  present: '#886d22',
  absent: '#3a3f52',
} as const

export const EMISSIVE = {
  empty: '#000000',
  filled: '#10143a',
  correct: '#0b4424',
  present: '#2e2406',
  absent: '#000000',
} as const

export const PALETTE = {
  background: '#05061a',
  nebula1: '#3a1c6e',
  nebula2: '#0e2a5e',
  accent: '#7cd3ff',
  danger: '#ff5d7a',
}
