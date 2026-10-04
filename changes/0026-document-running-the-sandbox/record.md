---
kind: task
status: in-progress
timestamp: 2026-10-04T14:19:52Z
---

# 0026 Document running the sandbox

## Description

How a developer runs the sandbox is the kit's behavior, the same in every project, and the kit's `README.md` does not
say it. The wrapper's options are documented only in the usage comment of `container/agent.sh`, and the local model
server only in comments in `container/compose.yml` and `container/entrypoint.sh`. The norareit project still
documents all of it in its own README, from the time the sandbox lived there, and cannot point here until this
README holds it.

Add the following to `README.md`, under "Running the sandbox". The wording to start from is norareit's `README.md`
at its commit `63662ff`, sections "Start it" and "Mount extra directories" and the local model server paragraph of
"Change the network allowlist", reworded so that it names no project. Keep the commands and the strength of each
statement as they are there.

* Starting it. What is needed on the host: Docker, Desktop on macOS or Engine on Linux. `./agent.sh` from the
  project root builds the image on first use and opens a shell in the container, with the project mounted
  read-write at `/work` and nothing else of the host reachable. A command appended to it runs instead of the shell,
  as in `./agent.sh claude` and `./agent.sh npm test`. `./agent.sh --rebuild` builds the image again before running
* Never as root. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would then be
  root too. When Docker needs elevated permissions, the developer joins the `docker` group and does not reach for
  `sudo`
* Another working directory. `--workdir DIR` mounts `DIR` at `/work` in place of the project root. The container
  works on a full checkout, not a `git worktree`, whose `.git` points at an absolute path on the host that does not
  resolve inside the container. To isolate the work further, mount a separate clone and push branches back from it
* Extra directories. `--mount HOST` mounts a host directory at `/mnt/<basename>`, read-write, and `--mount HOST:ro`
  read-only. It may be repeated
* The local model server. The sandbox reaches one host and port outside the allowlist: `MODEL_SERVER_HOST` on
  `MODEL_SERVER_PORT`, which `container/compose.yml` sets to `host.docker.internal` and `11434`, and nothing else on
  the host. On a Linux host whose firewall denies incoming traffic by default, `ufw` for example, the Docker bridge
  subnets must be allowed to that port on the host, or the container cannot reach the model. "Egress" already
  names the model server's host and port as something that leaves the container; say there, or in a subsection of
  its own that "Egress" points to, where the two values are set

Then:

* Every added line is wrapped at 120 characters, and the text has no em dash
* `npm test` and `npm run check-changes` are run, and the record says what they reported

Two statements above come from norareit's README and were not tried when this record was written: that a `git
worktree` does not work as the working directory, and the `ufw` note. The implementer either tries each and says
so, or logs it as carried over untried.

Not in this task:

* "Agent model selection" in norareit's README. It is not about the blog either, but it names one developer's
  machine and picks, and "What is here" says nothing in the kit names a particular project. Whether it moves here,
  and reworded how, is a decision for the human, and so more than a task
* The release that carries this README to a project, which is the human's
* Removing the same passages from norareit's README. That is a unit in norareit, once it is on a release that holds
  this

## Log

- 2026-10-04T11:29:49Z [human] in a norareit session that was removing what norareit's README repeats of the kit's,
  asked for a task here that adds to this README what norareit still documents and the kit does not
- 2026-10-04T11:29:49Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote this record, on the
  branch `task-0026-document-running-the-sandbox`. A task: the content exists, in norareit's README and in the
  kit's own comments, and the work is placing it, with nothing to decide but the wording. Numbered 0026 because
  0025 is taken by the branch `feature-0025-release-notes`, which is not on `master` yet. Checked before writing:
  this repository was on `master` with no uncommitted change to a tracked file; a search of `README.md` found none
  of `--workdir`, `--mount`, `sudo`, `worktree`, `MODEL_SERVER_PORT` or `ufw`, and `--rebuild` only in passing; the
  options and the root refusal are as `container/agent.sh` has them, and the model server's defaults as
  `container/compose.yml` has them. Not checked: the two statements the description names as untried. Status left
  at `draft` for the human's approval
- 2026-10-04T14:19:52Z [human] asked for change 0026 to be implemented, with the record as the planner left it
- 2026-10-04T14:19:52Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role. The status was `draft`, and
  the human's request to implement is taken here as the approval, so it moves through `approved` to `in-progress`
  in this one entry. That reading is the implementer's, not something the human said in those words
- 2026-10-04T14:20:34Z [Claude Code, anthropic/claude-opus-5-5] added to `README.md`, in `1ae3fba`, under "Running the
  sandbox": "Starting it", which also holds the refusal to run as root, "Another working directory" and "Extra
  directories", placed before "The shared `node_modules`", and "The local model server", placed after "Egress", which
  now ends its first paragraph by pointing to it. The wording starts from norareit's `README.md` at `63662ff`, with
  its commands unchanged except that the code fences are `sh`, as the rest of this README has them. One statement is
  weaker than there: norareit says Docker "and nothing else" is required, and this README says only that the host
  needs Docker, as the description has it, because "Where to run it" already says a fresh clone needs `npm ci` on the
  host first
- 2026-10-04T14:20:34Z [Claude Code, anthropic/claude-opus-5-5] tried the `git worktree` statement, on the Linux host,
  with the sandbox of the installed release 2.3.0. `./agent.sh --workdir <a worktree of this repository> git status`
  printed `fatal: not a git repository: /home/stef/projects/agentrite/.git/worktrees/wt-0026`, and `./agent.sh git
  status --short --branch` on the project root, a full checkout, printed the branch. The statement holds for that one
  case. The worktree was removed afterwards. Not tried: a worktree on macOS
- 2026-10-04T14:20:34Z [Claude Code, anthropic/claude-opus-5-5] the `ufw` note is carried over, tried in part. On this
  host `ufw` is enabled with `DROP` as its default for incoming traffic, by `/etc/ufw/ufw.conf` and
  `/etc/default/ufw`, and a server listens on `*:11434` and answers the host itself with 200 on both `localhost` and
  `172.17.0.1`. From the sandbox, `curl -m 8 http://host.docker.internal:11434/` timed out, after the entrypoint
  logged `allowed local model server at 172.17.0.1:11434`. That agrees with the half that says the container cannot
  reach the model. Not established: that `ufw` is what drops it, since its rules are readable only by root and were
  not read, and that allowing the Docker bridge subnets to the port makes the model reachable, which needs a change to
  the host's firewall that was not made. Not checked either: that nothing else on the host is reachable from the
  sandbox
- 2026-10-04T14:20:34Z [Claude Code, anthropic/claude-opus-5-5] on `1ae3fba`: `npm test` reported 188 tests, 188
  passed and 0 failed, and `npm run check-changes` exited 0 and printed nothing. No line of `README.md` or of this
  record is longer than 120 characters, by `awk 'length>120'`, and the added lines hold no em dash. Status stays
  `in-progress`: `implemented` waits for the review and for the human's decisions on what it returns
- 2026-10-04T14:20:34Z [Claude Code, anthropic/claude-opus-5-5] for the human, outside this task: the model server on
  this host is not reachable from the sandbox, as the entry above describes. And this branch was cut from `ab02eae`,
  before 0025 reached `master`, which also changed `README.md`, in other sections. `git merge-tree --write-tree master
  HEAD` reported no conflict; the merged text was not read

## Amendments
