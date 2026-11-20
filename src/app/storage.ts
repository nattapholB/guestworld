export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StorageEnvelope<T> {
  version: number
  savedAt: number
  data: T
}

export interface GameStorage<T> {
  key: string
  version: number
  load(): T | null
  save(data: T): boolean
  clear(): void
}

export interface CreateGameStorageOptions<T> {
  key: string
  version: number
  validate: (value: unknown) => value is T
  storage?: StorageLike | null
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

export function createGameStorage<T>(options: CreateGameStorageOptions<T>): GameStorage<T> {
  const { key, version, validate } = options
  const resolveStorage = () => (options.storage !== undefined ? options.storage : defaultStorage())

  return {
    key,
    version,
    load() {
      const store = resolveStorage()
      if (!store) return null
      try {
        const raw = store.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<StorageEnvelope<unknown>> | null
        if (!parsed || typeof parsed !== 'object') return null
        if (parsed.version !== version) return null
        if (!validate(parsed.data)) return null
        return parsed.data
      } catch {
        return null
      }
    },
    save(data: T) {
      const store = resolveStorage()
      if (!store) return false
      try {
        const payload: StorageEnvelope<T> = { version, savedAt: Date.now(), data }
        store.setItem(key, JSON.stringify(payload))
        return true
      } catch {
        return false
      }
    },
    clear() {
      const store = resolveStorage()
      if (!store) return
      try {
        store.removeItem(key)
      } catch {
        // Ignore storage errors so gameplay is never blocked in private/restricted browsers.
      }
    },
  }
}
