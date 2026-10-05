import { vi } from 'vitest'

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
window.visualViewport ||= { width: 1280, height: 800, addEventListener() {}, removeEventListener() {} }
