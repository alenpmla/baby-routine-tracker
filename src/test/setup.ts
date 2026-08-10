import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '')
  }
})

class MemoryStorage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
}

// jsdom does not define PointerEvent, so React never attaches its pointer* listeners
// and swipe gestures (onPointerDown/Move/Up) never fire under test. Polyfill a minimal
// PointerEvent before React module init so swipe interactions are testable. Guarded to
// also run under node-environment tests (server/*.test.js) where MouseEvent is absent.
if (
  typeof window !== 'undefined' &&
  typeof MouseEvent !== 'undefined' &&
  !('PointerEvent' in window)
) {
  class TestPointerEvent extends MouseEvent {
    pointerId: number
    pointerType: string

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
    }
  }
  const polyfilled = TestPointerEvent as unknown as typeof PointerEvent
  ;(window as unknown as Record<string, unknown>).PointerEvent = polyfilled
  ;(globalThis as unknown as Record<string, unknown>).PointerEvent = polyfilled
}
