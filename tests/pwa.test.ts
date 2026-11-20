import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getInstallMode, isIosSafari, isStandaloneMode, usePwaStore, type BeforeInstallPromptEvent } from '../src/app/pwa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

test('isStandaloneMode detects navigator.standalone and display-mode media queries', () => {
  assert.equal(isStandaloneMode(), false)
  assert.equal(isStandaloneMode({}), false)
  assert.equal(
    isStandaloneMode({
      navigator: { standalone: false },
      matchMedia: () => ({ matches: false }),
    }),
    false,
  )

  assert.equal(isStandaloneMode({ navigator: { standalone: true } }), true)
  assert.equal(
    isStandaloneMode({
      matchMedia: (q) => ({ matches: q === '(display-mode: standalone)' }),
    }),
    true,
  )
  assert.equal(
    isStandaloneMode({
      matchMedia: (q) => ({ matches: q === '(display-mode: fullscreen)' }),
    }),
    true,
  )
})

test('isIosSafari identifies iPhone, iPad, and touch iPadOS Safari while excluding other browsers', () => {
  const iphoneSafari =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const ipadSafari =
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const ipodSafari =
    'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  const macLikeSafari =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  const iosChrome =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1'
  const iosFirefox =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15'
  const iosEdge =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/125.2535.62 Mobile/15E148 Safari/605.1.15'
  const iosOpera =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) OPiOS/16.0.0 Mobile/15E148 Safari/605.1.15'
  const iosDuckDuckGo =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15'
  const androidChrome =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'

  assert.equal(isIosSafari(iphoneSafari), true)
  assert.equal(isIosSafari(ipadSafari), true)
  assert.equal(isIosSafari(ipodSafari), true)
  assert.equal(isIosSafari(macLikeSafari, 5), true)

  assert.equal(isIosSafari(iosChrome), false)
  assert.equal(isIosSafari(iosFirefox), false)
  assert.equal(isIosSafari(iosEdge), false)
  assert.equal(isIosSafari(iosOpera), false)
  assert.equal(isIosSafari(iosDuckDuckGo), false)
  assert.equal(isIosSafari(androidChrome), false)
  assert.equal(isIosSafari(macLikeSafari), false)
  assert.equal(isIosSafari(macLikeSafari, 0), false)
  assert.equal(isIosSafari(macLikeSafari, 1), false)
})

test('getInstallMode covers all combinations of standalone, deferredPrompt, and iosSafari', () => {
  assert.equal(
    getInstallMode({ isStandalone: true, hasDeferredPrompt: false, isIosSafari: false }),
    'hidden',
  )
  assert.equal(
    getInstallMode({ isStandalone: true, hasDeferredPrompt: true, isIosSafari: false }),
    'hidden',
  )
  assert.equal(
    getInstallMode({ isStandalone: true, hasDeferredPrompt: false, isIosSafari: true }),
    'hidden',
  )
  assert.equal(
    getInstallMode({ isStandalone: true, hasDeferredPrompt: true, isIosSafari: true }),
    'hidden',
  )

  assert.equal(
    getInstallMode({ isStandalone: false, hasDeferredPrompt: true, isIosSafari: false }),
    'prompt',
  )
  assert.equal(
    getInstallMode({ isStandalone: false, hasDeferredPrompt: true, isIosSafari: true }),
    'prompt',
  )

  assert.equal(
    getInstallMode({ isStandalone: false, hasDeferredPrompt: false, isIosSafari: true }),
    'ios-guide',
  )
  assert.equal(
    getInstallMode({ isStandalone: false, hasDeferredPrompt: false, isIosSafari: false }),
    'hidden',
  )
})

test('index.html defines PWA viewport, theme-color, relative icons, and updated title', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')

  assert.match(html, /<meta\s+name="viewport"\s+content="[^"]*viewport-fit=cover[^"]*"/i)
  assert.match(html, /<meta\s+name="theme-color"\s+content="#05061a"\s*\/?>/i)
  assert.match(
    html,
    /<link\s+rel="apple-touch-icon"[^>]*href="\.\/apple-touch-icon\.png"/i,
  )
  assert.match(html, /<link\s+rel="icon"[^>]*href="\.\/favicon\.ico"/i)
  assert.match(html, /<link\s+rel="icon"[^>]*href="\.\/icons\/favicon-32\.png"/i)
  assert.doesNotMatch(html, /href="\/(favicon\.ico|apple-touch-icon\.png|icons\/)/i)

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  assert.ok(titleMatch, 'index.html must include a <title> tag')
  assert.match(titleMatch[1], /Crossword/)
})

test('usePwaStore.promptInstall clears deferredPrompt and handles unavailable or rejected prompts', async () => {
  usePwaStore.setState({ deferredPrompt: null })
  assert.equal(await usePwaStore.getState().promptInstall(), 'unavailable')

  const acceptedPrompt = {
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
  } as unknown as BeforeInstallPromptEvent
  usePwaStore.setState({ deferredPrompt: acceptedPrompt })
  assert.equal(await usePwaStore.getState().promptInstall(), 'accepted')
  assert.equal(usePwaStore.getState().deferredPrompt, null)

  const rejectedPrompt = {
    prompt: async () => {
      throw new Error('prompt failed')
    },
    userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }),
  } as unknown as BeforeInstallPromptEvent
  usePwaStore.setState({ deferredPrompt: rejectedPrompt })
  assert.equal(await usePwaStore.getState().promptInstall(), 'unavailable')
  assert.equal(usePwaStore.getState().deferredPrompt, null)
})
