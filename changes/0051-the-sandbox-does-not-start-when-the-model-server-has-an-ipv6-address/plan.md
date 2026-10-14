# 0051 The sandbox does not start when the local model server's host has an IPv6 address

## Approach

The entrypoint's rule for the local model server moves into a function of its own, and then that function looks
the host up for IPv4 addresses alone. The two are separate commits: the first changes how the code is written and
nothing it does, the second what it does, as `process.md` asks. The function comes first because the suite tests
the entrypoint by its functions, through `tests/entrypoint-function.mjs`, and the rule is inline today, where no
test can run it. So the regression test is the first task of the change in behavior, and the extraction before it
is what makes it possible.

**The function.** In `container/entrypoint.sh`, the block under `# The host gateway address, on the local model
server's port only.` becomes `allow_model_server HOST PORT`, defined just above the call, which is
`allow_model_server "$MODEL_SERVER_HOST" "$MODEL_SERVER_PORT"`. It takes the host and the port as arguments rather
than reading the two variables, so that a test gives them. In the extraction its body is the block as it is: the
lookup, the `iptables` rule and its log line, or the warning. After the fix, its lookup is:

```sh
getent ahostsv4 "$host" | awk '{print $1}' | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1
```

with `|| true` after it, as today, so that a host with no IPv4 address gives an empty address and the warning.
`getent ahostsv4` asks for IPv4 addresses alone. It reads `/etc/hosts`, where the `host-gateway` mapping of
`container/compose.yml` puts `host.docker.internal`, which `dig`, the lookup of `resolve_one`, would not. The `grep`
is the one of `resolve_one`, and keeps the address an IPv4 one whatever the lookup gives. The comment above the
function says why IPv4 alone: the firewall denies every IPv6 address but loopback's, and `iptables` takes no IPv6
address, so the model server is reached at the IPv4 address of its host and at nothing else.

Nothing else in the entrypoint changes. The warning and the log line keep their wording.

**The test.** A new file, `tests/entrypoint-model-server.test.mjs`, runs `log` and `allow_model_server` as
`entrypointFunctions` gives them, in a bash script with `set -euo pipefail`, as `tests/entrypoint-home-owner.test.mjs`
runs its guard. Two stand-ins are first on the `PATH`, in a temporary directory made with `temporaryDirectory`:

* `iptables` records its arguments, one call to a line, and exits 0
* `getent` answers as glibc's did in the sandbox's image on Docker Desktop 4.95.0, which the planner ran there,
  from the addresses a test gives it for the host, in the order of `/etc/hosts`: `getent hosts` prints the first
  IPv6 address and the name when there is one, and else the first IPv4 address, and `getent ahostsv4` prints each
  IPv4 address three times, as `192.168.65.254  STREAM host.docker.internal`, then with `DGRAM` and `RAW` and no
  name. Any other kind of lookup, and a lookup of another host, prints nothing and exits 2, as glibc's does for a
  name it does not find. So a lookup the stand-in was not written for fails the test rather than passing it

macOS has no `getent`, so the stand-in is what every host runs, and the test needs nothing that a macOS host lacks:
it is skipped nowhere. Each test runs `allow_model_server host.docker.internal 11434` and checks the exit status,
the `iptables` calls and standard error:

1. With `fdc4:f303:9324::254` before `192.168.65.254`, as on Docker Desktop 4.95.0: exit 0, one `iptables` call,
   `-A OUTPUT -p tcp -d 192.168.65.254 --dport 11434 -j ACCEPT`, and the line
   `[entrypoint] allowed local model server at 192.168.65.254:11434`
2. With `192.168.65.254` before `fdc4:f303:9324::254`: the same
3. With `192.168.65.254` alone: the same
4. With `fdc4:f303:9324::254` alone: exit 0, no `iptables` call, and the line
   `[entrypoint] WARNING: host.docker.internal did not resolve; the local model server will be unreachable`
5. With no address: the same as 4

On the extraction, which still asks `getent hosts`, tests 1 and 2 fail and 3 to 5 pass. After the fix all five
pass.

**The run on the host.** This repository's `./sandbox.sh` runs the installed release 6.0.0, which does not start on
this host's Docker, so the runs use `./sandbox-dev.sh`, which runs the working copy's `container/`. The model server
on the host is Ollama, which listens on `127.0.0.1:11434` and answers `/` with `Ollama is running`. The planner saw a
container on this Docker Desktop reach it at `192.168.65.254:11434`. Run, from the repository root:

```sh
./sandbox-dev.sh --in-place curl -4 -s --max-time 5 http://host.docker.internal:11434/
./sandbox-dev.sh 0051 true
```

The first starts the sandbox and prints what the model server answered, with the entrypoint's lines above it. `-4`
keeps `curl` from trying the IPv6 address first, which the firewall drops. The second shows that a unit run starts
too. Should Ollama not be running, start it, or ask the human to.

## Files

- `container/entrypoint.sh`: the rule for the local model server becomes `allow_model_server`, which then looks up
  IPv4 addresses alone
- `tests/entrypoint-model-server.test.mjs`: new, the regression test
- `changes/0051-the-sandbox-does-not-start-when-the-model-server-has-an-ipv6-address/record.md`: the log, and what
  the runs showed

No other file changes. `README.md` and `SANDBOX.md` stay as they are, as the spec's non-goals say.

## Tasks

- [x] In `container/entrypoint.sh`, move the block of the local model server into `allow_model_server HOST PORT`,
  defined just above its call, with its body as it is but for the two arguments in place of the two variables.
  Change nothing it does. Run `npm test` on the host and see no test fail (R5)
- [ ] Write `tests/entrypoint-model-server.test.mjs` as the Approach describes. Run it with
  `node --test tests/entrypoint-model-server.test.mjs` on the host and see tests 1 and 2 fail, each with the
  `iptables` call for `fdc4:f303:9324::254` where the one for `192.168.65.254` is expected, and tests 3 to 5 pass.
  Log the failure in `record.md` (R6)
- [ ] In `allow_model_server`, look the host up as the Approach gives, and write the comment above the function
  that says why IPv4 alone. See the five tests pass (R1, R2, R3, R4, R6)
- [ ] See that `git diff master -- container/entrypoint.sh` changes nothing outside the block of the local model
  server and the new function, and that every `ip6tables` line is as it was (R5)
- [ ] On the macOS host with Docker Desktop 4.95.0, with Ollama listening on port 11434, run the two commands of
  the Approach. See the first print `allowed local model server at 192.168.65.254:11434` among the entrypoint's
  lines, and `Ollama is running`, and both exit 0 (R1, R4)
- [ ] Log in `record.md` the Docker and Compose versions, the two commands, the entrypoint's lines and what `curl`
  printed (R7)

## Verification

- [ ] `npm test` passes on the host, with no more tests skipped than on `master`
- [ ] `./sandbox-dev.sh --in-place npm test` passes, with no test skipped. `./sandbox.sh --in-place npm test`, the
  installed release, does not start on this host's Docker, which is the bug
- [ ] `npm pack --dry-run` lists the same files as on `master`
- [ ] `npm run check-changes` passes

## Commit Points

- [x] The extraction, as `bugfix-0051 Move the rule of the local model server into a function`. It changes no
  behavior, and the suite passes on it
- [ ] The regression test and the fix, in one commit, as `bugfix-0051 Admit the model server at its IPv4 address
  alone`. The failure of the test before the fix is in the record, so the tree is never committed with a failing
  test
- [ ] The record of the runs, as `bugfix-0051 Record the runs on Docker Desktop 4.95.0`
