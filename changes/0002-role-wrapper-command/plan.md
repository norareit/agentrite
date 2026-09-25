# 0002 A command that writes the harness role wrappers

## Approach

One dependency-free ESM script, `scripts/agent-kit-roles.mjs`, registered as the package's `bin` so that `npx
agent-kit-roles` finds it in a project that installed the kit. It follows `check-changes.mjs`: pure functions are
exported and unit tested, and the file-system work sits in a `main` that runs only when the file is executed.

The pure part:

* `ROLES`: the three roles, each a `name` and a `description`, in the order planner, implementer, reviewer, with the
  descriptions exactly as in Norareit's stubs
* `HARNESSES`: a registry keyed by harness name. Each entry has the `directory` it writes into and a `render(role)`
  that returns the file's content. Nothing outside the registry names a harness, so a third harness is one new entry
* `parseHarnesses(args)`: returns the distinct harness names in the order given, or throws a usage error when `args`
  is empty or holds a name the registry does not have
* `plannedFiles(harnesses)`: returns `{ path, content }` for every file, with `path` relative to the project root

The `main`: parse the arguments; compute the planned files; resolve each against `process.cwd()`; collect every path
that already exists and, if any does, print them all and exit 1 before creating anything; otherwise create each
directory with `recursive: true`, write each file with the `wx` flag, print each path written, and exit 0. A usage
error prints the usage to standard error and exits 2.

The Claude Code renderer produces, for a role:

```
---
name: <name>
description: <description>
---

Read `node_modules/@ritenoar/agent-kit/roles/<name>.md` in the project root and follow it. It is your instruction; this file holds none of its own.
```

The OpenCode renderer produces the same without `name:`, since OpenCode takes the name from the file, and with
`mode: subagent` after `description:`. Both end in one newline. The body line is one string shared by both
renderers, and it is kept on one line, as in Norareit, because it is file content and not text this repository wraps.

## Files

- `scripts/agent-kit-roles.mjs`: new, the command
- `tests/agent-kit-roles.test.mjs`: new, unit tests of the pure functions and tests that run the script in a
  temporary directory
- `tests/fixtures/claude-agents/planner.md`, `implementer.md`, `reviewer.md`: new, copies of Norareit's
  `.claude/agents/` at `610d564`, the expected Claude Code output
- `package.json`: a `bin` entry `agent-kit-roles` pointing at the script, and the script added to `files`
- `README.md`: the "Installing it into a project" section and the "What is here" table

## Tasks

- [x] Copy Norareit's three `.claude/agents/*.md` at `610d564` into `tests/fixtures/claude-agents/` and confirm with
  `diff` that they match (R4)
- [x] Write the unit tests, failing: `parseHarnesses` accepts `claude`, `opencode`, both in either order, and a
  repeated name once; it throws for no arguments and for an unknown name (R2, R3). `plannedFiles(['claude'])` returns
  exactly the three fixture files under `.claude/agents/` (R4). `plannedFiles(['opencode'])` returns three files under
  `.opencode/agents/` whose frontmatter is `description` then `mode: subagent`, with each description equal to the
  Claude Code one and the body naming the role's file (R5). `plannedFiles(['claude', 'opencode'])` returns all six
- [x] Write the script tests, failing, each running the script with `spawnSync` and `cwd` set to a fresh temporary
  directory: `claude opencode` writes the six files with the planned content, prints each path and exits 0 (R2, R8);
  an unrelated file already in `.claude/agents/` is left as it was (R6); with `.opencode/agents/reviewer.md` already
  present, `claude opencode` exits non-zero, names that file on standard error, and afterwards the directory holds
  that one file unchanged and no `.claude/` exists (R7); no arguments and `codex` each exit non-zero with the usage on
  standard error and create nothing (R3)
- [x] Implement `scripts/agent-kit-roles.mjs` as the approach describes, with the `#!/usr/bin/env node` line and the
  executable bit set, until `npm test` passes (R1 to R8)
- [x] Add the `bin` entry and the `files` entry to `package.json` (R1)
- [x] Rewrite the harness wrapper bullet of README's "Installing it into a project" to run
  `npx agent-kit-roles claude opencode`, naming only the harnesses the project uses; say that the command refuses to
  overwrite and that a model per role goes in the project's own wrapper. Update the list of shipped files in that
  section and the `scripts/` row of "What is here" (R9)

## Verification

- [x] `npm test` passes, and its output includes the new tests (R10)
- [x] `npm pack --dry-run` lists `scripts/agent-kit-roles.mjs`, and the packed file keeps its executable bit (R1)
- [x] In a scratch directory, `npm install` of the packed tarball followed by `npx agent-kit-roles claude opencode`
  writes the six files, and a second run fails and changes nothing (R1, R7)
- [x] In that scratch directory, `opencode debug agent planner`, `implementer` and `reviewer` each report the Norareit
  description, `mode` `subagent` and the pointer as the prompt (R5)
- [x] `diff -r` of the scratch directory's `.claude/agents/` against Norareit's at `610d564` reports nothing (R4)
- [x] `node scripts/check-changes.mjs` passes on the committed branch

## Commit Points

- [x] `feature-0002` The fixtures and the failing tests
- [x] `feature-0002` The command, the `bin` entry, and the README
