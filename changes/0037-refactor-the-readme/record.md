---
kind: feature
status: draft
timestamp: 2026-10-07T22:40:04Z
---

# 0037 Refactor the README

## Log

- 2026-10-07T22:40:04Z [human] in a session of Claude Code on the host, asked how `README.md`, which is 1027 lines,
  can be made shorter and better structured, and decided that it is to be built up again from the ground, on the
  basis of the existing one. What the human said of the structure so far: the introduction and "What is here" are
  liked as they are; there should be how to install, and maybe how to upgrade; an overview of all the commands and
  what they do matters more than those; and an explanation of what the roles are and of how a usual workflow with
  the kit looks would help a lot
- 2026-10-07T22:40:04Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `a7ff48e`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made the
  unit, as a feature: a new structure takes decisions on what the README covers, in what order, and what moves to
  another file. Numbered 0037 on the human's word: the `history-` directories do not count in the numbering.
  `spec.md` is not written yet, because the structure is to be decided with the human first
- 2026-10-07T22:55:00Z [human] decided, on an outline and five questions of the specifier: the sandbox reference moves
  to a file of its own, which the human reads once it is split, to see what belongs in the README after all. "How it
  works" describes each role briefly and in general terms and repeats little, and the human writes the workflow in
  it, on how they use the kit today. All commands are described and no option is left out: the README is to be
  complete, and that it is kept so goes into `AGENTS.md`. Asked where "working on the kit" belongs for a package
  whose README is released, should the project become open source, and leaned to a file that is not deployed
- 2026-10-07T22:55:00Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, wrote `spec.md`. Read for it the
  usage text and the argument parsing of `scripts/agentrite.mjs`, `scripts/agentrite-run.mjs`,
  `scripts/agentrite-roles.mjs`, `scripts/check-changes.mjs` and `container/agent.sh`, and searched the compose
  files for the environment variables they read. Found by that: `AGENT_MEM_LIMIT` and `AGENT_CPUS`, which the
  present README does not name. Not done: a full list of every option against the README, which is the
  implementer's by requirement 5. Three decisions in the spec are the specifier's and were not the human's in those
  words: the names `SANDBOX.md` and `CONTRIBUTING.md`, that nothing is dropped but repetition, and that there is no
  target length. The human answered neither the question on a length nor the one on dropping detail. Status left at
  `draft`

## Amendments
