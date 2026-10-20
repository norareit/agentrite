---
kind: task
status: implemented
timestamp: 2026-10-04T11:27:59Z
---

# 0024 Depend on AgentRite 2.3.0

## Description

This repository installs its own release, so that agents working here follow the released process and roles, and so
that `./agent.sh` runs the released sandbox. It is on 2.2.1, from 0018. Release 2.3.0 holds the "Beyond the
request" section of a spec, from 0019, the two hosts of 0015 and the two of 0023 in the kit's allowlist, and the
developer's Claude Code status line, from 0022. Move the devDependency to it:

* Run `npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-2.3.0.tgz`. The diff of
  `package.json` is the one URL, and the diff of `package-lock.json` touches only the kit's entry: its version, its
  URL and its integrity hash
* Check that `node_modules/@ritenoar/agentrite/` is 2.3.0, and that its `process.md`, `roles/` and `container/` are
  the same as the root's at the commit tagged `v2.3.0`
* Run `npx agentrite refresh claude opencode`, as the README asks after an update. It reports the six role wrappers
  and `agent.sh` as up to date and `git status` shows no change from it: between `v2.2.1` and `v2.3.0` no file that
  `refresh` writes from changed. If it does change a file, commit what it wrote

On a host with Docker, check that the everyday sandbox is now the released 2.3.0 one, with no rebuild, since no file
the image holds changed between the two releases:

* `./agent.sh grep listening /run/egress-proxy.log` names `platform.claude.com`, `models.opencode.ai`,
  `auth.openai.com` and `chatgpt.com` among the hosts
* On a host whose home holds `~/.claude/statusline-command.sh`, `./agent.sh ls /etc/claude-code` lists
  `managed-settings.json` and `statusline-command.sh`

Afterwards `npm test` and `npm run check-changes` pass, the second now running the check from the installed 2.3.0.

Not part of this task: logging OpenCode in to OpenAI in the everyday sandbox's home volume, which the human does
with the command the README gives, and moving any other project to 2.3.0.

## Log

- 2026-10-04T11:04:21Z [human] having released 2.3.0, asked for a small task that moves this repository to it
- 2026-10-04T11:04:21Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote this record, on the
  branch `task-0024-depend-on-agentrite-2-3-0` from `master` at `b1ca65b`. A task: one dependency and its checks,
  with no decision left open, after 0016, which did the same for 2.1.0. The number is the highest existing, 0023,
  plus one. Checked before writing: `package.json` on `master` is at version 2.3.0 and names 2.2.1 as the
  devDependency; the tarball of 2.3.0 is served from `agentrite.ritenoar.com` with status 200, holds 23 files, and
  its `container/compose.yml`, `container/agent.sh`, `process.md` and `README.md` are identical to those at the
  tag `v2.3.0`; and `git diff v2.2.1 v2.3.0 -- templates/project scripts` shows one file,
  `templates/project/agent/compose.project.yml`, which `refresh` never writes. Unlike in 0016, `refresh` is run:
  this repository has had a sandbox and its shim since 0018. Not checked: that `refresh` reports every file up to
  date, which is what the description expects and the implementer sees. Status left at `draft` for the human's
  approval
- 2026-10-04T11:05:16Z [human] shown the task, asked for it to be implemented, which is its approval
- 2026-10-04T11:05:16Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in a session on the host,
  on Linux, and moved the status through approved to in-progress
- 2026-10-04T11:05:43Z [Claude Code, anthropic/claude-opus-5-5] did the task, in `69921d4`. The harness did not block
  `npm install` this time, so the implementer ran it. What was verified:
  * The diff of `package.json` is the one URL. The diff of `package-lock.json` is the kit's entry, its version, its
    URL and its integrity hash, and the same URL where the lock repeats the root package's devDependencies, which
    the description does not mention
  * `node_modules/@ritenoar/agentrite/package.json` says 2.3.0. Its `process.md`, the three files in `roles/` and
    the seven in `container/` are identical to those at the tag `v2.3.0` (`b1ca65b`), compared with `cmp`
  * `npx agentrite refresh claude opencode` reported the six role wrappers and `agent.sh` as up to date, and
    `git status` showed no change from it
  * On Linux with Docker Engine 28.4.0 and Compose 2.39.2, `./agent.sh` started the sandbox with no rebuild: the
    id of the image `ritenoar-agentrite-agent` was the same before and after. The proxy's log names
    `platform.claude.com`, `models.opencode.ai`, `auth.openai.com` and `chatgpt.com` among the hosts it listens
    for, and its only refusal for want of an allowlist entry was the canary's. This host holds
    `~/.claude/statusline-command.sh`, and `/etc/claude-code` in the sandbox listed `managed-settings.json` and
    `statusline-command.sh`
  * `npm test` was run on the tree of the commit that holds this entry, with this entry already written, and
    reported 188 passing and 0 failing. `npm run check-changes`, now the check of the installed 2.3.0, exited 0 on
    that commit
  * Not checked: Claude Code's terminal showing the status line in the everyday sandbox, where only the two
    mounted files were listed; a login or a prompt there; Docker Desktop for macOS
  No review has been made, so the status stays in-progress until the human decides whether the task needs one
- 2026-10-04T11:25:13Z [OpenCode, openai/gpt-6.1-sol] reviewed `0024-depend-on-agentrite-2-3-0` at
  `2c4294327f8ffe3d0449b2189631292fae663c26`: full review against merge base
  `b1ca65b4ec73f1569476b25b7b68f662699e56a3`. Returned no finding labels. Complete review:
  `.reviews/0024-depend-on-agentrite-2-3-0/2026-10-04T11-22-39Z-full-2c4294327f8f.md`.
  Not independently observed: the original install invocation. Not verified: Claude Code's terminal rendering of
  the status line, an OpenCode login or prompt in the everyday sandbox, or Docker Desktop for macOS
- 2026-10-04T11:27:59Z [human] on the review coming back with no findings, asked for the task to be marked implemented
- 2026-10-04T11:27:59Z [Claude Code, anthropic/claude-opus-5-5] set the status to implemented: the task has no plan
  to tick, and the review returned no findings, so there is none to decide. `npm test` was run on the tree of the
  commit that holds this entry, with this entry already written, and reported 188 passing and 0 failing.
  `npm run check-changes` exited 0 on that commit

## Amendments
