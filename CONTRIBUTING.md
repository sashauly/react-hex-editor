# Contributing

This is an independently maintained fork of Keith McKnight's React Hex Editor, under the original ISC license. Report reproducible bugs and compatibility problems at <https://github.com/sashauly/react-hex-editor/issues>. Include React, styled-components, browser and package versions, a small example, and expected/observed behavior. There is no response-time guarantee.

Use Node 26.13.1 and bundled npm 11.20.0 (`nvm install && nvm use`). Commit package-lock.json with dependency updates. Keep unrelated behavior fixes separate from tooling changes.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run build:site
npm run check:links
npm run check:package
npx playwright install --with-deps chromium
npm run test:browser
```

`npm run validate` runs the local checks through package consumption; run browser checks separately. `npm run dev` opens the documentation/demo development server; `npm run preview` serves the built site under `/react-hex-editor/`. Browser tests use isolated installed tarballs, not source aliases. Set `REACT_VERSION=16.8.6`, `16.14.0`, or `17.0.2` for the smaller Chromium compatibility suite; run `check:package` with the same value first to prepare that fixture. The default suite uses React 18.3.1 in Chromium. Its root uses StrictMode.

React >=16.8.6 <19 and styled-components ^5.3.11 are supported. Declarations target TypeScript 5.6.2 and newer, including classic JSX and legacy node module resolution. Current Chrome/Edge, Firefox and Safari are the browser targets. See [the guide source](site/App.tsx) for mutable data, sizing, themes and existing editing limitations. TypeScript 7 is deferred because the lint and documentation tools require the TS6 compiler API.

## VS Code

Open the repository root with Node from `.nvmrc` active and install the recommended extensions from Extensions. After `npm ci`, accept the workspace TypeScript version prompt or run **TypeScript: Select TypeScript Version** and choose **Use Workspace Version**. The demo uses [its own TypeScript project](site/tsconfig.json) so imports of the library resolve to source during editing and typechecking.

ESLint uses the repository's flat config and applies available fixes on explicit saves. The Testing view runs Vitest unit tests and Playwright browser tests. Install Chromium and prepare the packed consumer with `npm run build:site` and `npm run check:package` before running Playwright. The GitHub Actions extension detects the workflows under `.github/workflows`.

Use the built-in **NPM Scripts** view or **Tasks: Run Task** for commands such as `dev`, `typecheck`, and `validate`. If Vitest reports an old Node version, set `vitest.nodeExecutable` to the Node 26 executable in your local VS Code settings.

## Pull requests

Feature PRs target `main` directly and use squash merge. Use a descriptive PR title: it becomes the commit subject on main, without the PR body or individual commit messages appended. Main requires a passing **Validation gate** and resolved conversations, with zero mandatory human approvals and no routine bypass. There is one validation job per PR; it runs the supported React/Chromium checks sequentially after one producer install. A main update builds and deploys documentation without repeating the full validation suite. There is no integration branch or promotion PR. Remote settings are described in [repository setup](docs/REPOSITORY_SETUP.md).

For package releases, follow [the manual release procedure](docs/RELEASING.md). No registry publishing is configured.
