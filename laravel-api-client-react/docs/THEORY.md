# Theory: CSR, SSR, Hydration, and React fundamentals

## Client-Side Rendering (CSR)

The server sends an almost-empty HTML file (like this project's `index.html`
with just `<div id="root"></div>`) and one large JavaScript bundle. The
browser downloads the JS, runs it, and only then does JavaScript build all
the DOM content.

**This project (React + Vite) works exactly this way.** Viewing "View Page
Source" (not DevTools Elements) shows a practically empty `<div id="root"></div>`
— all content only appears after the browser executes `main.jsx`.

Pros:
- Simpler architecture — the server doesn't need to know about components
- After the initial load, navigation is very fast (no full page reload)

Cons:
- Slower first render (blank screen while JS downloads and executes)
- Worse SEO without extra work — search engine bots have to execute JS to see content
- On slower devices or slower networks, the user sees a blank page or a
  "Loading..." state for a while

## Server-Side Rendering (SSR)

The server itself executes the component code (e.g. React) and sends the
browser **already-built HTML** with all the content inside. The browser can
show text and images immediately, before JavaScript has even loaded.

Example: if this project's posts page were SSR, the server would itself call
`/api/posts`, build HTML with all the post cards, and send it ready-made.

Pros:
- Faster First Contentful Paint
- Better SEO by default — the bot sees full HTML right away
- Works even if JS fails to load (partially)

Cons:
- More complex architecture (the server needs to be able to run components — a Node.js environment)
- Every page request requires server work, not just serving a static file
- The page looks ready but isn't interactive yet (see below)

## Hydration

This is the **bridge between SSR and CSR**. When the server sends
already-built HTML (SSR), that HTML is "mute" — buttons don't do anything,
forms don't work, because no JavaScript event listeners are attached to it
yet.

Hydration is the process where the JavaScript loaded in the browser "walks
over" the existing HTML and attaches all the interactivity (click handlers,
state) **without rebuilding the DOM from scratch**. React recognizes that
the HTML structure already matches what it would have built itself, and
simply "attaches" to it.

```
1. Server: runs React → builds HTML → sends ready HTML
2. Browser: shows the HTML immediately (user sees content)
3. Browser: downloads the JS bundle in the background
4. React (client-side): "hydrates" the existing HTML — adds event
   listeners, but doesn't re-render the DOM
5. The page becomes interactive
```

Between steps 2 and 5 there's an "uncanny valley" period — the page
**looks** ready and interactive, but the buttons don't work yet. This is
the *Time to Interactive* problem.

## Summary

| | CSR | SSR | SSR + Hydration |
|---|---|---|---|
| What the server sends | almost-empty HTML | ready-made HTML | ready-made HTML + JS |
| First render | slow (blank → JS → content) | fast (content right away) | fast |
| Interactivity | immediate once JS is ready | none until hydrated | delayed after render |
| Typical tools | Vite, Create React App | — | Next.js, Remix, Nuxt |

**This project (Vite + React) is pure CSR** — no SSR, and therefore no
hydration either, because the server (or the static hosting from
`npm run preview`) never executes React code; it only serves the JS file and
an empty `index.html`.

---

## What is React?

**React** is a JavaScript library for building user interfaces, developed by
Facebook (now Meta). The core idea: the UI is described as a **set of
functions (components)** that build what should be shown on screen from
data (state), and React itself handles updating the real DOM efficiently
when that data changes.

In this project, React replaced manual DOM manipulation — the earlier
vanilla-JS version wrote `document.createElement()`, `appendChild()`,
`replaceChildren()`, etc. by hand. In the React version, you only say **what
the UI looks like given the data**, and React decides what and how to
change in the DOM.

## React components

A component is a regular JavaScript function that returns JSX (HTML-like
syntax) and can be reused. Each `.jsx` file in this project exports one
component:

```jsx
// src/components/NewPostForm.jsx
export default function NewPostForm({ onCreated }) {
  // ...
  return (
    <section className="panel">
      <h2>New post</h2>
      <form className="form" onSubmit={onSubmit}>
        ...
      </form>
    </section>
  );
}
```

Important principles visible in this code:
- **Components receive "props"** (parameters) — e.g. `NewPostForm` receives
  an `onCreated` function from its parent (`App.jsx`) to report that a new
  post was created.
- **Components can contain other components** — `App.jsx` combines
  `TopBar`, `AuthPanel`, `PostFeed`, `CatFactWidget`, etc. on one page.
- **Single-responsibility principle** — each component does one thing:
  `Comments.jsx` only shows and manages comments, `PostCard.jsx` handles one
  post.

## The `useState` hook

`useState` is a function that lets a component **"remember" data between
renders** and automatically re-render when that data changes.

Example from `CatFactWidget.jsx`:

```jsx
const [fact, setFact] = useState('Loading…');
const [maxLength, setMaxLength] = useState('');
```

- `fact` — the current value (starts as `'Loading…'`)
- `setFact` — a function that, when called with a new value, makes React
  **re-render** the component with the new value

```jsx
async function load(length) {
  setFact('Loading…');       // the screen shows "Loading…"
  const data = await response.json();
  setFact(data.fact);        // the screen shows the new fact
}
```

Important: calling `setFact(...)` does **not** mutate a variable directly
(like `fact = 'new text'`), it tells React: "re-render this component with
this new value." This is fundamentally different from the old vanilla-JS
version, where the code did `box.textContent = data.fact` directly.

## The `useEffect` hook

`useEffect` lets you run code with **side effects** — such as API requests,
timers, subscriptions — that aren't directly part of rendering, but need to
run after the component has been shown on screen.

Example from `Comments.jsx`:

```jsx
useEffect(() => {
  let cancelled = false;
  api(`/posts/${postId}/comments`)
    .then((data) => { if (!cancelled) setComments(data); })
    .catch((error) => notify(error.message, true));
  return () => { cancelled = true; };
}, [postId]);
```

Here:
- The function inside `useEffect` runs **after** the first render (and
  after every time `postId` changes, since it's in the dependency array
  `[postId]`)
- It loads the comments from the API and saves them into state with
  `setComments`
- `return () => { cancelled = true; }` is a **cleanup function** — if the
  component is removed from the screen, or `postId` changes before the
  request finishes, this prevents calling `setState` on an already
  "dead" component

A simpler example from `TextApiWidget.jsx`:

```jsx
useEffect(() => { load(); }, [load]);
```

This means: "when the component first appears on screen (or when the
`load` function changes), call `load()`" — this replaces the old vanilla-JS
version's `init()` function, which ran once at page start.

### `useState` vs `useEffect` — the difference

| | `useState` | `useEffect` |
|---|---|---|
| What it does | Stores data and triggers a re-render | Runs code after rendering |
| When to use it | When the component needs "memory" | When you need an API request, a timer, a subscription |
| Example | `const [token, setToken] = useState(null)` | `useEffect(() => { fetchData() }, [])` |

## Advantages React provides

1. **Declarative style** — you describe *how the UI looks given the data*,
   not *step by step how to change it*. Compare the old `postCard()`
   function (which manually built DOM elements) with the new `PostCard.jsx`,
   which simply returns JSX based on the `post` and `editing` state.

2. **Reusable components** — `TextApiWidget.jsx` is one component used
   three times by `App.jsx` with different parameters (quote, joke, fact),
   instead of three nearly identical functions, as it would be in the
   vanilla-JS version.

3. **Automatic, efficient DOM updates** — React uses a virtual DOM to
   recompute only what actually changed, instead of redrawing the entire
   page.

4. **Large community and ecosystem** — many libraries, tools, and
   documentation; solutions are easy to find.

5. **Structured state management** — `AppContext.jsx` shows how data (the
   logged-in user, the notice banner) can be shared between components
   without manual DOM lookups (`document.querySelector`).

## When to use React, and when not to

**Use it when:**
- The app has a lot of **changing, interrelated state** (login/logout,
  posts, comments, edit modes) — this project's exact case
- The project will grow and have many components that need to be reused
- A team is working on a large project and needs clear structure
- Rich interactivity is needed (forms, real-time updates, conditionally
  rendered elements)

**Don't use it (or consider alternatives) when:**
- The page is **static or nearly static** (e.g. a business-card page,
  documentation) — plain HTML/CSS or a small amount of vanilla JS is
  enough there, as this project's original version was before converting
- A very fast first load and good SEO are needed without extra work, and
  there's no willingness/ability to add SSR (see the SSR/CSR/Hydration
  section above) — then React without Next.js/Remix can be overkill
- The project is small, a single page with one or two interactions — React
  adds complexity (build tools, dependencies, a learning curve) that may
  not be justified
- The performance budget is very tight (e.g. a slow network, where a small
  JS bundle is critical) — the React bundle (~155 KB in this project's
  build output) is larger than hand-written vanilla JS

In this project's specific case, moving from vanilla JS to React was
justified, because the app had already grown to several interrelated
pieces of state (authentication, posts, comments, editing, theme) — exactly
the scenario where React's advantages (structured state, reusable
components) outweigh the complexity it adds.
