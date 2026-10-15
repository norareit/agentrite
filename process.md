# Process

This document contains critical instructions for coding agents. Follow these guidelines precisely.

It holds how work is done: where instructions belong, how reported problems are verified, the commit prefixes, the
changes process and the roles. The rules on how text, documentation, commits, code and tests are written are in
[`standards.md`](standards.md). What a project is, what it is built with and how its commands are run belong to that
project's own `AGENTS.md`, which links here for the rest.

## General guidelines

### Where instructions belong

Agent memory is stored per machine and is not committed, so it does not travel. A project may be worked on from
several machines, and anything recorded only in memory is invisible on the others.

* Record anything that would still be useful on another machine in a committed instruction file rather than in agent
  memory. That includes workflow preferences, conventions, corrections, and lessons learned from a debugging session
* Keep in agent memory only what is genuinely specific to one machine, such as a local preview URL or a locally
  broken tool
* When something already in memory turns out to apply everywhere, move it into the committed instructions and delete
  the memory, so the two cannot drift apart
* When in doubt, prefer the committed file. A note that turns out to be machine-specific is easy to move back

A rule that applies to every project belongs in this kit. A rule that would need rewording to make sense in another
project belongs in the project's own `AGENTS.md`. Nothing is stated in both places.

### Verifying reported problems

The agent's shell may run in a sandbox that is not the developer's machine. Servers started there are not reachable
from the developer's browser, and commands the developer runs with a `!` prefix execute there rather than locally. A
`curl` returning 200, or a headless browser clicking through successfully, is therefore not evidence about what the
developer actually sees.

* When a reported problem cannot be reproduced, do not answer with measurements from the agent's own environment
* Observe the developer's own browser, or ask for the exact error text, before forming a theory about the cause
* If the developer repeats that something is broken after it was declared fine, treat that as proof the evidence came
  from the wrong place, not as a reason to restate it
* Prefer asking for one decisive detail over running more checks that cannot see the developer's machine

### Commits

* Prefix feature implementation commits with `feature-<number>`
* Prefix bugfix commits with `bugfix-<number>`
* Prefix task commits with `task-<number>`

## Changes

All project change records live in `changes/`, independent of the harness driving the work. Each unit has its own
directory, named `changes/<number>-<kebab-name>/`. The number is four digits and is the highest number appearing in any
existing change directory, regardless of its kind, plus one. A project that adopted this scheme later may hold
historical directories under its older naming, which are left as they are so that existing references to them remain
findable.

Each unit has a mandatory `record.md` and may also have `spec.md` and `plan.md`. Start from the kit's
`templates/changes/`.

* `spec.md` states what should be true: context, requirements, decisions with rationale, non-goals, and what the
  specifier left out as beyond the request. It has no file paths or task order
* `plan.md` states how the work will be done: approach, files, ordered tasks, tests first, and commit points
* `record.md` states what happened: frontmatter, timestamped status transitions, and amendments

Use the frontmatter in `templates/changes/record.md`. Its `kind`, `status`, and `timestamp` fields are required, and
`supersedes` names an older unit when applicable. The timestamp is an ISO 8601 instant in UTC ending in `Z`, so that
sorting it lexicographically orders the whole set chronologically.

Every entry under `## Log` and under `## Amendments` of `record.md` is a list item, written as these two are:

```markdown
- 2026-10-07T11:51:06Z [human] approved the spec. The status is `approved`
- 2026-10-07T11:51:36Z [Claude Code, anthropic/claude-opus-5-5] as the planner, wrote `plan.md`. The status is
  `planned`
```

* It opens with the timestamp, in the same UTC format as the frontmatter, written bare
* Then comes who made it, in square brackets: `[<harness>, <provider>/<model>]` for an agent, and `[human]` for a
  human-only action. The brackets are written, and are not a mark for something to fill in
* Then, for an agent that acts in a role, comes `as the <role>`, with one of the four roles below. An entry of a human
  has none, and neither has one of an agent that acts in no role
* Then comes the text
* In `templates/changes/record.md` the brackets around who made the entry are the written ones, and its other
  brackets mark what is to be filled in

Status progresses from `draft` to `approved` to `planned` to `in-progress` to `implemented`. `approved` says that the
human approved what the specifier wrote. `planned` says that the planner is done with the unit: its plan is written,
or the planner logged that it needs none. A task goes from `approved` to `in-progress`, and is never `planned`.

Set `implemented` only after the human has decided every blocking finding the review returned and every task in
`plan.md` is ticked. What blocks is defined in [`roles/reviewer.md`](roles/reviewer.md), and a limitation already
recorded as a decision does not. Remove a task that will not be done, recording the reason in `record.md`, rather
than leaving its box open. Once implemented, `spec.md` and `plan.md` are frozen. Log later small corrections under
`## Amendments` in `record.md`, with the timestamp, change, and reason. For a correction that would make the original
record misleading, create a new unit and set `supersedes:` to the old directory.

Run the change check before submitting work. The kit ships it as `scripts/check-changes.mjs`, and each project wires
it to a command of its own. It compares the committed work on the current branch with the default branch and rejects
changes to the `spec.md` or `plan.md` of any unit implemented on the merge base, and the deletion of any such unit. It
also rejects an implemented unit whose `plan.md` still has unticked tasks. It reads committed content, so commit
before trusting it. The default branch is the one the project names as `defaultBranch` in `agentrite.json` at its
root.

The reviewer saves its complete findings in the ignored `.reviews/<unit-directory>/` directory. Record the outcome
of each finding, not the full review, in `record.md`: as timestamped log entries while the unit is not frozen, and
as amendments once it is.

The spec is written when the human wants the unit described, and any number of units may be `draft` or `approved`
at one time. The plan is written when the unit is next to be built and not before, and nobody approves it: once the
unit is `planned`, the implementer may begin.

What the specifier writes, and the approval, are committed on the default branch: a unit's `spec.md` and `record.md`
while its status is `draft` or `approved`. Such a commit holds nothing but that unit's own documents. Everything after
the approval is done on the unit's branch and never on the default branch: the plan, the implementation, the record's
further entries, and a correction of the spec. The branch is cut from the head of the default branch when the planner
starts, or the implementer for a task, and not earlier. Its name is the prefix of the unit's commits and its
directory name, as `feature-0033-specifier-role`, with `bugfix` for a bug and `task` for a task. A unit run of the
sandbox cuts it, and a role run on the host cuts it itself. Commit the change documents first, then the
implementation. Work committed straight to the default branch skips the freeze check entirely, and that holds for the
specifier's commits too.

### Features

Features are larger changes and **require** a spec and plan before implementation.

### Bugs

Bugs **require** a spec. Add a `plan.md` only when the fix takes more than a couple of steps. A single-commit fix
needs only `spec.md` and `record.md`.

### Tasks

Tasks are small changes and may need only a record.

## Roles

Four roles do the work in `changes/`. The specifier writes what a unit must make true, the planner writes the plan
of an approved unit, the implementer builds it and keeps those documents true, and the reviewer judges the result
against them.

Before specifying, planning, implementing or reviewing, read the matching file:

* [`roles/specifier.md`](roles/specifier.md)
* [`roles/planner.md`](roles/planner.md)
* [`roles/implementer.md`](roles/implementer.md)
* [`roles/reviewer.md`](roles/reviewer.md)

Read it at the point the role is taken on, whether or not the tool running the session can delegate to a separate
agent. A session that specifies, then plans, then implements, then reviews reads each file in turn as it reaches that
stage. Work that fits none of the four roles follows this document and the project's `AGENTS.md` alone.
