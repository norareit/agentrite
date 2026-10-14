---
kind: bug
status: approved
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

## Amendments
