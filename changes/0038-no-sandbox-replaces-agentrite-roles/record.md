---
kind: feature
status: planned
timestamp: 2026-10-08T16:48:43Z
---

# 0038 `--no-sandbox` replaces `agentrite-roles`

## Log

- 2026-10-08T10:54:55Z [human] in an earlier session of Claude Code on the host, while unit 0037 was specified, was
  told that `agentrite-roles` and `agentrite roles` do unrelated things under nearly the same name, and that the
  first is nearly redundant since `init` and `refresh`. Proposed to move it into `agentrite init --roles-only` and
  `agentrite refresh --roles-only`. Was answered that `--no-sandbox` fits the case better, and that the choice is
  between removing `agentrite-roles` with that option on both commands, and removing it with no option at all. In
  this session, gave that exchange to the specifier and decided: "I agree with that last part. Make it a
  --no-sandbox !"
- 2026-10-08T10:54:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `3f61b74`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made the
  unit as a feature, since it takes decisions on what two commands leave out and on what becomes of a published
  name. Numbered 0038: the plain directories run from 0001 to 0037 and then hold 0042, the `history-` directories do
  not count, and the number continues after the last of the consecutive run, as the human said for 0037. Wrote
  `spec.md`. Read for it `scripts/agentrite.mjs`, `scripts/agentrite-roles.mjs`, the pointer package under
  `pointers/agentrite-roles/`, the parts of `README.md` on installing and updating, and the spec of unit 0037.
  Searched the repository for `agentrite-roles`. Found by that: the usage text of `init` and `refresh` is the usage
  text of `agentrite-roles` with the name replaced, and `scripts/agentrite.mjs` and `scripts/agentrite-run.mjs`
  import the wrappers from the file of the old command, so that file's logic stays whatever becomes of the command.
  Ran no command of the kit and no suite. The human decided the removal and the option on both commands. The rest in
  the spec is the specifier's and was not the human's in those words:
    * that the pointer package is kept, reworded and given a higher version, and that publishing it is the human's
    * that `init --no-sandbox` runs without a `name` in `package.json` and does not read `package-lock.json`
    * that no line is printed for a file that is left out
    * that the option is accepted at any place and counts once when repeated
    * that there is no release that warns first, and that the release that carries the unit is a major one
    * that nothing of unit 0037 is changed here, though its requirement 5 lists `agentrite-roles`
  Status left at `draft`
- 2026-10-08T16:45:17Z [human] approved the spec as it stands on `master` at `8be0136`
- 2026-10-08T16:45:17Z [Claude Code, anthropic/claude-sonnet-5-5] in the main session on the Linux host, on `master`
  at `8be0136`, set the status to `approved`
- 2026-10-08T16:48:43Z [Claude Code, anthropic/claude-sonnet-5-5] as the planner, in a session on the Linux host, cut
  the branch `feature-0038-no-sandbox-replaces-agentrite-roles` from `master` at `1916d7e`. Read `process.md`,
  `roles/planner.md`, `spec.md` and `record.md`, and wrote `plan.md` against the tree. Units 0037 and 0039 are
  implemented on `master`, so the spec's remark that 0037 is a draft is out of date and requirement 11 falls in the
  documents as they are. Re-checked every file that names `agentrite-roles`: `README.md` (the "What is here" row, the
  `agentrite-roles` section of "Commands", one line of "Installing it into a project"), `CONTRIBUTING.md` (the row of
  `pointers/`), `package.json` and `package-lock.json` (the root `bin`; the entry of the installed release 4.2.0 in the
  lock is not this repository's and stays), `scripts/agentrite-roles.mjs`, `scripts/agentrite.mjs` and
  `scripts/agentrite-run.mjs` (imports), `pointers/agentrite-roles/`, and `tests/`. `AGENTS.md`, `SANDBOX.md`,
  `RELEASING.md`, `CHANGELOG.md`, `templates/` and `container/` do not name it. Decided in the plan, the spec leaving it
  open: the module `scripts/agentrite-roles.mjs` keeps its name and loses only what made it a command; the parsing of
  the harnesses moves into `scripts/agentrite.mjs`; the pointer goes to version 2.0.0. Found no contradiction in the
  spec. Wrote no code and ran no suite. Status set to `planned`

## Amendments
