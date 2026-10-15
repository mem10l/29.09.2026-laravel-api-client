// Shapes of the data this app exchanges with the Laravel API. These exist
// purely for the compiler — they describe what every api() call is allowed
// to send and what it can expect back, so a typo like `post.titel` or
// passing the wrong field to a request body is caught before you run it.

export interface User {
  id: number;
  name: string;
}

// post_status_id: 1 = public, 2 = private (see STATUS in api.ts).
export interface Post {
  id: number;
  title: string;
  body: string;
  user_id: number;
  post_status_id: number;
  created_at: string;
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
}

// What /login and /register return. `token` is only present when the
// Laravel side actually looked the credentials up — on a wrong password it
// returns 200 with `errors` and no token, which is why `token` here is
// optional rather than always present (see AuthPanel.tsx).
export interface AuthResponse {
  user: User;
  token?: string;
  errors?: Record<string, string[]>;
  message?: string;
}

// The shape of a Laravel validation/error response, used by errorText().
export interface ApiErrorBody {
  errors?: Record<string, string[]>;
  message?: string;
}
