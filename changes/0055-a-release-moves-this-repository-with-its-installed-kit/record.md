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

## Amendments
