# What TypeScript adds in this version

This covers only what's *different* from the plain-JavaScript version —
for the React concepts themselves (`useState`, `useEffect`, context,
`forwardRef`, etc.), see [`CONCEPTS.md`](CONCEPTS.md); they're unchanged.

TypeScript is JavaScript plus a type checker. It compiles down to the exact
same JavaScript (`npm run build` runs `tsc` purely to check types, then
Vite strips all the type syntax away) — it adds nothing at runtime, only a
compile-time check that catches a category of bugs before you ever run the
code.

## `.ts` vs `.tsx`

Same rule as `.js` vs `.jsx`: a file needs the `x` the moment it contains
JSX markup (`<div>...</div>`). `api.ts`, `useTheme.ts`, and
`hooks/usePosts.ts` have no JSX in them, so they're plain `.ts`. Every file
in `components/`, plus `App.tsx`, `AppContext.tsx`, and `main.tsx`, return
JSX, so they're `.tsx`.

## Interfaces: describing what data looks like

```ts
// src/types.ts
export interface Post {
  id: number;
  title: string;
  body: string;
  user_id: number;
  post_status_id: number;
  created_at: string;
}
```

An `interface` is a compile-time description of an object's shape — it
doesn't exist anymore once the code runs. Before this, `post.titel` (a
typo) or passing a `Post` where a `Comment` was expected would only surface
as a runtime bug, or a blank screen with no error at all. Now it's a red
squiggle in your editor and a failed `npm run build`.

`AuthResponse` is a good example of why this matters here specifically:

```ts
export interface AuthResponse {
  user: User;
  token?: string;        // the ? means "may be absent"
  errors?: Record<string, string[]>;
  message?: string;
}
```

Recall from the main README: a wrong password makes `/login` return
**HTTP 200** with an `errors` object and no `token` — an easy thing to
forget and accidentally treat as a successful login. Marking `token` as
optional (`token?:`) forces every piece of code that reads `data.token` to
actually handle the case where it's missing, which is exactly the bug this
API's quirk invites:

```ts
// AuthPanel.tsx
if (!data.token) throw new Error(errorText(200, data));
```
Skip that line, and TypeScript would still compile — nothing *forces* you
to check `token` before using it, but passing `data` into `login()`, whose
parameter type is `AuthResponse`, correctly reflects that `token` might not
be there, nudging you to handle it.

## Generics: one function, many return types

```ts
// api.ts
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  // ...
  return data as T;
}
```

`<T>` is a **type parameter** — a placeholder filled in at the call site.
Compare the plain-JS version, where every call to `api(...)` returned
`any` (effectively "could be anything, no checking"), to this:

```ts
const data = await api<Post[]>('/posts');          // data: Post[]
const comment = await api<Comment>('/posts/1/comments', { ... }); // data: Comment
```

Now `data.slice().sort(...)` in `usePosts.ts` is checked against the real
`Post[]` shape — if `Post` didn't have an `id` field, `b.id - a.id` would
fail to compile.

## Typing component props

```ts
// PostCard.tsx
interface Props {
  post: Post;
  onUpdated: (post: Post) => void;
  onDeleted: (id: number) => void;
}

export default function PostCard({ post, onUpdated, onDeleted }: Props) {
```

In the JS version, nothing stopped a caller from writing
`<PostCard post={post} onUpdated={post.id} />` (passing a number where a
function was expected) — it would compile fine and fail confusingly at
runtime the first time `onUpdated(...)` was called. Here, that's a build
error at the call site in `PostFeed.tsx`, pointing at the exact line that's
wrong.

## Typing hooks' state

```ts
// usePosts.ts
const [posts, setPosts] = useState<Post[] | null>(null);
```

`useState<Post[] | null>` says explicitly: this starts as `null`
("loading"), and once it has a value, it's an array of `Post`. Every place
that reads `posts` has to account for the `null` case — which is exactly
what `PostFeed.tsx` already did in the JS version
(`{posts === null && <p>Loading…</p>}`), except now the compiler *requires*
that check rather than it just happening to be there.

## Typing the `forwardRef`/`useImperativeHandle` pair

This was the trickiest part of the conversion — see
[`CONCEPTS.md`](CONCEPTS.md#9-forwardref-and-useimperativehandle--letting-a-parent-call-a-childs-function)
for what this mechanism *does*. In TypeScript, it needs an explicit
"handle" type:

```ts
// usePosts.ts
export interface PostFeedHandle {
  reload: () => Promise<void>;
}
export function usePosts(ref: Ref<PostFeedHandle>) { ... }
```

```ts
// PostFeed.tsx
const PostFeed = forwardRef<PostFeedHandle, object>(function PostFeed(_props, ref) {
```

`forwardRef<HandleType, PropsType>` takes two type parameters: what the
parent's `ref.current` will be typed as (`PostFeedHandle` — just
`{ reload }`, nothing else, matching what `useImperativeHandle` actually
exposes), and what props the component accepts (`object`, since
`PostFeed` takes none). This is what makes
`feedRef.current?.reload()` in `App.tsx` type-checked — if `usePosts` ever
stopped exposing `reload`, every call site using it would fail to compile
instead of throwing `undefined is not a function` at runtime.

## Typing form events

```ts
// NewPostForm.tsx
const onSubmit = guard(async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
```

`FormEvent<HTMLFormElement>` is React's type for a form's `onSubmit`
event, parameterized by *which* element it's attached to — that's what
makes `event.currentTarget` correctly typed as an `HTMLFormElement` (which
has `.reset()`), rather than the generic `EventTarget` you'd get from a
plain DOM event listener.

### Gotcha: `event.currentTarget` is `null` after an `await`

TypeScript types `event.currentTarget` as the form, which makes it tempting to
use it anywhere in the handler. But the browser resets it to `null` as soon as
the event has finished dispatching, which happens while the handler is
suspended at an `await`. Reading it afterwards throws
`can't access property "reset", event.currentTarget is null`, and the compiler
cannot warn you, because the type says it is always an `HTMLFormElement`.

```ts
// Wrong: currentTarget is already null when the await finishes
await api('/posts', { ... });
event.currentTarget.reset();

// Right: keep the element in a variable before the first await
const formEl = event.currentTarget;
await api('/posts', { ... });
formEl.reset();
```

`AuthPanel.tsx` and `NewPostForm.tsx` do it the right way, and their tests
fail if someone reverts it.

## `unknown` vs `any`: the public-API widgets

```ts
// TextApiWidget.tsx
interface Props {
  extractText: (data: unknown) => string;
}
```

The four public APIs (kanye.rest, catfact.ninja, icanhazdadjoke.com,
uselessfacts.jsph.pl) each return a different, unrelated JSON shape, and
this project deliberately doesn't define a type for each one — it's not
worth it for a single field read in one place. But the response is typed
as `unknown`, not `any`. `any` would silently allow *anything* — typos,
wrong property access, anything — with zero checking. `unknown` forces
whoever receives it to narrow the type before using it:

```ts
// App.tsx
extractText={(data) => `\u201C${(data as { quote: string }).quote}\u201D`}
```

The `as { quote: string }` is an explicit, visible "trust me" — a
deliberate opt-out of checking, right at the one place it's needed,
instead of leaking un-type-checked data through the whole component.

## Where types are still "trust me" rather than verified

TypeScript only checks the *shapes you declare* — it has no way to confirm
that the Laravel API's JSON actually matches `Post` at runtime. If the
backend changed `user_id` to `userId` tomorrow, this project would still
compile and build successfully, and only fail when it actually ran against
the real API. Runtime validation (e.g. with a library like `zod`) is how
you'd close that gap — out of scope for this project, but worth knowing
it's a real limit of what these types guarantee.

## `strict` mode

```json
// tsconfig.json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
```

`strict` turns on the full set of TypeScript's checks — most importantly
`strictNullChecks`, which is why `User | null` and `Post[] | null` had to
be written explicitly throughout this codebase, rather than every value
silently being allowed to be `null`/`undefined` by default.
`noUnusedLocals`/`noUnusedParameters` catch dead imports and unused
variables — this is what caught the leftover `import React from 'react'`
lines during this conversion (no longer needed with React 18's JSX
transform, except where `React.StrictMode` is used directly in
`main.tsx`).
