# 0039 SNI-filtering egress proxy

## Approach

Build the parser before the proxy and the proxy before the firewall change, so each piece is provable on its own.
The ClientHello parser is pure: bytes in, a hostname or nothing out, which makes it the one part that can be
covered properly by unit tests, and it is where the subtle failures live. The proxy is then a socket splice around
it, and the entrypoint change is a redirect rule.

The dangerous moment is the firewall change, because it removes the per-address rules that currently permit TLS. If
the proxy is not listening at that point the container has no egress at all, which is the correct direction to
fail, but it means the proxy must be working before those rules go.

Two behaviours are verified by breaking them on purpose, because neither has a natural failing case once the tree
is right: killing the proxy in a running container must stop egress rather than open it, and a host that resolves
to an allowlisted address but is not itself allowlisted must be refused. The second is the whole point of the unit,
and 0033's review already supplies the case to use.

The work spans both repositories, and the kit has no `changes/` of its own yet, so kit commits are named in
`record.md` by their message.

## Files

In `~/projects/agent-kit`:

- `container/sni.mjs`: new, the ClientHello parser
- `tests/sni.test.mjs`: new, its unit tests
- `container/egress-proxy.mjs`: new, the listener, the allowlist check and the splice
- `tests/egress-proxy.test.mjs`: new, its unit tests, against a local upstream with the resolver injected
- `container/Dockerfile`: the `egress-proxy` user, and the proxy and parser copied into the image
- `container/compose.yml`: the comment on `ALLOWLIST`, which now takes hostnames only
- `container/entrypoint.sh`: starts the proxy as that user, redirects 443 to it with an owner exemption, drops the
  per-address TLS rules, moves the blocked-host check off 443, and gains the same-address probe
- `README.md`: the boundary is hostnames, and what that does and does not cover

In this project:

- `agent/compose.project.yml`: the thirteen Google Fonts CIDR ranges removed, the two hostnames kept
- `README.md`: the sandbox section, for the hostname boundary and how ECH is judged
- `agent-kit.md`: the kit pin, moved to the kit commit that carries the proxy

## Tasks

Kit repository:

- [x] Write `tests/sni.test.mjs` first, covering a ClientHello with SNI, one without, one split across TCP
      segments, one that is malformed, and one offering ECH, and see it fail before the parser exists (R8)
- [x] Write `container/sni.mjs`: given the bytes read so far, return the hostname, or nothing when there is none,
      when more bytes are needed, or when the record does not parse (R1, R8)
- [x] Write `tests/egress-proxy.test.mjs` first, covering an allowlisted connection forwarded byte for byte, a
      refused hostname, a subdomain, a non-TLS connection, a hello that times out or is cut short, and a name
      that does not resolve or whose addresses all refuse, and see it fail before the proxy exists (R1, R2, R3,
      R10)
- [x] Write `container/egress-proxy.mjs`: accept a connection, read enough bytes to parse the ClientHello, check
      the hostname against the allowlist, resolve that hostname, connect to an address it resolves to, then splice
      both directions or close. The client's own destination is never used (R1, R3, R10)
- [x] Forward bytes unchanged, terminating no TLS and presenting no certificate, so the client still validates the
      origin's own certificate (R2)
- [x] Add an `egress-proxy` user to `container/Dockerfile`, distinct from `agent`, and copy the proxy and parser
      into the image beside the entrypoint (R11)
- [x] Start the proxy from `container/entrypoint.sh` as that user before the privilege drop, redirect outbound TCP
      443 to it, and exempt the proxy user's own traffic from the redirect with an owner match so its onward
      connections do not loop back into it (R1, R3, R11)
- [x] Remove every per-address rule, both the resolved hosts and the CIDR ranges, so that no address is permitted
      merely because an allowlisted host resolves there. What remains is DNS to the resolvers, TCP 443 from the
      proxy's own user, and the model server's host and port (R1, R5, R12)
- [x] Add the rule that permits the proxy user's outbound 443, without which default-deny drops the proxy's own
      connections once the per-address rules are gone (R11, R12)
- [x] Move the existing blocked-host check off port 443, which no longer hangs now that it is redirected to the
      proxy, and onto a port the firewall still drops (R6)
- [x] Add the same-address probe to the start-up self-check: a host that is not allowlisted but resolves where an
      allowlisted one does must be refused, and the container must not start if it is not (R6)
- [x] Confirm the proxy needs no capability beyond the `NET_ADMIN` the firewall already has, and that the agent
      still lands with an empty capability set (R7)
- [x] Update the kit's `README.md` for the hostname boundary, how ECH is judged by its outer hostname, and what
      is still not covered (R2)

This project:

- [x] Move the kit pin in `agent-kit.md` to the kit branch's commit and install it, so the sandbox runs the proxy
      and every check below exercises it (R9)
- [x] Remove the thirteen Google Fonts CIDR ranges from `agent/compose.project.yml`, keeping
      `fonts.googleapis.com` and `fonts.gstatic.com`, and note in the comment why ranges are no longer needed (R4)
- [x] Update `README.md`'s sandbox section: egress is bounded by hostname, what that covers, what it does not, and
      that a client offering ECH is judged by the hostname it sends in the clear (R1, R2)

## Verification

- [x] The kit's `npm test` passes, including every new ClientHello case (R8)
- [x] `./agent.sh` builds and starts, the firewall self-check passes, and the same-address probe is refused (R6)
- [x] From inside, a request to an allowlisted host succeeds and the client validates the origin's own
      certificate, which proves nothing is being intercepted (R1, R2)
- [x] From inside, `claude.ai` is refused while `api.anthropic.com` succeeds, although both resolve to the same
      address. This is the case 0033's review used to demonstrate the address boundary (R1)
- [x] With the CIDR ranges gone, both font hosts are reachable and the end-to-end suite's web fonts still load
      (R4)
- [x] A host whose addresses rotate between start-up and use stays reachable, checked against an edge-served host
      already on the allowlist (R5)
- [x] Killing the proxy inside a running container stops egress rather than opening it, and the agent's capability
      set in `/proc/self/status` is still empty (R3, R7)
- [x] A connection carrying an allowlisted SNI but aimed at an address that host does not resolve to reaches the
      resolved host, not the address asked for, checked against a local listener (R10)
- [x] From inside the container, TLS naming a host that is not allowlisted, sent to an allowlisted address on 8443
      and on 2053, is refused rather than completing as it did on the host before this unit (R12)
- [x] From inside the container, plain HTTP on port 80 to an allowlisted address with a `Host` header naming
      another site is refused (R12)
- [x] `iptables -S OUTPUT` inside the container lists no ACCEPT rule carrying a destination address other than the
      resolvers, the model server gateway, and 127.0.0.1 on the proxy's own port, which admits redirected
      connections to the proxy and nothing outside the container (R12)
- [x] The proxy's own onward connections are not redirected back into it, and it runs as a user other than
      `agent` (R11)
- [x] Inside the sandbox: `npm ci`, `npm run build`, `npm run test:unit` and `PORT=3100 npm test` all pass (R9)
- [x] `npm run check:changes` passes, and `changes/0033-agent-sandbox-container/` is untouched by this branch's
      diff

## Commit Points

- [x] `feature-0039 Add the spec and plan for the SNI-filtering proxy`
- [x] `feature-0039 Parse the ClientHello hostname` (kit: `container/sni.mjs`, `tests/sni.test.mjs`)
- [x] `feature-0039 Filter egress by hostname` (kit: `container/egress-proxy.mjs`, `tests/egress-proxy.test.mjs`)
- [x] `feature-0039 Bound egress by hostname rather than address` (kit: `container/entrypoint.sh`,
      `container/Dockerfile`)
- [x] `feature-0039 Install the kit with the egress proxy` (`agent-kit.md`)
- [x] `feature-0039 Drop the Google Fonts address ranges` (`agent/compose.project.yml`)
- [x] `feature-0039 Document the hostname boundary` (kit `README.md`, `README.md`)
