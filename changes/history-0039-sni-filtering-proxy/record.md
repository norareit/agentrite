---
kind: feature
status: implemented
timestamp: 2026-09-23T11:17:58Z
---

# 0039 SNI-filtering egress proxy

## Log

- 2026-09-23T11:17:58Z [human] asked, while weighing where to host the kit's package for unit 0037, whether the
  sandbox's allowlist was not hostname-based, having understood it as DNS filtering rather than address filtering
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] confirmed it is address filtering, from
  `container/entrypoint.sh`, which resolves each allowlisted name once at start-up and adds an `iptables` rule per
  address, and from the comment in `agent/compose.project.yml` that already says so. Unit 0033 recorded the same
  thing deliberately, under "The firewall is an address boundary", naming the SNI-filtering proxy as the narrower
  fix and declining it as new infrastructure with a new failure mode and its own testing burden. Unit 0035 carried
  it forward as a non-goal, so it has been a recorded open item since, never a planned one
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] reported that the open item has now cost something
  in three consecutive units: the thirteen Google Fonts CIDR ranges exist only to work around it, a rotating edge
  aborted a sandbox start during 0035 with `FATAL: allowlisted host api.github.com is not reachable`, and 0037
  cannot host a package tarball behind a CDN without admitting that CDN's whole address space
- 2026-09-23T11:17:58Z [human] chose to build the proxy, and for unit 0037 to become the subdomain solution that
  depends on it
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] took the planner role. `spec.md` and `plan.md`
  written, status `draft`, awaiting approval. Nine requirements, six decisions and seven non-goals; nine kit tasks,
  two here, nine verification items and six commit points. The spec states an adversary and a supported usage,
  which the planner instructions require of a unit making a containment claim, so that a reviewer can tell a real
  hole from a hostile input the unit never promised to survive. Two residual risks are named there rather than
  closed: exfiltration through a host that is allowlisted, and DNS tunnelling through the permitted resolver
- 2026-09-23T11:17:58Z [Claude Code, anthropic/claude-opus-5] chose transparent redirection with ClientHello
  parsing over a CONNECT proxy, which would have needed no parsing at all. A CONNECT proxy depends on every client
  honouring proxy environment variables, and the container runs two harnesses, npm, git and whatever a unit
  invokes; Node's `fetch` ignores those variables by default, which alone would cut the harnesses off from their
  APIs. Redirection works whatever the client does, and a client it cannot reach fails closed
- 2026-09-23T11:46:36Z [human] rebased the branch onto `master` after 0038 was implemented, and approved the spec
  and plan
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and stopped before the
  first task. The spec contradicts itself. Its decision "Encrypted ClientHello is refused" cannot hold alongside R4
  and R9. Captured on the host with this project's Playwright Chromium: both ClientHellos it sent while loading
  `https://fonts.googleapis.com/` carried extension `0xfe0d` (encrypted_client_hello), which Chromium sends as
  GREASE when it has no ECH config. GREASE is indistinguishable from real ECH by design, so refusing every hello
  that offers ECH refuses every Chromium connection, the font loads with them. Only Chromium was checked; curl
  and Node were not. Changing the decision is a spec change, so the unit goes back to planning and the status
  stays `draft` until the human decides
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5-5] raised a second, plan-level problem at the same
  time. The plan's proxy task says to "recover its original destination" and forward there. Node has no API for
  `SO_ORIGINAL_DST`, and forwarding there would be unsafe against the stated adversary anyway: an agent could send
  an allowlisted SNI to any address it chose, and a server it controls would ignore the SNI. The proposed
  replacement is for the proxy to resolve the allowed hostname itself and connect to that. This also serves R5,
  because the proxy then resolves at connection time rather than at start-up. Not changed yet; awaiting the human
  together with the ECH decision
- 2026-09-23T11:46:36Z [human] brought both problems back to planning and asked for the spec and plan to be
  corrected
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5] took the planner role again. Both findings accepted;
  the ECH one is a planning error, not an implementation difficulty. The decision "Encrypted ClientHello is
  refused" was written without knowing that Chromium GREASEs the extension on every connection, so it would have
  refused every Chromium hello and failed requirements 4 and 9 the first time the end-to-end suite ran. Replaced
  with judging the outer hostname and not special-casing ECH at all, which is simpler as well as correct: a GREASE
  hello carries the real name, a genuine one carries the provider's public name and is refused because that name
  is not allowlisted
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5] verified the `SO_ORIGINAL_DST` half rather than
  taking it on trust: `node:net` exposes no `getsockopt`, so the original destination is unreachable without a
  native module, which the dependency-free decision rules out. The security half stands on its own and is the more
  important of the two: forwarding to the client's chosen address would have let the stated adversary present an
  allowlisted name on a connection to a server it controls, which ignores the name, so the boundary would have
  been bypassable by design. Added requirement 10 for it, because it is a property of the boundary rather than an
  implementation detail, and a plan-only note would not have been judged by a reviewer
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5] added requirement 11 for the dedicated proxy user.
  Without it the proxy's own onward connections are caught by the redirect and loop back into it, which is a
  start-up hang rather than a subtle fault, but the exemption is an owner match on a distinct uid and that is a
  property worth stating. The two remaining plan fixes are mechanical: the Dockerfile has to copy the proxy and
  parser, and the blocked-host check has to move off 443, which no longer hangs now that it is redirected
- 2026-09-23T11:46:36Z [Claude Code, anthropic/claude-opus-5] requirements 10 and 11 were appended rather than
  inserted, so that every `(R…)` tag already in `plan.md` keeps its meaning. Status stays `draft`: the spec the
  human approved is not the spec that now exists, so it needs approving again before implementation resumes
- 2026-09-23T11:53:40Z [human] approved the corrected spec and plan. Status `draft` to `approved`, with eleven
  requirements, and implementation unblocked
- 2026-09-23T11:54:37Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role again on the corrected
  unit. Status `approved` to `in-progress`. Kit work is on the kit branch `feature-0039-sni-filtering-proxy`, cut from kit
  `master` at `4087835`. Two gaps noted before starting. The kit and project README tasks still say "the ECH
  refusal", left over from the old decision, so both READMEs will describe the decision as it now stands: the
  outer hostname is judged. And the sandbox only runs a kit that `agent-kit.md` pins, so verifying anything inside
  the container means moving the pin to the kit branch's commit. That is added to the plan as a task
- 2026-09-23T11:57:28Z [Claude Code, anthropic/claude-opus-5-5] wrote `tests/sni.test.mjs` in the kit first and saw it
  fail with the parser module missing, then wrote `container/sni.mjs`. Kit commit `c64ceb9`, "feature-0039 Parse
  the ClientHello hostname". The parser returns one of four verdicts: a hostname, no hostname, incomplete, or
  invalid. Its 25 tests cover hand-built hellos with and without SNI; real hellos from Node's TLS client, with a
  servername and to a bare address; every split point of a hello across TCP segments; one handshake message
  fragmented across three records; ECH, both hand-built and a Chromium hello captured with Playwright 1.59.1 as
  `tests/fixtures/chromium-client-hello.hex`, carrying `0xfe0d` as GREASE and read as `fonts.googleapis.com`; and
  malformed input. Beyond the plan's cases, two ambiguous forms are refused rather than resolved by choosing one
  name: a second server_name extension, and a second host_name in one list. A hello over 16 KiB is refused as
  soon as its declared length arrives. The kit's `npm test` passes, 58 tests, on `c64ceb9`
- 2026-09-23T12:05:06Z [Claude Code, anthropic/claude-opus-5-5] wrote `tests/egress-proxy.test.mjs` in the kit first and
  saw it fail with the module missing, then wrote `container/egress-proxy.mjs`. Kit commit `1e41811`,
  "feature-0039 Filter egress by hostname". The proxy resolves the hostname it validated and never reads the
  client's destination (R10). It tries each IPv4 address in turn and logs one line per decision. A refused host
  gets a fatal `unrecognized_name` alert instead of a bare reset, so the client can say why it failed. Its 12
  tests run against a local upstream with the resolver injected. They cover: byte-identical forwarding in both
  directions with the hello split across writes (R2), case-insensitive matching, the resolver being asked for the
  validated name only, falling through to a second address, refusing a host that is not allowlisted, a subdomain of
  one, a non-TLS connection, a hello that times out, one cut short, a name that does not resolve, and one whose
  addresses all refuse. Two first-run hangs were races in the test helper, not in the proxy: it waited for `close`
  after the proxy had already closed. The kit's `npm test` passes, 70 tests, on `1e41811`. Also checked on the
  host, outside the sandbox, with the proxy allowing only `api.github.com`: curl through it reached GitHub with
  `ssl_verify_result` 0, so the origin's own certificate was validated, and `claude.ai` failed with `tlsv1
  unrecognized name` and a `refused claude.ai: not allowlisted` log line
- 2026-09-23T12:05:06Z [Claude Code, anthropic/claude-opus-5-5] stopped before the entrypoint tasks on a third contradiction
  in the spec. The decision "The address rules stay for everything that is not TLS" keeps the per-address rules on
  every port but 443, and that breaks R1 against the stated adversary. Measured on the host: TLS naming
  `claude.ai`, sent to `api.anthropic.com`'s address `160.79.104.10` on ports 8443 and 2053, completed and got an
  HTTP 403 from claude.ai's edge. So a name that is not allowlisted reached its server through an allowlisted
  address, only not on 443. Plain HTTP to `fonts.googleapis.com`'s address `64.233.167.95` on port 80 with
  `Host: www.google.com` returned 200, so a shared edge routes plain HTTP by Host header as well. The proposed
  replacement drops the per-address rules altogether, which leaves egress as DNS to the resolvers, TCP 443
  through the proxy, and the local model server's port. As far as their annotations say, nothing on this
  project's allowlist needs a port other than 443. Awaiting the human
- 2026-09-23T12:14:00Z [human] brought the third contradiction back to planning
- 2026-09-23T12:14:00Z [Claude Code, anthropic/claude-opus-5] accepted it, and confirmed the mechanism in the tree
  rather than only the measurements. `container/entrypoint.sh:95` installs
  `iptables -A OUTPUT -p tcp -d "$ip" -j ACCEPT` with no `--dport`, so every allowlisted address is open on every
  TCP port, and line 102 does the same for the CIDR ranges, which opens all thirteen Google blocks on every port
  too. Line 109 scopes the model server to its port and line 63 scopes DNS to 53, so the omission is specific to
  the two rules that matter here rather than a convention of the file. The decision "The address rules stay for
  everything that is not TLS" was mine and was wrong: it read as conservative and in fact left the boundary
  bypassable by choosing a port other than 443
- 2026-09-23T12:14:00Z [Claude Code, anthropic/claude-opus-5] replaced that decision with dropping the per-address
  rules altogether, and added requirement 12 naming the egress that remains: DNS to the resolvers, TCP 443 from
  the proxy's user, and the model server's host and port. Checked the allowlist's own annotations first, and
  nothing on it claims a port other than 443, so nothing this project needs is lost. The non-goal that said plain
  HTTP keeps the address boundary now says it is denied outright
- 2026-09-23T12:14:00Z [Claude Code, anthropic/claude-opus-5] recorded the consequence the change carries rather
  than leaving it implicit. Once the per-address rules go, the proxy needs a rule permitting its own outbound 443,
  matched by uid and not by destination, so `iptables` no longer constrains where the proxy may connect and a
  defect in the proxy is a hole in the boundary. That is accepted because the address rules were never the
  constraint they appeared to be, being portless, and because the proxy resolves the name it validated rather than
  trusting the caller. It is written into `spec.md` as its own decision so that a reviewer judges it
- 2026-09-23T12:14:00Z [Claude Code, anthropic/claude-opus-5] added the missing rule as a task, since default-deny
  would otherwise drop the proxy's own connections the moment the per-address rules are removed, and added three
  verification items that reproduce the bypasses from inside the container: TLS to an allowlisted address on 8443
  and 2053 naming a host that is not allowlisted, plain HTTP on 80 with a foreign `Host` header, and an
  `iptables -S OUTPUT` listing carrying no destination address beyond the resolvers and the gateway
- 2026-09-23T12:19:08Z [human] approved the revised spec and plan, with twelve requirements, and told the
  implementer to continue
- 2026-09-23T12:19:08Z [Claude Code, anthropic/claude-opus-5-5] resumed with the entrypoint and Dockerfile. The
  plan names the proxy's account `proxy`. `node:26-bookworm` already has a `proxy` account at uid 13, and the
  agent account is created with `useradd -o` at the host's uid, which may duplicate an existing one. So the image
  gets a dedicated system account named `egress-proxy` instead. It is created after the agent so that useradd
  picks a uid nothing holds, and the build fails if the two uids are equal. The entrypoint checks again at start,
  as it already does against a root agent, because an agent sharing the proxy's uid would inherit its exemption
  from the firewall. The account's purpose is what R11 asks for; only the name differs from the plan
- 2026-09-23T12:19:08Z [Claude Code, anthropic/claude-opus-5-5] the entrypoint now refuses an ALLOWLIST entry
  that is an address or a CIDR range, instead of ignoring it. With no per-address rule left there is nothing
  that could admit one, and silently dropping an entry would leave the allowlist claiming more than it grants.
  The same-address probe (R6) presents `FIREWALL_CANARY` pinned to `FIREWALL_PROBE`'s address with
  `curl --resolve`, so it does not depend on the canary happening to share an address with an allowlisted host.
  It passes only if the request fails and the proxy's log records `refused <canary>: not allowlisted`, because a
  failed request alone can fail for reasons of its own. The proxy logs to `/run/egress-proxy.log`, which the agent
  can read but not write
- 2026-09-23T12:34:07Z [Claude Code, anthropic/claude-opus-5-5] built the entrypoint and Dockerfile side in the kit. Kit commits, in order:
  `cdd7097` "feature-0039 Bound egress by hostname rather than address", then three fixes found by starting the
  sandbox, then `118a3e5` "feature-0039 Document the hostname boundary". The plan's commit points list one
  entrypoint commit. The three fixes follow it as separate commits because each needed a kit commit, a new pin, an
  install and a rebuild before it could be tried in the container:
  `43f95b9` "Check the proxy is running without signalling it". Root in the container holds no `CAP_KILL`, so
  `kill -0` on the proxy's uid failed with EPERM, and a proxy that was running was read as one that had exited.
  The start-up check now looks at `/proc/<pid>`.
  `217bd24` "Keep Docker's resolver rules in the nat table". Flushing the nat table removed the rules that reach
  Docker's embedded resolver at 127.0.0.11, and nothing resolved. The redirect rules are now appended.
  `e175bde` "Admit redirected connections to the proxy". A redirected SYN was dropped by the OUTPUT policy. The
  filter matches `-o` against the interface the packet was first routed to, eth0, not the loopback it is rerouted
  to, so `-o lo` does not admit it. The rule counters showed four SYNs redirected and four dropped by the policy.
  An explicit accept for 127.0.0.1 on the proxy port fixed it
- 2026-09-23T12:34:07Z [Claude Code, anthropic/claude-opus-5-5] one consequence of that last fix, for the verification item on `iptables -S OUTPUT`. Besides the
  resolver and the model server gateway, the listing has one more destination address: 127.0.0.1, port 15443, the
  proxy's own loopback listener. It admits nothing outside the container
- 2026-09-23T12:34:07Z [Claude Code, anthropic/claude-opus-5-5] this project's side: `85f05b1` moves the kit pin to `118a3e5`, a task added to the plan earlier;
  `a8d07ab` removes the thirteen Google Fonts ranges; `f4a93fc` rewrites the README's allowlist section. Between
  the first two commits the pinned kit refuses the CIDR entries still in the allowlist, so the sandbox does not
  start on `85f05b1` alone. The plan's commit points keep them separate. Both README tasks say "the ECH refusal";
  both READMEs describe the decision in the spec as it now stands, which judges the outer hostname
- 2026-09-23T12:34:07Z [Claude Code, anthropic/claude-opus-5-5] verification, inside the sandbox on this machine (Linux, Docker Engine), with the installed kit at
  `e175bde`, whose container payload is byte-identical to `118a3e5`'s (`git diff e175bde 118a3e5` touches only
  `README.md`, which is not installed):
  R6: start-up passed every check, including `example.com` pinned to `api.anthropic.com`'s address being refused.
  R1/R2: as `agent`, `https://api.github.com/` returned 200 with `ssl_verify_result` 0, and `openssl s_client`
  showed `CN = *.github.com` issued by Sectigo, the origin's own certificate. `api.anthropic.com` and `claude.ai`
  both resolved to `160.79.104.10`; the first returned 404 from the API, the second failed with `tlsv1
  unrecognized name` and a `refused claude.ai: not allowlisted` log line.
  R12: TLS naming `claude.ai` at `160.79.104.10` on 8443 and 2053 timed out, where on the host before this unit
  both returned 403. Plain HTTP to a Google Fonts address with `Host: www.google.com` timed out, where it had
  returned 200. `iptables -S OUTPUT` as above.
  R10: `api.github.com` pinned with `--resolve` to a listener the agent ran on the container's own address, port
  443, returned 200 from GitHub; the listener logged no connection, and the proxy logged the connection going to
  `140.82.121.6`. Pinned to `1.1.1.1`, the same.
  R11/R7: the proxy runs as `egress-proxy` (uid 999) with CapPrm and CapEff zero, and the agent's CapInh, CapPrm,
  CapEff and CapAmb are all zero. No capability was added to the compose file. The agent could not write
  `/run/egress-proxy.log` and could not kill the proxy (EPERM).
  R3: after the proxy was killed as its own user, HTTPS to `api.github.com` and `fonts.gstatic.com` failed to
  connect at once. An agent listener on the proxy's port then received only the agent's own redirected
  connection, which went no further.
  R5: 120 requests over about 90 seconds to four edge-served hosts, none failing. The proxy connected to 12
  different addresses for `registry.npmjs.org` and 4 for `objects.githubusercontent.com`, most of them different
  from the one it used at start-up. The two Google font hosts stayed on one address each for that window. Their
  start-up address did differ between two containers started minutes apart. Not checked: whether any of those
  later addresses fell outside what a single start-up resolve would have returned.
  R4/R9: in a fresh container, `npm ci`, `npm run build`, `npm run test:unit` (52 pass) and `PORT=3100 npm test`
  (the change check, then 86 Playwright tests pass, including the visual baselines, which need the web fonts).
  R8: the kit's `npm test` passes, 70 tests, on `118a3e5`
- 2026-09-23T12:35:04Z [Claude Code, anthropic/claude-opus-5-5] ran the suites on the final tree, `6ea142d`, inside the
  sandbox with the kit installed at `118a3e5`: the entrypoint's self-check passed, `npm ci` and `npm run build`
  succeeded, `npm run test:unit` passed 52 tests, and `PORT=3100 npm test` passed the change check and 86
  Playwright tests. Every task in `plan.md` is ticked. Status stays `in-progress` until the review's blocking
  findings are decided. The kit branch `feature-0039-sni-filtering-proxy` is not merged to kit `master`, and the
  pin points at its head, so the kit branch needs merging before this one
- 2026-09-23T12:59:05Z [OpenCode, openai/gpt-6-sol] completed a full review of unit 0039 at project commit
  `c53250285761bed5a2e7d0623a4656eb4bab0871` and pinned kit commit
  `118a3e5759f1f377ba31266aba0dbc53625b501a`. Findings P1, P2, C1 are saved in
  `.reviews/0039-sni-filtering-proxy/2026-09-23-full-c532502.md`. The kit's 70 tests, this project's 52 unit tests,
  and 86 Playwright tests passed locally. Docker access was denied in this shell, so the container's firewall,
  startup probes, and in-sandbox suites could not be independently verified
- 2026-09-23T13:02:43Z [Claude Code, anthropic/claude-opus-5-5] checked the three review findings against the tree, and all three held. None blocks, and all
  three are accepted and applied in `857e46f`, "feature-0039 Apply the review's findings":
  P1, accepted: the plan still named "the ECH refusal" in the file list and in both README tasks, and its
  `iptables -S OUTPUT` criterion did not allow for the 127.0.0.1 accept on the proxy port. All four now describe
  what was built and what the spec decides. Two stale mentions of the same kind, which the review did not name,
  were corrected with them: the file list and the Dockerfile task still called the account `proxy`, where the
  image has `egress-proxy` (logged at 12:19:08Z).
  P2, accepted: `tests/egress-proxy.test.mjs` is now in the file list, has its own test-first task ahead of the
  proxy task, and is named in the commit point for "Filter egress by hostname".
  C1, accepted: the comment on `ALLOWLIST` in the kit's `container/compose.yml` said "hosts and ranges". It now says
  hostnames only and that the entrypoint refuses an address or a range. Kit commit `dc27d56`, "feature-0039 Say
  the allowlist holds hostnames only", which also adds `container/compose.yml` to the plan's file list; the pin
  moves to it in `857e46f`.
  The reviewer could not reach Docker, so the in-sandbox claims were not independently verified. Running Docker in
  this session needs `sg docker`, because the session was started without the `docker` group
- 2026-09-23T13:02:43Z [Claude Code, anthropic/claude-opus-5-5] ran the suites on `857e46f`: the kit's `npm test` passes 70 tests on `dc27d56`. In the sandbox with
  the kit installed at `dc27d56`, the entrypoint's self-check passed, including the same-address probe; `npm ci`
  and `npm run build` succeeded; `npm run test:unit` passed 52 tests; and `PORT=3100 npm test` passed the change
  check and 86 Playwright tests. No finding blocks and every plan task is ticked, so by `process.md` the unit can
  move to `implemented`. That is left to the human, and the kit branch still needs merging to kit `master`
- 2026-09-23T13:06:00Z [OpenCode, openai/gpt-6-sol] completed a delta review of unit 0039 at project commit
  `02d8cbcd6f8feebfce0913e5726a44358523196d` and pinned kit commit
  `dc27d56ccde21a9f7e3432a6a957db18421c2bd9`, against the first review's project commit
  `c53250285761bed5a2e7d0623a4656eb4bab0871` and kit commit
  `118a3e5759f1f377ba31266aba0dbc53625b501a`. P1, P2 and C1 are corrected; there are no new findings.
  Complete findings are in `.reviews/0039-sni-filtering-proxy/2026-09-23-delta-02d8cbc.md`. The kit's 70 tests,
  project's 52 unit tests, and 86 Playwright tests passed locally; the container's entrypoint self-check, 52 unit
  tests, change check, and 86 Playwright tests also passed. The earlier kill-proxy, address-rotation and capability
  probes were not repeated because this delta changes no executable proxy or firewall code
- 2026-09-23T13:08:01Z [human] reported that the re-review passed, and asked for the kit branch and then this branch to be
  fast-forwarded
- 2026-09-23T13:08:01Z [Claude Code, anthropic/claude-opus-5-5] status `in-progress` to `implemented`. The first review's three
  findings did not block and are applied, the re-review found nothing new, and every task in `plan.md` is ticked.
  The kit branch `feature-0039-sni-filtering-proxy` is fast-forwarded to kit `master` at `dc27d56` before this
  branch is merged, so that the pin in `agent-kit.md` names a commit on the kit's `master`

## Amendments
