import { useEffect } from 'react'
import { useGameStore } from '../game/store'
import { sfx } from '../audio/sfx'

export function useKeyboardInput() {
  const addLetter = useGameStore((s) => s.addLetter)
  const removeLetter = useGameStore((s) => s.removeLetter)
  const submitGuess = useGameStore((s) => s.submitGuess)
  const phase = useGameStore((s) => s.phase)

  useEffect(() => {
    if (phase !== 'playing') return

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        submitGuess()
      } else if (e.key === 'Backspace') {
        sfx.keyPress()
        removeLetter()
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        sfx.keyPress()
        addLetter(e.key)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, addLetter, removeLetter, submitGuess])
}
