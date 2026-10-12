# Contributing

Thanks for your interest in contributing to rescuedogs-mcp-server!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ssatama/rescuedogs-mcp-server.git
   cd rescuedogs-mcp-server
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

## Testing with Claude Desktop

To test your local changes with Claude Desktop, update your config to point to your local build:

```json
{
  "mcpServers": {
    "rescuedogs": {
      "command": "node",
      "args": ["/path/to/your/rescuedogs-mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after making config changes.

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what the PR does
- Test your changes locally before submitting
- Follow existing code style

## Releasing

Releases publish from CI, never from a laptop. `.github/workflows/publish.yml`
runs when a `vX.Y.Z` tag is pushed. It checks that the tag matches
`package.json` and points at a commit on `main`, reruns the full CI suite,
builds and packs the package, then stages that tarball on npm through trusted
publishing. No npm token is involved, and the release carries a provenance
attestation. Only the final job can mint the OIDC token, and it runs no
project or dependency code. A staged version is private until a maintainer
approves it with 2FA, so a compromised workflow or GitHub account cannot ship
a release on its own.

1. Merge a PR that bumps `version` (`npm version X.Y.Z --no-git-tag-version`)
   and adds the `CHANGELOG.md` entry.
2. Tag the merge commit on `main` and push the tag:
   `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. When the Publish workflow finishes, find the staged version with
   `npm stage list rescuedogs-mcp-server` and check it before approving.
   `npm stage view <stage-id>` should show the version you tagged. Then run
   `npm stage download <stage-id>` and `shasum <tarball>`: the result should
   match the `shasum` that the workflow's pack job printed. Reject anything
   you didn't stage yourself with `npm stage reject <stage-id>`.
4. Approve it with 2FA: `npm stage approve <stage-id>`, or use the Staged
   Packages tab on npmjs.com.

If the stage job fails, run `npm stage list` before rerunning it. A version
that was already staged can't be staged again, so approve or reject the
existing one instead.

One-time npm setup, done on npmjs.com under the package's Settings:

- Trusted publishing: GitHub Actions, repository
  `ssatama/rescuedogs-mcp-server`, workflow `publish.yml`, environment `npm`,
  with only `npm stage publish` allowed.
- Publishing access: "Require two-factor authentication and disallow tokens".
  CI can then only stage a release, and nothing without a maintainer's 2FA
  can publish one.

## Hosted Server Config (Railway)

The hosted endpoint (`https://mcp.rescuedogs.me`) deploys from `main` on
Railway, built from `Dockerfile.http`. Its service settings live in
`.railway/railway.ts`, which Railway does **not** read on deploy:

- After changing it, run `railway config plan` and then `railway config apply`.
  A merge alone deploys the new code with the old settings, so apply before
  merging code that depends on a settings change, such as a new healthcheck
  path.
- Declare every environment variable the service needs in its `env` (use
  `preserve()` to keep a value set in the dashboard). `apply` deletes any
  variable that isn't declared.
- Don't change these settings in the Railway dashboard. If you must, mirror the
  change in `.railway/railway.ts`. `railway config plan --detailed-exit-code`
  exits 2 when the two differ.

## Reporting Issues

Found a bug or have a feature request? Open an issue with:
- Clear description of the problem or feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior

## Questions?

Open an issue for any questions about contributing.
