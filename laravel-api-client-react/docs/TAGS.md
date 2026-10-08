# Tags used in this project

There are two kinds of "tags" mixed together in the code: **real HTML
elements** (what the browser understands) and **custom React components**
(`<TopBar>`, `<PostCard>`, etc. — these are just function calls written in
angle-bracket syntax, not real HTML). This covers both.

## Document structure

| Tag | Used for |
|---|---|
| `<html>` | Root of the page. Carries `data-theme="dark"`/`"light"` (set by the inline script before React runs), which is how the dark-mode CSS switch works. |
| `<head>`, `<title>`, `<meta>` | Standard document metadata — charset, viewport, page title. Not rendered content. |
| `<body>` | Holds the single `<div id="root">` that React takes over. |
| `<script>` | One loads `main.jsx` as a module; the other is the small inline theme-detection script, which has to run *before* anything paints, so it can't be a React component. |

## Layout / semantic sectioning

These describe the **role** of a block of content, not just "a box" — that's
the whole point of using them instead of `<div>` everywhere:

| Tag | Where | Why this one |
|---|---|---|
| `<header>` | `TopBar.jsx` | The page's top banner (title + session + theme toggle). Screen readers can jump straight to it. |
| `<main>` | `App.jsx` (`.layout`) | Marks the primary content region of the page — there should be exactly one per page. |
| `<aside>` | `App.jsx` (`.side`) | Content related to the main content but not the main content itself — here, the sidebar of widgets (login, new post, quote/joke/fact boxes). |
| `<section>` | Every `.panel` (`AuthPanel`, `NewPostForm`, `TextApiWidget`, `CatFactWidget`), plus the feed | A distinct, self-contained block of content with its own heading. Some use `aria-labelledby` to formally tie the section to its `<h2>`. |
| `<article>` | `PostCard.jsx` | Content that stands on its own and would still make sense if pulled out and shown elsewhere (like in an RSS feed) — a single post is the textbook example. |

## Headings

`<h1>`, `<h2>`, `<h3>` form a hierarchy, not just "big text":

- `<h1>` — "Posts", the one page title, in `TopBar`.
- `<h2>` — section titles: "New post", "Random quote", "All posts", etc.
- `<h3>` — inside `PostCard`, the individual post's own title, one level below the section it lives in.

Skipping levels (e.g. jumping from `<h1>` straight to `<h3>`) would confuse
screen-reader navigation, so each component only uses the level that's
actually correct for its depth in the page.

## Forms and inputs

| Tag | Where | Note |
|---|---|---|
| `<form>` | Login, register, new post, edit post, comment, cat-fact length | Wrapping fields in `<form>` (not just a `<div>` with a button) is what makes `onSubmit`, native validation (`required`, `maxLength`), and pressing Enter to submit all work for free. |
| `<label>` | Every field | Pairs visually and *programmatically* with its `<input>`/`<textarea>` — a screen reader announces "Email, edit text" instead of just "edit text". |
| `<input>` | email, password, text, number | `type="email"` and `type="number"` aren't decorative — they change the on-screen keyboard on mobile and enable browser-native validation. |
| `<textarea>` | Post body, edit body | Multi-line text needs this; `<input>` can't do line breaks. |

## Content tags

| Tag | Where | Why |
|---|---|---|
| `<p>` | Post body, meta lines, "No comments yet", etc. | Plain paragraph text. |
| `<blockquote>` | The quote/joke/fact/cat-fact boxes | These display a quoted piece of text pulled from an external source — semantically correct use, not just styling. |
| `<ul>` / `<li>` | `comment-list` in `Comments.jsx` | A list of comments is literally a list — using real list markup means screen readers announce "list, 3 items" and you get that structure for free. |
| `<span>` | Status badge, session name | An inline wrapper with no block-level meaning of its own — used only when styling text *within* a line, not breaking the line. |
| `<div>` | Generic containers (`.comments`, `.row`, `.post-view`, etc.) | The deliberate "no semantic meaning" fallback, for purely visual grouping where none of the tags above fit. |
| `<button>` | Every clickable action | Always a real `<button>`, never a `<div onClick>` — that's what gives keyboard focus, Enter/Space activation, and the right screen-reader role automatically. |

## The custom ones: `<TopBar>`, `<PostCard>`, `<Comments>`, etc.

These aren't HTML — they're components written exactly like HTML tags
because that's React's JSX syntax. `<PostCard post={post} onUpdated={onUpdated} />`
compiles down to a JavaScript function call, `PostCard({ post, onUpdated })`,
that returns real HTML tags (`<article>`, `<p>`, etc.) underneath. The
browser never sees `<PostCard>` — by the time it reaches the DOM, it's just
the `<article className="post">...</article>` that function returned.

That's also why `<App>`, `<AppProvider>`, `<Shell>`, and `<React.StrictMode>`
show up in the component tree: they're the top-level components wiring
everything together, same mechanism, just one level up.
