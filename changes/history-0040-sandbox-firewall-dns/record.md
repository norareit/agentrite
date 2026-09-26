---
kind: bug
status: implemented
timestamp: 2026-09-25T00:54:53Z
---

# 0040 Sandbox firewall blocks its own DNS

## Log

- 2026-09-22T13:01:57Z [Claude Code, anthropic/claude-opus-5] found the defect while probing 0035's harness
  definitions in the sandbox: `./agent.sh` stops with "cannot resolve allowlisted host: api.anthropic.com" on this
  machine, macOS with Docker Desktop and Docker Engine 24.0.7, on every start
- 2026-09-22T13:01:57Z [Claude Code, anthropic/claude-opus-5] reproduced the root cause in the sandbox image with the
  entrypoint bypassed: `dig` answers before the firewall and not after it; a rule accepting UDP port 53 to any
  destination restores it and counts one packet; of three candidate upstreams, only the rule for `192.168.65.7`
  counts a packet. The embedded resolver forwards from inside the container's network namespace, where the default
  `DROP` policy discards the query
- 2026-09-22T13:01:57Z [human] found that `master` lacked 0033 and 0034, which had been fast-forwarded into another
  machine's `master` and not pushed, and pushed it. `master` is now at `e5fb337`
- 2026-09-22T13:01:57Z [Claude Code, anthropic/claude-opus-5] probed the fix in the sandbox image: with a uid 0 owner
  rule and a catch-all rule for UDP port 53, the embedded resolver's forwarded query matched the owner rule and a
  direct query from uid 1000 to `1.1.1.1` matched only the catch-all. Confirmed `no-new-privileges:true` in
  `agent/compose.yml`, so the setuid binaries found in the image cannot raise the agent to uid 0. TCP was not probed
- 2026-09-22T13:01:57Z [Claude Code, anthropic/claude-opus-5] took the planner role. `spec.md` written, status
  `draft`; a single-commit fix, so no `plan.md`. Five requirements, four decisions and four non-goals
- 2026-09-23T13:19:46Z [human] asked for the unit to be renumbered, because its number collided with
  `0036-install-the-agent-kit`, which reached `master` first
- 2026-09-23T13:19:46Z [Claude Code, anthropic/claude-opus-5-5] renumbered it from 0036 to 0040, the next free number, and moved
  it to `changes/0040-sandbox-firewall-dns/` on branch `bugfix-0040-sandbox-firewall-dns`, cut from `master` at
  `9b23c88`. Its documents came from `8e2922a` on `origin/bugfix-0036-sandbox-firewall-dns`, unchanged apart from
  the number in the two headings. The spec predates 0035 and 0039: it names `agent/entrypoint.sh`, which is now
  the kit's `container/entrypoint.sh`, and describes the firewall before 0039 made egress go through the proxy,
  whose own lookups run as the `egress-proxy` user rather than as root. Whether the defect still reproduces on
  macOS with Docker Desktop is not yet checked
- 2026-09-23T14:12:58Z [Claude Code, anthropic/claude-opus-5-5] checked it on macOS with Docker Desktop, Docker
  Engine 24.0.7, with the kit installed at `dc27d56`. It still reproduces: `./agent.sh --rebuild` stops with
  "firewall canary example.com does not resolve", because since 0039 the canary is the first lookup. With the
  entrypoint bypassed on the sandbox's Compose network, `dig` answers before the firewall, not after it, and again
  once the `192.168.65.x` upstreams are allowed; with a uid 0 owner rule and a catch-all, the forwarded query
  matched the owner rule and a direct query from uid 1000 to `1.1.1.1` matched only the catch-all. A plain
  `docker run` on the default bridge does not reproduce it, since `/etc/resolv.conf` there names `192.168.65.7`
- 2026-09-23T14:12:58Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and updated `spec.md` for the
  kit and 0039: the entrypoint is the kit's `container/entrypoint.sh`, the fix is made in the kit repository and
  reaches this project through the pin, the observed failure is the post-0039 one, and the start-up proof in
  requirement 1 is 0039's. Requirements numbered, one added for the pin, and decisions added on 0039's
  requirement 12 and on fixing in the kit. Status stays `draft`
- 2026-09-23T14:14:45Z [human] approved the spec. Status `draft` to `approved`
- 2026-09-23T14:17:45Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role. Status `approved` to
  `in-progress`. Kit work is on the kit branch `bugfix-0040-sandbox-firewall-dns`, cut from kit `master` at
  `dc27d56`. The failing case is the reproduction logged at 2026-09-23T14:12:58Z, on `dc27d56`
- 2026-09-23T14:19:30Z [Claude Code, anthropic/claude-opus-5-5] fixed it in the kit's `container/entrypoint.sh`:
  UDP and TCP port 53 to any destination are accepted only with `-m owner --uid-owner 0`, ahead of the unchanged
  rules for the `/etc/resolv.conf` nameservers, and the comment above them now says the embedded resolver forwards
  from inside the namespace and why the owner rule exists (R4, R5). Kit commit `72d7135`, "bugfix-0040 Admit the
  embedded resolver's forwarded DNS". The kit's `npm test` passes, 70 tests, on `72d7135`. The pin in `agent-kit.md`
  moved to `72d7135` and the kit installed from it (R6). The kit's README says egress is "DNS to its resolvers",
  which the spec's decision on 0039's requirement 12 keeps true, so it is unchanged
- 2026-09-23T14:31:10Z [Claude Code, anthropic/claude-opus-5-5] verified on macOS with Docker Desktop, Docker Engine
  24.0.7, kit at `72d7135`:
  R1: `./agent.sh --rebuild` passed every start-up check (canary blocked, every allowlisted host and the probe
  reachable, `example.com` refused at `api.anthropic.com`'s address) and dropped to the agent user, which is uid
  501, not the uid 1000 the requirement names: `agent.sh` builds the agent with the host's `id -u`, which is 501
  here. Raised for the human, since the spec is not the implementer's to change.
  R2: as the agent, `dig` answered for `api.anthropic.com` and `www.wikipedia.org`, `getent hosts github.com`
  answered, and `dig +tcp` through the embedded resolver answered for `registry.npmjs.org`.
  R3: as the agent, `dig` straight to `1.1.1.1` over UDP and over TCP, and to `8.8.8.8` over UDP, timed out.
  R4: `iptables -S OUTPUT` in a running sandbox lists four port 53 rules: the two uid 0 owner rules and the UDP and
  TCP rules for `127.0.0.11`. Their counters after the checks: uid 0 UDP 26 packets, uid 0 TCP 1, `127.0.0.11`
  none, since loopback is accepted earlier.
  Not checked: DNS from the `egress-proxy` user directly; requirement 1 passing covers it only through the proxy
- 2026-09-23T14:31:10Z [Claude Code, anthropic/claude-opus-5-5] ran the suites. On the host: `npm run test:unit`
  passes, 52 tests, after `npm ci`, since the host's `node_modules` lacked `ts-node`; `npm run check:changes`
  passes. The end-to-end suite was not run: its baselines are Linux ones, so it runs in the sandbox, and there it
  could not install dependencies. Concerns found once the sandbox first started on this machine, none caused by
  or in scope for this unit: git refuses `/work` as "dubious ownership", because Docker Desktop shows the mount
  root as `0:0` while its contents are `501:20`; the `norareit-agent_agent-home` volume is owned by uid 1000 from
  an earlier build, so the uid 501 agent cannot write `~/.npm`; and `npm ci` inside would replace the Mac's own
  `node_modules`, which is the same bind mount. The kit branch is not merged to kit `master`, and the pin points
  at its head, so it needs merging before this branch
- 2026-09-24T23:57:43Z [human] reported that the kit and this project had both moved on, and asked for both branches
  to be checked against their remotes and rebased, and for the spec to be brought up to date in the planner role
- 2026-09-24T23:57:43Z [Claude Code, anthropic/claude-opus-5-5] found 0037 on both `origin/master`s: the kit is now
  the npm package `@ritenoar/agent-kit`, released as immutable tarballs, and this project depends on release 1.0.1
  through `package.json` and `package-lock.json`, with `agent-kit.md` deleted. Release 1.0.1's
  `container/entrypoint.sh` is identical to `dc27d56`'s. Rebased the kit branch onto kit `origin/master` at
  `314070e` without conflict: the kit commit is now `fd3b85e`, and the kit's `npm test` passes, 67 tests, on it.
  Rebased this branch onto `origin/master` at `f6a6f7d`; the one conflict was `agent-kit.md`, deleted there and
  moved here, so the pin change was dropped and the commit that carried it now holds only this record, as
  "bugfix-0040 Record the fix and its verification". R6 as written, and the pin at `72d7135` logged above, no
  longer apply. The fix has not been checked in the sandbox since the rebase
- 2026-09-24T23:58:52Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and updated `spec.md` for 0037:
  the fix reaches this project as a kit patch release, R6 now asks for the dependency on that release with R1 to R4
  holding on it, R1 asks for the unprivileged `agent` user with the host user's uid rather than uid 1000, a
  decision says the kit commit is reviewed and checked from a tarball before the human releases it, and a non-goal
  fences off the other sandbox faults found on this machine. Added `plan.md`, since the fix now spans two
  repositories with a release between them. The kit commit `fd3b85e` already does the plan's two kit tasks; they
  are left unticked for the implementer to confirm. The spec changed after its approval, so the status is back to
  `draft` until the human approves it again
- 2026-09-25T00:08:51Z [human] asked for the kit branch to be pushed, to release it from another machine, then found
  that machine had unpushed kit commits, pushed them, and asked for the kit branch to be rebased again
- 2026-09-25T00:08:51Z [Claude Code, anthropic/claude-opus-5-5] pushed the kit branch `bugfix-0040-sandbox-firewall-dns`
  at `fd3b85e`, then rebased it onto kit `origin/master` at `216b735`, which adds the kit's task-0001, a copy of this
  project's history units into the kit's own `changes/`. No conflict: those commits touch only `changes/`. The kit
  commit is now `6015d6a`, the kit's `npm test` passes, 67 tests, on it, and the branch was force-pushed with a lease
  on `fd3b85e`. The kit now has a `changes/` of its own, which the spec's decision on naming kit commits in this
  record predates. Not yet done, from the plan: the check from a tarball of the kit branch, and the review
- 2026-09-25T00:10:26Z [human] decided the unit stays a Norareit unit: the kit commit keeps its `bugfix-0040` prefix and
  the spec's decision on naming kit commits in this record stands, since it was true when the unit was written. The
  human will copy this unit into the kit's `changes/` with a `history-` prefix, as task-0001 did for the others
- 2026-09-25T00:27:27Z [human] released kit 1.0.2 from another machine, before the plan's check from a tarball and
  before the review, then approved the updated spec and plan. Status `draft` to `approved`
- 2026-09-25T00:27:27Z [Claude Code, anthropic/claude-opus-5-5] confirmed the release: tag `v1.0.2` contains
  `6015d6a` and differs from it only in the version bump, `3e7108e` on the kit branch; the tarball served at
  `https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.2.tgz` has version 1.0.2 and a `container/entrypoint.sh`
  identical to `6015d6a`'s. Kit `master` is still at `216b735`, so the kit branch is not yet merged to it
- 2026-09-25T00:27:27Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role. Status `approved` to
  `in-progress`. Ticked the two kit tasks, done in `6015d6a`, and the release. Removed the two pre-release tasks,
  the check from a tarball and restoring 1.0.1 afterwards, because the release they were meant to guard is already
  made; the checks against 1.0.2 cover the same requirements. Moved the review after those checks, and dropped
  merging the kit branch from the release task, since the release was made without it
- 2026-09-25T00:29:28Z [Claude Code, anthropic/claude-opus-5-5] moved `@ritenoar/agent-kit` to
  `https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.2.tgz` with `npm install`; `package-lock.json` changes only
  in that entry's URL, version and integrity (R6). Verified on macOS with Docker Desktop, Docker Engine 24.0.7, with
  1.0.2 installed, the image rebuilt, and its `/usr/local/bin/entrypoint.sh` identical to 1.0.2's:
  R1: `./agent.sh --rebuild` passed every start-up check (canary blocked, every allowlisted host and the probe
  reachable, `example.com` refused at `api.anthropic.com`'s address) and dropped to the `agent` user, uid 501.
  R2: as the agent, `dig` answered for `api.anthropic.com`, `getent hosts github.com` answered, and `dig +tcp`
  through the embedded resolver answered for `registry.npmjs.org`.
  R3: as the agent, `dig` straight to `1.1.1.1` over UDP and over TCP timed out.
  R4: `iptables -S OUTPUT` in a running sandbox lists four port 53 rules, the two uid 0 owner rules and the UDP and
  TCP rules for `127.0.0.11`; the uid 0 UDP rule had counted 28 packets.
  R5: the comment reads as the plan describes, checked in `6015d6a`.
  The kit's `npm test` passed, 67 tests, on `6015d6a`. On the host, `npm run test:unit` passes, 48 tests, and
  `npm run check:changes` passes. The end-to-end suite was not run, for the reasons logged on 2026-09-23. Not
  checked: DNS from the `egress-proxy` user directly, which R1 covers only through the proxy. The review is still
  to do, so the status stays `in-progress`
- 2026-09-25T00:50:40Z [OpenCode, openai/gpt-5.6-sol] completed a full review of unit
  `0040-sandbox-firewall-dns` at `d0f945c0c225ae2d8852a091a3f69a1d09554e2e`, against merge base
  `f6a6f7ddd880777404708a142842b937e9223654`, including kit commit `6015d6a`. Findings are saved in
  `.reviews/0040-sandbox-firewall-dns/2026-09-25T005040Z-gpt-5.6-sol-full.md`. Finding: P1. Could not verify: nothing
- 2026-09-25T00:54:53Z [human] accepted the review, which returned no blocking findings, and asked for the unit to be
  marked implemented and fast-forwarded to `master`
- 2026-09-25T00:54:53Z [Claude Code, anthropic/claude-opus-5-5] applied P1, non-blocking: the plan's Approach said the
  kit branch was checked from a tarball and reviewed before the release, which did not happen. It now gives the
  order the work took and points to this record for the change. Ticked the review task. The review also closed the
  one item logged as not checked: queries from the `egress-proxy` user, uid 500, through the embedded resolver
  answered over UDP and TCP. Every plan task is ticked and no blocking finding is open. Status `in-progress` to
  `implemented`

## Amendments
