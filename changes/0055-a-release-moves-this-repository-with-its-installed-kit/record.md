---
kind: feature
status: approved
timestamp: 2026-10-16T12:51:32Z
---

# 0055 A release moves this repository, with its installed kit

## Log

- 2026-10-16T12:51:32Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `2b93c0b`, which is the release 7.1.0 and the head of `origin/master`. The session had made that
  release and stopped its step 6, and found on the way that `npx agentrite` runs the working tree here. The human
  asked for that finding and a step 6 that carries out exact update instructions in one unit. Made it a feature:
  widening step 6 is new behavior, not the repair of a fault, and the finding is its context. Numbered 0055: the
  highest number in `changes/` is 0054.
  Took the role from the role file and `process.md` of release 7.0.0, installed. Reproduced the finding before
  writing it: with 7.0.0 installed, `npx agentrite roles`, `node node_modules/agentrite/scripts/agentrite.mjs
  roles` and `node_modules/.bin/agentrite roles` were compared on the implementer's description, and
  `npm exec -c 'command -v agentrite'` was run, with npm 11.19.1; the spec's "Context" gives what each printed.
  Read `RELEASING.md`, the release skill, "Commands" and the table of `CONTRIBUTING.md`, this repository's
  `CLAUDE.md`, and the tests that name `RELEASING.md`. Found `npx agentrite` in this repository's own documents in
  step 6 of `RELEASING.md` alone.
  Wrote `spec.md`. It decides, without asking the human: the script's name `kit`, the closed list of what is an
  exact instruction, that this repository's prose stops listing the kit's instruction files, and that the move to
  7.1.0 is step 6 run alone after this unit. Approving the unit approves them. The status is `draft`
- 2026-10-16T12:56:11Z [human] approved the spec. The status is `approved`
- 2026-10-16T12:57:29Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, cut
  `feature-0055-a-release-moves-this-repository-with-its-installed-kit` from `master` at `70831ec`, with 7.0.0
  installed. Took the role from the role file and `process.md` of 7.0.0. Read `spec.md`, `RELEASING.md`,
  `CONTRIBUTING.md`, `CLAUDE.md`, `opencode.json`, `package.json`, `tests/release.test.mjs`, the release skill, and
  "Worth knowing when you update" of 7.0.0 and 7.1.0 in `CHANGELOG.md`. Wrote no plan: the spec leaves open what
  the text of step 6 has to say, in two places, and the unit goes back to the specifier and the human. The status
  stays `approved`.
  First, an instruction that repeats one of the five commands. Both sections that asked for more open with a block
  that holds `npm install --save-dev agentrite@latest` and `npx agentrite refresh`, and 7.0.0's holds
  `./sandbox.sh --in-place --rebuild true` too. Each is a command word for word, so requirement 6 has step 6 carry
  it out after the five. Carried out as written, the install moves the devDependency from `7.1.0` to `^7.1.0`, and
  the reading of the tree then stops the step, since `package.json` differs by more than the version. The spec
  does not say whether such an instruction is carried out, counts as done by the five, or stops the step.
  Second, the context says that what 7.1.0 asks besides the five commands is exact: `init` and the line of
  `CLAUDE.md`. Its section asks two more things of a project. A unit whose status is `planned` at the update is to
  have `status: planned` changed to `status: approved`: that is a change to a line, which is not on the closed list
  of requirement 6, and whether it holds here is settled by the units in `changes/`, not by `agentrite.json`. And an
  `AGENTS.md` that names no `standards.md` is to take what the project wants of the sections `init` prints, which
  leaves a choice; this repository's `AGENTS.md` names no `standards.md`. Under requirements 6 and 7 as written,
  step 6 for 7.1.0 stops on both, so the run the decisions name as the first use of the widened step does not
  carry 7.1.0 through. The spec does not say whether that is intended, or whether an instruction whose condition
  does not hold here, as no unit is `planned` at the time, is one that "asks a project to do something"

## Amendments
