# 0020 The sandbox refuses to run anything from `/tmp`

## Context

The sandbox's root filesystem is read-only, and the kit's base Compose file gives the agent `/tmp` as scratch
space, a tmpfs. Docker mounts a tmpfs listed that way with `noexec`, so nothing written to `/tmp` can be run. Writing a
script or a binary to the temporary directory and running it is ordinary: test suites do it, and so do build tools
and installers. A project should not have to change its code to run its own suite in the sandbox.

It was found on 2026-10-03 while implementing 0018, the first time a project ran a suite in the sandbox that
executes what it writes to the temporary directory: this repository's own.

## Observed behavior

A file in `/tmp` cannot be executed, whatever its mode:

```
bash: line 1: /tmp/probe: Permission denied
```

with exit status 126. In this repository, `./agent.sh npm test` reports 162 passing and 15 failing, where the same
tree on the host reports 177 passing. The 15 are the tests of the sandbox wrapper and of the release script, and
one of the `init` command, that copy or write a script under the temporary directory and run it. They fail with an
exit status of `null`, since the script was never started.

## Expected behavior

A file the agent writes to `/tmp` and makes executable runs, as it does on the host and as it already does in
`/work` and in the agent's home.

## Steps to reproduce

In a project with the kit at 2.2.0 and a built sandbox:

1. `./agent.sh bash -c 'printf "#!/bin/sh\necho ran\n" > /tmp/probe && chmod +x /tmp/probe && /tmp/probe'`
2. Observe `Permission denied` and exit status 126

## Root cause

Reproduced on Linux with Docker Engine 28.4.0 and Compose 2.39.2, with the kit at 2.2.0, in this repository.

The kit's base Compose file lists `/tmp` under `tmpfs:` with no options. Inside the container the mount is
`rw,nosuid,nodev,noexec,relatime`: Docker adds `nosuid`, `nodev` and `noexec` to a tmpfs given this way, and only
an explicit `exec` takes `noexec` away. Nothing in the kit asks for `noexec`. No spec, comment or README text
mentions it, so it is Docker's default and not a decision of the kit's.

The same probe was run in every place the agent can write:

| Place         | Mount options                      | Executing a file written there |
|---------------|------------------------------------|--------------------------------|
| `/tmp`        | `rw,nosuid,nodev,noexec`           | `Permission denied`, 126       |
| `/dev/shm`    | `rw,nosuid,nodev,noexec`           | `Permission denied`, 126       |
| `/work`       | `rw`                               | runs, 0                        |
| `/home/agent` | `rw`                               | runs, 0                        |

`/run` is a tmpfs too, owned by root, and the agent cannot write to it.

With the one entry changed to `/tmp:exec` in a copy of the installed compose file, and nothing else changed, the
mount was `rw,nosuid,nodev,relatime` and `npm test` in the sandbox reported 177 passing and 0 failing.

## Fix description

The kit's base Compose file mounts `/tmp` with `exec`, and says beside the mount that it does and why.

## Requirements

1. In the sandbox, a file the agent writes under `/tmp` and makes executable runs
2. `/tmp` stays a tmpfs mounted `nosuid` and `nodev`, on a root filesystem that stays read-only. No other mount, and
   no other confinement setting, changes
3. A regression test in the suite fails on the tree before the fix and passes after it. The suite runs no Docker,
   so the test reads the kit's base Compose file and holds that the agent's `tmpfs` list is `/tmp` with the `exec`
   option, and `/run` without it
4. The behavior is checked for real on a host with Docker, with the working copy's compose file: the probe of the
   steps above exits 0, the mount options of `/tmp` are as R2 says, and this repository's `npm test` exits 0 in the
   sandbox. What was seen is in the record, with the Docker and Compose versions
5. The README says, under "Running the sandbox", what the agent can write and that `/tmp` is scratch space that is
   emptied with the container and from which files can be run

## Decisions

* **`/tmp` is executable, for every project.** The fix is in the kit and not in the project that met it. The
  alternative, a project pointing its tests at a directory under `/work`, was rejected by the human on 2026-10-03:
  using the temporary directory is not special, and nobody who adopts the kit should have to change their code to
  run their tests in the container
* **What `noexec` on `/tmp` defended, and why losing it costs nothing here.** The sandbox's adversary is the agent
  itself, and whatever it is tricked into running: the boundary is that it reaches only the allowlisted hosts,
  writes only the working directory, its home and scratch space, holds no capability and cannot gain one, and
  cannot alter the image. `noexec` on a scratch mount defends a system in which an attacker can write a file but
  not otherwise run code. That is not this system. The agent runs code by design, and it can already write and run
  a file in `/work` and in `/home/agent`, which the table above shows. Taking `noexec` off `/tmp` therefore gives
  it nothing it did not have. `nosuid` and `nodev` stay, and no-new-privileges already makes a set-uid bit useless
* **`exec` on the existing mount, not a second scratch directory.** A separate executable tmpfs with `TMPDIR`
  pointing at it was considered, keeping `/tmp` as it is. It was rejected: it protects nothing, for the reason
  above, and a program that writes to `/tmp` by name rather than through `TMPDIR` would still fail
* **`/dev/shm` stays `noexec`.** It is shared memory for Chromium, sized by `shm_size`, not scratch space for
  files, and nothing was seen to fail on it
* **The regression test reads the compose file as text.** The suite runs no Docker and the kit has no YAML parser
  among its dependencies. Adding one for one assertion was rejected. The test finds the entries of the `tmpfs:`
  list by their indentation, which is how the file is written, and R4 covers what a text match cannot: that
  Docker honors the option

## Non-goals

* Moving this repository to the release that holds the fix, and finishing its sandbox. That is 0018, which waits
  for that release
* The release itself, which the human makes
* `/dev/shm`, `/run`, and any other mount or confinement setting
* A size limit on `/tmp`. It has none today, and the container's `mem_limit` bounds it
* Docker Desktop for macOS and Docker Engine 24.0.7. Whether `/tmp:exec` behaves the same there was not checked
  while planning, and R4 asks only for the host the implementer has
