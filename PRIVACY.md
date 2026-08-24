# Privacy Policy

**Last updated: 23 August 2026**

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
tool name, how long it took, and whether it succeeded. No inputs, results, or
identifiers are logged.

**Standard web request data.** The remote endpoint sees the IP address of the
connecting client, as any HTTP service does. It is held in memory only, solely
to enforce rate limits, and expires within the rate-limit window (at most one
hour). It is not written to disk, not used to build profiles, and not linked to
queries.

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

Nothing personal is retained. Rate-limit counters live in memory for at most one
hour and are lost on restart. Operational logs contain no personal data.

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
