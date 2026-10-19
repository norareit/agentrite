# 0057 A signal to the sandbox stops it

## Context

The human started the sandbox for unit 0056 with `./sandbox.sh 0056`, in this repository on a Linux host, with
Claude Code 2.1.303 in the image. Claude Code asked for a login. While it waited for the code, the container
stopped, and the terminal showed:

```
[FATAL tini (1)] Unexpected error when forwarding signal: 'Operation not permitted'
```

It was the second time it stopped during that login. Since the container stops before the code is pasted, no login
is saved, and the next start asks for one again.

The kit's `container/compose.yml` has the sandbox's settings, unchanged in this respect since the kit's first commit
on 2026-09-22:

* `init: true`, so that Docker runs its init, tini, as PID 1. It runs as root, and forwards a signal it receives to
  the command it started
* `cap_drop: ALL`, and `cap_add` with `NET_ADMIN`, `SETUID` and `SETGID` alone
* the entrypoint, started by tini, installs the firewall as root and then runs the command as the agent, with
  `setpriv --reuid=agent`

## The bug

**Observed.** A signal that `docker compose run` passes on to the container stops it. A terminal that is resized
sends `SIGWINCH` to the processes in its foreground, `docker compose` among them, which passes it on to PID 1.
tini fails to forward it, says so in the message above, and exits, which stops the container and everything in it.

**Expected.** The sandbox keeps running, and the command in it gets the signal, as a command run outside the
sandbox does. A resize of the terminal reaches the command as a change of size.

**Steps to reproduce.** Start the sandbox in any form that starts a container, such as `./sandbox.sh 0056`, and
resize the host's terminal window, or send `SIGWINCH` to the `docker compose` process of the run. The container
stops with the message above.

**Root cause.** tini runs as root, and the container holds no `KILL` capability. Without it, a process may send a
signal only to a process of its own user. The command runs as the agent, so the kernel refuses tini's forwarding
with `EPERM`, and tini treats a failure to forward as fatal. The specifier showed it on the human's host on
2026-10-19, with the image `ritenoar-agentrite-sandbox:latest` and a Compose file that holds the same `init`,
`cap_drop` and `cap_add` and drops to another user with `setpriv`, as the entrypoint does:

| What was done                                                     | What happened                            |
|-------------------------------------------------------------------|------------------------------------------|
| `docker kill -s WINCH` on the container                           | It stopped, with the message above       |
| `SIGWINCH` to the `docker compose run` process                    | It stopped, with the message above       |
| `SIGINT` to the `docker compose run` process                      | It stopped, with the message above       |
| `SIGWINCH` to `docker compose run`, with `KILL` added to `cap_add` | It went on running, with no message      |
| `SIGWINCH` to a plain `docker run` with the same settings          | It went on running                       |

What sent the signal during the human's login was not established. A resize of the terminal is the one trigger
shown, and every signal that reaches PID 1 stops the container the same way. The reproduction was not run through
`sandbox.sh` itself, since a sandbox of the human's was running at the time and was left alone; it used the same
image and the settings named above.

**Fix.** Add `KILL` to the capabilities the container is given. tini, as root, may then forward a signal to the
agent's command. The agent gains nothing: `setpriv` changes to the agent's user without keeping capabilities, so
the agent's processes hold none, and `no-new-privileges` leaves them no way to gain one, as today.

## Requirements

1. A `SIGWINCH` sent to the `docker compose run` process of a sandbox, as a resize of the host's terminal sends it,
   leaves the container running, and prints no message of tini. This holds in every form of `./sandbox.sh` that
   starts a container: a unit, `--in-place` and `--workdir`, and in `./sandbox-dev.sh`, which runs the same
   settings
2. A signal sent to PID 1 of a running sandbox, as `docker kill -s <signal>` sends it, is forwarded to the command.
   `SIGWINCH` leaves the container running. A signal that ends the command, such as `SIGTERM`, ends it, and the
   container stops as the command's ending stops it, without the message of tini
3. The agent's processes, the command of a run and that of `--connect`, still hold no capability: the lines
   `CapEff`, `CapPrm` and `CapAmb` of `/proc/self/status` are all zero, and `NoNewPrivs` is `1`, as today
4. The suite holds a regression test that starts a container with the kit's settings of `init`, `cap_drop`,
   `cap_add` and the drop to the agent, sends `SIGWINCH` to its PID 1, and finds it still running. It fails on the
   tree this unit is cut from. Where Docker is not available, it is skipped as the suite's other tests that need
   Docker are
5. `SANDBOX.md` is true of the sandbox after the unit: where it says what `docker exec <container> bash` holds, with
   no user named, it names `KILL` among the capabilities, and "What the sandbox defends against" still holds

## Decisions

* **The adversary and the boundary stay as they are.** The sandbox defends against the agent, as "What the sandbox
  defends against" in `SANDBOX.md` says, and the agent holds no capability before and after the unit. `KILL` is held
  only by what runs as root in the container: tini, the entrypoint until it drops to the agent, and a
  `docker exec` with no user named. Root in the container can already change the firewall with `NET_ADMIN`, so a
  root that can also signal the container's other processes reaches nothing outside the container it could not
  reach before, and nothing the agent can use
* **`KILL` is added, and tini stays root.** It is the smallest change that makes the forwarding work, the
  reproduction shows that it does, and it changes no process of the sandbox but tini's permission. Rejected: running
  tini as the agent, from the entrypoint after the drop, in the place of `init: true`. It needs tini in the image,
  changes PID 1 and the chain of `exec` that the entrypoint's tests rely on, and makes a process of the agent the
  container's init. Rejected as well: keeping signals from PID 1, which would stop a `SIGTERM` or a `SIGHUP` from
  the host reaching the command, so that closing the terminal or stopping the container no longer ends the command
  cleanly
* **The bug has no entry in "When something goes wrong" of `SANDBOX.md`.** After the unit it no longer happens, and
  a reader has nothing to do for it

## Non-goals

* Why the home volume held no saved login of Claude Code before the human's start at 14:37 UTC on 2026-10-19. The
  specifier found that `.claude.json` in the volume was written new at that start, with a backup beside it, and no
  `.credentials.json`, and did not establish why. A login that is completed after this unit is saved, as `SANDBOX.md`
  says. Should a saved login be lost again, that is a bug of its own
* What sent the signal during the human's login. The fix holds for every signal that reaches PID 1
* `--connect`, which runs its command with `docker exec` beside the run and does not go through tini

## Beyond the request

None
