---
kind: bug
status: in-progress
timestamp: 2026-10-14T21:29:22Z
---

# 0051 The sandbox does not start when the local model server's host has an IPv6 address

## Log

- 2026-10-14T21:29:22Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `1a7baac`, on the human's request for a bug unit for the sandbox that stopped starting after
  Docker Desktop was updated from 4.26.0 to 4.95.0. Made the unit as a bug. Numbered 0051: the plain directories
  run from 0001 to 0050, and `origin` was fetched and holds no unit past 0050.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: the entrypoint's firewall, which is the same on `master` as in the installed release, how the suite
  runs the entrypoint's functions, and "The local model server" and "When something goes wrong" of `SANDBOX.md`.
  Reproduced on Docker Desktop 4.95.0, Engine 29.8.2, Compose 5.6.0: `./sandbox.sh --in-place true` prints
  `iptables`'s refusal of `fdc4:f303:9324::254` after `IPv6 egress denied`, and the wrapper exits 2. The human saw
  the same for `./sandbox.sh 0049`. In the sandbox's image, with `--add-host host.docker.internal:host-gateway`,
  `/etc/hosts` holds `192.168.65.254` and `fdc4:f303:9324::254` for the name, `getent hosts` gives the IPv6
  address and `getent ahostsv4` the IPv4 one, and with `NET_ADMIN` `iptables` takes a rule for the IPv4 address and
  refuses one for the IPv6 address, exiting 2. The default bridge has `EnableIPv6=false`, and
  `~/.docker/daemon.json` names nothing of IPv6 or of a gateway. The release notes of Docker Engine 28.0.0 say that
  `host-gateway` may give an IPv6 address besides the IPv4 one. `git log -S` gives the commit that added the kit,
  `03112fb`, for the lookup.
  Wrote `spec.md`. Decided, each with its reason under "Decisions": the model server is admitted at its IPv4
  address alone, a host with only IPv6 addresses is treated as one that does not resolve, and the proof is a run on
  this host. Left out, under "Beyond the request": a message of the kit's own when a rule of the firewall fails.
  Not checked: a Linux host, which Docker Desktop version first gave the name an IPv6 address, and the fix through
  the wrapper, which is the implementer's. The status is `draft`
- 2026-10-14T21:34:43Z [human] approved the spec. The status is `approved`
- 2026-10-14T21:36:19Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, on
  the host rather than in the sandbox, which does not start on this host's Docker. Cut
  `bugfix-0051-the-sandbox-does-not-start-when-the-model-server-has-an-ipv6-address` from `master` at `b6f80bf`. Read
  the role file and `process.md` as installed, release 6.0.0. Judged that the fix needs a plan: the rule moves into a
  function first, since the suite tests the entrypoint by its functions, then a regression test, the fix and a run
  through the wrapper. Read besides: the entrypoint around the rule, `resolve_one`, `tests/entrypoint-function.mjs`
  and `tests/entrypoint-home-owner.test.mjs` for how a test runs the entrypoint's functions with stand-ins.
  Ran in the sandbox's image on Docker Desktop 4.95.0, for the stand-in of `getent`: `getent hosts` gives
  `fdc4:f303:9324::254`, `getent ahostsv4` gives `192.168.65.254` with `STREAM`, `DGRAM` and `RAW`, and `getent
  ahosts` gives the IPv4 address first. Found Ollama listening on `127.0.0.1:11434` on the host, and a container on
  this Docker reaching it at `192.168.65.254:11434`.
  Wrote `plan.md`. The status is `planned`
- 2026-10-14T21:37:36Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the macOS host,
  on the host rather than in the sandbox, on
  `bugfix-0051-the-sandbox-does-not-start-when-the-model-server-has-an-ipv6-address` at `452ee13`. Read the role
  file as installed, release 6.0.0. The status is `in-progress`
- 2026-10-14T21:39:43Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved the rule of the local
  model server into `allow_model_server HOST PORT`, defined just above its call, with its body as it was but for
  the two arguments in place of `MODEL_SERVER_HOST` and `MODEL_SERVER_PORT`, and the lookup still `getent hosts`.
  `bash -n` passes on the entrypoint. `npm test` on the host reports 547 tests, 530 passing, 17 skipped and none
  failing
- 2026-10-14T21:40:45Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote
  `tests/entrypoint-model-server.test.mjs` as the plan describes. On the tree of `adc8d14` with the test added,
  `node --test tests/entrypoint-model-server.test.mjs` on the host reports 5 tests, 2 passing and 3 failing. Tests
  1 and 2, an IPv6 address before the IPv4 one and after it, record the `iptables` call for `fdc4:f303:9324::254`
  where the one for `192.168.65.254` is expected. Test 4, an IPv6 address alone, records the same call where none
  is expected. Tests 3 and 5 pass. The plan had test 4 passing on the old lookup: it admits the IPv6 address alone,
  which the stand-in `iptables` takes and a real one refuses, so the failure is the bug's. Corrected the plan's
  Approach and its task to say so
- 2026-10-14T21:41:09Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, had `allow_model_server` look the
  host up with `getent ahostsv4`, keep the addresses that `resolve_one`'s `grep` keeps and take the first, and
  wrote the comment above it that says why IPv4 alone. `bash -n` passes on the entrypoint, and the five tests of
  `tests/entrypoint-model-server.test.mjs` pass. `git diff master -- container/entrypoint.sh` changes the block of
  the local model server alone, into the function and its call, and no `ip6tables` line
- 2026-10-14T21:44:19Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the working copy's
  sandbox through the wrapper on `f322a7e`, with `./sandbox-dev.sh`, on the macOS host with Docker Desktop 4.95.0,
  Engine 29.8.2 and Compose 5.6.0, with Ollama listening on `127.0.0.1:11434`. Each run rebuilt the image.
  * `./sandbox-dev.sh --in-place curl -4 -s --max-time 5 http://host.docker.internal:11434/` exited 0. The
    entrypoint logged `installing default-deny egress firewall`, `IPv6 egress denied`,
    `allowed local model server at 192.168.65.254:11434`, the proxy listening, the canary blocked, every
    allowlisted host and the probe reachable, `example.com` refused at the probe's address, and
    `firewall verified; dropping to the agent user`. `curl` printed `Ollama is running`
  * `./sandbox-dev.sh 0051 true` exited 0, in the container
    `ritenoar-agentrite-sandbox-dev-bugfix-0051-the-sandbox-does-not-start-when-the-model-server-has-an-ipv6-address`,
    with the same lines of the entrypoint. After it the checkout was on the unit's branch at `f322a7e` with nothing
    in `git status`, and the clone's directory was gone
  On that tree, with this record and the ticks of `plan.md` added, which change no code: `npm test` on the host
  reports 552 tests, 535 passing, 17 skipped and none failing, the seventeen that skipped before this unit, since
  the new file skips none. `./sandbox-dev.sh --in-place npm test` reports 552 tests, 552 passing, none skipped and
  none failing. `npm pack --dry-run` lists 33 files, the same as on `master` at `b6f80bf`. `npm run
  check-changes` is run on the commit of this entry. Every task of the plan is ticked. The status stays
  `in-progress` until the review.
  Not checked: a Linux host, and a model server's host with an IPv6 address alone through the wrapper, which the
  regression test holds
- 2026-10-14T21:54:36Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, full review of unit 0051 at commit
  `ab5d8e3ce1e0bdace2301c57f8f5f59526044c41`, against merge base `b6f80bf0b960ba92929c298369cca384dd7ccd96`.
  Returned C1. Findings saved in
  `.reviews/0051-the-sandbox-does-not-start-when-the-model-server-has-an-ipv6-address/2026-10-14-215307-full-ab5d8e3.md`
  Independently ran `npm test` on macOS: 552 tests, 535 passing, 17 skipped, none failing or cancelled, after an
  initial run exceeded the tool's 120-second limit. `./sandbox-dev.sh --in-place npm test`: 552 passing, none
  skipped, failing or cancelled. On Docker Desktop 4.95.0, Engine 29.8.2 and Compose 5.6.0, both wrapper commands
  of the plan exited 0 and logged the admitted IPv4 address; the connection to Ollama printed `Ollama is running`.
  The real `getent hosts` gives the IPv6 address and `getent ahostsv4` the IPv4 one. Running the five regression
  assertions against the functions from `adc8d14` in memory gives the recorded three failures and two passes.
  `bash -n`, the committed change check and `git diff --check master...HEAD` pass. The pack dry run lists 33 files,
  and the reviewed files fit 120 characters. Could not independently verify the historical tests-first chronology,
  a physical Linux host or an IPv6-only model-server host through the real wrapper.
- 2026-10-14T21:59:55Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, accepted C1, which blocks:
  `tests/entrypoint-model-server.test.mjs` names the test context `t`, in `allowModelServer` and in its five tests,
  where `process.md` says that one-character variables are never used, and the unit records no exception. The rest
  of the suite names it `t` 247 times in 16 files, but the file is new, and `temporaryDirectory` of unit 0046 names
  it `testContext`. Added to `plan.md`, before doing it, a task, a commit point, and the verification to be run
  again, on the human's word to apply C1. The other uses of `t` in the suite are outside this unit, and were
  raised with the human
- 2026-10-14T22:02:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied C1. Renamed the test
  context of `allowModelServer` and of the five tests of `tests/entrypoint-model-server.test.mjs` from `t` to
  `testContext`, and wrapped the call of the fourth test over lines, whose title no longer fit 120 characters with
  the longer name. Nothing else in the file changed, and the five tests pass. C1 is resolved.
  On that tree, `npm test` on the host reports 552 tests, 535 passing, 17 skipped and none failing.
  `./sandbox-dev.sh --in-place npm test` reports 552 tests, 552 passing, none skipped and none failing. `npm pack
  --dry-run` lists 33 files, the same as on `master` at `b6f80bf`. `npm run check-changes` is run on the commit of
  this entry. Every task of the plan is ticked. The change for C1 has not been reviewed, so the status stays
  `in-progress` for the human to decide whether it is reviewed again

## Amendments
