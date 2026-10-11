---
kind: feature
status: in-progress
timestamp: 2026-10-11T21:40:31Z
---

# 0045 A project names its settings in `agentrite.json`

## Log

- 2026-10-10T22:14:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host
  that another agent started, on `master` at `9c838dd`. That agent gave the request and the decisions the human
  made in a conversation with it, and while the spec was being written added one more on the human's word: the kit
  is installed as a development dependency. Made the unit as a feature. Numbered 0045: the plain directories run
  from 0001 to 0044, and the `history-` directories are below that. The remote was not fetched, so a unit numbered
  elsewhere in the meantime is not ruled out.
  `node_modules/agentrite` is not on this host, which still holds `node_modules/@ritenoar/agentrite` from before
  unit 0044, so the role file and `process.md` were read at the repository root: `git diff v6.0.0 HEAD -- roles
  process.md scripts container templates` prints nothing, so they are what release 6.0.0 holds. `npm ci` was not
  run. Read besides: `README.md`, `SANDBOX.md`, `CONTRIBUTING.md`, step 6 of `RELEASING.md`, the four scripts and
  the two files of the wrapper, and the specs of units 0010, 0013, 0029, 0038, 0041 and 0044.
  Wrote `spec.md`. The human's decisions are marked as theirs in it. Settled the points that were left open, each
  with its reason under "Decisions": `init` and `refresh` refuse a setting given as an argument once the file is
  there, a file is valid whole or not at all, `agentrite run` does not read it, the wrapper reads it only when it
  cuts a branch and from the checkout it is run from, the change check reads the working tree's, `init` without
  the sandbox still asks for no `name`, and this repository gets its own file in this unit.
  Tried, with npm 11.19.1 and node 26.9.0 in scratch projects outside the repository: `npm install --save-dev
  agentrite` writes `devDependencies`, `npm install agentrite@latest` keeps the section the package is in,
  `--save-dev` with it moves a regular dependency to `devDependencies`, and `npm ci --omit=dev` and
  `NODE_ENV=production npm ci` install no kit. `git check-ref-format --branch` runs outside a repository.
  Looked for what else names the install command: `CONTRIBUTING.md`, `SANDBOX.md`, `RELEASING.md` and the release
  skill need no change for it, and the pointer package `agentrite-roles` and its tests name `npm install agentrite`,
  which "Beyond the request" has.
  Ran on the tree with the two documents, which change no code: `node scripts/check-changes.mjs` exits 0, and
  `npm test` reports 426 tests with 1 failing, "the wrapper mounts a relative XDG_DATA_HOME as the absolute path it
  names from its working directory", which expects a path under `/var` and gets the same under `/private/var`. That
  is macOS's temporary directory and no part of this unit.
  Not checked: that `npx agentrite` at this root runs the working copy, which is taken from unit 0044, and
  anything that needs Docker. The status is `draft`
- 2026-10-10T22:30:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on `master`
  at `656faec`, on the human's answers as the agent that started the session gave them. Two confirm the draft and
  are now the human's in "Decisions": `init` refuses a setting given as an argument once the file is there, also
  one that says what the file says, and an empty `harnesses` is not valid. Two change it, and both left "Beyond the
  request". `init` says what it wrote: requirement 8 has it print the content of the file, as `config` does in
  requirement 18, and a notice when `master` was written unasked, and requirement 46 has the test. The pointer
  package is in the unit: requirements 48 and 49, with the version `2.0.2` and the publish as the human's step
  after the release. No requirement was renumbered. Read for it `pointers/agentrite-roles`, its test and units
  0038 and 0043. `CONTRIBUTING.md` has only the row of `pointers/` and `RELEASING.md` names no pointer, so the
  version and the publish follow what those two units did. `npm view agentrite-roles versions` gives `1.0.0` and
  `2.0.1`. `pointers/` holds no other package. The status stays `draft`
- 2026-10-10T22:34:57Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on `master`
  at `2c37719`, on the human's two further answers as the agent that started the session gave them. The publish of
  a changed pointer is in step 5 of `RELEASING.md` since `2c37719`, which is on `master` and no part of this unit,
  so requirement 49 names that step where it spelled the publish out, the plan holds nothing for it, and the item
  left "Beyond the request". The version `2.0.2` is confirmed, and is the human's in "Decisions". Read `2c37719`:
  it leaves step 6 as it was, so requirement 43 stands as written. No requirement was added or renumbered. The
  status stays `draft`
- 2026-10-11T20:43:31Z [human] approved the spec. The status is `approved`
- 2026-10-11T21:04:35Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  the branch `feature-0045-project-settings-in-agentrite-json`, which was there already at `4d09d9b`, the head of
  `master`.
  Read `roles/planner.md` and `process.md` of the installed release 6.0.0, the spec and this record, and the tree:
  the four scripts, the two files of the wrapper, the templates, the four documents, the pointer package and the
  tests that run `init`, `refresh`, `run`, the change check and a unit run. Wrote `plan.md`: 29 tasks in eight
  commits, each task with the requirements it delivers, and every requirement from 1 to 49 with a task. Found
  nothing in the spec that is unclear or that the tree contradicts. Decided what the spec leaves to the how, each
  with its reason under "Approach": one module, `scripts/agentrite-settings.mjs`, which the wrapper runs with
  `node` for the default branch; the written file rendered, and held equal to the template by a test; `master` in
  the template alone; the kit's order of the harnesses in the file, and the order given for every other file, by
  requirement 15; a command line that cannot be parsed exits 2 before the file is looked at; and git asked for
  `refs/heads/<default branch>`. Ran nothing but reads: no test, and no command that changes a file. The working
  tree held a change to `README.md` that is not committed and not this session's, the heading `## Commands` as
  `## npCommands`. It was left as it is and is in no commit of the planner. The status is `planned`
- 2026-10-11T21:40:31Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  the branch `feature-0045-project-settings-in-agentrite-json`, from `78c3e53`. Read `roles/implementer.md` and
  `process.md` of the installed release 6.0.0, the spec, the plan and this record. The working tree was clean:
  the change to `README.md` that the planner found was not there any more. Moved the status to `in-progress` and
  worked the 29 tasks in order, each test written and seen to fail before its code, in the eight commits the plan
  names, `add5266` to `720b906`, and ticked the verification in `a5c9421`. No task was added to the plan and none
  removed, and `spec.md` is as it was approved.
  Run on `a5c9421`: `npm test` reports 493 tests, 493 passing, where the tree before the unit had 426.
  `node scripts/check-changes.mjs` at the root exits 0, and so does `npm run check-changes`, which runs the
  installed 6.0.0. `node scripts/agentrite.mjs refresh` at the root prints `up to date` for the nine files and
  changes none. The three greps and `npm pack --dry-run` of "Verification" give what the plan says they give, and
  `git diff master` shows no change of `CHANGELOG.md`, one line of `RELEASING.md` and one row of `CONTRIBUTING.md`.
  Tried besides, outside the suite: `npm test` in a clone that holds this branch alone and no `master` reports the
  same 493 passing. The tarball of `npm pack`, installed with `--save-dev` into a scratch repository on `main`:
  `npx agentrite init --default-branch main claude`, `npm run check-changes`, `npx agentrite refresh` and the
  reader run with `node` all ran from `node_modules`.
  What the plan left to the implementer, and what was chosen:
  the messages of the reader, which are held word for word by `tests/agentrite-settings.test.mjs`; the refusal of
  `init` in a project that has the file, in two lines; the two notices; and, for a file that the wrapper cannot
  take, the line `sandbox.sh: so no branch is cut for '<unit>'.` under the reader's own message.
  The reader run as the entry point with no argument, or with more than one, prints a usage and exits 2, which the
  plan does not name.
  Something at the path of `agentrite.json` that cannot be read, a directory or a dangling link, is refused as a
  file that cannot be read and not as a missing one, so that it is never answered with `npx agentrite config`,
  which skips such a path. Only the directory is tested.
  Tests that held what the unit ends were replaced and not kept: `refresh --no-sandbox` at each place among the
  harnesses, and `init` given a harness in a project set up without the sandbox, which is now `init` with no
  argument after an edit of `sandbox`.
  `README.md` says of `--default-branch=<name>` that it is refused as an unknown harness, which the spec has under
  "Beyond the request" as what happens and no requirement asks to be documented.
  Concerns:
  the guard `isMain` is in `scripts/agentrite.mjs` and, as the plan asks, a second time in
  `scripts/agentrite-settings.mjs`. Sharing it would take a third module in the package, which the plan does not
  have.
  The remedy of `agentrite run`, with the plan's words, makes its one line longer than 120 characters where a
  wrapper's path is long. It is printed, and no line of a file.
  Not checked: anything with real Docker, `./sandbox-dev.sh` among it. A unit run is tested with the stand-in of
  `tests/wrapper-fixture.mjs` alone. `./sandbox.sh` at this root runs the installed 6.0.0 and was not run. No
  `shellcheck` is on this host, and the two shell files were checked with `bash -n` and by the suite. The pointer
  is at `2.0.2` in the tree and is not published.
  The unit is not reviewed. The status stays `in-progress`

## Amendments
