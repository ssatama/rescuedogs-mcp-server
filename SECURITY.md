# Security Policy

## Reporting a Vulnerability

We take the security of this project seriously. If you discover a security vulnerability, please report it through GitHub's private vulnerability reporting feature.

**To report a vulnerability:**

1. Go to the [Security tab](https://github.com/ssatama/rescuedogs-mcp-server/security) of this repository
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

We will acknowledge receipt within 48 hours and work with you to understand and address the issue.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| < 3.0   | :x:                |

## Security Updates

Security updates will be released as patch versions. We recommend always using the latest version.

## Official Sources

Install this server only from these sources:

- npm: [`rescuedogs-mcp-server`](https://www.npmjs.com/package/rescuedogs-mcp-server)
- Source: [github.com/ssatama/rescuedogs-mcp-server](https://github.com/ssatama/rescuedogs-mcp-server)
- Hosted endpoint: `https://mcp.rescuedogs.me/mcp`
- Directory listings that point to the above: the
  [Claude Connectors Directory](https://claude.ai/directory/connectors/rescue-dogs),
  Smithery and Glama

This project never distributes ZIP archives, installers or executables, and
has no "Download" button. Treat any copy, fork or listing that offers one as
malicious.

Releases from 3.1.0 onward are published from GitHub Actions with npm
provenance. Check the signatures and attestations of an install with
`npm audit signatures`.
