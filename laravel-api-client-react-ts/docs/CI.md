# CI: lint, test and build on every push to `main`

The workflow lives in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
GitHub runs it automatically after **every `git push` to the `main` branch**.

```
git push origin main
        │
        ▼
 ┌───────────┐   ┌───────────┐
 │   Lint    │   │   Test    │      ← run in parallel
 │ (ESLint)  │   │ (Vitest)  │
 └─────┬─────┘   └─────┬─────┘
       └───────┬───────┘
               ▼
   ┌────────────────────────┐
   │ Type-check and build   │      ← only runs if both above passed
   │ (tsc -b && vite build) │
   └────────────────────────┘
               ▼
      uploads `dist/` as an artifact
```

If any step fails, the run is marked red and the jobs after it are skipped.

## Watching a run in the Actions tab

1. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "ci: add lint, test and build workflow"
   git push origin main
   ```
2. Open your repository on github.com and click the **Actions** tab.
3. The newest entry under **All workflows → CI** is your run. Yellow dot =
   running, green check = passed, red cross = failed.
4. Click the run to see the three jobs (**Lint**, **Test**, **Type-check and
   build**). Click a job, then a step, to read its log.
5. When the build job finishes, the **Artifacts** section at the bottom of the
   run page contains the `dist` folder (kept for 7 days).
6. Re-run a failed run with **Re-run jobs**, or start one by hand with
   **Run workflow** (that button exists because of `workflow_dispatch`).

Optional status badge for the README (replace `<user>` and `<repo>`):

```markdown
![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)
```

## What each part of `ci.yml` does

| Part | Meaning |
|---|---|
| `on: push: branches: [main]` | The required trigger: every push to `main`. |
| `pull_request`, `workflow_dispatch` | Extras: check pull requests into `main`, and a manual run button. |
| `concurrency` | If you push again while a run is in progress, the old run is cancelled. |
| `permissions: contents: read` | The workflow may only read the code, nothing else. |
| `actions/checkout@v4` | Downloads your repository onto the runner machine. |
| `actions/setup-node@v4` + `cache: npm` | Installs Node 20 and caches npm downloads between runs. |
| `npm ci` | Installs exactly what `package-lock.json` lists. It fails if the lock file and `package.json` disagree, so commit `package-lock.json`. |
| `npm run lint` | ESLint (`eslint.config.js`): TypeScript rules plus the React Hooks rules. |
| `npm run test:run` | Vitest runs every `*.test.ts(x)` file once and exits. |
| `npm run build` | `tsc -b && vite build`: the type check runs first, then the production bundle. |
| `needs: [lint, test]` | The build job waits for, and requires, the other two. |
| `actions/upload-artifact@v4` | Saves `dist/` so you can download the build. |

## Run the same checks locally first

```bash
npm ci            # clean install, same as CI
npm run lint
npm run test:run
npm run build
```

If all four pass locally, the run on GitHub should be green too.

## The tests

The test suite (59 tests, 9 files) was written with AI assistance and added to
the workflow's `test` job. Files sit next to the code they test:

| File | What it checks |
|---|---|
| `src/api.test.ts` | `errorText`, `formatDate`, and `api()`: headers, Bearer token, JSON body, 204, 422 errors, network failure |
| `src/useTheme.test.ts` | Default theme, reading `<html data-theme>`, toggling, `localStorage` sync |
| `src/AppContext.test.tsx` | login / logout, corrupt `localStorage`, `notify` timeout, `guard()` |
| `src/components/AuthPanel.test.tsx` | Login, wrong password (HTTP 200 without a token), register, network error |
| `src/components/NewPostForm.test.tsx` | Publishing a post, server validation error |
| `src/components/PostCard.test.tsx` | Owner-only controls, status toggle, inline edit, delete with confirm |
| `src/components/Comments.test.tsx` | Listing, adding, deleting, logged-out state, load failure |
| `src/components/widgets.test.tsx` | Public-API widgets, `max_length` query parameter, token never sent to third parties |
| `src/App.test.tsx` | Whole app: feed order, login/logout flow, saved session, expired token, dark mode |

Shared helpers are in `src/test/`: `mockFetch()` fakes the network (and throws
on any request a test did not expect, so no test can reach the real internet),
and `renderWithApp()` renders a component inside `<AppProvider>`.

**AI-written tests still need a human review.** Read them, and ask whether each
one would actually fail if the code were broken. As a check, the old
`event.currentTarget is null` bug was put back in temporarily: the three
regression tests in `AuthPanel.test.tsx` and `NewPostForm.test.tsx` failed, and
passed again once the fix was restored.

## If the repository root is not this folder

GitHub only reads workflows from `.github/workflows/` at the **repository
root**. If your repo contains this project inside a subfolder, move `.github/`
to the repo root and add this to `ci.yml` so the commands run in the right place
(and point the npm cache at the lock file):

```yaml
defaults:
  run:
    working-directory: laravel-api-client-react-ts
```
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
          cache-dependency-path: laravel-api-client-react-ts/package-lock.json
```
(`defaults.run` goes at the top level of the file, next to `env:`; the
`cache-dependency-path` line goes in each `setup-node` step.)
