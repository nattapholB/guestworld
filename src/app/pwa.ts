import { create } from 'zustand'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallMode = 'hidden' | 'prompt' | 'ios-guide'

export interface StandaloneWindowLike {
  matchMedia?: (q: string) => { matches: boolean }
  navigator?: { standalone?: boolean }
}

/** Checks whether the app is currently running in an installed standalone or fullscreen window. */
export function isStandaloneMode(win?: StandaloneWindowLike): boolean {
  const target =
    win ?? (typeof window !== 'undefined' ? (window as unknown as StandaloneWindowLike) : undefined)
  if (!target) return false
  if (target.navigator?.standalone === true) return true
  if (target.matchMedia?.('(display-mode: standalone)')?.matches) return true
  if (target.matchMedia?.('(display-mode: fullscreen)')?.matches) return true
  return false
}

/** Detects iOS/iPadOS Safari where manual Share -> Add to Home Screen instructions apply. */
export function isIosSafari(userAgent: string, maxTouchPoints?: number): boolean {
  const isIosDevice =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && (maxTouchPoints ?? 0) > 1)
  if (!isIosDevice) return false
  const hasSafari = /Safari/i.test(userAgent)
  const isNonSafariBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)
  return hasSafari && !isNonSafariBrowser
}

/** Chooses the install affordance state for the current environment. */
export function getInstallMode(input: {
  isStandalone: boolean
  hasDeferredPrompt: boolean
  isIosSafari: boolean
}): InstallMode {
  if (input.isStandalone) return 'hidden'
  if (input.hasDeferredPrompt) return 'prompt'
  if (input.isIosSafari) return 'ios-guide'
  return 'hidden'
}

export interface PwaState {
  online: boolean
  standalone: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  iosSafari: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export const usePwaStore = create<PwaState>((set, get) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  standalone: typeof window !== 'undefined' ? isStandaloneMode() : false,
  deferredPrompt: null,
  iosSafari:
    typeof navigator !== 'undefined'
      ? isIosSafari(navigator.userAgent, navigator.maxTouchPoints)
      : false,
  promptInstall: async () => {
    const deferred = get().deferredPrompt
    if (!deferred) return 'unavailable'
    try {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      return outcome
    } catch {
      return 'unavailable'
    } finally {
      set({ deferredPrompt: null })
    }
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    usePwaStore.setState({ deferredPrompt: event as BeforeInstallPromptEvent })
  })

  window.addEventListener('appinstalled', () => {
    usePwaStore.setState({ deferredPrompt: null, standalone: true })
  })

  window.addEventListener('online', () => {
    usePwaStore.setState({ online: true })
  })

  window.addEventListener('offline', () => {
    usePwaStore.setState({ online: false })
  })

  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')
  standaloneMedia?.addEventListener?.('change', () => {
    usePwaStore.setState({ standalone: isStandaloneMode() })
  })
}
