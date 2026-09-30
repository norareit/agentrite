# 0010 A command that sets up the kit in a project

## Approach

Do the kit's side first, so that the files `init` generates can already leave out what the kit supplies. The
entrypoint's allowlist parsing moves into a function, `parse_allowlist`, which the test pulls out of the shipped
entrypoint the way `tests/entrypoint-home-owner.test.mjs` pulls out `check_home_owner`. The entrypoint runs it over
`KIT_ALLOWLIST` and `ALLOWLIST` together and drops duplicates. `container/agent.sh` asks Compose for the merged
configuration as JSON and reads the build argument with `node`, which a project has on the host already for `npm`.

Then `init` as `scripts/agent-kit.mjs`, a dependency-free ESM executable like `agent-kit-roles.mjs`. It reuses
`parseHarnesses` and `plannedFiles` from `agent-kit-roles.mjs` rather than restating the roles. The content of
`AGENTS.md`, `CLAUDE.md`, `agent.sh` and `agent/compose.project.yml` is in `templates/project/`, with placeholders
written as `{{name}}`, which `init` replaces and which read as unfinished in a file copied by hand. Its logic is split
into pure functions, one per generated file, that take the template and the project's current file contents and
return what to write, so that most of it is tested without a file system. The entry point reads the templates from
the kit's own directory and the files from the project, calls them, and writes.

## Files

- `container/compose.yml`: `KIT_ALLOWLIST` with the probe host, `registry.npmjs.org` and `agent-kit.ritenoar.com`
- `container/entrypoint.sh`: `parse_allowlist`, run over both lists; an empty merged list still dies
- `container/agent.sh`: the `PLAYWRIGHT_VERSION` check before the build
- `templates/project/AGENTS.md`, `CLAUDE.md`, `agent.sh`, `agent/compose.project.yml`: new, the templates
- `scripts/agent-kit.mjs`: new, the `agent-kit` executable with its `init` subcommand
- `package.json`: `agent-kit` under `bin`, `scripts/agent-kit.mjs` under `files`
- `tests/entrypoint-allowlist.test.mjs`: new
- `tests/entrypoint-function.mjs`: new, the helper that cuts a function out of the shipped entrypoint
- `tests/entrypoint-home-owner.test.mjs`: uses that helper
- `tests/agent-wrapper.test.mjs`: the fake `docker` answers the configuration query; the new check's tests
- `tests/agent-kit-init.test.mjs`: new
- `README.md`: "Installing it into a project" rewritten around `init`; the sandbox section names `KIT_ALLOWLIST`

## Tasks

- [x] Move the extraction of a function from `container/entrypoint.sh`, now in
  `tests/entrypoint-home-owner.test.mjs`, into a helper shared with the new allowlist test, as a refactoring commit of
  its own (R11)
- [x] Write `tests/entrypoint-allowlist.test.mjs`: `parse_allowlist` over a kit list and a project list admits the
  hosts of both, lowercased, once each; accepts an empty or missing project list; still refuses an address, a CIDR
  range and an allowlisted canary in either list (R11)
- [x] Move the parsing in `container/entrypoint.sh` into `parse_allowlist`, run it over `KIT_ALLOWLIST` and
  `ALLOWLIST`, and add `KIT_ALLOWLIST` to its list of inputs and to `container/compose.yml` (R11)
- [x] Extend `tests/agent-wrapper.test.mjs`: the fake `docker` answers `config --format json`; a configuration
  without `PLAYWRIGHT_VERSION` exits non-zero naming `agent/compose.project.yml` and never calls `build` or `run`; one
  with it proceeds as before (R12)
- [x] Add the check to `container/agent.sh`, ahead of the image query (R12)
- [x] Stop with Compose's own error when Compose refuses the configuration, before the check reads it, with a
  regression test in `tests/agent-wrapper.test.mjs` (R12)
- [x] Write `templates/project/AGENTS.md`, `CLAUDE.md`, `agent.sh` and `agent/compose.project.yml`, modeled on
  Norareit's files with what is specific to Norareit replaced by `{{name}}` placeholders (R3, R4, R6, R7, R15)
- [x] Write `tests/agent-kit-init.test.mjs` for the pure functions: the usage errors (R1); the role wrappers equal
  `plannedFiles` (R2); `AGENTS.md` holds the Development Guidelines, Roles and Changes in this project sections,
  naming `process.md`, the three role files and `npm run check-changes` (R3); `CLAUDE.md` for every harness list,
  importing `@AGENTS.md` (R4); the notice for an existing `AGENTS.md` names the three sections and holds their text
  exactly as the generated `AGENTS.md` does, and the notice for an existing `CLAUDE.md` names `@AGENTS.md` (R5);
  the compose name and image from a scoped and an unscoped package name, reduced to the characters Compose accepts,
  and the Playwright version from a lockfile resolving `playwright` directly and one resolving it through
  `@playwright/test` (R7); none when the lockfile has no `playwright` (R8); `package.json` gains the script with key
  order and indentation kept, and is unchanged when the script exists (R9, R13); `.dockerignore` created, appended to
  when it excludes `node_modules` without the exception, and unchanged otherwise (R10, R13); every generated
  template has no `{{` left after filling, and the `AGENTS.md` template holds the three headings the notice cuts by
  (R15)
- [x] Add end-to-end cases to the same file that run the executable in a temporary project: a fresh project gets
  every file, `agent.sh` is executable and execs the kit's wrapper with its own directory (R6), and the output lists
  each file written (R14); a project with some files already present, among them `AGENTS.md` and `CLAUDE.md`, gets the
  rest, the present ones are named as skipped and byte for byte unchanged, and the output holds the notices (R5, R13,
  R14); a project without Playwright gets everything but the compose file and a non-zero exit (R8, R14)
- [x] Write `scripts/agent-kit.mjs` until both test files pass, and register it in `package.json` (R1 to R10, R13 to
  R15)
- [x] Refuse a `package.json` that cannot be read or has no `name`, before anything is written, naming the file and
  exiting 1, with an end-to-end case in `tests/agent-kit-init.test.mjs` (R7, and the human's decision in `record.md`)
- [x] Review S1: when the lockfile resolves no `playwright` and `agent/compose.project.yml` exists, report the file as
  skipped, still say on standard error that the sandbox requires Playwright, and exit non-zero, with an end-to-end
  case first (R8, R14)
- [x] Review S3: decide whether `.dockerignore` keeps the kit out by evaluating its patterns as Docker does, the last
  matching one deciding and a pattern that matches a parent directory covering what is inside it, against a file in
  the kit's `container/`, rather than by recognizing literal `node_modules` lines. Unit cases first for
  `**/node_modules`, `node_modules/**`, `node_modules/*`, an exception placed before the exclusion, and a comment
  (R10)
- [x] Review S4: decide the `.dockerignore` amendment by every file in the kit's `container/` directory, read from
  the installed kit, rather than by `entrypoint.sh` alone, so that an exception for one file does not pass for the
  directory. A unit case first for `node_modules` followed by an exception for `entrypoint.sh` only (R10)
- [x] Review S5: append the exception only when the existing `.dockerignore` excludes `node_modules` as a whole,
  judged by a path to another package inside it, as well as a file of the kit's `container/`, so that a pattern aimed
  at the kit or at one package alone is left as it is. Unit cases first for an exclusion of one kit file and of
  `node_modules/@ritenoar` (R10)
- [x] Review S6: judge whether `.dockerignore` excludes `node_modules` line by line, by a pattern that is not an
  exception and, with any trailing `/*` and `/**` segments removed, matches `node_modules` itself, rather than by one
  sample path that a later exception can let back in. Unit cases first for `node_modules` followed by
  `!node_modules/*/index.js`, and for `node_modules/**/*`. Patterns with character classes, such as
  `node_modules/[a-m]*`, are a known limit (R10)
- [x] Requirement 10 as amended after review finding S7: append the exception whenever Docker's rules keep any file
  of the kit's `container/` out of the build context, and remove the check for whether `node_modules` is excluded.
  The unit cases for S5's files, which exclude the kit without excluding `node_modules`, and for S7's file change
  first to expect the exception (R10)
- [x] Match `.dockerignore` as BuildKit does, where an exception reaches into a directory only when the directory
  was excluded at that point, and make the kit's exception `!node_modules/@ritenoar/agent-kit/container/**`, which
  lets its files back in however they were excluded, in a new `.dockerignore`, in one amended and in the README.
  Unit cases first for a kit file excluded by name, and by `container/*`, before and after the directory form (R10)
- [x] Rewrite "Installing it into a project" in `README.md` around `npx agent-kit init claude opencode`: what each file
  is for, which the project may edit, what to do with the notice for an existing `AGENTS.md`, and that the kit's own
  hosts need no listing, and name `templates/project/` for a project set up or repaired by hand. Add `KIT_ALLOWLIST`
  to the egress section. Keep every other statement the section makes today (R16)

## Verification

- [x] `npm test` passes
- [x] `npm pack --dry-run` lists `scripts/agent-kit.mjs` and every file in `templates/project/`
- [x] In a scratch project with the packed kit installed and `playwright` in its lockfile, `npx agent-kit init claude`
  writes every file, and `./agent.sh true` builds the image and starts the container with an `ALLOWLIST` holding no
  host of the kit's
- [x] `npm run check-changes`, where task 0009 has wired it, or the script run directly with `node`, passes

## Commit Points

- [x] The kit supplies its own hosts, and the wrapper checks for `PLAYWRIGHT_VERSION`
- [x] The `agent-kit init` command
- [x] The README describes setting a project up with `init`
