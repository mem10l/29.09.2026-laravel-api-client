# Posts client (React + TypeScript + Vite)

The TypeScript port of `laravel-api-client-react/` — same app, same
behavior, same styling, every `.jsx`/`.js` file converted to `.tsx`/`.ts`
with real types for the API data (`Post`, `Comment`, `User`, ...), typed
component props, and `strict` mode turned on.

Talks to the Laravel API at `http://127.0.0.1:8000/api` and to four public
APIs (kanye.rest, catfact.ninja, icanhazdadjoke.com, uselessfacts.jsph.pl).

## Run it

```bash
# terminal 1: the Laravel API
cd laravel-api
php artisan migrate
php artisan serve

# terminal 2: this project
cd laravel-api-client-react-ts
npm install
npm run dev        # opens http://localhost:5500
```

- `npm run build` — type-checks (`tsc -b`) then builds to `dist/`. The
  build **fails** if there's a type error, by design.
- `npm run typecheck` — just the type check, no build, useful while editing.
- `npm run preview` — serves the built `dist/` folder.

## Project layout

```
src/
  main.tsx               entry point
  App.tsx                 page layout
  api.ts                   typed fetch() wrapper + the four public API URLs
  types.ts                  shared interfaces: User, Post, Comment, AuthResponse
  AppContext.tsx            logged-in user + notice banner + guard(), shared via context
  useTheme.ts                dark/light mode hook, synced with <html data-theme>
  vite-env.d.ts                Vite's ambient type declarations
  hooks/
    usePosts.ts              post list's data + mutations, used by PostFeed;
                             also defines PostFeedHandle, the ref type
  components/
    TopBar.tsx             header, log-out button, dark/light toggle
    AuthPanel.tsx           login / register tabs
    NewPostForm.tsx         create-post form (shown once logged in)
    PostFeed.tsx             renders the post list (data comes from usePosts)
    PostCard.tsx              one post: view, edit, status toggle, delete
    Comments.tsx               comments for one post, loaded on demand
    TextApiWidget.tsx          reusable box for quote / joke / useless-fact
    CatFactWidget.tsx          cat-fact box with the max_length parameter field
  style.css                 identical to the JS version — unaffected by TS
```

## Docs

- [`docs/TAGS.md`](docs/TAGS.md) — every HTML tag and custom component
  used, and why each one was chosen. Unaffected by TypeScript, carried over
  as-is.
- [`docs/THEORY.md`](docs/THEORY.md) — CSR, SSR, Hydration, and React
  fundamentals.
- [`docs/CONCEPTS.md`](docs/CONCEPTS.md) — every React hook/pattern used
  (`useState`, `useEffect`, `useCallback`, context, custom hooks,
  `forwardRef`, controlled vs. uncontrolled inputs), same content as the JS
  version with file references updated to `.tsx`/`.ts`.
- [`docs/TYPESCRIPT.md`](docs/TYPESCRIPT.md) — **new for this version**:
  what TypeScript itself adds on top of the above — interfaces, generics,
  typed props, typing `forwardRef`, `strict` mode, and where the type
  system's guarantees stop (it never checks the real API's JSON at
  runtime).

## Notes carried over from the JS/vanilla versions

- Login returns HTTP 200 with an `errors` object (no token) on a wrong
  password — `AuthResponse.token` is typed as optional (`token?: string`)
  specifically because of this.
- `post_status_id`: 1 = public, 2 = private (from the `post_statuses`
  seeder). The API returns private posts to everyone — the badge only
  labels them, it doesn't hide them.
- There's no comment-edit endpoint, so this client only offers adding and
  deleting comments, not editing them.
- The four public-API widgets use plain `fetch()`, never the Laravel token.
- If CORS errors appear for icanhazdadjoke.com or uselessfacts.jsph.pl in
  your browser, that's those APIs' own CORS policy, not a bug in this
  client.

## Dark / light mode

Same mechanism as the JS version: a toggle (`☾`/`☀`) in the top bar flips
`<html data-theme>` between `"light"` and `"dark"`, persisted to
`localStorage`, with an inline script in `index.html` setting it before
React mounts to avoid a flash of the wrong theme.
