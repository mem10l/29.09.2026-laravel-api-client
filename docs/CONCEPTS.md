# Understanding this codebase, term by term

> This is the TypeScript (`.tsx`) version of the client. The React
> concepts below are identical to the plain-JavaScript version — this doc
> was carried over and its file references updated to `.tsx`/`.ts`. For
> what TypeScript itself adds on top (types, interfaces, generics), see
> [`TYPESCRIPT.md`](TYPESCRIPT.md) instead.

This walks through every React concept actually used in this project, in
the order you'd hit them reading the code top to bottom. Each term is
explained using the real line from this codebase, not a generic example.

If you want the bigger-picture "what is React / CSR vs SSR" background
first, read [`THEORY.md`](THEORY.md). If you want every HTML tag explained,
read [`TAGS.md`](TAGS.md). This doc is about the *JavaScript/React*
machinery in between those tags.

---

## 1. Components and props

A **component** is just a function that returns JSX (markup). A function
becomes a component the moment you call it like a tag: `<NewPostForm />`.

```jsx
// src/components/NewPostForm.tsx
export default function NewPostForm({ onCreated }) {
```

`{ onCreated }` here is **destructuring props**. When `App.tsx` writes:

```jsx
<NewPostForm onCreated={() => feedRef.current?.reload()} />
```

React calls `NewPostForm({ onCreated: () => feedRef.current?.reload() })`
behind the scenes. `onCreated` is a **prop** — a value passed from parent
to child, same direction as an HTML attribute, except it can be *any*
JavaScript value: a string, a number, an object, or (as here) a function.

Passing a function down as a prop is how a child tells its parent "something
happened" — `NewPostForm` doesn't know *what* `onCreated` does, it just
calls it after a successful POST. The parent decides what that means
(reload the post list).

## 2. JSX

JSX is the HTML-looking syntax inside the `return (...)`. It's not a
string and it's not real HTML — it compiles to plain JavaScript function
calls. `<h1>Posts</h1>` becomes roughly
`React.createElement('h1', null, 'Posts')`. That's why you can drop
JavaScript into it with curly braces:

```jsx
<span>{user.name}</span>
```

`{user.name}` is JavaScript; everything outside the braces is treated as
literal text/markup.

### Conditional rendering

Three patterns show up repeatedly:

```jsx
// ternary: render one of two things
{tab === 'login' ? (
  <form className="form" onSubmit={onLogin}>...</form>
) : (
  <form className="form" onSubmit={onRegister}>...</form>
)}
```

```jsx
// && : render something, or nothing
{notice && (
  <p className={`notice ${notice.isError ? 'error' : ''}`} role="status">
    {notice.message}
  </p>
)}
```
`notice && <p>...</p>` works because JSX treats `false`, `null`, and
`undefined` as "render nothing." If `notice` is `null`, the `&&`
short-circuits and nothing is rendered; if it's an object, the `<p>` renders.

```jsx
// early return: render a completely different thing and stop
if (comments === null) return <div className="comments">Loading…</div>;
```
(from `Comments.tsx` — before the data has arrived, the function returns
early with a loading message instead of reaching the real JSX below it.)

### Lists and `key`

```jsx
{posts && posts.map((post) => (
  <PostCard key={post.id} post={post} onUpdated={update} onDeleted={remove} />
))}
```
Whenever you render a list with `.map()`, every item needs a `key` prop —
a stable, unique identifier. React uses it to figure out which items
changed, were added, or were removed between renders, instead of
re-rendering the whole list from scratch. `post.id` is a good key because
it never changes for a given post; the array *index* would be a bad key
here, because deleting post #1 would shift every other post's index.

### Fragments: `<>...</>`

```jsx
return (
  <>
    <TopBar onLoggedOut={() => feedRef.current?.reload()} />
    {notice && ( ... )}
    <main className="layout">...</main>
  </>
);
```
A component can only return *one* root element. `Shell` needs to return a
header, a notice, and a `<main>` side by side — three siblings — but
wrapping them in a real `<div>` would add a meaningless extra element to
the page. `<>...</>` (a **Fragment**) groups them without adding any actual
HTML tag.

## 3. `useState` — a component's memory

```jsx
const [theme, setTheme] = useState(
  () => document.documentElement.getAttribute('data-theme') || 'light',
);
```
(from `useTheme.ts`)

`useState` gives a component a piece of **state**: a value that survives
between re-renders, plus a function to change it. The array-destructuring
`[theme, setTheme]` is just a naming convention — `useState` actually
returns a two-item array, `[currentValue, setterFunction]`.

Two important rules, both visible in this codebase:

- **Calling the setter triggers a re-render.** When `CatFactWidget` does
  `setFact(data.fact)`, React re-runs the component function and the new
  `fact` value is what gets displayed. You never mutate state directly
  (`fact = 'new text'` would do nothing visible).
- **The setter can take a function instead of a value**, when the new
  value depends on the old one:
  ```jsx
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  ```
  This "updater function" form guarantees you're flipping the *actual
  latest* theme, not a stale value captured from an earlier render.

`useState`'s argument can also be a function (`() => ...` above) rather
than a plain value — that's a small optimization: the function only runs
once, on the very first render, instead of being recomputed every time the
component re-renders for an unrelated reason.

## 4. `useEffect` — doing things *after* a render

```jsx
useEffect(() => {
  let cancelled = false;
  api(`/posts/${postId}/comments`)
    .then((data) => { if (!cancelled) setComments(data); })
    .catch((error) => notify(error.message, true));
  return () => { cancelled = true; };
}, [postId]);
```
(from `Comments.tsx`)

`useEffect(fn, deps)` runs `fn` after the component has rendered — and
again, automatically, whenever any value in the `deps` array changes. This
is for **side effects**: things that reach outside the component (network
requests, timers, reading `localStorage`) rather than just computing what
to display.

Reading this one line by line:
- `[postId]` means "re-run this effect if `postId` ever changes" — e.g. if
  you opened a different post's comments.
- `let cancelled = false` plus `return () => { cancelled = true; }` is a
  **cleanup function**. If the component disappears (or `postId` changes)
  before the fetch finishes, the cleanup flips `cancelled` to `true`, so
  the stale `.then()` callback checks `if (!cancelled)` and skips calling
  `setComments` on a component that's no longer there. Without this, you'd
  risk "Can't update state on an unmounted component" bugs or, worse,
  showing comments for the *wrong* post if you switched posts quickly.

A simpler shape, with an empty dependency array:
```jsx
useEffect(() => { load(); }, []); // CatFactWidget.tsx
```
`[]` means "the values this effect depends on never change" — in practice,
this reads as "run this once, right after the first render," which is how
every widget in this app loads its initial data.

## 5. `useCallback` — keeping a function identity stable

```jsx
const notify = useCallback((message, isError = false) => {
  setNotice({ message, isError });
  clearTimeout(noticeTimer.current);
  noticeTimer.current = setTimeout(() => setNotice(null), 5000);
}, []);
```
(from `AppContext.tsx`)

Every time a component re-renders, any plain function defined inside it is
a *brand new* function — even if the code looks identical to last time.
Normally that's harmless. It matters here because `notify` is put into
context (`AppContext.Provider value={...}`) and read by `useEffect` hooks
elsewhere (like `usePosts`'s `reload`, which lists `notify` in its own
dependency array). If `notify` were a new function on every render, every
effect that depends on it would think "my dependency changed" and re-run
unnecessarily — in the worst case, causing an infinite loop of effects
re-triggering re-renders.

`useCallback(fn, deps)` returns the *same* function reference across
renders, as long as `deps` hasn't changed. `[]` here means "this function
never needs to change, create it once."

You'll see the same pattern in `usePosts.ts` for `reload`, `update`, and
`remove` — all memoized with `useCallback` for the same reason: other code
(an effect, a ref) depends on them, and depends on them *not* changing
identity on every render.

## 6. `useRef` — a value that survives renders *without* causing one

```jsx
const noticeTimer = useRef();
```
(from `AppContext.tsx`) and
```jsx
const feedRef = useRef(null);
```
(from `App.tsx`)

`useRef` looks like `useState` but behaves differently: changing
`.current` does **not** trigger a re-render. It's for values you need to
keep around between renders that aren't part of what's displayed.

- `noticeTimer.current` holds the ID returned by `setTimeout`, purely so a
  later call can `clearTimeout(noticeTimer.current)` to cancel a pending
  "hide the notice" timer if a new notice arrives first. The timer ID
  itself is never shown on screen, so it doesn't belong in `useState`.
- `feedRef` is used differently — see `forwardRef` below.

## 7. Context: `createContext`, `Provider`, `useContext`

```jsx
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ...
  const value = { user, login, logout, notify, notice, guard };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
```
(from `AppContext.tsx`)

Props work fine for passing data one level down, but get awkward for data
that *lots* of unrelated components need — here, "who's logged in" and
"show this notice" are needed by `TopBar`, `AuthPanel`, `NewPostForm`,
`PostCard`, and `Comments`, none of which are direct parent/child of each
other.

**Context** solves this: `createContext` makes a shared "channel."
`<AppContext.Provider value={...}>` (wrapping the whole app, in `App.tsx`:
`<AppProvider><Shell /></AppProvider>`) makes that `value` available to
*any* component nested inside it, no matter how deep. `useContext(AppContext)`
— wrapped here in the friendlier name `useApp()` — is how a component
reads it:

```jsx
const { user, logout, notify } = useApp(); // TopBar.tsx
```

`children` in `AppProvider({ children })` is a special prop: it's
whatever JSX was written *between* the component's opening and closing
tags — in this case, `<Shell />`.

## 8. Custom hooks

Any function whose name starts with `use` and that calls other hooks
inside it is a **custom hook** — a way to package up stateful logic so it
can be reused. This project has three:

- **`useApp()`** (in `AppContext.tsx`) — shorthand for
  `useContext(AppContext)`.
- **`useTheme()`** (`useTheme.ts`) — owns the dark/light state, syncs it to
  `<html data-theme>` and `localStorage`, and returns `[theme, toggle]`.
  `TopBar.tsx` just calls `const [theme, toggleTheme] = useTheme();` and
  gets a ready-to-use toggle button handler, without needing to know
  *how* the theme is persisted.
- **`usePosts(ref)`** (`hooks/usePosts.ts`) — owns the entire post list:
  fetching it, updating one post in place, removing one, and loading it on
  mount. `PostFeed.tsx` becomes almost entirely about *rendering*, because
  all the data logic was moved into this hook.

The benefit in all three cases: the logic is written once, and the
component using it reads like a plain list of "give me these values and
these functions," not a tangle of `useState`/`useEffect` calls mixed in
with JSX.

### `guard()` — not a hook, but built the same way

```jsx
const guard = useCallback((handler) => async (...args) => {
  try {
    await handler(...args);
  } catch (error) {
    notify(error.message, true);
  }
}, [notify]);
```
(from `AppContext.tsx`)

`guard` is a **higher-order function**: a function that takes a function
and returns a new function. Every form submit handler in this app looks
like:

```jsx
const onLogin = guard(async (event) => {
  event.preventDefault();
  // ...
  if (!data.token) throw new Error(errorText(200, data));
  // ...
});
```
(from `AuthPanel.tsx`)

Instead of every single handler writing its own
`try { ... } catch (error) { notify(error.message, true) }`, they just
`throw` when something's wrong, and `guard` catches it once, centrally, and
shows it via the notice banner. This is the same pattern the vanilla-JS
version of this project used (also called `guard()` there) — same idea,
just expressed as a hook-friendly function here instead of a plain closure.

## 9. `forwardRef` and `useImperativeHandle` — letting a parent call a child's function

Normally, data flows *down* through props, and a child talks back *up*
only by calling a function the parent gave it (like `onCreated` above).
But here, `App.tsx` needs to directly tell `PostFeed` "reload your data"
after a login, logout, or new post — and `PostFeed`'s internals
(`usePosts`) are not something `App.tsx` should need to know about.

```jsx
// App.tsx
const feedRef = useRef(null);
// ...
<PostFeed ref={feedRef} />
// ...
<TopBar onLoggedOut={() => feedRef.current?.reload()} />
```

```jsx
// PostFeed.tsx
const PostFeed = forwardRef(function PostFeed(_props, ref) {
  const { posts, reload, update, remove } = usePosts(ref);
  // ...
});
```

```jsx
// hooks/usePosts.ts
useImperativeHandle(ref, () => ({ reload }), [reload]);
```

Three pieces working together:
- **`forwardRef`** lets a function component receive a `ref` — normally
  only plain HTML elements (like `<input ref={...}>`) can take one.
- **`useImperativeHandle(ref, () => ({ reload }), [reload])`** decides
  *what* the parent is allowed to do through that ref — here, exactly one
  thing: call `.reload()`. The parent can't reach into `PostFeed`'s
  internal state at all; it only gets the narrow API this line exposes.
- The parent then calls `feedRef.current?.reload()`. The `?.` (**optional
  chaining**) guards against calling `.reload()` before `PostFeed` has
  mounted and attached the ref yet, in which case `feedRef.current` is
  still `null`.

This is deliberately used sparingly in React — props/state are the normal
way data flows. It's reached for here specifically because "refresh the
list" needs to be triggered by three unrelated components (`TopBar`,
`AuthPanel`, `NewPostForm`) that have no other relationship to `PostFeed`.

## 10. Controlled vs. uncontrolled inputs

Two different patterns show up for form fields in this codebase:

**Uncontrolled** — the DOM holds the value, React just reads it on submit:
```jsx
// NewPostForm.tsx
<input type="text" name="title" required maxLength={255} />
// ...
const form = new FormData(event.target);
await api('/posts', { body: { title: form.get('title'), ... } });
```
There's no `useState` tracking what's typed into this field. `FormData`
reads whatever the browser currently has in the form at submit time. This
is simpler whenever you don't need the value for anything *until* submit.

**Controlled** — React's state *is* the value, on every keystroke:
```jsx
// CatFactWidget.tsx
const [maxLength, setMaxLength] = useState('');
// ...
<input
  value={maxLength}
  onChange={(event) => setMaxLength(event.target.value)}
/>
```
Here, `value={maxLength}` means the input can never show anything React's
state doesn't already know about, and `onChange` keeps that state updated
on every keystroke. This is necessary whenever something *else* on the
page needs to react to the value as it's being typed, or whenever the
value needs to be reset or changed from outside the input itself (e.g.
`Comments.tsx` clearing `text` back to `''` after a successful post).

Similarly, `PostCard.tsx`'s edit form uses `defaultValue={post.title}` —
a *third* variant: pre-fill an uncontrolled input with a starting value,
without tracking every keystroke in state, same `FormData`-on-submit
pattern as `NewPostForm`.

## 11. Everything else that isn't React-specific

A few things that look like part of "the React way" but are actually
plain JavaScript or browser APIs, used *inside* React components:

- **`async`/`await`, `try`/`catch`, `throw`** — ordinary JS error handling.
  `api.ts`'s `api()` function `throw`s a plain `Error`; `guard()` is what
  turns that into something the user sees.
- **Template literals** — `` `Bearer ${token}` ``, `` `User #${post.user_id}` ``
  — string interpolation, nothing React-specific.
- **`localStorage`** — the browser's own persistent key/value store,
  used for the auth token, the logged-in user, and the theme choice. It
  has nothing to do with React; it's just how this app remembers things
  across page reloads.
- **`fetch`** — the browser's built-in HTTP client. `api.ts` wraps it once
  for talking to the Laravel backend; the widgets (`TextApiWidget.tsx`,
  `CatFactWidget.tsx`) call it directly for the public APIs, deliberately
  *not* through `api()`, so the Laravel auth token never gets attached to
  those third-party requests.
- **`confirm()`** — the browser's native "OK/Cancel" dialog, used in
  `PostCard.tsx` before deleting a post. Blocks everything until the user
  answers; fine for a small app, but a real design system would replace
  it with a custom modal.

## Quick lookup table

| Term | One-line meaning | Where to see it |
|---|---|---|
| Component | A function that returns JSX | every `.tsx` file |
| Props | Data passed from parent to child | `function NewPostForm({ onCreated })` |
| JSX | HTML-like syntax that compiles to JS | everywhere inside `return (...)` |
| `useState` | State that persists between renders and triggers re-render when changed | `const [fact, setFact] = useState(...)` |
| `useEffect` | Run code after render, optionally on a schedule tied to dependencies | `Comments.tsx`'s comment-loading effect |
| `useCallback` | Keep a function's identity stable across renders | `notify`, `reload`, `update`, `remove` |
| `useRef` | A mutable value that survives renders without causing one | `noticeTimer`, `feedRef` |
| `createContext`/`Provider`/`useContext` | Share data across many components without prop-drilling | `AppContext.tsx` |
| Custom hook | A reusable function starting with `use` that calls other hooks | `useApp`, `useTheme`, `usePosts` |
| `forwardRef`/`useImperativeHandle` | Let a parent call a specific function on a child | `PostFeed` + `usePosts` |
| Controlled input | React state drives the input's value | `CatFactWidget`'s `maxLength` field |
| Uncontrolled input | The DOM holds the value; read via `FormData` on submit | `NewPostForm`'s fields |
