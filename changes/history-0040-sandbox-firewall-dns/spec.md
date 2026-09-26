# 0040 Sandbox firewall blocks its own DNS

## Context

The sandbox's entrypoint, built by `0033-agent-sandbox-container` and moved into the agent kit by
`0035-shared-agent-kit` as the kit's `container/entrypoint.sh`, installs a default-deny egress firewall and then
resolves hosts with `dig` for its start-up proof. It allows DNS to the nameservers in the container's
`/etc/resolv.conf`, and its comment says that Docker's embedded resolver "sits on loopback and is already covered".
On at least one machine that assumption is false, and the sandbox cannot start at all.

`0039-sni-filtering-proxy` since moved the egress boundary from addresses to hostnames: the entrypoint no longer
resolves the allowlist itself, and an egress proxy running as the `egress-proxy` user resolves each host when a
connection names it. It left the DNS rules as they were, so the defect remains, and the failure now surfaces at the
first lookup the start-up proof makes, the canary's.

`0037-kit-as-an-npm-package` then made the kit the npm package `@ritenoar/agent-kit`. A project depends on a release
tarball served from `agent-kit.ritenoar.com`, pinned by `package-lock.json`, and each release is immutable. Release
1.0.1, the one this project depends on, carries the same entrypoint as `dc27d56`, so it has the defect too.

0033 does not record which Docker version it was verified on, so why it started there is not known.

## Observed behavior

With the kit at `dc27d56`, which carries 0039, `./agent.sh` stops during start-up. Release 1.0.1 was not run on this
machine, but its `container/entrypoint.sh` is byte for byte the one at `dc27d56`:

```
[entrypoint] installing default-deny egress firewall
[entrypoint] IPv6 egress denied
[entrypoint] allowed local model server at 192.168.65.254:11434
[entrypoint] egress proxy listening on 127.0.0.1:15443 as egress-proxy
[entrypoint] verifying the canary (example.com) is blocked
[entrypoint] FATAL: firewall canary example.com does not resolve; nothing to prove blocked
```

Before 0039, when the entrypoint resolved every allowlisted host first, the same defect stopped it earlier:

```
[entrypoint] installing default-deny egress firewall
[entrypoint] IPv6 egress denied
[entrypoint] FATAL: cannot resolve allowlisted host: api.anthropic.com
```

## Expected behavior

The container passes its start-up proof and drops to the agent user. DNS keeps working after the drop, both for the
agent and for the egress proxy, which resolves each allowlisted host when a connection names it. Egress stays
confined as 0033's requirement 9 and 0039's requirements 3 and 12 promise.

## Steps to reproduce

On macOS with Docker Desktop, Docker Engine 24.0.7, with the kit at `dc27d56` or any later commit up to release
1.0.1:

1. `./agent.sh --rebuild`
2. Observe the failure above, on every start

## Root cause

Reproduced on the machine above, in the sandbox image with the entrypoint bypassed and its rules applied by hand:

* Before the firewall is installed, `dig +short A api.anthropic.com` in the image answers `160.79.104.10`. A plain
  `alpine` container on the same Docker resolves it too, so DNS on the machine works
* The container's `/etc/resolv.conf` lists only `nameserver 127.0.0.11`, Docker's embedded resolver
* With the entrypoint's rules in place, the same `dig` gets no answer
* Adding one rule that accepts UDP port 53 to any destination makes it answer, and that rule counts exactly one
  packet. Replacing it with rules for three candidate upstreams shows where that packet goes: the rule for
  `192.168.65.7`, Docker Desktop's DNS server, counts one packet, and the rules for `192.168.65.1` and
  `192.168.65.254` count none

So on this Docker, the embedded resolver answers the query on `127.0.0.11` and then forwards it to `192.168.65.7`
from inside the container's network namespace. The forwarded query passes through the container's `OUTPUT` chain,
where no rule accepts it, and the default `DROP` policy discards it. The entrypoint cannot allow that upstream by
reading `/etc/resolv.conf`, because it is not listed there.

Reproduced again with the kit at `dc27d56`, on the same machine and Docker, in the image the kit builds and on the
Compose network `./agent.sh` uses: `dig +short A example.com` answers before the entrypoint's rules, gets no answer
with them, and answers again once the `192.168.65.x` upstreams are allowed. The rules 0039 added, for the proxy's
TCP port 443 and its redirect, play no part: they do not touch port 53.

A plain `docker run` on the default bridge network does not reproduce it, because there `/etc/resolv.conf` names
`192.168.65.7` directly and the existing rules allow it. The sandbox runs on a Compose network, which always has the
embedded resolver.

## Fix description

The fix is made in the kit's `container/entrypoint.sh`, in the kit repository, is released as the kit's next patch
release, and reaches this project by moving its `@ritenoar/agent-kit` dependency to that release.

Accept outgoing DNS, UDP and TCP port 53 to any destination, only from sockets owned by uid 0, using the `owner`
match. Keep the existing rules for the nameservers in `/etc/resolv.conf`, and correct the comment above them so it
states what the embedded resolver does rather than what it was assumed to do.

The owner rule separates the two senders. Probed in the sandbox image, with the rule and a catch-all rule for port
53 behind it, first before 0039 and again with the kit at `dc27d56`:

* The embedded resolver's forwarded query matched the uid 0 rule: its socket belongs to the Docker daemon
* A query sent as uid 1000 straight to `1.1.1.1` skipped the uid 0 rule and matched only the catch-all. Without the
  catch-all, which the fix does not add, it is dropped

The proxy's lookups need nothing of their own. The proxy runs as `egress-proxy`, not as root, but it asks the embedded
resolver on `127.0.0.11`, which the loopback rule already allows, and the forwarding to the upstream is the daemon's,
from a uid 0 socket, whichever user asked. That is inferred from the probe rather than probed as `egress-proxy`, and
requirement 1, which needs every allowlisted host reachable through the proxy, checks it.

The agent cannot produce a uid 0 socket. It runs as the unprivileged `agent` user, whose uid is the host user's
(`agent.sh` passes `id -u`, 501 on this Mac, 1000 on a typical Linux host) and which the entrypoint refuses to start
as if it is uid 0. It holds an empty capability set, and the kit's
`container/compose.yml` sets `no-new-privileges:true`, so the setuid binaries present in the image (`su`, `passwd`,
`mount` and others) cannot raise it to root. The `egress-proxy` user is not uid 0 either, which the entrypoint
refuses to start without.

The probe covered UDP only. TCP port 53, which a resolver falls back to for a truncated answer, is included on the
same reasoning and is verified as part of the fix.

## Requirements

1. On the machine above, `./agent.sh` starts: the canary resolves and is blocked, every allowlisted host and the probe
   are reachable, the canary is refused at the probe's address, and the agent lands as the unprivileged `agent`
   user, with the host user's uid rather than uid 0
2. Inside the started sandbox, the agent resolves hosts through the embedded resolver
3. Inside the started sandbox, a DNS query the agent sends directly to an address outside the allowlist, over UDP and
   over TCP, gets no answer
4. No rule accepts outgoing traffic to port 53 from a socket that uid 0 does not own, other than the existing rules
   for the nameservers in `/etc/resolv.conf`
5. The comment above the DNS rules in the kit's `container/entrypoint.sh` describes the forwarding behavior and why
   the owner rule exists
6. This project's `package.json` and `package-lock.json` depend on a kit release that carries the fix, and
   requirements 1 to 4 hold with that release installed

## Decisions

* **Match the sender, not the destination.** Allowing only `192.168.65.7` would fix this machine and hardcode Docker
  Desktop's internal address, which a Linux Docker engine does not use. Its upstreams are the host's own resolvers,
  and Docker Engine 24.0.7 does not expose them to the container. Declaring a resolver explicitly with `dns:` in
  the kit's `container/compose.yml`, and allowing only that address, would make the upstream known and portable, but
  it would replace the host's DNS with a fixed one, which breaks resolution that depends on the host's network, such
  as a VPN with split DNS, and it states the same address twice, once for Docker and once for the firewall. Matching
  the socket owner needs no address at all and works whichever upstream the daemon uses. Where a Docker version
  forwards from outside the container's namespace instead, the rule never matches and costs nothing
* **Allowing port 53 to every destination was rejected.** It fixes start-up and gives the agent an open UDP and TCP
  channel to any host on port 53, which breaks 0033's requirement 9 and 0039's requirement 12
* **The uid 0 rule is a narrow reading of 0039's "DNS to its resolvers".** 0039's requirement 12 lists DNS to the
  container's resolvers among the egress it permits. The upstream the embedded resolver forwards to is one of those
  resolvers, reached on the resolver's behalf, and the owner match keeps it out of reach of every other user in the
  container, the agent and the proxy included
* **The DNS exfiltration channel through the resolver is not new.** A process that can resolve names can encode
  data in the names it asks for, and the embedded resolver forwards them upstream. That was true before this fix,
  through the rules for `/etc/resolv.conf`, and it is part of what resolving hosts at run time means. 0039 lists it
  among what the sandbox does not defend against. This fix adds no path the agent can use directly
* **Fixed in the kit, not overridden here.** The entrypoint is the kit's since 0035, and every project that installs
  the kit on Docker Desktop fails the same way. A project-side override would fix one project and fork the firewall.
  The kit has no `changes/` of its own yet, so, as in 0039, the kit commit is named in `record.md` by its message
* **Reviewed before it is released, and released by the human.** A kit release is immutable and cannot be replaced,
  so the kit commit is reviewed, and requirements 1 to 4 are checked with it installed from the kit branch, before
  any release is made. The release itself runs the kit's `deploy.sh`, which needs AWS credentials that the sandbox
  deliberately does not hold, and publishes to a public host, so it is the human's step, not an agent's. It is a
  patch release, since the fix changes no interface a project uses. The requirements are checked again once this
  project depends on the release, because that tarball, not the kit branch, is what the project runs. The fix now
  spans two repositories and a release between them, so the unit has a `plan.md`
* **The regression check is manual, as 0033 decided.** 0033 recorded that no automated suite covers the entrypoint,
  and that decision stands. The failure above, reproduced before the fix, is the failing case, and the requirements
  above, checked on the same machine after it, are the passing one

## Non-goals

* Explaining why the sandbox started where 0033 was verified. Its record does not name the Docker version, and the
  fix does not depend on it
* An automated suite for the entrypoint, which 0033 declined and 0035 lists as a non-goal
* Adding a start-up proof that direct DNS from the agent is blocked. A dropped UDP query and a server that does not
  answer DNS both time out, so such a proof could not tell a closed firewall from an unhelpful target, the same
  weakness 0033 removed from the canary check
* Any change to the allowlist, to how the proxy resolves allowlisted hosts, or to IPv6 handling
* The other faults found once the sandbox first started on this machine, logged in `record.md`: git refusing
  `/work` as "dubious ownership", the agent's home volume left owned by an earlier build's uid, and the sandbox
  sharing the host's `node_modules`. None is caused by DNS, and each is a unit of its own
