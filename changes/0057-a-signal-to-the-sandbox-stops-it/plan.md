# 0057 A signal to the sandbox stops it

## Approach

Add `KILL` to `cap_add` in `container/compose.yml`, the one file every form of the sandbox takes its confinement
from: `./sandbox.sh` with a unit, `--in-place` and `--workdir`, and `./sandbox-dev.sh`, all end in `docker compose
run` over it. tini, PID 1 as root, may then forward a signal to the agent's command. Nothing else in the container
changes: the entrypoint drops to the agent with `setpriv`, which keeps no capability, and `no-new-privileges` stays.

The regression test comes first and is shown to fail on the tree before the fix. It reads the settings that decide
the bug from `container/compose.yml` itself, `init`, `cap_drop`, `cap_add` and `security_opt`, so that it follows the
file rather than a copy of it, and passes them to a `docker run` of the image the kit's `Dockerfile` builds on,
`node:26-bookworm` (its `FROM ... AS base` line, read from the file), whose command drops to uid and gid 1000 with
`setpriv --reuid=1000 --regid=1000 --clear-groups` and sleeps, as the entrypoint drops to the agent. It does not
build the sandbox's image, which takes minutes and the network, and it does not run `sandbox.sh`, which needs a
project. It sends `SIGWINCH` to PID 1 with `docker kill -s WINCH`, finds the container running and its log free of
tini's message, then sends `SIGTERM` and finds that the container stopped, again without tini's message.

The kit's suite has no test yet that needs Docker: the tests that are skipped are skipped for what a host other than
Linux lacks, and their reason, from `tests/skip-reason.mjs`, sends the reader to the sandbox. The sandbox's image
holds no Docker, so that reason would be false for this test. It is skipped with a reason of its own, which says
that it needs Docker, that the sandbox has none, and that it runs with `npm test` on a host that has Docker.
`CONTRIBUTING.md` lists what each skipped test needs, so it gains this one. This follows from requirement 4 and the
rule that `CONTRIBUTING.md` says what there is, and decides nothing the spec left open.

Four comments say what the container's root holds, leaving `KILL` out, and become false with the fix. They are made
true in the same commit as the fix: the capability comment in `container/compose.yml`, the comment on the proxy's
start-up check in `container/entrypoint.sh`, whose `/proc` check stays as it is, and the two comments of
`container/sandbox.sh` that list what a `docker exec` with no user named holds.

## Files

- `tests/sandbox-signal.test.mjs`: new. The regression test of requirements 1, 2 and 4, skipped where Docker is not
  available
- `container/compose.yml`: `KILL` added to `cap_add`, and the comment above `cap_drop` saying why it is there
- `container/entrypoint.sh`: the comment above the proxy's start-up check, which says root holds no `CAP_KILL`
- `container/sandbox.sh`: the comments at lines 36 to 37 and 453 to 454, which name the capabilities a `docker exec`
  with no user named is given
- `SANDBOX.md`: the paragraph of "What the sandbox defends against" that says what `docker exec <container> bash`
  holds
- `CONTRIBUTING.md`: "The kit's own tests", the list of tests a host skips and why
- `changes/0057-a-signal-to-the-sandbox-stops-it/record.md`: the log entries of the work and of the checks on the
  host

## Tasks

- [x] Write `tests/sandbox-signal.test.mjs`, matching the idiom of `tests/compose-tmpfs.test.mjs`. (R4, R1, R2)
    - Read `container/compose.yml` and take, by indentation as `compose-tmpfs.test.mjs` does, the value of
      `    init:` and the entries of the service's `    cap_drop:`, `    cap_add:` and `    security_opt:` lists.
      Assert that `init` is `true`, so that a change to it fails here rather than leaving the test meaningless
    - Read `container/Dockerfile` and take the image of the line `FROM <image> AS base`
    - Skip the test when `docker info` exits other than 0, with the reason: `needs Docker, which the host lacks. The
      sandbox holds no Docker, so run npm test on a host that has it`. Do not use `skipReason`, whose text sends the
      reader to the sandbox
    - Start the container detached and without `--rm`, with `--init`, a `--cap-drop` for each entry of `cap_drop`, a
      `--cap-add` for each entry of `cap_add`, a `--security-opt` for each entry of `security_opt`, the image read
      above, and the command `setpriv --reuid=1000 --regid=1000 --clear-groups -- sleep 300`. Remove it with
      `docker rm -f` in an `after` of the test, whatever the outcome
    - Wait until `docker inspect -f '{{.State.Running}}'` gives `true`, then `docker kill -s WINCH` the container,
      wait one second, and assert that it is still running and that `docker logs` holds no line with `tini`
    - `docker kill -s TERM` the container, `docker wait` it, and assert that it stopped and that `docker logs` holds
      no line with `tini`
- [x] Run `node --test tests/sandbox-signal.test.mjs` on the host, on the tree before the fix, and see the `SIGWINCH`
  assertion fail with the container stopped. Log the outcome in `record.md`. (R4)
- [x] Add `- KILL` to `cap_add` in `container/compose.yml`, after `SETGID`. Rewrite the comment above `cap_drop` so
  that it names `KILL` and why: Docker's init runs as root and forwards a signal the container receives, a resize of
  the terminal among them, to the command, which runs as the agent, and without `KILL` the kernel refuses it and the
  init exits, stopping the container. Keep the comment's last sentence, that the agent ends up with an empty set and
  `no-new-privileges` leaves it no way to regain one. (R1, R2, R3)
- [x] Run `node --test tests/sandbox-signal.test.mjs` on the host and see it pass. (R1, R2, R4)
- [x] In `container/entrypoint.sh`, rewrite the comment above the proxy's start-up loop, which says root holds no
  `CAP_KILL` and so cannot signal the proxy, to say that the check reads `/proc` because the existence of the
  process is what is asked, and that it does not depend on which capabilities root holds. Change no code. (R3)
- [x] In `container/sandbox.sh`, change "with the capabilities the entrypoint keeps for the firewall" in both comments,
  at lines 36 to 37 and 453 to 454, to "with the capabilities the container is given". Change no code. (R3)
- [x] In `SANDBOX.md`, "What the sandbox defends against", change "is root and holds `NET_ADMIN`, `SETUID` and
  `SETGID`" to "is root and holds `NET_ADMIN`, `SETUID`, `SETGID` and `KILL`", keeping the rest of the paragraph and
  the 120-character wrap. Read the rest of the section and confirm that nothing else in it names the capabilities or
  becomes false; the agent's processes still hold none. (R5)
- [x] In `CONTRIBUTING.md`, "The kit's own tests", say after the list of what a host other than Linux skips that a
  host without Docker skips the test that a signal to the sandbox leaves it running, and that the sandbox is such a
  host, so that test runs with `npm test` on a host that has Docker, and the paragraph that sends the reader to
  `./sandbox.sh --in-place npm test` does not hold for it. (R4)

## Verification

- [x] `npm test` on the host, with Docker: every test passes, `tests/sandbox-signal.test.mjs` among them and not
  skipped
- [x] `./sandbox-dev.sh --in-place npm test`: every test passes, and `tests/sandbox-signal.test.mjs` is skipped with the
  reason above
- [x] In `./sandbox-dev.sh 0057 bash`, run in a terminal on the host: once the shell's prompt is up, send `kill -WINCH`
  to the `docker compose run` process from another shell of the host, and resize the terminal window. The shell goes
  on running and the terminal shows no message of tini. Then, in that shell, `tput cols` gives the new width. Log
  the outcome in `record.md`. (R1)
- [x] In a sandbox of `./sandbox-dev.sh 0057 bash`, `docker kill -s WINCH` the container from the host, and it goes on
  running. Then, in `./sandbox-dev.sh --in-place sleep 300`, `docker kill -s TERM` the container, and the run ends
  without the message of tini. An interactive bash ignores SIGTERM, so the `TERM` check needs a command that ends on
  it. Log the outcome. (R2)
- [x] In a sandbox of `./sandbox-dev.sh 0057 bash`, `grep -E '^(CapEff|CapPrm|CapAmb|NoNewPrivs)' /proc/self/status`
  shows the three sets all zero and `NoNewPrivs` `1`; and from another shell of the host, `./sandbox-dev.sh
  --connect 0057 grep -E '^(CapEff|CapPrm|CapAmb|NoNewPrivs)' /proc/self/status` shows the same. Log both outputs. (R3)
- [x] `npm run check-changes` passes on the committed branch

## Commit Points

- [x] `bugfix-0057 Plan the fix`: `plan.md` and the planner's entry in `record.md`
- [x] `bugfix-0057 Give the sandbox's init the capability to forward a signal to the agent`: the regression test,
  `container/compose.yml`, the comments of `container/entrypoint.sh` and `container/sandbox.sh`,
  `SANDBOX.md` and `CONTRIBUTING.md`, with the record's entries of the failing and the passing run
- [x] `bugfix-0057 Record the checks on the host`: the record's entries of the checks under "Verification"
