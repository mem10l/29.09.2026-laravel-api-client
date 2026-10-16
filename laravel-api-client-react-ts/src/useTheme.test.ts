import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('defaults to light when index.html has not set a theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });

  it('starts from the theme the inline script put on <html>', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');
  });

  it('toggles between light and dark', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1]());
    expect(result.current[0]).toBe('dark');
    act(() => result.current[1]());
    expect(result.current[0]).toBe('light');
  });

  it('keeps <html data-theme> and localStorage in sync', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1]());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
