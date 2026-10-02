---
kind: feature
status: in-progress
timestamp: 2026-10-02T10:06:16Z
---

# 0011 Rename the kit to AgentRite

## Log

- 2026-10-02T10:06:16Z [human] asked for the kit to be renamed, because `agent-kit` is not a unique name and the kit
  becomes public with the projects that are to be open sourced. Settled on AgentRite, for the pun on the kit's
  process being a rite and for the three ways the name reads, and asked for both, with the tagline "A kit for running
  coding agents by a fixed process", at the top of the README. Decided that the stacks and their resources are
  renamed too, with the old ones destroyed, since nothing but Norareit depends on the kit; that the kit stays
  self-hosted with the `@ritenoar` scope reserved on npm; and that the unscoped name is held by a small pointer
  package. Decided against registering `agentrite.dev`
- 2026-10-02T10:06:16Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: it needs decisions on the lowercase form, the stacks, old releases, the version, the npm
  names and the order around the release. Checked on the day that `agentrite` and the scope `@ritenoar` are
  unclaimed on npm, that `agentrite` returns no repository on GitHub, and that no project under `~/projects` but
  Norareit references the kit. Added a second pointer package, `agentrite-roles`, beyond the one the human chose,
  for the reason the spec gives; it is the human's to strike. Wrote unit 0012 as a draft task for the
  self-dependency, which waits for the release. The plan lists the human's own steps, numbered, beside the
  implementer's tasks
- 2026-10-02T10:12:07Z [human] decided that the open units come first: the drafts 0006 and 0008, which are worked on
  from the MacBook, are fixed and released under the old name before this unit is approved. It stays `draft` until
  then
- 2026-10-02T10:12:07Z [Claude Code, anthropic/claude-opus-5-5] noted what to revise in this unit and in 0012 when
  it is picked up again. Both name 1.0.3 as the last release under the old name, in requirement 9, the lockfile and
  `npm pack` lines of the plan and 0012's description, and that becomes whichever release is then current. The
  plan's paragraph on the branches of 0006 and 0008 goes: it says they conflict with the rename, which was wrong,
  since each holds only a draft spec and record, and they will be merged by then. Requirement 10's clause on 0004,
  with its task, goes if 0004 is implemented first. The names were checked on npm and GitHub on 2026-10-02 and are
  checked again

- 2026-10-02T11:20:14Z [Claude Code, anthropic/claude-opus-5-5] moved the branch onto `master` at 7cf0f6b, which holds
  0006 and 0008, both implemented. They added a README section and a block in `container/compose.yml`, neither with
  the old name, so the rename's list of files and replacements is unchanged; their specs are frozen and are left as
  requirement 10 already says. Removed the plan's paragraph on their branches, which are merged and deleted. The
  version is still 1.0.3 and nothing newer is on the old host, so the 1.0.3 named in this unit and in 0012 still holds
  unless a 1.0.4 is released first. 0004 is still a draft, so its clause stays
- 2026-10-02T11:21:13Z [human] decided that 0006 and 0008 are not released under the old name: there is no 1.0.4, and
  their fixes first ship in 2.0.0, so that Norareit moves once. This replaces the earlier entry's "released under the
  old name". 1.0.3 stays the last release under the old name, as this unit and 0012 say
- 2026-10-02T11:47:22Z [human] decided that 0004 is not done on its own: 0012 does its work, with the new command,
  once 2.0.0 is installed
- 2026-10-02T11:47:22Z [Claude Code, anthropic/claude-opus-5-5] took the 0004 clause out of requirement 10 and its
  task, file and commit point out of the plan, and reworded the decision on history to say that 0012 supersedes 0004.
  Every remaining task still traces to a requirement, and requirement 10 to the search task
- 2026-10-02T11:49:25Z [human] approved the unit as written, with the second pointer package, the pointer's message
  naming the Bitbucket repository and the README's line on Ritenoar, by asking for it to be implemented in the session
  that planned it, which is to stop wherever a step is the human's
- 2026-10-02T11:49:25Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`
- 2026-10-02T11:50:28Z [Claude Code, anthropic/claude-opus-5-5] in 9a5cf95, renamed the package, the two commands, the
  installed path and the container variable, with the two test files and the two scripts moved by `git mv`. The tests
  failed first, three of them, on the missing scripts and the variable, and `npm test` then passed, 139 of 139. `npm
  install --package-lock-only` changed only the root entry of the lockfile: its name, and its `bin`, which had held
  only `agent-kit-roles` and now holds both commands
- 2026-10-02T11:50:28Z [Claude Code, anthropic/claude-opus-5-5] changed the host, the stack names and the comments.
  The three tests named in the plan did not fail after their expectations changed, contrary to what the plan expected:
  each holds its own data, the allowlist test its own list, the deploy test its own stubs, the record-name test its
  own arguments, and none reads the shipped `container/compose.yml`, `infra/bin/app.ts` or the stack names in
  `deploy.sh`. So no test covers requirements 5 and 6 for those shipped values; they are checked by the search in the
  last task and by `cdk synth` under Verification. `npm test` passed, 139 of 139, and `npx tsc -p infra` exited 0. No
  test was added for this, the plan not having one; raised with the human instead

## Amendments
