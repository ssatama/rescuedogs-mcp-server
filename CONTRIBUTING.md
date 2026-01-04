# Contributing

Thanks for your interest in contributing to rescuedogs-mcp-server!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rescuedogs-mcp-server.git
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

## Reporting Issues

Found a bug or have a feature request? Open an issue with:
- Clear description of the problem or feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior

## Questions?

Open an issue for any questions about contributing.
