# 0051 The sandbox does not start when the local model server's host has an IPv6 address

## Context

The entrypoint installs the container's firewall before anything else runs in it. One of its rules admits the local
model server: `MODEL_SERVER_HOST` on `MODEL_SERVER_PORT`, `host.docker.internal` and `11434` unless a project sets
them otherwise. `SANDBOX.md` describes it in "The local model server".

On a Docker that gives `host.docker.internal` an IPv6 address as well as an IPv4 one, that rule fails, the
entrypoint stops, and no sandbox starts: a unit run, `--in-place` and `--workdir` alike. It was found on the macOS
host right after Docker Desktop was updated from 4.26.0 to 4.95.0, at the first unit run after it, of unit 0049.

The firewall is IPv4 only apart from one thing: it denies all IPv6 traffic but loopback's. So the model server is
reached at its IPv4 address and at nothing else, which the rule meant all along. It has looked the address up the
same way since the kit was made, and has worked while the lookup gave an IPv4 address first.

## Observed behavior

On the macOS host, with Docker Desktop 4.95.0, Engine 29.8.2 and Compose 5.6.0, and the kit's release 6.0.0,
`./sandbox.sh --in-place true` and `./sandbox.sh 0049` both print:

```
[entrypoint] installing default-deny egress firewall
[entrypoint] IPv6 egress denied
iptables v1.8.9 (nf_tables): host/network `fdc4:f303:9324::254' not found
Try `iptables -h' or 'iptables --help' for more information.
```

and the container stops. The wrapper exits 2. No line of the kit's says why or what to do.

Before the update, on Docker Desktop 4.26.0 with Engine 24.0.7, the same step printed
`[entrypoint] allowed local model server at 192.168.65.254:11434` and the sandbox started.

## Expected behavior

The sandbox starts, and its firewall admits the IPv4 address of the local model server's host on the model
server's port, as it did on the Docker before. An IPv6 address of that host is not admitted, as no IPv6 address
is.

## Steps to reproduce

On a host whose Docker gives `host.docker.internal` an IPv6 address, as Docker Desktop 4.95.0 does on macOS, with
the kit's release 6.0.0:

1. Run `./sandbox.sh --in-place true`
2. Observe the lines above, and that the wrapper exits 2

What the name resolves to, in the sandbox's image, with the host gateway mapping that `container/compose.yml`
gives:

```sh
docker run --rm --entrypoint sh --add-host host.docker.internal:host-gateway <the sandbox's image> -c \
  'grep host.docker.internal /etc/hosts; getent hosts host.docker.internal; getent ahostsv4 host.docker.internal'
```

On Docker Desktop 4.95.0, `/etc/hosts` holds `192.168.65.254` and `fdc4:f303:9324::254` for the name, `getent
hosts` gives `fdc4:f303:9324::254`, and `getent ahostsv4` gives `192.168.65.254`.

## Root cause

The entrypoint takes the model server's address as the first that `getent hosts` gives for `MODEL_SERVER_HOST`, and
hands it to `iptables`. `getent hosts` gives an IPv6 address first when the name has one. `iptables` takes IPv4
addresses only, refuses an IPv6 one with "host/network not found" and exits 2, and the entrypoint, which runs with
`set -e`, stops there.

Shown in the sandbox's image on Docker Desktop 4.95.0, with `NET_ADMIN`: `iptables -A OUTPUT -p tcp -d
192.168.65.254 --dport 11434 -j ACCEPT` succeeds, and the same rule with `fdc4:f303:9324::254` fails with the message
above and exit status 2.

Docker Engine 28.0.0 made `host-gateway` give an IPv6 address besides the IPv4 one: its release notes say so for a
default bridge network with IPv6, and that the gateway may be configured with two addresses, one of each. On this
host the default bridge has no IPv6 (`EnableIPv6=false`) and the daemon's configuration names no gateway address,
and the name has both addresses all the same, from which it is taken that Docker Desktop's own set-up of the engine
gives both. Where Desktop configures it was not looked into. On Docker Desktop 4.26.0, whose Engine is 24.0.7, the
lookup gave the IPv4 address first, as the line the entrypoint logged there shows. Whether the name had an IPv6
address there too cannot be checked any more, since that Docker is no longer on the host.

The firewall's other hosts are looked up for IPv4 addresses alone, and are not affected.

## Fix

The entrypoint looks up the model server's host for IPv4 addresses alone, as it does the other hosts, and admits
the first it gets. A host with no IPv4 address is then one that does not resolve for the firewall: the entrypoint
says so, as it does today for a name that does not resolve, and the sandbox starts without the model server.

Shown in the sandbox's image on Docker Desktop 4.95.0: `getent ahostsv4 host.docker.internal` gives
`192.168.65.254` first, and `iptables` takes the rule with that address.

## Requirements

1. On a Docker that gives the local model server's host an IPv6 address and an IPv4 one, in either order, the
   sandbox starts, and its firewall admits that host's IPv4 address on `MODEL_SERVER_PORT` and no other address of
   it
2. On a Docker that gives that host an IPv4 address alone, the firewall admits it as it does before this unit
3. When that host has no IPv4 address, the entrypoint gives the warning it gives today for a host that does not
   resolve, and the sandbox starts
4. The line the entrypoint logs for the admitted model server names the IPv4 address it admitted, as
   `allowed local model server at 192.168.65.254:11434`
5. Nothing else of the firewall changes: every IPv6 address is still denied but loopback's, and every other rule is
   as it is before this unit
6. The suite holds a test that fails when the entrypoint admits, for the model server, an address that is not
   IPv4: given a host whose lookup gives an IPv6 address before an IPv4 one, the address admitted on the model
   server's port is the IPv4 one. It holds the cases of requirements 2 and 3 as well
7. Requirement 1 is shown through the wrapper on the macOS host with Docker Desktop 4.95.0, in the unit's record:
   the Docker and Compose versions, what was run, the line the entrypoint logged for the model server, and that a
   connection from the container to `MODEL_SERVER_HOST` on `MODEL_SERVER_PORT` reached a server listening on that
   port on the host

## Decisions

* **The model server is admitted at its IPv4 address alone.** The firewall denies all IPv6 traffic but loopback's,
  so an IPv6 address of the model server could not be reached even if it were admitted. Rejected: admitting the
  IPv6 address too, with an `ip6tables` rule. It would open the first IPv6 hole in a firewall that promises none,
  for a model server that the IPv4 address already reaches on every Docker seen
* **A host with only IPv6 addresses is treated as one that does not resolve.** The warning is what the
  entrypoint says today when the model server cannot be admitted, and the sandbox starts without it, which is
  what a developer who uses no local model server wants. Rejected: refusing to start, which would stop every run
  for a server that many projects never use
* **The lookup is the kind the entrypoint uses for its other hosts: IPv4 addresses alone.** So the one firewall
  asks for IPv4 addresses in one way. Which command does it is the planner's
* **The proof is a run on the host where it fails.** The suite runs the entrypoint's code with the host's tools,
  and cannot make Docker give a name two addresses. The regression test holds the lookup's handling of the
  addresses, and the run on Docker Desktop 4.95.0 shows that the sandbox starts and reaches the model server
* **A bug.** The sandbox does not start on a current Docker Desktop, which `README.md` names as what a macOS host
  needs

## Non-goals

* A Linux host: not reproduced there. By Engine 28.0.0's release notes, a Linux host whose default bridge has
  IPv6, or whose daemon names an IPv6 gateway address, would fail the same way, and the fix covers it
* A model server reached over IPv6, or one that listens on an IPv6 address alone
* A `MODEL_SERVER_HOST` that a project sets to an IPv6 address
* A message of the kit's own when a rule of the firewall fails to install. See "Beyond the request"
* A change to `README.md` or `SANDBOX.md`, whose descriptions of the model server stay true
* A section in `CHANGELOG.md`, which is written when a release is made

## Beyond the request

* **The entrypoint says which step of the firewall failed, and what to do, when an `iptables` command fails.**
  This failure printed only `iptables`'s own message, and nothing of the kit's, so a reader could not tell that
  the model server was the cause. It would cost a message for each rule, or a wrapper around the firewall's
  commands, and a test for it. Without it, a failure that a later Docker brings shows `iptables`'s message alone,
  as this one did, and the sandbox does not start, which is seen at once
