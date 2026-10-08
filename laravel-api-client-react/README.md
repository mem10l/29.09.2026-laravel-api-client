# Posts client (React + Vite)

Same app as the vanilla-JS version, rebuilt with React. Talks to the Laravel
API at `http://127.0.0.1:8000/api` and to four public APIs (kanye.rest,
catfact.ninja, icanhazdadjoke.com, uselessfacts.jsph.pl).

## Run it

```bash
# terminal 1: the Laravel API
cd laravel-api
php artisan migrate
php artisan serve

# terminal 2: this project
cd laravel-api-client-react
npm install
npm run dev        # opens http://localhost:5500
```

`npm run build` produces a static `dist/` folder; `npm run preview` serves it.

## Project layout

```
src/
  main.jsx              entry point
  App.jsx                page layout
  api.js                 fetch() wrapper + the four public API URLs
  AppContext.jsx          logged-in user + notice banner + guard(), shared via context
  useTheme.js              dark/light mode hook, synced with <html data-theme>
  hooks/
    usePosts.js             post list's data + mutations, used by PostFeed
  components/
    TopBar.jsx            header, log-out button, dark/light toggle
    AuthPanel.jsx          login / register tabs
    NewPostForm.jsx        create-post form (shown once logged in)
    PostFeed.jsx            renders the post list (data comes from usePosts)
    PostCard.jsx             one post: view, edit, status toggle, delete
    Comments.jsx              comments for one post, loaded on demand
    TextApiWidget.jsx         reusable box for quote / joke / useless-fact
    CatFactWidget.jsx         cat-fact box with the max_length parameter field
  style.css                light/dark theme via CSS variables
```

See [`docs/TAGS.md`](docs/TAGS.md) for a walkthrough of every HTML tag and
custom component used in the project, and why each one was chosen.

See [`docs/THEORY.md`](docs/THEORY.md) for background on CSR, SSR,
Hydration, and React fundamentals (`useState`, `useEffect`, components,
when to use React and when not to).

## Notes carried over from the vanilla-JS version

- Login returns HTTP 200 with an `errors` object (no token) on a wrong
  password; the client checks for a missing token rather than the status code.
- `post_status_id`: 1 = public, 2 = private (from the `post_statuses` seeder).
- The four public-API widgets (quote, cat fact, dad joke, useless fact) use
  plain `fetch()`, never the Laravel token.
- If CORS errors appear for icanhazdadjoke.com or uselessfacts.jsph.pl in
  your browser, that's the API's own CORS policy, not a bug in this client.

## Dark / light mode

A toggle (`☾`/`☀`) in the top bar switches `<html data-theme>` between
`"light"` and `"dark"`, and the choice is saved to `localStorage`. An inline
script in `index.html` sets the theme before React mounts (falling back to
the OS's `prefers-color-scheme` on first visit), so there's no flash of the
wrong theme on load.
