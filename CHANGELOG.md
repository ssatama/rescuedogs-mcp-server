# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-24

The server is now reachable as a remote endpoint at
`https://mcp.rescuedogs.me/mcp`, and three bugs that had been failing silently
in production are fixed.

### Breaking

- **`response_format: "json"` returns a different shape.** Responses are now
  projected through an allowlist instead of spreading the raw API record.
  `dog_profiler_data` is now `profile`, the numeric dog `id` is gone (`slug` is
  the handle every tool accepts), and scraper and LLM bookkeeping fields
  (`last_scraped_at`, `consecutive_scrapes_missing`, `adoption_check_data`,
  `model_used`, `prompt_version`, `processing_time_ms`, `confidence_scores`)
  are no longer emitted. Payloads are about 80% smaller. Markdown output is
  unaffected.
- **`rescuedogs_search_dogs` no longer substring-matches organization names.**
  A query only resolves to an organization filter on a full-name match. See
  the fix below for why.

### Added

- Remote **streamable HTTP transport** (`dist/http.js`, `npm run start:http`)
  alongside stdio, in stateless mode. Rate limited per IP at 120/minute and
  3,000/hour, with CORS for browser clients and a `/health` endpoint.
- **Titles and safety annotations** on all eight tools (`readOnlyHint`,
  `destructiveHint`, `idempotentHint`, `openWorldHint`), and server-level
  instructions sent during initialization.
- Adoption-relevant profiler fields that the API returns but the server had
  been discarding: `favorite_activities`, `unique_quirk`, `special_needs`,
  `medical_needs`, `sociability`, `trainability`, `exercise_needs`,
  `grooming_needs`, and compatibility with children, dogs and cats.
- `PRIVACY.md` and `TERMS.md`.
- Contract tests against the live API, run on a schedule; test typechecking;
  `knip` dead-code detection; and a markdown link and anchor checker.

### Fixed

- **AI personality profiles never appeared in search results.** The client
  called `/api/enhanced_animals/…`, a path that does not exist, and all three
  call sites swallowed the 404 into a log line. The data was already inline on
  every animal record, so both requests were removed rather than repaired,
  which also drops an N+1 round-trip per search.
- **Searching a dog's name could return a different organization's roster.**
  A query for "Daisy" substring-matched "Daisy Family Rescue e.V.", replaced
  the query with that organization's id, and returned its dogs while hiding
  every actual Daisy. The same applied to Paws, Tears, Trust, Underdog, Woof,
  Pets, Misis and Rean.
- **Every request to four endpoints took a 307 redirect** from trailing
  slashes the API does not serve.
- `DogProfilerData` described fields the API never returns (`bio`,
  `looking_for`, `interests`, `deal_breakers`, `fun_fact`) while ignoring the
  ones it does. Compatibility values are strings (`"yes"`, `"no"`,
  `"unknown"`, `"older_children"`, `"selective"`), not booleans; `"unknown"`
  is now omitted so absence of data does not read as a "no".
- README documented the wrong macOS Claude Desktop config path, omitted about
  ten parameters, and overstated the catalogue (1,500+ dogs, 12+ organizations
  and 370+ breeds against an actual 1,393, 11 and 96).

### Migration

Consumers of `response_format: "json"` should read `profile` where they read
`dog_profiler_data`, and `slug` where they used the numeric `id`. Markdown
consumers, which is the common case, need no changes. The stdio entrypoint,
tool names and tool parameters are unchanged.

## [1.2.0] - 2026-01

Internal quality release: type deduplication, modular tool files, environment
configuration, full test coverage, retry logic, and tool-call logging.

## [1.1.0] - 2026-01

Bug fixes and error boundaries: wired up the `match_preferences` compatibility
parameters, added tool-level error handling, and fixed a version mismatch.
