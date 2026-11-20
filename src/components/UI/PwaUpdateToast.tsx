import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdateToast() {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration
    },
  })

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        registrationRef.current?.update().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (!needRefresh) return null

  return (
    <aside className="pwa-update-toast" role="status" aria-live="polite">
      <div className="pwa-update-copy">
        <strong>Update available</strong>
        <span>Reload when ready for the latest version.</span>
      </div>
      <div className="pwa-update-actions">
        <button type="button" className="btn" onClick={() => void updateServiceWorker(true)}>
          Reload
        </button>
        <button type="button" className="btn secondary" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </aside>
  )
}
