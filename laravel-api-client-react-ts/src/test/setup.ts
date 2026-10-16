import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Every test starts with a clean browser state and no leftover mocks.
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
  vi.useRealTimers();
});
