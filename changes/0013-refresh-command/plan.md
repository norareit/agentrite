# 0013 A command that brings the kit's own files in a project up to date

## Approach

`refresh` goes in `scripts/agentrite.mjs`, beside `init`, and reuses what `init` already has: `plannedFiles` for the
wrappers, the `agent.sh` template, and the harness parsing.

The argument parsing changes first, as a step of its own. `parseInitArgs` becomes `parseArgs`, which returns the
command and the harnesses, so that the entry point can dispatch. For `init` it accepts and rejects exactly what it
did; only the usage for a missing or unknown command changes, to two lines:

```
usage: agentrite init claude | opencode
       agentrite refresh claude | opencode
```

A usage error inside a command still prints that command's line alone.

What `agent.sh` is, is cut out of `projectFiles` into a function of its own, `shimFile`, which `projectFiles` then
calls. That is a refactoring commit: `init` writes the same files, in the same order, before and after. The list of
files the kit owns, `kitOwnedFiles`, is the wrappers and that shim. It is written with `refresh`, its one caller,
and `projectFiles` is not built from it: the list marks the wrappers as files whose frontmatter is kept, which
`init` has no use for, and `init` writes `AGENTS.md` and `CLAUDE.md` between the wrappers and the shim.

The one piece of new logic is pure: `refreshedWrapper(existing, rendered)` takes the wrapper as it is in the project
and as this release renders it, and returns what to write. It splits each into its frontmatter and its body. The
frontmatter is the lines between a first line of `---` and the next line of `---`. A key is a line that starts with
a name and a colon at the left margin, and every line after it that is indented, starts with `-`, or is blank
belongs to that key. The result is the rendered frontmatter, then each key block of the existing one whose name the
rendered one does not have, in their order, then the rendered body. An existing file without frontmatter gives the
rendered file unchanged. It knows nothing about any harness: the keys the kit writes are whatever the rendered file
holds.

The entry point, `refresh(root, harnesses)`, reads each file's state with `lstatSync`, and writes, rewrites, leaves
or refuses it. It reads neither `package.json` nor the lockfile.

Start from `master` once 0012 is merged into it, since the tests and the README paragraphs this unit touches are
the ones 0011 and 0012 left.

## Files

- `scripts/agentrite.mjs`: `parseArgs` in place of `parseInitArgs`; `shimFile`; `kitOwnedFiles`; `refreshedWrapper`;
  `refresh`; the dispatch in the entry point
- `tests/agentrite-init.test.mjs`: the parsing tests, for `parseArgs`
- `tests/agentrite-refresh.test.mjs`: new, the unit tests of `refreshedWrapper` and the end-to-end tests of the
  command
- `README.md`: "Updating a project to a newer kit" gains the command; "Installing it into a project" says which
  generated files are the kit's
- `changes/0013-refresh-command/record.md`: the log

## Tasks

- [x] In `tests/agentrite-init.test.mjs`, rewrite the parsing tests for `parseArgs`: `init` with harnesses gives
  `{ command: 'init', harnesses }`, and `refresh` the same with its own name; no harness or an unknown one gives
  that command's usage line alone; no command, and a command that is neither, gives both usage lines, the second
  after `unknown command: <name>`. See them fail (R1, R2)
- [x] Replace `parseInitArgs` with `parseArgs` and dispatch on the command in the entry point, with `refresh`
  exiting through a stub that throws, until the parsing tests pass and every other `init` test still does (R1, R2)
- [x] As a refactoring commit of its own, cut `shimFile(templates)` out of `projectFiles`, returning what
  `agent.sh` is, and have `projectFiles` call it. No test changes, and all pass (R6)
- [x] Write the unit tests of `refreshedWrapper` in `tests/agentrite-refresh.test.mjs`: an existing wrapper equal
  to the rendered one comes back unchanged; `model: x` added to either harness's frontmatter is kept, after the
  kit's keys; two added keys keep their order; a key with a nested value over several lines, and one holding a
  list, are kept whole; a changed `description`, and a changed `mode` or `name`, take the rendered value; a body
  with an older pointer line and an added paragraph becomes the rendered body; a file with no frontmatter becomes
  the rendered file. See them fail (R4, R5, R12)
- [x] Write `refreshedWrapper` until they pass (R4, R5)
- [x] Write the end-to-end tests in the same file, running the executable in a temporary project: wrappers
  holding the old package's path and a pinned model, and an `agent.sh` with other content and no executable bit,
  are refreshed, the pin is kept, the output names each file as refreshed and the exit status is 0 (R3, R4, R6,
  R8); a second run names each as up to date and leaves every file's content and modification time as it was
  (R8); a project with none of the files gets all seven, named as written (R3, R6, R8); `AGENTS.md`, `CLAUDE.md`,
  `agent/compose.project.yml`, `package.json` and `.dockerignore` present are byte for byte unchanged, and absent
  are still absent (R7); only the given harness's wrappers are touched (R3); a symbolic link at one wrapper's path,
  pointing outside the project, and a directory at `agent.sh`, are left, named on standard error, the link's
  target is unchanged, the other files are refreshed and the exit status is 1 (R9); a project with no
  `package.json` and no lockfile is refreshed (R10); no harness and an unknown one write nothing and exit 2 (R1).
  See them fail (R12)
- [x] Write `kitOwnedFiles({ templates, harnesses })`, returning the wrappers, marked as keeping their
  frontmatter, and the shim, and write `refresh` over it until they pass (R3, R6, R7, R8, R9, R10)
- [ ] Update `README.md`. In "Updating a project to a newer kit", after the install command: run
  `npx agentrite refresh claude opencode`, naming the project's harnesses, which rewrites the role wrappers and
  `agent.sh` as the new release writes them and prints what it did; a key the project added to a wrapper's
  frontmatter, such as a pinned model, is kept, and anything else added to those files is replaced, which
  `git diff` shows. In "Installing it into a project", where it says that every generated file is the project's
  own and that `init` never regenerates one, add that the wrappers and `agent.sh` are the exception `refresh`
  keeps current, and reword "`CLAUDE.md` and `agent.sh` are best left as written" so that it says `agent.sh` is
  rewritten by `refresh`. Remove nothing else (R11)

## Verification

- [ ] `npm test` passes
- [ ] `npm pack --dry-run` still lists `scripts/agentrite.mjs` and nothing new
- [ ] In a scratch project set up with `npx agentrite init claude opencode` from the packed kit, with a model
  pinned by hand in one wrapper and a line appended to `agent.sh`, `npx agentrite refresh claude opencode` reports
  those two as refreshed and the other five as up to date, the pin is still there and the appended line is gone
- [ ] `npm run check-changes` passes

## Commit Points

- [x] The argument parsing for two commands
- [x] The refactoring that names the shim
- [x] `refreshedWrapper` and its tests
- [x] The `refresh` command and its end-to-end tests
- [ ] The README
