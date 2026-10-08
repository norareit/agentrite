---
kind: feature
status: approved
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
- 2026-10-07T22:55:04Z [human] read the spec's three open decisions and answered: `SANDBOX.md` is fine. The documents
  are still to lose a lot of their prose, and every account of why something was done: whoever reads the README
  wants to know what there is and how to use it, and the why is in the change documents. That may be a general
  rule. The reviewer is to check against the original README what was lost, so that the human can decide whether a
  loss is a problem. Asked for a table of contents with links, between "The name" and "What is here". Said that
  "What is here" is not complete, is to be corrected, and is to be kept up to date by an entry in `AGENTS.md`
- 2026-10-07T22:55:04Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, rewrote `spec.md` for that. The
  decision that nothing is dropped but repetition is replaced by requirement 10, which says what stays and what
  goes, and by a section for the reviewer. The table of contents moved from "Beyond the request" into the
  requirements, for the README. "What is here" is to have a row for every tracked entry at the root of the
  repository, of which there are 24 by `git ls-tree`, and the present table has 11. Three things in the rewrite are
  the specifier's and not the human's in those words: that the table says of each entry whether it is in the
  package, that the links of the table of contents are Bitbucket's, since `origin` is at `bitbucket.org`, and that
  the rule on the why goes into this repository's `AGENTS.md`, with the kit-wide form under "Beyond the request".
  Not checked: the form of Bitbucket's anchors, which the specifier knows from memory and did not try. Status left
  at `draft`
- 2026-10-07T23:05:00Z [human] said that "What is here" is not to hold everything at the root of the repository: it
  is limited to what is shipped, so `deploy.sh`, `infra/` and `RELEASING.md`, which are in it today, do not belong
  there
- 2026-10-07T23:05:00Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, changed `spec.md` for that:
  requirement 3 limits "What is here" to what the package holds, and the column that said whether an entry ships is
  gone with the need for it. That the rows which leave go into a table in `CONTRIBUTING.md`, and that this table is
  complete for the rest of the repository, is the specifier's: the human said where the rows do not belong, not
  where they go. Status left at `draft`
- 2026-10-07T23:15:00Z [human] answered the two open questions. No table of contents, unless its links work in the
  Markdown on Bitbucket, on GitHub and in IntelliJ alike. And the rule that the documents say what and how, and not
  why, goes into this repository's `AGENTS.md` and is not a rule for every project
- 2026-10-07T23:15:00Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, changed `spec.md` for that. The
  table of contents is out of the requirements, with a decision that says why there is none, and the requirements
  after it are renumbered, so a number in an earlier entry of this log is the number of that time. The two entries
  under "Beyond the request" that the answers settle are removed: the rule as a rule of the kit, and a table of
  contents in the other two documents. That Bitbucket's anchors differ from GitHub's and IntelliJ's is from the
  specifier's memory and was not tried. Nothing the specifier asked is open now. Status left at `draft`
- 2026-10-08T10:57:11Z [human] read the spec and found requirement 5 ambiguous: it could give a list of all commands
  and then a description of each, or one list with the description right after each command. Wants the second, so
  that the result does not grow long again
- 2026-10-08T10:57:11Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, rewrote requirement 5 for that. As
  it stood it meant the first reading. It now asks for one list in which each command stands once, says what an
  entry holds and in which order, and has a decision beside it. Status left at `draft`
- 2026-10-08T11:03:57Z [human] asked whether `SANDBOX.md` is the present README's text copied over, and so still a
  lot of prose and of explaining why
- 2026-10-08T11:03:57Z [Claude Code, anthropic/claude-opus-5-5] as the specifier. It is not: requirements 9 and 10
  hold for all three documents. Requirements 7 and 8 said that the two new documents hold what the present README
  says, which reads as a copy, so both now say that they cover its subjects and are written anew by requirements 9
  and 10. Status left at `draft`
- 2026-10-08T11:13:07Z [human] took the last entry of "Beyond the request" into the unit: the release in the install
  examples. It will be out of date soon, and it does no harm to bring it along
- 2026-10-08T11:13:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, moved it into `spec.md` as
  requirement 16, with a decision, and the requirement on the suites is 17. One entry is left under "Beyond the
  request", the test for an option the README does not name. Status left at `draft`
- 2026-10-08T11:15:04Z [human] asked for the unit to be planned. Asked whether the spec is approved as it stands on
  `master` at `17cef2f`, said that it is
- 2026-10-08T11:15:04Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host, on `master` at
  `17cef2f`, set the status to `approved`

## Amendments
