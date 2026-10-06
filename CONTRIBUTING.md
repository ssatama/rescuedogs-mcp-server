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
