# 0010 A command that sets up the kit in a project

## Approach

Do the kit's side first, so that the files `init` generates can already leave out what the kit supplies. The
entrypoint's allowlist parsing moves into a function, `parse_allowlist`, which the test pulls out of the shipped
entrypoint the way `tests/entrypoint-home-owner.test.mjs` pulls out `check_home_owner`. The entrypoint runs it over
`KIT_ALLOWLIST` and `ALLOWLIST` together and drops duplicates. `container/agent.sh` asks Compose for the merged
configuration as JSON and reads the build argument with `node`, which a project has on the host already for `npm`.

Then `init` as `scripts/agent-kit.mjs`, a dependency-free ESM executable like `agent-kit-roles.mjs`. It reuses
`parseHarnesses` and `plannedFiles` from `agent-kit-roles.mjs` rather than restating the roles. Its logic is split
into pure functions, one per generated file, that take the project's current file contents and return what to write,
so that most of it is tested without a file system. The entry point reads the files, calls them, and writes.

## Files

- `container/compose.yml`: `KIT_ALLOWLIST` with the probe host, `registry.npmjs.org` and `agent-kit.ritenoar.com`
- `container/entrypoint.sh`: `parse_allowlist`, run over both lists; an empty merged list still dies
- `container/agent.sh`: the `PLAYWRIGHT_VERSION` check before the build
- `scripts/agent-kit.mjs`: new, the `agent-kit` executable with its `init` subcommand
- `package.json`: `agent-kit` under `bin`, `scripts/agent-kit.mjs` under `files`
- `tests/entrypoint-allowlist.test.mjs`: new
- `tests/agent-wrapper.test.mjs`: the fake `docker` answers the configuration query; the new check's tests
- `tests/agent-kit-init.test.mjs`: new
- `README.md`: "Installing it into a project" rewritten around `init`; the sandbox section names `KIT_ALLOWLIST`

## Tasks

- [ ] Write `tests/entrypoint-allowlist.test.mjs`: `parse_allowlist` over a kit list and a project list admits the
  hosts of both, lowercased, once each; accepts an empty or missing project list; still refuses an address, a CIDR
  range and an allowlisted canary in either list (R11)
- [ ] Move the parsing in `container/entrypoint.sh` into `parse_allowlist`, run it over `KIT_ALLOWLIST` and
  `ALLOWLIST`, and add `KIT_ALLOWLIST` to its list of inputs and to `container/compose.yml` (R11)
- [ ] Extend `tests/agent-wrapper.test.mjs`: the fake `docker` answers `config --format json`; a configuration
  without `PLAYWRIGHT_VERSION` exits non-zero naming `agent/compose.project.yml` and never calls `build` or `run`; one
  with it proceeds as before (R12)
- [ ] Add the check to `container/agent.sh`, ahead of the image query (R12)
- [ ] Write `tests/agent-kit-init.test.mjs` for the pure functions: the usage errors (R1); the role wrappers equal
  `plannedFiles` (R2); `AGENTS.md` holds the Development Guidelines, Roles and Changes in this project sections,
  naming `process.md`, the three role files and `npm run check-changes` (R3); `CLAUDE.md` for every harness list,
  importing `@AGENTS.md` (R4); the notice for an existing `AGENTS.md` names the three sections and holds their text
  exactly as the generated `AGENTS.md` does, and the notice for an existing `CLAUDE.md` names `@AGENTS.md` (R5);
  the compose name and image from a scoped and an unscoped package name, reduced to the characters Compose accepts,
  and the Playwright version from a lockfile resolving `playwright` directly and one resolving it through
  `@playwright/test` (R7); none when the lockfile has no `playwright` (R8); `package.json` gains the script with key
  order and indentation kept, and is unchanged when the script exists (R9, R13); `.dockerignore` created, appended to
  when it excludes `node_modules` without the exception, and unchanged otherwise (R10, R13)
- [ ] Add end-to-end cases to the same file that run the executable in a temporary project: a fresh project gets
  every file, `agent.sh` is executable and execs the kit's wrapper with its own directory (R6), and the output lists
  each file written (R14); a project with some files already present, among them `AGENTS.md` and `CLAUDE.md`, gets the
  rest, the present ones are named as skipped and byte for byte unchanged, and the output holds the notices (R5, R13,
  R14); a project without Playwright gets everything but the compose file and a non-zero exit (R8, R14)
- [ ] Write `scripts/agent-kit.mjs` until both test files pass, and register it in `package.json` (R1 to R10, R13,
  R14)
- [ ] Rewrite "Installing it into a project" in `README.md` around `npx agent-kit init claude opencode`: what each file
  is for, which the project may edit, what to do with the notice for an existing `AGENTS.md`, and that the kit's own
  hosts need no listing. Add `KIT_ALLOWLIST` to the egress section. Keep every other statement the section makes
  today (R15)

## Verification

- [ ] `npm test` passes
- [ ] `npm pack --dry-run` lists `scripts/agent-kit.mjs`
- [ ] In a scratch project with the packed kit installed and `playwright` in its lockfile, `npx agent-kit init claude`
  writes every file, and `./agent.sh true` builds the image and starts the container with an `ALLOWLIST` holding no
  host of the kit's
- [ ] `npm run check-changes`, where task 0009 has wired it, or the script run directly with `node`, passes

## Commit Points

- [ ] The kit supplies its own hosts, and the wrapper checks for `PLAYWRIGHT_VERSION`
- [ ] The `agent-kit init` command
- [ ] The README describes setting a project up with `init`
