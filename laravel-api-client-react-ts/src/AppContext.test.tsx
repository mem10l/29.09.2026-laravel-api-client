import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from './AppContext';

const wrapper = AppProvider;

describe('AppContext', () => {
  it('starts logged out', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.notice).toBeNull();
  });

  it('restores the user saved in localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'Saved' }));
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.user).toEqual({ id: 7, name: 'Saved' });
  });

  it('ignores corrupt data in localStorage', () => {
    localStorage.setItem('user', '{not json');
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('login() stores the token and user', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.login({ user: { id: 1, name: 'Ana' }, token: 'tok' }));
    expect(result.current.user).toEqual({ id: 1, name: 'Ana' });
    expect(localStorage.getItem('token')).toBe('tok');
  });

  it('login() does nothing when the response has no token', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.login({ user: { id: 1, name: 'Ana' } }));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout() clears the session', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Ana' }));
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('notify() shows a notice that disappears after 5 seconds', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.notify('Saved.'));
    expect(result.current.notice).toEqual({ message: 'Saved.', isError: false });
    act(() => { vi.advanceTimersByTime(4999); });
    expect(result.current.notice).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.notice).toBeNull();
  });

  it('guard() turns a thrown Error into an error notice', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const guarded = result.current.guard(async () => { throw new Error('Boom'); });
    await act(async () => { await guarded(); });
    expect(result.current.notice).toEqual({ message: 'Boom', isError: true });
  });

  it('guard() passes its arguments through and stays quiet on success', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const handler = vi.fn<(a: number, b: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => { await result.current.guard(handler)(1, 'two'); });
    expect(handler).toHaveBeenCalledWith(1, 'two');
    expect(result.current.notice).toBeNull();
  });

  it('useApp() throws when used outside <AppProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useApp())).toThrow('useApp() must be used inside <AppProvider>');
  });
});
