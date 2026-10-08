---
kind: feature
status: in-progress
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

## What the three documents leave out

Every statement of the base README that is in none of the three documents, by the section of the base README it
stood in. Each list names the line of requirement 9 that its statements went by, or where the same is now said.

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

## Amendments
