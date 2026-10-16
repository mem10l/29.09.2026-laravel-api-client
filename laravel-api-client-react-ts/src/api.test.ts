import { describe, expect, it, vi } from 'vitest';
import { api, errorText, formatDate } from './api';
import { mockFetch } from './test/utils';

describe('errorText', () => {
  it('joins every Laravel validation message into one sentence', () => {
    const data = { errors: { email: ['Email is required.'], password: ['Too short.', 'Needs a digit.'] } };
    expect(errorText(422, data)).toBe('Email is required. Too short. Needs a digit.');
  });

  it('falls back to the top-level message', () => {
    expect(errorText(403, { message: 'This action is unauthorized.' })).toBe('This action is unauthorized.');
  });

  it('falls back to the HTTP status when the body has nothing useful', () => {
    expect(errorText(500, null)).toBe('Request failed (HTTP 500).');
    expect(errorText(500, {})).toBe('Request failed (HTTP 500).');
  });
});

describe('formatDate', () => {
  it('returns an empty string for missing dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formats an ISO date with day and year', () => {
    const text = formatDate('2026-09-24T10:00:00Z');
    expect(text).toContain('24');
    expect(text).toContain('2026');
  });
});

describe('api()', () => {
  it('asks for JSON and sends no Authorization header when logged out', async () => {
    const { calls } = mockFetch({ 'GET /posts': { body: [] } });
    await api('/posts');
    expect(calls[0].headers.Accept).toBe('application/json');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });

  it('sends the saved token as a Bearer header', async () => {
    localStorage.setItem('token', 'abc123');
    const { calls } = mockFetch({ 'GET /user': { body: { id: 1, name: 'Ana' } } });
    await api('/user');
    expect(calls[0].headers.Authorization).toBe('Bearer abc123');
  });

  it('serialises the body as JSON with a Content-Type header', async () => {
    const { calls } = mockFetch({ 'POST /posts': { status: 201, body: { id: 9 } } });
    const result = await api<{ id: number }>('/posts', { method: 'POST', body: { title: 'Hi' } });
    expect(result).toEqual({ id: 9 });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toEqual({ title: 'Hi' });
  });

  it('returns null for 204 No Content responses', async () => {
    mockFetch({ 'DELETE /posts/1': { status: 204 } });
    await expect(api('/posts/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('throws the Laravel validation text on a 422', async () => {
    mockFetch({
      'POST /posts': { status: 422, body: { message: 'Invalid.', errors: { title: ['The title is required.'] } } },
    });
    await expect(api('/posts', { method: 'POST', body: {} })).rejects.toThrow('The title is required.');
  });

  it('throws a helpful message when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/posts')).rejects.toThrow('Cannot reach the API. Is "php artisan serve" running?');
  });
});
