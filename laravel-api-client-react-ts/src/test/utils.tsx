import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { API_URL } from '../api';
import { AppProvider, useApp } from '../AppContext';
import type { User } from '../types';

// ---------- fetch mocking ----------

export interface MockReply {
  status?: number;
  body?: unknown;
}

export interface RecordedCall {
  method: string;
  path: string; // URL with the Laravel API_URL prefix removed
  headers: Record<string, string>;
  body: unknown; // parsed JSON body, or undefined
}

// Routes are keyed "METHOD /path" for the Laravel API (e.g. "GET /posts")
// or "METHOD <full url>" for the public APIs. Any request without a
// matching route throws, so a test can never silently hit the network.
export function mockFetch(routes: Record<string, MockReply | ((call: RecordedCall) => MockReply)>) {
  const calls: RecordedCall[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.startsWith(API_URL) ? url.slice(API_URL.length) : url;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const call: RecordedCall = { method, path, headers, body };
    calls.push(call);

    const route = routes[`${method} ${path}`];
    if (!route) throw new Error(`Unmocked request: ${method} ${path}`);

    const reply = typeof route === 'function' ? route(call) : route;
    const status = reply.status ?? 200;
    if (status === 204 || reply.body === undefined) return new Response(null, { status });
    return new Response(JSON.stringify(reply.body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return { calls };
}

// ---------- rendering ----------

// Shows the current notice banner, so component tests can assert on the
// messages that App.tsx would normally display.
export function NoticeProbe() {
  const { notice } = useApp();
  if (!notice) return null;
  return <p role="status" data-error={notice.isError}>{notice.message}</p>;
}

export function renderWithApp(ui: ReactElement, { user }: { user?: User } = {}) {
  if (user) {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(user));
  }
  return render(
    <AppProvider>
      {ui}
      <NoticeProbe />
    </AppProvider>,
  );
}
