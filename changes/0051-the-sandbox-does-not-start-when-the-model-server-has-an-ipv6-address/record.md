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

## Amendments
