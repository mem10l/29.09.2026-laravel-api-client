# Posts client (vanilla JavaScript)

A plain HTML/CSS/JS front end for the Laravel posts API — no build step, no
framework, no dependencies. All data loading and DOM updates are done by
hand with `fetch()` and DOM APIs, using AJAX (no page reloads).

A React rewrite of this same app lives in `../laravel-api-client-react/`.

## Run it

```bash
# terminal 1: the Laravel API
cd laravel-api
php artisan migrate
php artisan serve                 # http://127.0.0.1:8000

# terminal 2: this project — must be served over http, not opened as file://
cd laravel-api-client
python3 -m http.server 5500       # then open http://localhost:5500
```

The VS Code "Live Server" extension works too. If the browser shows a CORS
error, check that `api/*` is allowed in the Laravel app's
`config/cors.php`.

If widgets get stuck on "Loading…" after you've edited the files, hard-refresh
(Ctrl+Shift+R / Cmd+Shift+R) — browsers cache `script.js` aggressively.

## Files

```
index.html    page structure: login/register, new-post form, post feed,
              and four public-API widgets (quote, cat fact, dad joke,
              useless fact)
script.js     all logic: the api() fetch wrapper, DOM helpers (el(), $()),
              session handling, post/comment CRUD, and the four widgets
style.css     styling (minimalist light/dark-ready palette)
```

`script.js` has no build step and no imports — it's loaded directly by
`<script src="script.js"></script>` in `index.html`.

## How it works

- **AJAX, no reloads:** every request goes through one `api()` function
  that wraps `fetch()`. Form submissions call `event.preventDefault()` and
  update the page by re-rendering just the parts that changed.
- **DOM manipulation:** a small `el(tag, attrs, ...children)` helper builds
  elements without innerHTML, so user-supplied text (post titles, comments)
  is always inserted as a text node, never parsed as HTML — this is what
  keeps the app safe from stored XSS.
- **Session:** the auth token and logged-in user are kept in
  `localStorage`, so a page refresh stays logged in. On load, the token is
  verified against `GET /user` before trusting it.
- **Public-API widgets:** the quote, cat-fact, dad-joke, and useless-fact
  boxes each call their API directly with a plain `fetch()` — the Laravel
  auth token is never attached to those requests.

## Notes on the Laravel API

- Login returns HTTP 200 with an `errors` object (no token) on a wrong
  password; the client checks for a missing token rather than the status
  code.
- `post_status_id`: 1 = public, 2 = private (from the `post_statuses`
  seeder). The API returns private posts to everyone — the badge only
  labels them, it doesn't hide them.
- There's no comment-edit endpoint (`CommentController` has no `update`
  method), so this client doesn't offer editing comments, only adding and
  deleting them.
- If CORS errors appear for `icanhazdadjoke.com` or `uselessfacts.jsph.pl`
  in your browser console, that's those APIs' own CORS policy, not a bug in
  this client.

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
  AppContext.jsx          logged-in user + notice banner, shared via context
  useTheme.js              dark/light mode hook, synced with <html data-theme>
  components/
    TopBar.jsx            header, log-out button, dark/light toggle
    AuthPanel.jsx          login / register tabs
    NewPostForm.jsx        create-post form (shown once logged in)
    PostFeed.jsx            fetches and lists posts
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
