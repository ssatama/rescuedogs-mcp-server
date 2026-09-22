# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-09-22

Tools now return typed, structured results alongside their text, and a round
of runtime dependency advisories is patched. Text output is unchanged from
2.0.0 apart from the `rescuedogs_list_breeds` markdown fix below.

### Added

- **`outputSchema` and `structuredContent` on all eight tools.** Clients get
  typed results instead of parsing prose. The text payload of every tool,
  including `response_format: "json"`, is byte-identical to 2.0.0; only
  `structuredContent` is new. List tools return a per-dog summary (slug, name,
  breed, age, sex, size, adoption_url, tagline, energy, experience,
  organization) in structured output; `rescuedogs_get_dog_details` returns
  the full record. `rescuedogs_get_adoption_guide` reports the normalized
  country code (`"uk"` becomes `GB`), and only when guidance was found.
- Structured logs on the HTTP server carry a `level` (`info` for successful
  tool calls, `warn` for handled tool errors, `error` for thrown handlers and
  request failures), so hosts that classify stderr as errors no longer flag
  every call. Thrown handlers now log their error message.

### Fixed

- `AdoptionFees` declared `currency`, `amount` and `notes`; the API returns
  `currency` and `usual_fee`.
- `breed_group` was described as FCI groups. The API uses AKC-style values
  plus two custom ones (Designer/Hybrid, Guardian, Herding, Hound, Mixed,
  Non-Sporting, Sporting, Terrier, Toy, Working), now listed in the parameter
  description, so FCI names no longer silently return zero results.
- `rescuedogs_list_breeds` printed platform-wide totals above a filtered list,
  so `breed_group: "Terrier"` showed the whole catalogue's dog count beside
  three terriers. With `breed_group` or `min_count` set, markdown now leads
  with the number of breeds and dogs shown, says so when nothing matches, and
  labels the totals as platform-wide. Structured output reports totals for
  the returned breeds. `response_format: "json"` text is unchanged.

### Security

- fast-uri 3.1.8 (four high-severity SSRF and host-confusion advisories),
  hono 4.13.8 (three moderate, including `parseBody()` memory exhaustion) and
  qs 6.16.0 (two moderate). All are transitive, via the MCP SDK and express.
- The Smithery container moves from Node 20, end of life since 2026-04-30, to
  Node 22.

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
  are no longer emitted. Payloads are about 80% smaller. This projection does
  not change markdown output, though other entries below do.
- **`rescuedogs_search_dogs` no longer substring-matches organization names.**
  A query resolves to an organization filter only on an exact match against
  that organization's name, its name without a trailing `e.V.`, or an acronym
  preceding a parenthetical expansion. So `"Daisy Family Rescue e.V."`,
  `"Daisy Family Rescue"` and `"REAN"` all still resolve, while `"Daisy"`,
  `"Paws"` and `"Trust"` are now treated as dog-name searches. See the fix
  below for why.

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
  `"unknown"`, `"older_children"`, `"selective"`), not booleans. Markdown
  omits `"unknown"` so absence of data does not read as a "no"; JSON passes it
  through, since an explicit `"unknown"` is more informative to a machine
  reader than a missing key.
- README documented the wrong macOS Claude Desktop config path, omitted about
  ten parameters, and overstated the catalogue (1,500+ dogs, 12+ organizations
  and 370+ breeds against an actual 1,393, 11 and 96).

### Security

- Carries the dependency remediation merged since 1.2.0, including
  [#64](https://github.com/ssatama/rescuedogs-mcp-server/pull/64), which
  resolved 36 Dependabot alerts, and an earlier round covering 12 more.
  Roughly 36 dependency and CI commits are included in total, among them major
  bumps of eslint, axios and zod.

### Migration

Consumers of `response_format: "json"` should read `profile` where they read
`dog_profiler_data`, and `slug` where they used the numeric `id`.

Markdown consumers need no code changes, but the output does gain content: dog
profiles now render favourite activities, exercise and grooming needs,
trainability, important notes and a fun fact, and compatibility lines appear
where they previously did not. Anything snapshot-testing that markdown will
need its snapshots refreshed.

The stdio entrypoint, tool names and tool parameters are unchanged.

## [1.2.0] - 2026-02-16

Internal quality release: type deduplication, modular tool files, environment
configuration, full test coverage, retry logic, and tool-call logging.

## [1.1.0] - 2026-02-15

Bug fixes and error boundaries: wired up the `match_preferences` compatibility
parameters, added tool-level error handling, and fixed a version mismatch.
