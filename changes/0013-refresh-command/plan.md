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
and as this release renders it, and returns what to write. It finds the existing wrapper's frontmatter, the lines
between a first line of `---` and the next one, takes from it every line that opens with `model:` at the left
margin, and returns the rendered wrapper with those lines put in before the `---` that closes its frontmatter. It
reads no YAML and knows nothing about any harness.

The unit took three reviews to get there, and the tasks below keep that history: they first built a function that
kept every key a project added, then a reader of one stated form of frontmatter that refused the rest, in a module
of its own with a comparison against a YAML parser beside it. The last tasks take all of that out again, by the
human's decision in the spec.

The entry point, `refresh(root, harnesses)`, reads each file's state with `lstatSync`, and writes, rewrites, leaves
or refuses it. It reads neither `package.json` nor the lockfile.

Start from `master` once 0012 is merged into it, since the tests and the README paragraphs this unit touches are
the ones 0011 and 0012 left.

## Files

- `scripts/agentrite.mjs`: `parseArgs` in place of `parseInitArgs`; `shimFile`; `kitOwnedFiles`; `refreshedWrapper`;
  `refresh`; the dispatch in the entry point
- `scripts/wrapper-frontmatter.mjs`, `tests/manual/frontmatter-vs-yaml.py`, `tests/manual/refresh-cases.mjs`: added
  during the reviews and removed again by the last tasks, with the entry for the first in `package.json`. The unit
  leaves none of them, and `package.json` as it was
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
- [x] Update `README.md`. In "Updating a project to a newer kit", after the install command: run
  `npx agentrite refresh claude opencode`, naming the project's harnesses, which rewrites the role wrappers and
  `agent.sh` as the new release writes them and prints what it did; a key the project added to a wrapper's
  frontmatter, such as a pinned model, is kept, and anything else added to those files is replaced, which
  `git diff` shows. In "Installing it into a project", where it says that every generated file is the project's
  own and that `init` never regenerates one, add that the wrappers and `agent.sh` are the exception `refresh`
  keeps current, and reword "`CLAUDE.md` and `agent.sh` are best left as written" so that it says `agent.sh` is
  rewritten by `refresh`. Remove nothing else (R11)
- [x] Review S1: find the frontmatter of a wrapper whose lines end in CRLF, so that its added keys are kept. The
  result is written with LF, as the release writes it. First the regressions: in the unit tests, a CRLF wrapper
  with a pinned model and a nested key keeps both, takes the release's values and body, and is stable on a second
  refresh; end to end, a CRLF wrapper with a pinned model keeps the pin (R4, R5)
- [x] Review S2: recognize a key at the left margin that is written in double or single quotes, or with space
  before its colon, and compare keys by their name, not their spelling. First the regressions: `"model"`,
  `'model'` and `model :` added to a wrapper are kept as written; a kit key written as `"mode"` after a kept key is
  replaced by the release's `mode`, leaving one mode key (R4, R5)
- [x] Review C1: count the shim as executable only when its owner may execute it. First the regression, end to
  end: a shim with the release's content and mode 0645 is reported as refreshed and is then executable by its
  owner, and a second run reports it as up to date (R6)
- [x] Delta review S2 and C2, with the spec as amended by requirements 13 and 14: write the tests first, in
  `tests/agentrite-refresh.test.mjs`. `refreshedWrapper` returns either the content to write or the problem that
  kept it from reading the frontmatter, as the number of a line and a reason. Unreadable, each naming its line: a
  key in double quotes, in single quotes, with space before its colon, and written with `?`; a single-quoted and a
  double-quoted value that run over several lines, the review's case among them; a bracketed list that runs over
  several lines; a quoted value and a bracketed list opened on an indented line; a value with an anchor and with a
  tag; a tab in the indentation; a margin line that is neither key, list item, comment nor blank; an indented line
  before any key; frontmatter never closed. Readable and kept whole: a comment above an added key, which comes with
  it; a nested map with a quoted nested key; quoted values that hold a colon and a `#`; a bracketed list on one
  line; a `|` text holding quotes and a line shaped like a key; a list at the left margin; blank lines. The tests
  that expected quoted and spaced keys to be kept are replaced by these, and the guard whose value was not valid
  YAML is replaced by quoted values that are. End to end: a wrapper the command cannot read is byte for byte
  unchanged, named on standard error with its line, the others are refreshed, the exit status is 1, and a second
  run does the same. See them fail (R4, R5, R13, R14). As done, and as review finding P1 records: the module of the
  next task was drafted before these unit tests, which therefore passed when first run and were not seen failing
  against the code they were written for; only the end-to-end test failed first
- [x] Rework `splitWrapper`, `keyBlocks` and `refreshedWrapper` to read exactly the form of requirement 13 and
  report anything else, taking back the recognition of quoted and spaced keys that the fix of S2 added, and have
  `refresh` leave and name a wrapper it cannot read. Until the tests pass (R4, R5, R13, R14)
- [x] Check every frontmatter the new tests use with a YAML parser, outside the suite, which has no dependency to
  parse with: each one the tests call readable parses, to the keys and values the test expects kept, and each one
  they call unreadable is recorded as valid or as invalid YAML (R13, R14)
- [x] Add to the README, where it describes `refresh`: the form of frontmatter it reads, in a few lines, and that a
  wrapper written otherwise is left as it is and named, with the exit status (R11)
- [x] Compare the reader with a YAML parser on random frontmatter, outside the suite: build frontmatters from
  pieces that are readable, unreadable and deliberately misleading, and for each one the command reads check that
  the result parses, that every added key has the value it had, that every kit key has the release's, and that a
  second refresh changes nothing. Turn each failure into a test in the suite before fixing it (R4, R5, R13, R14)
- [x] Review S3: read a key at the left margin whose name is any run of letters, digits, `_` and `-`, as
  requirement 13 says, where the reader asked for a letter or `_` first. First the regression: `2fa: true`,
  `9: nine` and `-x: 1` added to a wrapper are kept (R13)
- [x] Review C3: refuse a bracketed list or map that holds a `#`, since what follows a `#` may be a comment, and a
  bracket in a comment closes nothing. First the regressions: the review's case, in the function and through the
  command, is reported at the line that opens the list, the wrapper byte for byte unchanged and its modification
  time with it, the exit status 1, the other files done, and the same on a second run; a bracketed list followed
  by a comment on its line, and one with a `#` inside a word, are refused too (R13, R14)
- [x] Keep the comparison with a YAML parser in the repository, as `tests/manual/`, so that it can be run again
  and its cases are not lost with a session: it needs Python with PyYAML, which the suite must not, so `npm test`
  does not run it and the README says how to. Extend it to build frontmatter out of single tokens as well as
  whole pieces, comments inside brackets among them, which the first version lacked and which is how C3 got past
  it. Run it, and turn each failure into a test in the suite before fixing it (R4, R5, R13, R14)
- [ ] Keep only the pinned model, as the spec now has it in requirements 4 and 5, with 13 and 14 withdrawn. First
  the tests, replacing those of the reader: a wrapper that is what the release writes comes back unchanged; a
  `model:` line is kept after the kit's keys in both harnesses, wherever it stood, and as written, whatever its
  value; several are kept in their order; a wrapper saved with CRLF keeps its model and is written with LF; another
  key, a nested setting and a comment are not kept; a line that only starts like it, such as `models:`, an indented
  `model:` and one in the body are not taken for a pin; the kit's keys and the body are the release's; a file with
  no frontmatter, or with one never closed, becomes the release's wrapper; a second refresh changes nothing. End to
  end, the tests of the refusal go, and the others stay as they are. See them fail (R4, R5, R12)
- [ ] Write `refreshedWrapper` in `scripts/agentrite.mjs` as the Approach describes, returning the content, have
  `refresh` use it without a refusal, and remove `scripts/wrapper-frontmatter.mjs`, its entry in `package.json`,
  and `tests/manual/`. Until the tests pass (R3, R4, R5)
- [ ] In the README, take out the description of the frontmatter `refresh` reads and of the check run by hand, and
  say instead that a `model:` line is kept and everything else in a wrapper is replaced, which `git diff` shows
  (R11)

## Verification

- [x] `npm test` passes
- [ ] `npm pack --dry-run` lists `scripts/agentrite.mjs` and the same 22 files as before the unit
- [x] In a scratch project set up with `npx agentrite init claude opencode` from the packed kit, with a model
  pinned by hand in one wrapper, after the kit's keys, and a line appended to `agent.sh`,
  `npx agentrite refresh claude opencode` reports `agent.sh` as refreshed and the six wrappers as up to date, the
  one with the pin among them since a pin after the kit's keys is already what a refresh writes. The pin is still
  there, the appended line is gone, and the five files that are the project's are byte for byte unchanged
- [x] `npm run check-changes` passes

## Commit Points

- [x] The argument parsing for two commands
- [x] The refactoring that names the shim
- [x] `refreshedWrapper` and its tests
- [x] The `refresh` command and its end-to-end tests
- [x] The README
