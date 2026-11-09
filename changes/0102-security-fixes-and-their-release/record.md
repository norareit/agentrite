---
kind: task
status: draft
timestamp: 2026-11-09T00:32:25Z
---

# 0102 How a security fix is specified, kept and released

## Description

"Security findings" of `AGENTS.md` keeps the findings of the security reviewer out of everything committed, but
says nothing of how a finding the human decides to fix becomes a unit and a release. Followed as `process.md` gives
it, a fix would be a bug, whose spec states the observed behavior, the steps to reproduce and the root cause, which
together describe the weakness in a committed document. And since everything pushed is published, a fix pushed
before it is released tells a reader of the diff where the weakness is in every version that users have installed,
with no version to move to.

The human decided on the following rules.

The change, to "Security findings" of `AGENTS.md`:

* A finding the human decides to fix is specified as a feature or a task, and never as a bug. Its documents state
  what will be true once it is done, as what the code does or refuses, and state no observed behavior, no steps to
  reproduce and no root cause. This is an exception to the rule of `process.md` on the kinds of a unit, which a bug
  would otherwise be
* Nothing of the unit of such a fix is pushed before the release that ships it is published: not its documents on
  `master`, not its branch, and not `master` once it holds either. Its commits are pushed by the push of that
  release, which follows `npm publish`, so the fix becomes public as a release that users can move to

The change, to `RELEASING.md`:

* A release that ships the fix of a finding names it, in the section of `CHANGELOG.md`, as a security fix described
  by what it changes, as the rule on fixes of "Security findings" says of a plan, a record and a commit message
* After the push of such a release, the human publishes the finding's draft security advisory on GitHub, with the
  version of the release as the patched version, so that the projects that depend on the kit are alerted to move to
  it. This is a step 8 of its own, taken only in a release that ships such a fix
* In step 8 the agent asks the human for the ID of each advisory the release fixes, as `GHSA-xxxx-xxxx-xxxx`, and the
  range of versions the advisory names as affected, which the human reads from the advisory. For each it prints one
  `gh api -X PATCH repos/<owner>/<repository>/security-advisories/<ID>` command that sets the state to `published`
  and the affected package `agentrite` of the `npm` ecosystem with that range and the release's version as the
  patched version. It runs none of them, and it reads nothing of an advisory itself: what it puts in the command is
  what the human gave it and the version of the release
* The agent ends step 7 by saying that step 8 follows, when the human says the release ships such a fix, and step 8
  by telling the human the commands, which the human runs with their own login of `gh`
* The human may then mark the versions before it as deprecated, with `npm deprecate 'agentrite@<X.Y.Z' '<message>'`
  and the release's version as `X.Y.Z`, so that each install of one of them warns. The step is the human's to take
  or leave, for each release

Nothing else changes: no command, no script and no role file. Publishing an advisory and `npm deprecate` are run by
the human, as the commands of steps 5 and 7 of `RELEASING.md` are. A GitHub Action that publishes the advisories on
the tag was rejected, since it needs a token that can publish advisories, kept as a secret of a public repository,
and an agent that runs the command itself was rejected, since it would read the advisory to fill the command in.

## Log

- 2026-11-09T00:32:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `d93ef21`, on the
  human's request to write down how a security fix is specified, kept unpushed and released. Read "Security findings" of
  `AGENTS.md`, `RELEASING.md` for the order of `npm publish` and the push, and the kinds of a unit in
  `process.md`. Wrote the record. The status is `draft`
- 2026-11-09T00:35:22Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `d91960e`, on the
  human's request, added step 8 to the change of `RELEASING.md`: the agent prints the command of `gh` that publishes
  each advisory the release fixes, from the ID and the affected range the human gives it, and runs none. The status
  is `draft`

## Amendments
