import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { CAT_URL, FACT_URL, JOKE_URL, QUOTE_URL } from './api';
import { mockFetch } from './test/utils';

const posts = [
  { id: 1, title: 'First', body: 'one', user_id: 1, post_status_id: 1, created_at: '2026-09-01T10:00:00Z' },
  { id: 3, title: 'Third', body: 'three', user_id: 2, post_status_id: 2, created_at: '2026-09-03T10:00:00Z' },
  { id: 2, title: 'Second', body: 'two', user_id: 1, post_status_id: 1, created_at: '2026-09-02T10:00:00Z' },
];

const publicApis = {
  [`GET ${QUOTE_URL}`]: { body: { quote: 'I am a god.' } },
  [`GET ${CAT_URL}`]: { body: { fact: 'Cats sleep a lot.', length: 17 } },
  [`GET ${JOKE_URL}`]: { body: { joke: 'A very dad joke.' } },
  [`GET ${FACT_URL}`]: { body: { text: 'Bananas are berries.' } },
};

describe('App', () => {
  it('loads the post feed newest-first and fills every public-API widget', async () => {
    mockFetch({ ...publicApis, 'GET /posts': { body: posts } });
    render(<App />);

    const feed = await screen.findByRole('region', { name: 'All posts' });
    const titles = (await within(feed).findAllByRole('heading', { level: 3 })).map((h) => h.textContent);
    expect(titles).toEqual(['Third', 'Second', 'First']);

    expect(await screen.findByText('\u201CI am a god.\u201D')).toBeInTheDocument();
    expect(await screen.findByText('Cats sleep a lot.')).toBeInTheDocument();
    expect(await screen.findByText('A very dad joke.')).toBeInTheDocument();
    expect(await screen.findByText('Bananas are berries.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no posts', async () => {
    mockFetch({ ...publicApis, 'GET /posts': { body: [] } });
    render(<App />);
    expect(await screen.findByText('No posts yet. Log in and write the first one.')).toBeInTheDocument();
  });

  it('logs in, swaps the login form for the new-post form, then logs out', async () => {
    const { calls } = mockFetch({
      ...publicApis,
      'GET /posts': { body: posts },
      'POST /login': { body: { user: { id: 1, name: 'Ana' }, token: 'tok' } },
      'POST /logout': { body: { message: 'Logged out' } },
    });
    const u = userEvent.setup();
    render(<App />);

    await u.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'New post' })).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    // The feed reloads after login so the owner's Edit/Delete buttons appear.
    expect(calls.filter((c) => c.method === 'GET' && c.path === '/posts')).toHaveLength(2);

    await u.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New post' })).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps a saved session on load and never leaks its token to public APIs', async () => {
    localStorage.setItem('token', 'saved-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Ana' }));
    const { calls } = mockFetch({
      ...publicApis,
      'GET /posts': { body: posts },
      'GET /user': { body: { id: 1, name: 'Ana' } },
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'New post' })).toBeInTheDocument();
    await screen.findByText('Bananas are berries.');

    const laravelCalls = calls.filter((c) => !c.path.startsWith('https://'));
    const publicCalls = calls.filter((c) => c.path.startsWith('https://'));
    expect(laravelCalls.every((c) => c.headers.Authorization === 'Bearer saved-token')).toBe(true);
    expect(publicCalls).toHaveLength(4);
    expect(publicCalls.some((c) => 'Authorization' in c.headers)).toBe(false);
  });

  it('drops an expired saved session when /user rejects the token', async () => {
    localStorage.setItem('token', 'expired');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Ana' }));
    mockFetch({
      ...publicApis,
      'GET /posts': { body: posts },
      'GET /user': { status: 401, body: { message: 'Unauthenticated.' } },
    });
    render(<App />);

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('switches between light and dark mode and remembers the choice', async () => {
    mockFetch({ ...publicApis, 'GET /posts': { body: [] } });
    const u = userEvent.setup();
    render(<App />);

    await u.click(await screen.findByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await u.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
