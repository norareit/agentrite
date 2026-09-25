# 0006 Git refuses the sandbox's working directory

## Context

The sandbox mounts the project at `/work` and runs the agent as the unprivileged `agent` user, whose uid is the host
user's. Git refuses to work in a repository whose top directory another user owns, unless `safe.directory` names it.
On Docker Desktop for macOS the top of every bind mount appears to the container as owned by root, so git refuses
`/work`, and with it every git command the agent and the change check run there.

It was found while fixing Norareit's `0040-sandbox-firewall-dns`, the first time the sandbox started on a Mac with
Docker Desktop.

## Observed behavior

Inside the sandbox, as the agent:

```
$ git -C /work rev-parse --short HEAD
fatal: detected dubious ownership in repository at '/work'
To add an exception for this directory, call:

	git config --global --add safe.directory /work
```

A project's change check, which runs git, fails the same way, so its end-to-end suite cannot run in the sandbox.

## Expected behavior

Git works as the agent in `/work`, and in any repository mounted with `agent.sh --mount`.

## Steps to reproduce

On macOS with Docker Desktop, Docker Engine 24.0.7, in a project using kit release 1.0.2:

1. `./agent.sh -- git -C /work status`
2. Observe the failure above, on every start

## Root cause

Reproduced on the machine above:

* Inside the sandbox, `stat` reports `/work` as `0:0` while `/work/.git` and `/work/package.json` are `501:20`, the
  host user's uid and gid, and the agent runs as uid 501
* The same holds outside the kit: a plain `alpine` container, with or without `--user 501:20`, sees the top of a bind
  mount as `0:0` for every host directory tried (`~/projects`, two project roots, and a subdirectory of one), while
  each is owned by 501 on the host
* The image's git is 2.39.5, which refuses a repository whose top directory is not owned by the current user unless
  `safe.directory` names it in protected configuration
* The image's `chown` of `/work` does not help, because the bind mount replaces that directory at run time

So on this Docker the ownership of the mount root is not the host's, and git's ownership check fails for the agent
even though the agent owns everything inside it. Linux Docker Engine, where a bind mount shows the host's ownership,
was not checked.

Setting `safe.directory` through git's environment configuration, `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0` and
`GIT_CONFIG_VALUE_0`, was tried in the sandbox: git then accepted `/work` and the change check ran.

## Fix description

Set `safe.directory` to `*` for every process in the container, through the `GIT_CONFIG_*` environment variables in
the kit's `container/compose.yml`, with a comment saying why.

## Requirements

1. On the machine above, as the agent in the sandbox, `git -C /work status` succeeds
2. As the agent, git also succeeds in a repository mounted with `agent.sh --mount`
3. A project's change check runs in the sandbox without any setup of its own
4. The comment beside the setting says what Docker Desktop shows the mount root as, and why the ownership check
   protects nothing inside this container

## Decisions

* **The ownership check protects nothing here, so it is switched off rather than narrowed.** It guards a user from
  running git in a repository another user controls, whose configuration could run commands. In the sandbox the only
  user that writes to a mounted repository is the agent, which can already change `.git/config` in `/work` itself, and
  the mounts are the developer's own. `*` covers `/work` and every `--mount` path without the wrapper having to list
  them. Listing `/work` alone was rejected because `--mount` repositories would still fail
* **Environment, not a config file.** The system config, `/etc/gitconfig`, is the developer's own `~/.gitconfig`
  mounted read-only, and the global one lives in the agent's home volume, which a new volume starts without. Git reads
  `GIT_CONFIG_*` as command-scope configuration, which counts as protected, so `safe.directory` is honored there. A
  project that sets `GIT_CONFIG_COUNT` itself would override the kit's, which the comment says
* **The regression check is manual.** No automated suite covers the container, as 0033 decided in Norareit. The
  failure above is the failing case and the requirements, checked on the same machine, the passing one

## Non-goals

* Changing how Docker Desktop reports ownership, or the uid the agent runs as
* The agent's home volume and its owner, which is `0007-home-volume-owner-mismatch`
