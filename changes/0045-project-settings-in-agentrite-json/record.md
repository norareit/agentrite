---
kind: feature
status: draft
timestamp: 2026-10-10T22:14:15Z
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

## Amendments
