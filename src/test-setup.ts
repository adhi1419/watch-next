import '@testing-library/jest-dom/vitest';

// Mock IntersectionObserver for jsdom
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;
