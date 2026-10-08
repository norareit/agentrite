---
kind: feature
status: implemented
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
- 2026-10-08T11:21:56Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the Linux
  host. Cut `feature-0037-refactor-the-readme` from `master` at `4bcf21f`, and read `process.md` and
  `roles/planner.md` of the installed release 4.2.0, the spec, this record and the README. Found two things the plan
  needs and the spec left open, wrote no plan, and asked the human. The spec gave no place to what "Running a role"
  says of `agentrite run` beyond its options: requirement 1 closed the README's parts, requirement 5 limits an
  entry of the list, and requirement 9 keeps such statements. And requirement 2 asks for a row for every entry at
  the root of the package, while the present table has two rows for `templates/`
- 2026-10-08T11:21:56Z [human] decided both: "Running a role" is a part of the README of its own, right after the
  commands, and the two rows for `templates/` stay
- 2026-10-08T11:21:56Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on the
  unit's branch, read `roles/specifier.md` and changed `spec.md` for that: requirement 1 has the part as its fifth,
  so the parts after it are the sixth to the eighth, requirement 2 names the two rows, and each has a decision. No
  requirement was renumbered. The status stays `approved`, since both are the human's own decisions
- 2026-10-08T11:24:29Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the same session, wrote
  `plan.md` against the branch at `6cefdfd`, on which `npm test` passes with 401 tests and `npm run check-changes`
  exits 0. Read for it, besides the above: the usage text and the argument parsing of the four scripts under
  `scripts/` and of `container/agent.sh`, the environment variables the compose files and the wrapper read,
  `agent-dev.sh`, `deploy.sh`, what `npm pack --dry-run` lists against `git ls-tree`, and every line outside
  `changes/` and `CHANGELOG.md` that names the README or a section of it. Three things in the plan are the
  planner's: the headings of the three documents, in which document each of the four facts of requirement 11 is
  stated, and that what the documents leave out is listed in a section of this record of its own, built up with
  each move. Not done: the full list of options against the code, which is a task of the plan, and the text of
  the workflow, which the implementer asks the human for. Status `planned`
- 2026-10-08T12:02:07Z [human] gave the text of the usual workflow, nine numbered steps, in the session,
  and said that it has not been spell-checked
- 2026-10-08T12:02:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the main session on the Linux
  host, on the unit's branch at `6dd984b`, in the main checkout. Read `process.md` and `roles/implementer.md` of the
  installed release 4.2.0, the spec, the plan and this record, and the base README in full. Status `in-progress`. Asked
  the human for the text of the workflow before the first task. Made the first move: `SANDBOX.md` is written anew from
  "Working on a clone" up to "The local model server", `package.json` lists it in `files`, the README has "The sandbox"
  in place of "Running the sandbox", and what the move left out is listed below. Three statements that the plan places
  in "Installing it into a project" were put there now, so that no commit is without them: the kit's hosts as a pointer
  to "Egress", the `.dockerignore` exception, and that the build argument alone decides on the browser. `SANDBOX.md` has
  one heading the plan does not name, `### Moving from a release up to 4.0.0` under "The harness logs", for the steps of
  moving away from the home volume. `tests/package-documents.test.mjs` failed on `SANDBOX.md` before `package.json`
  named it, and `npm test` passes after, with 403 tests
- 2026-10-08T12:03:42Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the second move.
  `CONTRIBUTING.md` is written anew from the base README's last four sections, with a table of the 18 entries that
  `git ls-tree` lists at the root and `npm pack --dry-run --json` does not, and with the commands that only this
  repository has. Read for those: `agent-dev.sh`, `deploy.sh`, `scripts` of `package.json` and
  `.claude/skills/release/SKILL.md`. `deploy.sh` and `npm test` read no argument, and `agent-dev.sh` passes every
  argument on to the wrapper. `tests/release.test.mjs` failed on `CONTRIBUTING.md` before the file was there, and
  `npm test` passes after, with 403 tests. The four sections are out of the README
- 2026-10-08T12:06:59Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the third move: the README is
  rebuilt in the order of requirement 1. The introduction and "The name" are untouched, and `git diff` shows no changed
  line in them. The human's text of the workflow is placed in "How it works" as given, and no line of it needed
  wrapping. Three things in it differ from what the kit does, and are left as the human wrote them, for the human:
  `agent.sh 007`, where a unit's number is four digits; "mark the change `complete`", where the status is `implemented`;
  and "merge back", where the wrapper fast-forwards. Both install examples name 4.2.0, which `devDependencies` of
  `package.json` names
- 2026-10-08T12:06:59Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, checked the list of commands against
  the code and not against the base README. Read: what `node scripts/agentrite.mjs`, `node scripts/agentrite.mjs run`
  and `node scripts/agentrite-roles.mjs` print with no argument; `parseRunArgs` and `RUN_OPTIONS` of
  `scripts/agentrite-run.mjs`; `parseHarnesses` of `scripts/agentrite-roles.mjs`; the entry point of
  `scripts/check-changes.mjs`; the usage in the header of `container/agent.sh` and its `case` over the options; every
  `${...}` of `container/agent.sh`, `container/unit-clone.sh`, `container/compose.yml` and
  `templates/project/agent/compose.project.yml`; and `process.env` in the scripts, which none reads. The names the base
  README did not hold: `AGENT_MEM_LIMIT`, `AGENT_CPUS`, `--model=<id>`, which the parser takes as it takes
  `--prompt=<text>`, and the `--` of `./agent.sh` as an option, which the base README used in one example and did not
  describe. Left out of the README as the plan has it: `AGENT_UID`, `AGENT_GID`, `AGENTRITE_CONTAINER`,
  `AGENT_CLAUDE_CODE_VERSION` and `AGENT_OPENCODE_VERSION`, which the wrapper sets itself, and `HOME`. Not checked: the
  options by running each command with them, apart from the three usage texts
- 2026-10-08T12:08:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the fourth and fifth commits:
  the comments in `agent.sh`, `templates/project/agent.sh`, the two `compose.project.yml`, `container/Dockerfile`,
  `agent-dev.sh` and `tests/harness-versions.test.mjs` name the document that now holds what they point to, the message
  of `container/agent.sh` for a missing `agent/compose.project.yml` ends in the title of the section, on a line of its
  own, and `AGENTS.md` has "The documents" and names which document is the source of truth on what. Both `git grep`
  searches of the plan were run, and every line they found names a document that holds what the line says. What follows
  for a project: `templates/project/agent.sh` changed by its comment, so `refresh` reports `agent.sh` as refreshed in
  every project at the next release
- 2026-10-08T12:08:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, finished the plan's tasks across the
  three documents. Searched them for `auth.openai.com`, `rewrites`, `PLAYWRIGHT_VERSION` and `!node_modules`: the first
  is in "Egress" of `SANDBOX.md` alone, the second in "Updating a project to a newer kit" alone, and the last two are
  stated in "Installing it into a project", with `PLAYWRIGHT_VERSION` named besides in the two lists of what
  `agent/compose.project.yml` holds. Took every code span and every line of a code block of the base README with a
  script and looked for each in the three documents: 6 code spans and 22 lines of code blocks are in none, and each
  belongs to a statement listed below, the base README's two install examples at 2.0.0 and 2.1.0 apart, which
  requirement 16 replaced. Read the base README once more by section beside the three documents. Not done by a tool: the
  comparison of prose statements, which is by reading, so a statement may be missing from the lists, and the reviewer's
  own comparison is what finds it
- 2026-10-08T12:08:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the verification on `7cf3949`:
  `npm test` passes with 403 tests; `npm pack --dry-run --json` lists `README.md` and `SANDBOX.md` at the root and not
  `CONTRIBUTING.md`; `npm run check-changes` exits 0; no file the branch changed has a line over 120 characters or an em
  dash; none of the three documents has a table of contents. The commit that holds this entry changes this record and
  the ticks of the plan and nothing else. Two concerns for the human. The three documents are not shorter than the base
  README taken together: it has 1027 lines and 10707 words, and they have 1189 lines and 10978 words, of which
  `README.md` 474 lines and 4154 words, `SANDBOX.md` 567 and 5577, and `CONTRIBUTING.md` 148 and 1247. What requirement
  9 lets go was a small part of the reference of the sandbox, most of which says what the sandbox does, refuses and
  leaves behind, and the lists and the new parts took the room that the why gave up. A shorter `SANDBOX.md` takes a
  decision on what of that a reader does not need. And "How it works" holds the human's text with the three differences
  the entry of the third move names. Status stays `in-progress`: the review has not been done
- 2026-10-08T12:14:16Z [human] read the three differences between the text of the workflow and what the kit does, and
  asked for them to be corrected
- 2026-10-08T12:14:16Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, changed the three in "How it works"
  of `README.md`, on the human's word, and nothing else of the text: the unit's number is `0007` in steps 3 and 4, step
  9 says that the branch on the host is fast-forwarded to the one from the container, and the status it names is
  `implemented`. Requirement 4 has the implementer write none of the text, and these words are the implementer's, asked
  for by the human
- 2026-10-08T12:20:03Z [human] found that "How it works" names the plan and does not say what it is, and wanted it said
  that it is the concrete plan the implementer follows. Took the implementer's proposal of one clause in the planner's
  row
- 2026-10-08T12:20:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the planner's row of the table
  in "How it works" say that the plan is the ordered tasks the implementer then follows. What a plan holds besides stays
  in `process.md`, by requirement 3
- 2026-10-08T12:25:51Z [human] found "The commands" odd as a heading and its nested list odd as a form, had a table in
  mind, as a man page has, and asked how other projects do it. Took the implementer's proposal to try: a part named
  "Commands", with a heading per command and a table of its arguments and options. Said that the branch can be set back
  to `285d06b` if it does not please
- 2026-10-08T12:25:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, rewrote the part in `README.md` and
  the one in `CONTRIBUTING.md` so, in one commit, and added the task to the plan. Each command has a heading, its forms
  in a code block, one or two sentences, a table with a row per argument and option, a second table for the environment
  variables where it reads any, and the titles of where more is said. A cell is one line, so three things moved from the
  entries of `run` and `./agent.sh` to where the rest is said: how the unit of `run` may be written and the two examples
  of a model id, to "Running a role", and that a number with no branch gets its branch first, to "The sandbox". The
  pointers in `SANDBOX.md`, in `CONTRIBUTING.md` and in the lists below name "Commands". Requirement 5 says "one list",
  and this is a part of sections with tables, in which each command still stands once, with its description right after
  it and no overview. The spec is not changed: whether it is corrected for this form, or the form goes back, is the
  human's to decide. Not checked: how the tables render on Bitbucket
- 2026-10-08T12:29:11Z [human] read the part "Commands" as built with a heading and a table per command, keeps it, and
  asked for the spec and the plan to be changed so that it holds
- 2026-10-08T12:29:11Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on the unit's
  branch, read `roles/specifier.md` of the installed release 4.2.0 and changed `spec.md` for that: requirement 1 names
  the part "Commands", requirement 5 asks for a section per command with its forms in a code block, a table of its
  arguments and options and a second table of its environment variables, in place of one list, and there is a decision
  on the form beside the one on each command standing once. No requirement was renumbered. The status stays
  `in-progress`, since it is the human's own decision. Then, as the implementer, made the plan name `## Commands` among
  the headings and say that the part was first built as one list
- 2026-10-08T12:52:24Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, completed a full review of 0037 at
  `bcc9234a07f1c83d48968b34d96eeb8b04c51a3f`, against the merge base with `master` at
  `4bcf21f1d3bca02b023b3a21f6042c27258a0f42`. Returned S1, S2 and P1. Complete findings are in
  `.reviews/0037-refactor-the-readme/full-bcc9234-20261008T125054Z.md`. Independently compared the base README
  section by section with the three documents. On the reviewed tree, `npm test` passed with 403 tests,
  `npm run check-changes` exited 0, `npm pack --dry-run --json` included `README.md` and `SANDBOX.md` and excluded
  `CONTRIBUTING.md`, and the whitespace, line-width and no-em-dash checks passed. Could not independently establish
  the original workflow's authorship, the source of its later edits or the historical tests-first failures.
  Markdown rendering on Bitbucket, GitHub and IntelliJ and historical platform trials were not checked
- 2026-10-08T13:01:12Z [human] decided the review's findings. S1: `agent-dev.sh` points to the README for what it takes
  of `agent.sh`, since the README describes all of it, and the rows are not repeated. That is the human's decision and
  is settled. P1: declined. The further edits to the workflow text in `285d06b` are the human's own, to the human's own
  text
- 2026-10-08T13:01:12Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host. S1: no document
  is changed. Saw that every argument, option and environment variable the review names is a row of "agent.sh" in
  "Commands" of `README.md`. As the specifier, wrote the decision into `spec.md`, as a sentence of requirement 8 and a
  decision beside it. S2: accepted, as the implementer. The statement is added to the list of "The harness logs" below,
  as how a behavior is brought about. Whether it comes back is the human's to decide, and was not asked. P1: nothing is
  changed. Not run again: the suites, since no file outside the unit's documents changed
- 2026-10-08T13:06:17Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, completed a delta review of 0037 at
  `c14c850b10aaf61f25fc2b707a7fab17d9cc9836`, from the previous reviewed commit
  `bcc9234a07f1c83d48968b34d96eeb8b04c51a3f`. Returned no findings on spec conformance, plan fidelity or code
  quality. Complete review is in `.reviews/0037-refactor-the-readme/delta-c14c850-20261008T130525Z.md`.
  On the reviewed tree, `npm test` passed with 403 tests, `npm run check-changes` exited 0, and the delta's
  whitespace, line-width and no-em-dash checks passed. Confirmed that every file outside `changes/` is identical
  to the previous reviewed tree. The original workflow session and historical tests-first failures remain
  unavailable for independent verification
- 2026-10-08T13:10:54Z [human] read that the delta review returned no findings, and asked for the unit to be marked
  implemented
- 2026-10-08T13:10:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, set the status to `implemented`.
  Every finding of the full review has its outcome above, the delta review at `c14c850` returned none, and every task of
  `plan.md` is ticked. `npm test` passes with 403 tests on `c14c850`, and the commit that holds this entry changes
  nothing but this record

## What the three documents leave out

Every statement of the base README that is in none of the three documents, by the section of the base README it
stood in. Each list names the line of requirement 9 that its statements went by, or where the same is now said.

### What is here

Now said elsewhere:

* The rows for `tests/`, `infra/`, `RELEASING.md` and `deploy.sh`, which are in the table of `CONTRIBUTING.md`
* The sentence on the four commands of `agentrite`, which "Commands" says

### Installing it into a project

Went as why a behavior was chosen or how it is brought about, or is now said elsewhere:

* That `deploy.sh` prints the URL of a release when it makes one, which "Commands" of `CONTRIBUTING.md` says
* What a project receives, by the paths that `files` lists, `scripts/agentrite.mjs`, `scripts/agentrite-roles.mjs`
  and `scripts/agentrite-run.mjs` among them, which "What is here" says by directory, and what it does not receive,
  which the table of `CONTRIBUTING.md` says
* That what a kit release needs from every project is kept in the kit, where updating the kit delivers it
* Why an OpenCode wrapper has `mode: all`: that OpenCode takes only a primary agent on its command line, which is
  where `agentrite run` gives it the role, and that a role is also dispatched as a subagent from a session
* That the role wrappers and `agent.sh` hold nothing but what the kit put there. That `refresh` rewrites them, and
  what survives, is in "Updating a project to a newer kit"
* That `init` decides on the `.dockerignore` exception by the rules BuildKit applies
* That the npm script is one way to wire the check and that a project may run the kit's script from a command of
  its own. "Commands" gives both forms

### Installing on a fresh clone

Went as why a behavior was chosen:

* That the lockfile is authoritative, what installing the kit's latest on every run would mean for two people who
  clone on different days, and that the lockfile makes a clone reproducible. That `npm ci` installs exactly what
  the lockfile records stays

### Updating a project to a newer kit

Went as why a behavior was chosen:

* That the URL is the pin, and that moving to a newer kit is a deliberate change to the project
* What kind of change of a release reaches a project through `refresh`: a role's description, the line that points
  at its role file, or the shim. That without it the copies stay as an older release wrote them stays

### Running a role

Went as why, or as a copy of what a command prints:

* The example of what `npx agentrite roles --json` prints. What the document holds stays
* That the kit has no session of its own
* That the `--` in front of the prompt is there so that an option of the harness that takes several values does
  not take the prompt for one
* That the wrapper is what makes the harness read the role's file

### Where to run it

Now said elsewhere:

* That the hosts are admitted through the kit's `KIT_ALLOWLIST`, and which two they are, which "Egress" of
  `SANDBOX.md` says

### Running the sandbox

Its opening. Went as why a behavior was chosen, or as how it is brought about where a reader does not act on it:

* That `container/agent.sh` layers a project's compose file over the kit's base and runs the container
* That the shim exists so that the documented command stays one command from the repository root, and that the
  wrapper takes the root from its caller because how deep the kit sits under `node_modules` is npm's to decide
* Why the build context is the project root and not the kit directory, that the wrapper passes
  `--project-directory`, and that it passes the kit's `container/` directory as `AGENTRITE_CONTAINER`
* The rule of BuildKit by which an exception for a directory reaches its files only when the directory itself was
  excluded. What a project must write, and that the directory alone does not do, stays
* The pointer to "The harness versions". The README now points to `SANDBOX.md` as a whole

"Starting it": nothing is left out. Its forms are for the list of commands, which the third move writes.

"Working on a clone". Went as why, as how, as a copy of what a command prints, or as evidence of what was tried:

* That the branch is cut on the first unit run so that the plan is written against what `master` holds by then
* The line the wrapper prints when it cut a branch. That it says what it cut, from which commit and for which unit,
  stays
* That the clone's place is outside the project and in a directory that a restart does not empty
* That a new run is refused while `sandbox/<branch>` holds commits so that an earlier run's commits are not
  overwritten. The refusal and the recovery stay
* How a process of `docker exec` comes to be root: that the capabilities are those the entrypoint keeps to install
  the firewall and to leave root, that such a process does not pass through the entrypoint, and that `--connect`
  names the agent for the process it starts
* What was shown of a connected command on Linux: its user, groups, environment, working directory and capability
  sets, that it could not become root or read the firewall's rules, and that it was refused a host that is not on
  the allowlist. Where it was shown and where not stays
* The words "anything the sandbox did not defend against before", which went as what an earlier release did. The
  two things they introduced stay

"Another working directory" and "Extra directories": nothing is left out.

"The shared `node_modules`". Went as how a behavior is brought about:

* That npm installs a package that is limited to some platforms only on those platforms, and that `npm ci` removes
  `node_modules` before it installs
* That the container has no `node_modules` of its own, which "share one `node_modules`" now says

"The home volume". Went as how, or as a copy of what a command prints:

* That Docker fills a named volume from the image, ownership included, only the first time an empty volume is
  mounted, and never changes it afterwards
* That the entrypoint checks the owner of `/home/agent` before it drops to the agent
* The five lines the entrypoint prints. What they name and the two commands stay
* That a mismatched home is a one-off state, which "The next start creates a new volume owned by the agent" now
  says

"The harness logs". Went as why, as what an earlier release did, as a copy, or as evidence:

* That the log directory reads as a home that holds nothing but the two directories
* That OpenCode's login is "no longer" in the home volume
* Why nothing of OpenCode is copied once the log directory holds a database: that the database is one file with
  companions that belong to it alone
* That it is Docker that makes the missing mount points as root. That they are root's stays
* That it is the entrypoint that examines those directories, and that it does so as the agent. What passes and
  what is refused stays
* The six lines the entrypoint prints for such a volume. What they name stays
* What was shown on macOS: both harnesses with their logs on the mounted directories, two containers writing at
  the same time, and the host reading while a container wrote. The system and the limit stay

"The harness versions". Went as copies of what the wrapper prints, of which the section says what each means:

* The line that names the latest published version the image is built with
* The two lines for a latest version that could not be found
* The line for a command that printed no version
* The two lines that say why the image is built again

"The status line". Went as what an earlier release did:

* That with no such file on the host "the sandbox is as it was". That neither file is mounted stays

"Logging in to a model provider". Went as why, or is now said elsewhere:

* That the browser is on the host and the harness listens inside the container, and that it is deliberate that
  nothing reaches into the sandbox from outside
* The names of the two hosts of the ChatGPT login and what each is for, which "Egress" of `SANDBOX.md` now says,
  with a pointer from here

"Egress". Went as how:

* That it is the entrypoint that redirects the connections on port 443 to the proxy, and that the hostname travels
  in the clear in the TLS ClientHello

"The local model server": nothing is left out.

### The kit's own tests, The kit's own copy of the kit, Trying the working copy's sandbox

Nothing is left out. Each statement of the three is in `CONTRIBUTING.md`, under the same title.

### Releasing

Went as why a behavior was chosen, or is now said elsewhere:

* That the certificate is in us-east-1 because CloudFront takes no other. That it is there stays
* The paragraph that opens with "In short", which gave the steps of a release and who takes each. `RELEASING.md`
  holds every step, and `CONTRIBUTING.md` names it and holds none

### Out of date, moved as it is

No statement that stayed was found to be out of date. None was looked for beyond what the reading for the three
moves showed, and no statement was tried against the code but the commands, their arguments and their options.

## Amendments
