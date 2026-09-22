# Privacy Policy

**Last updated: 22 September 2026**

This policy covers the `rescuedogs-mcp-server` MCP server, both the remote
endpoint at `https://mcp.rescuedogs.me/mcp` and the npm package that runs locally over stdio.

## The short version

This server collects no personal data. It takes search filters, queries a public
catalogue of rescue dogs, and returns results. There are no accounts, no
authentication, and nothing to sign in to.

## What is collected

**Tool inputs.** Search criteria such as breed, size, age, energy level, living
situation, and the country you would adopt to. These are passed to the
rescuedogs.me API to run the query. They are not stored, and they are not
associated with any identifier.

The `rescuedogs_match_preferences` tool accepts details about your household
(whether you have children, dogs, or cats) and your experience level. These are
used only as search filters for that single request.

**Operational logs.** The server writes one line per tool call containing the
tool name, how long it took, and whether it succeeded, and one line per
connection naming the client application and version it reports (for example
`claude-ai 0.1.0`) and the protocol version. No inputs, results, or
identifiers are logged.

**Standard web request data.** The remote endpoint sees the IP address of the
connecting client, as any HTTP service does. The server holds it in memory only,
solely to enforce rate limits, and it expires within the rate-limit window (at
most one hour). The server does not write it to disk, use it to build profiles,
or link it to queries.

The hosting provider, [Railway](https://railway.com/legal/privacy), keeps
standard HTTP access logs for the remote endpoint: IP address, user agent,
request path, status code, and timing, but not request bodies, so no tool
inputs. They are kept for Railway's log retention period and used here only
for operations, such as spotting abuse and errors.

## What is not collected

No names, email addresses, postal addresses, phone numbers, payment details,
precise location, credentials, conversation history, or chat transcripts. No
cookies and no tracking. No special-category or sensitive personal data.

## Who receives data

Tool inputs reach the rescuedogs.me API, which is operated by the same
maintainer as this server. Nothing is sold, shared with advertisers, or passed
to any third-party analytics service.

Following an adoption link takes you to the rescue organization's own website,
which has its own privacy policy. This project has no involvement in what
happens there and receives nothing back.

## Retention

The server retains nothing personal. Rate-limit counters live in memory for at
most one hour and are lost on restart. Operational logs contain no personal
data. The hosting provider's access logs, described above, include IP
addresses and expire under its retention policy.

## Your controls

Because nothing is stored or linked to you, there is no account to delete and no
data export to request. Stop using the server and nothing of yours remains.

If you are a rescue organization and want your listings removed from the
catalogue, see the removal process in the
[README](README.md#how-the-data-is-gathered-and-how-to-be-removed). Requests are
honoured without justification.

## About the dog listings

Listings are collected from the public adoption pages of rescue organizations.
They describe animals, not people. Where a listing names rescue staff or a
foster contact, that text comes from the organization's own public page.

## Changes

Material changes will be reflected here with an updated date. The published
history of this file is the changelog.

## Contact

Open an issue at
<https://github.com/ssatama/rescuedogs-mcp-server/issues>.
