import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithApp } from '../test/utils';
import AuthPanel from './AuthPanel';

describe('AuthPanel', () => {
  it('logs in, saves the session, calls onAuthed and clears the form', async () => {
    const onAuthed = vi.fn();
    const { calls } = mockFetch({
      'POST /login': { body: { user: { id: 1, name: 'Ana' }, token: 'abc' } },
    });
    const u = userEvent.setup();
    renderWithApp(<AuthPanel onAuthed={onAuthed} />);

    await u.type(screen.getByLabelText('Email'), 'ana@example.com');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Welcome back, Ana.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({ email: 'ana@example.com', password: 'secret123' });
    expect(localStorage.getItem('token')).toBe('abc');
    expect(onAuthed).toHaveBeenCalledTimes(1);

    // Regression: reading event.currentTarget after the await used to throw
    // "event.currentTarget is null", so the form was never reset and an
    // error notice replaced the welcome message.
    expect(screen.getByRole('status')).toHaveAttribute('data-error', 'false');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('treats HTTP 200 without a token (wrong password) as a failure', async () => {
    const onAuthed = vi.fn();
    mockFetch({
      'POST /login': { body: { errors: { email: ['These credentials do not match our records.'] } } },
    });
    const u = userEvent.setup();
    renderWithApp(<AuthPanel onAuthed={onAuthed} />);

    await u.type(screen.getByLabelText('Email'), 'ana@example.com');
    await u.type(screen.getByLabelText('Password'), 'wrong');
    await u.click(screen.getByRole('button', { name: 'Log in' }));

    const notice = await screen.findByText('These credentials do not match our records.');
    expect(notice).toHaveAttribute('data-error', 'true');
    expect(onAuthed).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('registers a new account and logs in', async () => {
    const onAuthed = vi.fn();
    const { calls } = mockFetch({
      'POST /register': { status: 201, body: { user: { id: 2, name: 'Bruno' }, token: 'new-token' } },
    });
    const u = userEvent.setup();
    renderWithApp(<AuthPanel onAuthed={onAuthed} />);

    await u.click(screen.getByRole('tab', { name: 'Register' }));
    await u.type(screen.getByLabelText('Name'), 'Bruno');
    await u.type(screen.getByLabelText('Email'), 'bruno@example.com');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.type(screen.getByLabelText('Repeat password'), 'secret123');
    await u.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Account created. You are logged in as Bruno.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({
      name: 'Bruno',
      email: 'bruno@example.com',
      password: 'secret123',
      password_confirmation: 'secret123',
    });
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(onAuthed).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('shows a notice when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const u = userEvent.setup();
    renderWithApp(<AuthPanel onAuthed={vi.fn()} />);

    await u.type(screen.getByLabelText('Email'), 'ana@example.com');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText(/Cannot reach the API/)).toBeInTheDocument();
  });

  it('switches between the login and register forms', async () => {
    const u = userEvent.setup();
    renderWithApp(<AuthPanel onAuthed={vi.fn()} />);

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    await u.click(screen.getByRole('tab', { name: 'Register' }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true'));
    await u.click(screen.getByRole('tab', { name: 'Log in' }));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
