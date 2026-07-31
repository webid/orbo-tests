// Test environment setup: silence the app's network calls in jsdom.
import { vi } from 'vitest';

// App.tsx polls index.html for version changes; return a stable fake document
// so the poller resolves quietly instead of hitting the network.
vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({ text: () => Promise.resolve('<script src="/orbo/assets/test.js"></script>') })
  )
);
