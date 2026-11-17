# Repository setup

Use `main` as the only long-lived branch. Open feature PRs directly against main and squash-merge them with a descriptive title. No promotion or synchronization PR is needed.

## Merge settings

Under Settings -> General -> Pull Requests, enable squash merging and disable merge commits and rebase merging. Set the default squash commit title to the PR title and the message to blank. This produces one useful commit subject per change instead of a generated merge message or a list of intermediate commits.

## Main protection

Keep an active branch ruleset targeting only `refs/heads/main`, with no bypass actors:

- Require a pull request, with zero required approving reviews and resolved conversations.
- Require the observed **Validation gate** GitHub Actions check and an up-to-date branch.
- Block force pushes and deletion.
- Require linear history. Leave general restrict-creations/updates rules off.

`Validate` runs on PRs targeting main and on manual dispatch. One job installs the producer dependencies once, runs the local validation command and tests the four supported React versions in Chromium sequentially. Keep the check name stable so branch protection continues to match. No path filters leave documentation-only PRs pending.

## Pages

Set Settings -> Pages -> Source to GitHub Actions. Restrict the `github-pages` environment to main. The separate **Deploy documentation** workflow builds and deploys the site on main updates; it does not repeat the package and browser validation already required on the PR. Manual deployment is also available from main.

The site is https://sashauly.github.io/react-hex-editor/ and remains labelled development documentation until a release is deliberately prepared. Tags, GitHub package releases and npm publication remain separate manual decisions.

## Retiring the integration branch

After confirming that main contains all integration work and that no PR targets the old branch, remove the integration branch from the protection rules and delete it. Update local tracking refs with `git fetch --prune` and `git remote set-head origin -a`. Do not rewrite published main history without explicit approval.
