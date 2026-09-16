import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver
