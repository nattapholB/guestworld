import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Native modality makes the background inert; explicit Tab wrapping keeps focus in the card. */
export function Modal({ titleId, onClose, children, className = '' }: {
  titleId: string; onClose: () => void; children: ReactNode; className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current!
    dialog.showModal()
    const focusTarget = dialog.querySelector<HTMLElement>('[data-initial-focus]')
    focusTarget?.focus()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return (
    <dialog ref={ref} className={`game-dialog ${className}`} aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); onClose() }} onKeyDown={e => {
        e.stopPropagation()
        if (e.key !== 'Tab') return
        const focusable = [...e.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
        )].filter(node => node.getClientRects().length > 0)
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }}>
      {children}
    </dialog>
  )
}
