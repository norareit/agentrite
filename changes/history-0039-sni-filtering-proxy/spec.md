# 0039 SNI-filtering egress proxy

Make the sandbox's egress boundary a hostname boundary instead of an address one, by filtering outbound TLS on the
hostname in the ClientHello.

## Context

Unit 0033 built the sandbox with a default-deny egress firewall driven by a checked-in allowlist of hostnames. The
firewall is `iptables`, which filters on destination IP and port and cannot see the hostname a TLS connection asks
for, so the entrypoint resolves each allowlisted name once at start-up and permits those addresses. 0033 stated the
consequence plainly rather than fixing it, under "The firewall is an address boundary", and its own review
demonstrated it: allowlisting `api.anthropic.com` also reached `claude.ai`, `platform.claude.com` and
`console.anthropic.com`, none of them listed, because all four are served from the same address.

Two costs have since come due. The Google Fonts entry needs thirteen CIDR ranges, added precisely because the font
edge rotates faster than one start-up resolve can track, and those ranges admit whatever else that edge serves. And
a rotating edge breaks the start-up self-check outright: a run during unit 0035 aborted with
`FATAL: allowlisted host api.github.com is not reachable` because GitHub answered from an address the resolve had
not pinned.

The third cost arrived with unit 0037. Hosting anything behind a shared CDN, which is how a self-hosted package
tarball would be served, means allowlisting that CDN's address space. Under an address boundary that is a large,
shared widening; under a hostname boundary it is one name. 0037 is blocked on this unit for that reason.

0033 named the fix when it declined it: "a small SNI-filtering proxy that reads the ClientHello hostname before a
connection is allowed through, needing no certificate or TLS interception since SNI is sent in the clear". It was
declined as new infrastructure with a new failure mode and its own testing burden. That reasoning was sound then
and has been outweighed since, by three separate costs in three consecutive units.

## Adversary and supported usage

The unit makes a containment claim, so the boundary it defends is stated before the requirements.

**Defended against.** An agent running inside the container that has been induced, by a prompt injection, a
compromised dependency, or its own error, to send data to or fetch code from a host the developer did not
allowlist. It executes arbitrary code as the unprivileged `agent` user, holds no Linux capabilities, and can open
sockets freely.

**Not defended against.** A container or kernel escape; an attacker who already has root on the host; a malicious
or compromised host that *is* allowlisted; exfiltration through an allowlisted host, such as posting data into an
API the agent is meant to use; covert channels including DNS tunnelling through the permitted resolver and timing
signals. Also a genuine Encrypted ClientHello whose outer public name is itself allowlisted: the real hostname is
encrypted, so the connection is judged on the public name alone and the inner one is not seen. None of these is
made worse by this unit, and none is closed by it.

**Supported usage.** One developer's own machine, running their own agents against their own checked-in allowlist,
which they review. Not a multi-tenant host and not a boundary between mutually distrusting users.

## Requirements

1. Outbound TLS is permitted by hostname: a connection whose ClientHello names an allowlisted host is forwarded,
   and one naming any other host is refused, including when that host resolves to an address an allowlisted host
   also resolves to
2. No TLS is terminated or inspected. The proxy reads the ClientHello, installs no certificate authority, presents
   no certificate, and forwards the connection's bytes unchanged
3. Egress stays default-deny, and the proxy failing, crashing or being unreachable denies egress rather than
   permitting it
4. The allowlist stays a list of hostnames in the project's own Compose file, and no longer needs CIDR ranges to
   cover a rotating edge. The thirteen Google Fonts ranges are removed and both font hosts stay reachable
5. A host whose addresses change after start-up stays reachable, and the start-up self-check no longer fails
   because an edge answered from an address the resolve did not pin
6. The start-up self-check proves the hostname boundary: it verifies that a host which is not allowlisted but
   resolves to an allowlisted address is refused, and fails the container's start if it is not
7. The agent process still ends with an empty capability set, and the proxy needs no capability the firewall did
   not already need
8. The ClientHello parsing is covered by unit tests in the kit's own suite, including a hello with no SNI, one
   split across TCP segments, and a malformed one
9. The sandbox still starts with one command from the repository root, and both suites still pass inside it
10. The proxy connects only to an address the hostname it validated resolves to, so a connection aimed at an
    address of the client's choosing does not reach that address by presenting an allowlisted name
11. The proxy runs as its own unprivileged user, distinct from the agent, so that its own outbound connections are
    exempt from the redirect rather than looping back into it
12. No rule permits traffic to an address merely because an allowlisted host resolves there. The egress the
    container permits is DNS to its resolvers, TCP 443 from the proxy's own user, and the local model server's host
    and port, and everything else is denied whatever port it uses

## Decisions

* **Transparent redirection with SNI parsing, not a CONNECT proxy.** A CONNECT proxy would give the hostname
  directly with no parsing, but it needs every client to honour proxy environment variables, and the container runs
  two harnesses, npm, git and whatever a unit calls, whose behaviour is not ours to control. Node's `fetch` ignores
  proxy variables by default, which alone would break the harnesses. Redirecting port 443 to a local listener works
  whatever the client does, and a client that cannot be redirected simply fails closed.
* **No TLS interception.** SNI travels in the clear in the ClientHello, so the hostname is readable without a
  certificate or a man in the middle. Terminating TLS would mean installing a CA into the container and being able
  to read every credential that passes through it, which is a far larger change, and a far larger thing to get
  wrong, than the problem asks for.
* **The hostname sent in the clear is what is judged, and Encrypted ClientHello is not a special case.** An
  earlier version of this decision refused any hello offering ECH, reasoning that an unreadable hostname should
  fail closed. That is wrong in practice. Chromium sends the ECH extension as GREASE on every connection when it
  has no ECH configuration, and GREASE is by design indistinguishable from the real thing, so the rule would have
  refused every Chromium connection and with it the web fonts the end-to-end suite waits for. Measured on this
  project's Playwright Chromium: both hellos sent while loading `fonts.googleapis.com` carried extension `0xfe0d`.
  The proxy therefore reads the outer hostname and judges that, whatever else the hello offers. A GREASE hello
  carries the real hostname there and is checked like any other. A genuine ECH hello carries the provider's public
  name, such as `cloudflare-ech.com`, which is not allowlisted and is refused for that reason rather than by a rule
  about ECH.
* **The proxy connects to the hostname it validated, never to the address the client chose.** Reading the client's
  original destination would be both impossible and unsafe here. Node exposes no `getsockopt`, so `SO_ORIGINAL_DST`
  is unreachable without a native module, which the dependency-free decision above rules out. More importantly,
  honouring it would defeat the whole boundary against the stated adversary: an agent could open a connection to
  any address it controlled and put an allowlisted hostname in the SNI, and a server it owns would simply ignore
  the name. Resolving the validated hostname and connecting there closes that, and it satisfies requirement 5 at
  the same time, because resolution then happens per connection rather than once at start-up.
* **Written in Node, dependency-free, in the kit's `container/`.** Node is already in the image, the kit's tests
  already run under `node --test`, and a TCP splice with a ClientHello parser is small enough to read in one
  sitting. Adding a language runtime or a third-party proxy would be more to install, pin and trust.
* **The per-address rules go entirely, rather than staying for everything that is not TLS.** An earlier version of
  this decision kept them, on the reasoning that redirecting only 443 made the change additive rather than a
  rewrite of the firewall. That leaves the boundary bypassable in one step. The rule the entrypoint installs per
  allowlisted address carries no `--dport`, so it permits every TCP port to that address, and the same is true of
  the CIDR ranges. Measured on the host: TLS naming `claude.ai` sent to `api.anthropic.com`'s address on ports
  8443 and 2053 completed and returned an HTTP 403 from claude.ai's edge, and plain HTTP to a Google Fonts address
  on port 80 with `Host: www.google.com` returned 200. A shared edge routes by name on other ports and by `Host`
  header without TLS at all, so an agent that wanted a host it was not allowed simply avoids 443. What remains is
  DNS to the container's resolvers, TCP 443 through the proxy, and the local model server's host and port, each
  already scoped to its port.
* **The boundary therefore rests on the proxy, not on the kernel's address rules.** Dropping the per-address rules
  means the proxy needs its own rule permitting its outbound 443, which by uid rather than by destination, so
  nothing in `iptables` constrains where the proxy may connect. That is a real shift and is stated rather than
  glossed: a defect in the proxy is now a hole in the boundary. It is accepted because the address rules were
  never the constraint they appeared to be, being portless, and because the proxy resolves the name it validated
  rather than trusting the client, so there is no address for a caller to influence.
* **Recorded in this project, spanning both repositories.** The proxy is container mechanism and belongs to the
  kit, and the allowlist it reads belongs to the project. The kit's own change process, its unit 0001, is still
  `draft`, so this follows the shape of 0035 to 0037.

## Non-goals

* Filtering anything but TLS by hostname. Plain HTTP and every other port are denied outright rather than filtered,
  so nothing on the allowlist may be reached except over 443 through the proxy
* Terminating TLS, installing a certificate authority, or inspecting anything inside the encrypted stream
* Per-process, per-user or per-unit policy. The allowlist stays one list for the whole container
* Moving where the allowlist lives or changing its format, beyond dropping the CIDR ranges that only existed to
  work around the address boundary
* Closing any of the residual risks named above as not defended against
* Anything unit 0037 does. That unit depends on this one and is planned separately
* An automated regression suite for `agent.sh` and `entrypoint.sh`, which remains 0033's open item
