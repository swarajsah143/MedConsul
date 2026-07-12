import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom lacks these; Recharts' ResponsiveContainer and several pages touch them.
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver ??= RO

// framer-motion's whileInView uses IntersectionObserver, which jsdom does not have.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  root = null
  rootMargin = ''
  thresholds = []
}
;(globalThis as any).IntersectionObserver ??= IO
;(window as any).IntersectionObserver ??= IO

// Recharts measures its container; jsdom reports 0x0, which makes it render nothing
// and hides real crashes. Give every element a non-zero box.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1024 })
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 768 })
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({ width: 1024, height: 768, top: 0, left: 0, bottom: 768, right: 1024, x: 0, y: 0, toJSON: () => {} }),
})

window.scrollTo = vi.fn()
if (!window.URL.createObjectURL) window.URL.createObjectURL = vi.fn(() => 'blob:mock')
