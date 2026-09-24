# 0035 Shared agent kit

Move the roles, the changes process and the sandbox container into one repository that every project vendors, so
that an improvement is made once rather than once per project.

## Context

The roles, the changes process and the container built by `0033-agent-sandbox-container` are not specific to this
blog. `~/projects/finrite` already carries a hand-trimmed copy of `roles/`, and the two copies have drifted in both
directions. finrite is ahead on substance: its plan tasks carry the requirement numbers they deliver, as `(R2)`, and
its spec findings cite the requirement they concern. norareit is behind on that and ahead on noise: it still carries
project anecdotes, such as "three rounds of tool restrictions produced three ways around themselves" and a timestamp
rule justified by "has already put a record a day ahead of itself here", which finrite rewrote as general rules.
With two projects, neither copy is the correct one. More projects are expected.

The second reason is the review loop. Unit 0033 went through four review rounds and the findings did not converge.
The reviews in `.reviews/0033-agent-sandbox-container/` show why, and the cause is the instructions rather than the
code:

* Two reviews of the same commit, `243c5ce`, returned different finding sets. A full re-review samples from a large
  space of possible findings, so a fresh finding each round says the space is large, not that the fixes were bad
* The missing test coverage for the shell scripts was reported as blocking in all four rounds, including after it
  was declined and written into `spec.md` as a decision, because nothing says a recorded decision outranks a general
  rule in AGENTS.md
* Almost every finding was marked blocking, because `roles/reviewer.md` asks for the judgment without defining it,
  while AGENTS.md gates `implemented` on a review that "passes"
* The findings drifted from real defects, such as the macOS group id and the swallowed IPv6 failure, toward hostile
  inputs like `AGENT_UID=00` and a deliberately unresolvable firewall canary, because the spec never stated a threat
  model that says which of those count

`ideas/roles-tuning-loop.md` raises the same thing from the other side, and asks where "won't fix" decisions should
live. The 0033 history answers it: the decision was recorded in the spec and re-raised anyway, so the fix is to give
recorded decisions authority in the reviewer's instructions, not to add another file for them.

These role corrections and the extraction are one unit because they touch the same files. Doing them separately
means writing the corrections twice, once in each project.

## Requirements

1. A private repository named `agent-kit` exists in the `ritenoar` Bitbucket workspace with `master` as its main
   branch, cloned at `~/projects/agent-kit`, and holds every file this unit shares between projects
2. No file in the kit, other than its own README, names this project, its domain, its stack or its history. The kit
   reads as instructions for any project
3. The kit holds: the three role files; a process document carrying the changes process and the code standards; the
   change templates; the `check-changes` script with its unit tests; and the container's image, entrypoint, base
   Compose file and wrapper script
4. The kit's role files carry the better of the two existing copies: plan tasks name the requirements they deliver,
   spec-conformance findings name the requirement they concern, and every project anecdote is rewritten as a general
   rule
5. The reviewer treats a limitation recorded as a spec decision or in the record as settled. It is reported once as
   a residual risk and never blocks, including when it is an exception to a rule in the process document
6. The reviewer's instructions define what blocks. A finding blocks only when a spec requirement is false under the
   unit's supported usage and stated threat model, or when a process rule is broken with no recorded exception.
   Anything else is reported without blocking
7. A re-review checks the delta by default: it verifies that the accepted findings were corrected and reviews the
   diff since the commit it last reviewed. A full re-review happens when the human asks for one
8. The planner's instructions require a unit that makes a safety or security claim to state its adversary and its
   supported usage, so that what counts as a defect is bounded before implementation starts
9. The implementer's instructions require every claim in a document to name what was verified rather than assert a
   universal property, and allow the implementer to answer a finding with a proposed decline and its reason, which
   only the human turns into a decision
10. The process document gates `implemented` on the human having decided every blocking finding, rather than on a
    review that passes
11. This project vendors the kit at `agent-kit/` with `git subtree`, and a later `git subtree pull` updates it with
    no manual copying
12. This project's `AGENTS.md` holds only what is specific to it and links to the kit for the rest. Nothing is
    stated in both places
13. Both harnesses still resolve the three roles: Claude Code through `.claude/agents/`, OpenCode through
    `opencode.json`, each pointing into the kit
14. The sandbox still starts with one command from the repository root. The image, entrypoint, wrapper and harness
    version pins live in the kit; the allowlist, the resource limits and the Playwright version live in a
    project-owned Compose file
15. `npm run check:changes` runs the kit's script and keeps its behavior: it rejects an edited frozen `spec.md` or
    `plan.md`, the deletion of an implemented unit, and an implemented unit with unticked tasks. `npm test` still
    runs it
16. A reference left pointing at a moved file fails a test in this project
17. Nothing about how the site is built, tested or deployed changes. Both suites pass on the host and inside the
    sandbox, with the unit count lower only by the tests that moved into the kit
18. The kit's README says how to vendor it into a project, how to pull an update, and how to send an improvement
    back. This project's README says that kit updates are a host task and how the sandbox configuration is split

## Decisions

* **Bitbucket and `git subtree`, not the alternatives.** The kit must be readable by agents at a stable path, must
  work on every machine, must work inside the 0033 container, and must be editable from whichever project exposes
  the need. A submodule works but makes an improvement a two-step commit and every clone a `--recursive` one. An npm
  package lands the files in `node_modules`, which is gitignored and which agent search tools skip. A Claude Code
  plugin covers one harness, and OpenCode runs the implementer and the reviewer. A symlink into `~/projects` is
  invisible inside the container, which mounts only the working directory, and does not travel between machines.
  Subtree vendors ordinary committed files, which satisfies all four constraints, and `git subtree push` sends back
  an improvement made while working in a project, which is exactly how finrite got ahead of norareit.
* **The prefix is `agent-kit/`, not `.agent-kit/`.** Agents read these files constantly and dot directories are
  skipped by some search tools. The cost is a visible directory at the project root.
* **The split line is how work is done against what the project is.** The kit holds the roles, the process and the
  container mechanism. The project holds its overview, its commands, its house style and its "In this repository"
  rules. A rule that would need rewording to make sense in another project belongs to the project.
* **Text rules split by scope.** "No em dashes" applies to anything an agent writes for this developer, so it goes
  to the kit. The American English house style is this blog's voice and stays here.
* **The container splits by what varies.** The Dockerfile, the entrypoint, the base Compose file and the wrapper are
  the same everywhere and go to the kit, including the harness version pins, so that every project updates its
  harnesses by pulling the kit. The allowlist, the resource limits and the Playwright version vary per project and
  live in a project-owned Compose file layered over the base. `.dockerignore` stays with the project, because the
  build context is the project. This restates where 0033's requirement 11 pins live; it does not change that they
  are pinned in one place.
* **`agent.sh` stays at the repository root as a shim.** 0033's requirement 4 is one command from the repository
  root, and the README, the harness wrappers and habit all name `./agent.sh`. The root file becomes a two-line exec
  into the kit's wrapper, holding no configuration of its own, so the documented command survives the move.
* **The harness wrappers stay project-owned and gain no install step.** `.claude/agents/*.md` and the `agent` block
  in `opencode.json` are already thin pointers that name a role file and nothing else, and both must sit at paths
  the harnesses fix. Migrating them is one path each. A generator or a sync script would be new logic to maintain
  for files that change once.
* **`check-changes` is ported to dependency-free ESM.** It imports only `node:child_process` and `node:path` today,
  so nothing is lost, and a project without TypeScript or `ts-node` can still run it. Its unit tests move with it
  into a kit suite run by node's built-in test runner, which keeps the kit free of dependencies while leaving new
  kit logic testable.
* **The kit gets no `changes/` process of its own in this unit.** This unit is recorded here, where the tooling and
  the history are. Once the kit carries the templates and the script, kit-only work can have its own `changes/`, and
  that is a later decision rather than a guess made now.
* **Kit updates are a host task.** `bitbucket.org` is not on the sandbox allowlist and no git credential reaches the
  container, by 0033's design. Rather than widen either, `git subtree pull` and `push` run on the host, documented
  the way `npm run image` is. Making them work inside the sandbox is a later unit if it is ever wanted.
* **Unit 0033 is frozen and is not edited.** Its `spec.md` and `plan.md` describe what was true when it was
  implemented, and `npm run check:changes` rejects a change to either. Where this unit moves a file 0033 created,
  this spec says so and 0033's documents stay as they are.
* **The role corrections ship with the extraction rather than after it.** They change the same three files the
  extraction moves. Doing them in this project first would mean applying them again in the kit, and doing them after
  the migration would leave the next review running under the instructions that produced the 0033 loop.

## Non-goals

* Migrating finrite onto the kit. That is a unit in finrite's own `changes/`, once the kit exists
* Any change to a third project, or a survey of which projects should adopt the kit
* The unattended plan, implement and review loop, and delegation between the two harnesses. Both remain later units
* A check, in CI or otherwise, that a project's vendored copy is current with the kit
* Publishing the kit outside the `ritenoar` workspace
* Any further work on the container's own open items: the SNI-filtering proxy, an automated suite for `agent.sh` and
  `agent/entrypoint.sh`, and git credentials inside the container. This unit moves those files and changes none of
  their behavior
* Any change to the site generator, the CDK application, the site's test suites, or the deployment script
