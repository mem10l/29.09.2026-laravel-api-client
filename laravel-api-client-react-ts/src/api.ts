import type { ApiErrorBody } from './types';

// Where "php artisan serve" is running.
export const API_URL = 'http://127.0.0.1:8000/api';

// IDs come from the post_statuses migration (public is inserted first).
export const STATUS: Record<number, string> = { 1: 'public', 2: 'private' };

// Public APIs for the sidebar widgets (no key needed for any of these).
export const QUOTE_URL = 'https://api.kanye.rest';
export const CAT_URL = 'https://catfact.ninja/fact';
export const JOKE_URL = 'https://icanhazdadjoke.com';
export const FACT_URL = 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';

// Turns a Laravel error response into one readable sentence.
export function errorText(status: number, data: ApiErrorBody | null): string {
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  if (data?.message) return data.message;
  return `Request failed (HTTP ${status}).`;
}

interface ApiOptions {
  method?: string;
  body?: Record<string, unknown>;
}

// One wrapper around fetch() for every Laravel endpoint. Reads the token
// from localStorage itself, so callers never have to pass it around.
// The <T> type parameter is what the caller expects back — e.g.
// api<Post[]>('/posts') types `data` as Post[] with no cast needed.
export async function api<T>(path: string, { method = 'GET', body }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }; // makes Laravel answer with JSON, never HTML redirects
  if (body) headers['Content-Type'] = 'application/json';

  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the API. Is "php artisan serve" running?');
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorText(response.status, data));
  return data as T;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
