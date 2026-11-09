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
  it
* The human may then mark the versions before it as deprecated, with `npm deprecate 'agentrite@<X.Y.Z' '<message>'`
  and the release's version as `X.Y.Z`, so that each install of one of them warns. The step is the human's to take
  or leave, for each release

Nothing else changes: no command, no script and no role file. The steps of the advisory and of `npm deprecate` are
the human's, as the other commands of steps 5 and 7 of `RELEASING.md` are.

## Log

- 2026-11-09T00:32:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `d93ef21`, on the
  human's request to write down how a security fix is specified, kept unpushed and released. Read "Security findings" of
  `AGENTS.md`, `RELEASING.md` for the order of `npm publish` and the push, and the kinds of a unit in
  `process.md`. Wrote the record. The status is `draft`

## Amendments
