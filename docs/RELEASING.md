# Manual release procedure

Package identity remains `react-hex-editor`; namespace and the fork's first version are undecided. The current 0.3.0 metadata is inherited from upstream and is not a new fork release. Npm registry publishing is deferred. Never use upstream `npm install react-hex-editor` as instructions for installing this fork.

1. Agree the fork version and release notes. Use a clean, validated main commit with the develop promotion merged. Preserve the original ISC license and Keith McKnight attribution.
2. Update version metadata and the lockfile, review the version change through the normal PR workflow, and validate the resulting main commit. Keep development documentation clearly labelled until intentionally changing it for a release.
3. With Node 26.13.1/npm 11.20.0 run `npm ci`, `npm run validate`, and the browser/React matrix. Complete the consuming AggreGate integration gate. Record source revision, exact tool versions, tarball SHA256 and results.
4. Run `npm run package`. Its prepack lifecycle rebuilds JavaScript, declarations and themes. Inspect `artifacts/react-hex-editor-<version>.tgz`; install it into a clean consumer. Source archives from GitHub do not contain generated ignored output.
5. Review the exact tag, commit, release notes and artifact before the separate external release action. Manually create the versioned tag from validated main and a GitHub release, attaching the installable `.tgz` and checksums. Do not publish to the npm registry. Do not release from develop.
6. Link the fork's GitHub release asset from installation docs. Bring any main-only release changes back to develop with a synchronization merge PR.

The tarball includes built CJS, bundler ESM, native ESM facade, declarations, theme imports, README, metadata and LICENSE. Site output, tests and tooling are excluded. The facade lets Node load older React's CJS package without relying on named-export detection.
