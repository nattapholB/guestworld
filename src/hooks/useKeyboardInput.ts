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
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || useGameStore.getState().helpOpen) return
      const target = e.target as HTMLElement
      if (target.closest('dialog, input, textarea, select, [contenteditable=true]')) return
      if (e.key === 'Enter' && target.closest('button, a')) return
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) e.preventDefault()
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
