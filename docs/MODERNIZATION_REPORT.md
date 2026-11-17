# Modernization report — 2026-11-17

Branch: `feature/modernize-react-hex-editor`, based on `ddd912f`. No release or registry publication.

## Implemented

Phases 1–6 are implemented locally: 20 observable baseline tests; Vite library builds with classic JSX; separate strict declarations; flat recommended ESLint presets; compatible runtime updates; live demo, guides and generated API; fork metadata, contribution/release/setup instructions; validation and Pages deployment workflows; installable tarball. Default/named components, refs, themes, styling hooks, CJS and ESM entries are preserved. Public type exports are additive. No intentional editing-policy change.

Producer: Node 26.13.1/npm 11.20.0, Vite 8.3.8, React plugin 6.3.0, Vitest 5.1.0, TypeScript 6.0.3, ESLint 10.15.0, typescript-eslint 8.73.0, hooks 7.1.1, TypeDoc 0.28.20. The TS7 trial failed: typescript-eslint rejects TS7 and TypeDoc cannot read `PropertyDeclaration`. Only TS6 is installed in the producer.

Runtime: styled-components 5.3.11, react-window 1.8.11, AutoSizer 1.0.26, classnames 2.5.1, keycode-js 3.1.0, keycoder 1.1.1. All 27 used keyboard constants match the original. AutoSizer needs a private type adapter for dynamic disable flags; its types do not leak into public declarations. Native ESM uses a CJS facade for React 16 interoperability; bundler ESM is retained.

## Verification

Clean `npm ci`, `typecheck`, `lint`, 20 unit tests (also under development StrictMode), library/site/API builds, and 1,859 local links/assets across 19 HTML pages pass. Final Chromium suite: 10 tests pass, including fixed columns at different widths. Packed CJS/ESM, theme paths, SSR rendering, the documentation example and TS5.6.2 declarations pass with React/DOM 16.8.6, 16.14.0, 17.0.2 and 18.3.1 and matching React types. Older React Chromium suites passed; earlier Firefox/WebKit runs passed 27 checks before the final fixed-column case. Final browser scope and CI were narrowed to Chromium at the user's request.

Phase 7 is partially validated in the isolated `.integration/aggregate-consumer` clone at `27b56ff1ec927758c864c6bcaa0b5b768bb92eae`, with current consumer package files, editor wrapper and existing tests copied in. Node 22.21.0, TS5.6.2, React18.3.1 and existing styled-components/type pins were retained. The original checkout was untouched.

The consumer's 23 tests pass after correcting only its isolated geometry stub: it previously reported a 350px container through offsetHeight but 35px through getBoundingClientRect. The newer AutoSizer exposed that inconsistency. Typecheck reports exactly the same 1,869 existing diagnostics, with none added/removed. Browser and SSR builds retain the same two TS7053 date-picker errors; SSR retains its existing warning. Worker builds pass before and after substitution. Logs and diagnostic comparisons are retained in ignored `.integration/evidence/`.

## Pending and deferred

The consuming-app runtime/served-asset smoke test remains unfinished: the isolated clone lacks server.xml, compiled server JARs and runtime data. Package/browser fixtures do not establish that app gate. GitHub still has master as default, no open PRs or rulesets, and no Pages site. Rename/main/develop setup, observed required checks, protection, first deployment and compliant PR verification remain external setup steps. Release numbering, tags, releases and registry publication remain deferred.

Existing read-only paste/ref-write bypass, endpoint-based selected-range edits, malformed/partial paste handling, truncation, non-byte ASCII and empty/backspace offset cases are documented and preserved for separate decisions.

Artifact: `artifacts/react-hex-editor-0.3.0.tgz` (inherited version, not a fork release). SHA256: `446822b9656de6d8dd787861d3bf023b3e88d60666cd426b9b6fed6b171d314e`. Its 33 runtime/declaration files match the consumer-validated tarball byte-for-byte; only README installation/test instructions changed afterward.
