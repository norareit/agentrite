---
kind: task
status: draft
timestamp: 2026-10-04T11:04:21Z
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

## Amendments
