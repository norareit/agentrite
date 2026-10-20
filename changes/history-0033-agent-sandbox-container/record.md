---
kind: feature
status: implemented
timestamp: 2026-09-09T14:08:36Z
---

# 0033 Agent sandbox container

## Log

- 2026-09-09T14:08:36Z [human] requested a containerized environment for Claude Code and OpenCode, so that the plan,
  implement and review loop can run without a human watching every tool call. Brought a prior design conversation
  as input: Docker as the mechanism, Anthropic's reference dev container as the pattern, hardening by non-root user,
  dropped capabilities, a read-only root filesystem and an egress allowlist
- 2026-09-09T14:08:36Z [Claude Code, anthropic/claude-opus-5] scoped the unit with the human. Four decisions were
  put to them and answered: this unit builds the sandbox only, with delegation and the unattended loop as later
  units; both harnesses share one container over one working directory rather than one container each; delegation,
  when it is built, will be a shell-out rather than an MCP bridge; and network egress is default-deny with an
  allowlist
- 2026-09-09T14:08:36Z [human] asked why Debian, whether so much of the configuration had to be shell rather than
  declarative, and how the harnesses get updated given that the image pins a version while both self-update on
  launch
- 2026-09-09T14:08:36Z [Claude Code, anthropic/claude-opus-5] answered and revised the design on all three points.
  Debian is not preference: the committed `*-chromium-linux.png` baselines from `task-012` came from Playwright's
  own glibc-linked Chromium, which Alpine cannot run, so an Alpine image would fail the visual suite. The firewall
  genuinely cannot move into the Dockerfile, since iptables rules are kernel state in a network namespace created at
  run time and the build container has no `NET_ADMIN`, but everything else could and did: all runtime settings moved
  into `agent/compose.yml`, and `agent.sh` shrank to a wrapper that exists only because Compose cannot take an
  ad-hoc mount per invocation. On versions, the original design had a latent defect, in that a global install under
  a read-only root filesystem would make both harnesses' self-update fail at every launch
- 2026-09-09T14:08:36Z [human] chose pinned versions with auto-update disabled and a documented rebuild, over
  letting the harnesses update themselves, and chose the Compose plus thin wrapper structure over Compose alone or a
  script alone
- 2026-09-09T14:08:36Z [human] asked whether README.md would say how to update the harnesses in the Dockerfile
- 2026-09-09T14:08:36Z [Claude Code, anthropic/claude-opus-5] made it explicit. Requirement 11 now names the two
  README.md steps, the plan has a documentation task for them and a verification that following the README alone
  bumps a version, and the pins moved from Compose build arguments into two `ARG` lines in `agent/Dockerfile`, so
  that the version is stated where the install happens and in one place only
- 2026-09-09T14:08:36Z [Claude Code, anthropic/claude-opus-5] `spec.md` and `plan.md` written, status `draft`,
  awaiting approval. Fifteen requirements, twelve decisions and eight non-goals; eight ordered task groups and seven
  commit points
- 2026-09-09T14:15:51Z [human] approved the spec and plan as written; status moves to `approved`
- 2026-09-09T14:15:51Z [Claude Code, anthropic/claude-sonnet-5] took the implementer role and moved the unit to
  `in-progress`. Docker is present on this host but the daemon socket is not reachable by the developer's user;
  awaiting a socket ACL grant before the image can be built
- 2026-09-09T16:40:00Z [Claude Code, anthropic/claude-sonnet-5] socket access granted. Task group 1: wrote
  `agent/Dockerfile`, `agent/compose.yml` (minimal) and a repo-root `.dockerignore`. First build hung for 20 minutes
  inside `npx playwright install --with-deps chromium`: Playwright's out-of-process browser downloader deadlocks
  under BuildKit after the Chrome zip reaches 100 percent. Reworked the image to copy `/ms-playwright` from
  `mcr.microsoft.com/playwright:v<version>-jammy` in a build stage and run only `playwright install-deps chromium`
  (apt, no download) on the node base. Added `.dockerignore` (not in the plan Files list) because the build context
  is otherwise the whole 450 MB working tree, most of it `cdk/node_modules`; and `ARG PLAYWRIGHT_VERSION` so the
  browser image tag has one source, noted in a comment as needing to match `package-lock.json`
- 2026-09-09T16:40:00Z [Claude Code, anthropic/claude-sonnet-5] plan task 5 said "named volumes for Claude Code's
  and OpenCode's state" (plural). Adjusted the task to one named volume mounted at `/home/agent`: the read-only root
  filesystem already forces the home to be a persistent volume for the agent to have anywhere to write, and one home
  volume then covers both harnesses' state and the npm cache without hard-coding per-harness paths that shift between
  releases. Requirement 12 is unaffected
- 2026-09-09T17:05:00Z [Claude Code, anthropic/claude-sonnet-5] task groups 1 and 2 done. Image builds on
  `linux/amd64` with no `--platform`; `claude --version` reports 2.1.266, `opencode --version` reports 1.18.30, the
  shell runs as `agent` (uid 1000). arm64 was checked by inspection only, not built: every base is multi-arch
  (`node:26-bookworm`, `mcr.microsoft.com/playwright`), no step downloads an arch-specific artifact, and QEMU
  emulation on this amd64 host would not be a faithful test. The Apple Silicon machine is the real check. Inside the
  container against `..:/work` and `shm_size: 1gb`: `npm ci` clean, `npm run build` clean, `npm run test:unit` 56/56
  pass, `npm test` 86/86 pass including the `callouts.spec.ts` visual comparisons against the committed
  `*-chromium-linux.png` baselines. Chromium runs with its default namespace sandbox under Docker's default
  capabilities; `--no-sandbox` was not needed and cannot be set anyway without editing `playwright.config.ts`. Task 2
  said to settle the sandbox flags here: none are needed, and the only knob that mattered was `/dev/shm` at 1G.
  `lsof` is absent in the image so `npm test`'s port-kill step prints "lsof: not found", harmlessly swallowed by its
  own `|| true`
- 2026-09-09T17:35:00Z [Claude Code, anthropic/claude-sonnet-5] task group 3 done. `agent/entrypoint.sh` runs as
  root (the Dockerfile no longer ends `USER agent`), installs an iptables default-deny OUTPUT policy with loopback,
  conntrack ESTABLISHED/RELATED and DNS allowed, resolves each allowlisted host into an ipset and accepts TCP to it,
  allows the resolved model-server gateway on its port only, drops IPv6 entirely, then verifies: the canary
  (example.com) must be blocked and every allowlisted host plus the probe must be reachable, any failure aborting the
  start. Then it drops to the agent user with `setpriv`. Verified via `docker compose run`: canary blocked, all
  allowlisted hosts reachable, agent has an empty capability set, `iptables -F` as agent is EPERM, no `sudo`. A
  bogus allowlist entry makes the container exit 1 at start-up (covers the task-8 "break one entry" check via the
  resolve step). Three deviations logged below
- 2026-09-09T17:35:00Z [Claude Code, anthropic/claude-sonnet-5] deviation: added `models.dev` to the allowlist
  beyond the plan's "Anthropic and OpenAI APIs, npm registry, GitHub". OpenCode fetches its model catalog from
  `models.dev` at start-up; without it OpenCode is unusable, which would defeat the unit. Annotated in
  `agent/compose.yml`. The planner should confirm this belongs in the spec's allowlist
- 2026-09-09T17:35:00Z [Claude Code, anthropic/claude-sonnet-5] deviation: the self-check tolerates the model
  server being unreachable (it only warns), rather than failing the start. Requirement 10 fails the start when an
  allowlisted host is unreachable; the model-server gateway is a special allow, not an allowlist host, and treating
  a stopped local model as a fatal start error would make the sandbox unusable whenever the model is not running.
  The resolve of `host.docker.internal` is still required
- 2026-09-09T17:35:00Z [Claude Code, anthropic/claude-sonnet-5] observation, not a code change: on this host the
  model server is not reachable from a container at all. `host.docker.internal` maps to the default-bridge gateway
  172.17.0.1, and the host's `ufw` default-deny drops the container's SYN to it (a plain alpine container cannot
  reach it either). This is a host-config prerequisite, not a repo matter: the dev machine needs a `ufw` rule
  allowing the Docker bridge subnets to the model-server port. README's sandbox section should state this. Raised
  for the developer
- 2026-09-09T19:20:00Z [Claude Code, anthropic/claude-sonnet-5] task group 4 done. `agent/compose.yml` now sets
  `read_only: true` with tmpfs `/tmp` and `/run`, `cap_drop: ALL`, `cap_add: [NET_ADMIN, SETUID, SETGID]`,
  `no-new-privileges:true`, `mem_limit` 8g, `cpus` 6, `pids_limit` 4096, and the `agent-home` named volume. Under
  confinement: `npm ci`, `npm run build`, `npm run test:unit` (56/56) and `npm test` (86/86) all pass; writes to
  `/`, `/usr` and `/opt` are denied. Three findings, all logged below
- 2026-09-09T19:20:00Z [Claude Code, anthropic/claude-sonnet-5] deviation from the decision "NET_ADMIN is the one
  capability kept": the entrypoint also needs `SETUID` and `SETGID` to drop from root to the agent user (setresuid
  from uid 0 still needs CAP_SETUID). The first design used an ipset for the allowlist, which forced a fourth
  capability (`NET_RAW`, for iptables' ipset match); replaced with plain per-address `-d <ip> -j ACCEPT` rules so
  ipset and its capability are gone. Net result: three capabilities, and the agent process still ends with an empty
  effective set that no-new-privileges keeps empty. The spec's "one capability" wording needs the planner's
  attention
- 2026-09-09T19:20:00Z [Claude Code, anthropic/claude-sonnet-5] deviation: `www/style.css` `@import`s three faces
  from Google Fonts, and under the egress allowlist the e2e page loads never fired `load` and timed out. Adding
  `fonts.googleapis.com`/`fonts.gstatic.com` as hostnames was not enough: Google's font edge rotates through a wide
  address range faster than one start-up resolve tracks, so three or four navigations timed out per run at random.
  Resolved by teaching the entrypoint to accept CIDR entries in the allowlist and adding Google's thirteen
  front-end serving ranges (not GCP customer space). This widens the allowlist well beyond the plan's "Anthropic
  and OpenAI APIs, npm registry, GitHub"; the planner should decide whether the spec should name Google Fonts, or
  whether the site should stop importing web fonts
- 2026-09-09T19:20:00Z [Claude Code, anthropic/claude-sonnet-5] note: the firewall resolves allowlisted hostnames
  once at start-up. For CDN-fronted hosts (`api.anthropic.com`, `registry.npmjs.org`, `models.dev`) whose address
  can rotate during a long session, a request to a newly-rotated address would be dropped until the container is
  restarted. This matches Anthropic's own reference dev-container firewall. The Google ranges are handled by CIDR;
  the others are left as-is and noted for the README
- 2026-09-09T19:55:00Z [Claude Code, anthropic/claude-sonnet-5] task groups 5 and 6 done. compose.yml mounts the
  developer's `~/.gitconfig` read-only at `/etc/gitconfig` (the lowest-precedence git config), so the identity is
  supplied while the agent's own `~/.gitconfig` stays writable. A first attempt mounted it directly at
  `/home/agent/.gitconfig`, which then broke `git config --global` inside with "Device or resource busy". Verified:
  `git config user.name/user.email`
  and a real `git commit` inside the container report `stef <stef.klaassen@gmail.com>`; a file written under
  `~/.claude` in one container is present in the next (the persistence mechanism; the interactive Claude Code OAuth
  login is left for the developer to run once on the real machine); `claude --version` and `opencode --version`
  return instantly with `DISABLE_AUTOUPDATER`, `DISABLE_UPDATES` and the OpenCode `autoupdate:false` config in
  place, and the update hosts are not on the allowlist. `agent.sh` written: `--rebuild`, `--workdir DIR`,
  repeatable `--mount HOST[:ro]` (mounts at `/mnt/<basename>`), command pass-through. Verified the repo lands at
  `/work`, an extra `:ro` mount is read-only, an extra mount without `:ro` is writable, host paths outside the
  mounts (`/home/stef`, the host `/tmp`) are invisible, and the wrapper carries no docker security flag of its own
  (the agent process still has an empty capability set through it)
- 2026-09-09T19:55:00Z [Claude Code, anthropic/claude-sonnet-5] note: the start-up self-check flaked twice on
  `github.com`/`example.com` during this session (transient), each time recovering on a rerun. The check already
  retries three times per host; a persistently flaky network would still block the container from starting, which
  is the intended fail-closed behavior but worth the developer knowing
- 2026-09-09T20:30:00Z [Claude Code, anthropic/claude-sonnet-5] task group 7 done. README.md gains an "Agent
  sandbox" section (purpose, `./agent.sh`, `--workdir`, the worktree caveat, `--mount`, editing the allowlist, the
  ufw note for the local model server, the two-step harness update naming the `ARG` lines, and what does not work
  inside) and an `agent/` line under "Project structure"; AGENTS.md gains one line under "In this repository". No
  existing documentation was removed or condensed. `ideas/harnass-container.md` deleted. No em dashes, American
  English, and every added line is within 120 characters in the changed documents
- 2026-09-09T20:30:00Z [Claude Code, anthropic/claude-sonnet-5] task group 8. Following README's update step
  alone (edit `CLAUDE_CODE_VERSION` to 2.1.265, `./agent.sh --rebuild`) the container reported `2.1.265 (Claude
  Code)`; reverted to 2.1.266. A deliberately broken allowlist entry (`api.anthropic.invalid`) makes the container
  exit 1 at start-up with `FATAL: cannot resolve allowlisted host`, not start. On the host on the final tree
  (Node 24 in the agent's own shell, not the developer's machine): `npm run test:unit` 56/56, `PORT=3100 npm test`
  86/86. Inside the sandbox on the final tree via `./agent.sh`: `npm ci` clean, `npm run test:unit` 56/56,
  `PORT=3100 npm test` 86/86. `git config --global` inside works after the `/etc/gitconfig` fix. Every task in
  plan.md traces to a spec requirement and every requirement to a task
- 2026-09-09T20:30:00Z [Claude Code, anthropic/claude-sonnet-5] open items for the human, all logged above: the
  firewall keeps three capabilities (NET_ADMIN, SETUID, SETGID) rather than the spec decision's one; the allowlist
  is wider than the plan named (`models.dev` for OpenCode, Google's font ranges for the test suite). Both are
  forced by reality but contradict the spec as written, so a spec amendment or a follow-up planning pass is needed
  before this unit is marked implemented. The interactive harness logins and a host-machine suite run are the
  developer's to do
- 2026-09-09T20:45:00Z [Claude Code, anthropic/claude-sonnet-5] final suite run on the committed tree (18307cd)
  via `./agent.sh`: `npm ci` clean, `npm run build` clean, `npm run test:unit` 56/56, `PORT=3100 npm test` 86/86,
  including the visual baselines. `npm run check:changes` passes. All plan tasks, verification items and commit
  points are ticked. Status stays `in-progress` pending review and the human's call on the two spec conflicts noted
  above
- 2026-09-09T21:10:00Z [human] reviewed the capability question in detail and directed that `spec.md` and
  `plan.md` be revised to match the implementation on both open points: the firewall keeps `NET_ADMIN`, `SETUID`
  and `SETGID` (not one capability), and the allowlist covers `models.dev` and Google's font-serving CIDR ranges
  (not only the harness APIs, npm and GitHub)
- 2026-09-09T21:10:00Z [Claude Code, anthropic/claude-sonnet-5] took the planner role at the human's direction and
  revised the frozen-once-implemented documents while the unit is still `in-progress`. `spec.md`: requirement 8 now
  names the three capabilities and the empty agent set; requirement 9 now says the allowlist holds hosts and
  address ranges and covers the harnesses, toolchain and the site's pages; the "one capability" decision is
  rewritten to explain the three and the `ipset`/`NET_RAW` history; a new decision "What the allowlist contains"
  records the hosts, the Google Fonts ranges and the rejected narrower alternative. `plan.md`: tasks 3 and 4 and
  the `entrypoint.sh` file note updated to match. Traceability still holds both ways. The earlier implementer
  deviation entries above are the record of what was found; these two entries are its resolution
- 2026-09-09T15:47:16Z [OpenCode, openai/gpt-6-astra] reviewed unit `0033-agent-sandbox-container` at commit
  `02401d1929edd316aae99a128b2dae0b36605642`, against merge base
  `f706fcc631e3a354f0ac758c4cb129efd5e4a342`. Returned findings C1, C2, S1, P1, C3 and P2; complete findings and
  verification details are in `.reviews/0033-agent-sandbox-container/2026-09-09T154523Z-gpt-6-astra.md`.
  Independently ran host and sandbox unit suites (56/56 each) and end-to-end suites (86/86 each), sandbox rebuild,
  `npm ci`, build, and `npm run check:changes`. Could not verify native arm64 execution, real OAuth login and
  authenticated persistence, authenticated harness startup/update traffic, local model-server responses, or actual
  external IPv6 routing. Did not repeat file-writing persistence/mount probes, a real commit, or the historical
  version-bump/revert experiment. Host-shell tests used Node 24.14.1; sandbox tests used Node 26.8.1. The task tool
  was unavailable, so the review ran directly. Preserved the pre-existing `AGENTS.md` worktree change.
- 2026-09-09T21:40:00Z [human] accepted findings C1, C2, S1 and P2 for this unit and set aside P1 and C3.
- 2026-09-09T21:40:00Z [Claude Code, anthropic/claude-sonnet-5] applied the four accepted findings.
  - C1 (accepted): `agent/Dockerfile` now creates the `agent` group and user with `groupadd -o` / `useradd -o`, so
    a host uid or gid that already exists in the base image (macOS gid 20 is Debian's `dialout`) no longer fails
    the build. Reproduced the original failure (`groupadd: GID '20' already exists`, exit 4) and confirmed the
    fixed build succeeds with `501:20` and that the privilege drop still lands on `uid=501 gid=20`
  - C2 (accepted): `agent/entrypoint.sh` no longer swallows IPv6 firewall errors. The lockdown runs without
    `|| true`; if it fails and the container has an IPv6 address or default route the start aborts
    (`FATAL: the container has IPv6 connectivity but the IPv6 firewall could not be installed`), and if it fails
    with no IPv6 present it logs and continues. Verified all three paths by fault injection, including the
    reviewer's `ip6tables` override
  - S1 (accepted): `spec.md` requirement 7 now states that the agent can write only the working directory, its
    home, `/tmp` and `/dev/shm`; `plan.md` task 4 and the matching verification item say the same. Checked from
    inside: `/`, `/usr`, `/opt`, `/etc` are read-only to the agent, `/tmp` and `/dev/shm` are mode-1777 tmpfs, and
    `/run` is a tmpfs but root-owned mode 755, so the agent cannot write it either. Requirement 7 does not claim
    `/run` as writable
  - P2 (accepted): `.dockerignore` is now in the `plan.md` Files list and has a task under group 1
  - P1 (set aside): the "second container run is still authenticated" verification item stays as written; the
    record already states that only file persistence under `~/.claude` was tested and the interactive login is the
    developer's to run
  - C3 (set aside): no automated tests were added for `agent.sh` or `agent/entrypoint.sh`. The firewall and
    privilege-drop paths need root, `NET_ADMIN` and a live container to exercise and the repository has no shell
    test harness; coverage comes from the start-up self-check and the fault-injection checks recorded here. This
    is a conscious deviation from AGENTS.md's "unit test all newly added logic" for the human and reviewer to weigh
- 2026-09-09T22:05:00Z [Claude Code, anthropic/claude-sonnet-5] suite run on the committed tree (`2ee19e2`) after
  the review fixes, via `./agent.sh`: `npm ci` clean, `npm run build` clean, `npm run test:unit` 56/56,
  `PORT=3100 npm test` 86/86 including the visual baselines; `npm run check:changes` passes. `agent/entrypoint.sh`
  now logs `IPv6 egress denied` on the normal path. The pre-existing `AGENTS.md:188` indentation change is still
  unrelated to this unit and left unstaged
- 2026-09-09T22:40:00Z [human] raised Docker Sandboxes (`sbx`) as a possible replacement, since it does automatic
  git-worktree branching for parallel agents. After reviewing what it supports, decided to keep this unit's
  container: `sbx` has no OpenCode template (the implementer and reviewer harness), its local-model support is
  experimental and does not cover a host model server, and its configuration is not checked into the project. Asked
  for the evaluation to be captured so it is not re-asked.
- 2026-09-09T22:40:00Z [Claude Code, anthropic/claude-sonnet-5] planner pass at the human's direction: added a
  decision "Docker Sandboxes (`sbx`) evaluated and not adopted" to `spec.md` with the three reasons, and extended
  the compare-two-implementations non-goal to say the later unit should evaluate `sbx` and Dagger's `container-use`
  before hand-building it. Research behind the decision: `sbx` is microVM-based (own kernel), `sbx run <agent>
  --branch auto` gives each agent its own worktree/branch with a `sandbox-<name>` git remote for review, network is
  a host proxy with Open/Balanced/Locked-Down presets, and it does not read `~/.claude`. It supports Claude Code,
  Copilot, Codex and Gemini; Linux x86_64 with KVM, macOS Apple Silicon and Windows 11. Dagger's `container-use`
  is the container-not-microVM equivalent: a bare repo plus per-environment worktree outside any container, copied
  in, changes flowing back through a `container-use` git remote
- 2026-09-20T15:11:51Z [OpenCode, openai/gpt-5.6-sol] re-reviewed unit `0033-agent-sandbox-container` at commit
  `243c5ce76e07c5968517b2215cc98e9e814f76ff`, against merge base
  `f706fcc631e3a354f0ac758c4cb129efd5e4a342`. Returned findings S1, C1 and P1; complete findings and verification
  details are in `.reviews/0033-agent-sandbox-container/2026-09-20T151151Z-gpt-5-6-sol-rereview.md`. Independently
  rebuilt the amd64 sandbox, ran its install, build, 56 unit tests and 86 end-to-end tests, and ran the host's 56
  unit tests, 86 end-to-end tests and change check. Could not verify native arm64 execution, real OAuth or
  authenticated persistence, authenticated harness requests or update traffic, local model-server responses, or
  actual external IPv6 routing. Host tests used Node 24.14.1; the sandbox supplied Node 26.
- 2026-09-20T21:07:46Z [OpenCode, openai/gpt-5.6-sol] independently re-reviewed unit
  `0033-agent-sandbox-container` at commit `243c5ce76e07c5968517b2215cc98e9e814f76ff`, against merge base
  `f706fcc631e3a354f0ac758c4cb129efd5e4a342`. Returned findings S1, C1, C2 and P1; complete findings and
  verification details are in
  `.reviews/0033-agent-sandbox-container/2026-09-20T210746Z-gpt-5-6-sol-independent-rereview.md`. Rebuilt the amd64
  sandbox; ran its install, build, 56 unit tests and 86 end-to-end tests; ran the host's 56 unit tests, 86 end-to-end
  tests and change check; and exercised shared-IP, root-ID, macOS-ID, IPv6-failure and confinement paths. Could not
  verify native arm64 execution, real OAuth or authenticated persistence, authenticated harness requests or update
  traffic, local model-server responses, actual external IPv6 routing, or the historical version-bump experiment.
  Host tests used Node 24.14.1; sandbox tests used Node 26.9.0.
- 2026-09-20T21:15:00Z [human] reviewed the four findings. Asked for an explanation of `SETUID`/`SETGID` before
  accepting the capability decision recorded earlier (unrelated to this review round, carried over from the
  question that prompted it); on this round's findings, chose to document the address-boundary limitation (S1)
  rather than build an SNI-filtering proxy, and to decline automated regression coverage (C2) a third time rather
  than build a Docker-dependent test suite, in both cases as a recorded decision rather than a fix. Confirmed C1
  (the sudo/root bug) and P1 (the overclaimed authentication verification) should be corrected.
- 2026-09-20T21:27:45Z [Claude Code, anthropic/claude-sonnet-5] took the implementer role to apply the third
  review round's findings and the human's decisions on them, added as plan task group 9.
  - C1 (accepted, fixed): reproduced independently first (`AGENT_UID=0 AGENT_GID=0` build produced `uid=0(root)`,
    and after the entrypoint's drop the process was still `uid=0` with `CapEff=0x10c0`, `iptables -L` succeeding).
    Fixed at three points: `agent/Dockerfile` refuses to build when `AGENT_UID` or `AGENT_GID` is `0`, which is the
    one enforcement point that catches every invocation path including a direct `docker compose build`; `agent.sh`
    refuses early with a message naming `sudo` as the mistake and group membership as the fix; and
    `agent/entrypoint.sh` refuses to drop into an `agent` account it finds at uid or gid `0`, as a defense in depth
    against a future image built some other way. Verified: the Dockerfile build fails with the intended message at
    `AGENT_UID=0`/`AGENT_GID=0`; `agent.sh`'s own check fires before any Docker call, with a simulated root `id`;
    the entrypoint's check logic was verified in isolation; and the normal 1000:1000 path still starts cleanly and
    drops to an empty-capability `agent`
  - S1 (accepted, documented rather than fixed): reproduced independently first (allowlisting `api.anthropic.com`,
    resolved to `160.79.104.10`, also left `claude.ai` at 403, `platform.claude.com` at 200 and
    `console.anthropic.com` at 301 reachable, none of them listed). This is inherent to filtering by destination
    address, which is what `iptables` can see; the TLS hostname is not visible to it. Requirements 9 and 10 in
    `spec.md` now say plainly that the boundary is addresses, not hostnames, and a new decision "The firewall is an
    address boundary" explains why, names the SNI-filtering proxy that would close it, and records that it was
    considered and declined for this unit. `agent/compose.yml`'s `ALLOWLIST` comment and README.md's allowlist
    section say the same for whoever edits the allowlist next. `plan.md`'s matching verification item was reworded
    to not imply hostname-level proof
  - C2 (declined a third time, recorded): a new decision "No automated regression suite covers `agent.sh` or
    `agent/entrypoint.sh`, and that stands" replaces the informal record-only "set aside" from the second review
    round. It names the real reason (a trustworthy test needs `NET_ADMIN` and root in a live container, which is a
    kind of test this repository has never had and would need to live apart from `npm test`/`npm run test:unit`,
    both of which run without Docker today), corrects the earlier misreading of requirement 15's "test suites"
    non-goal (that non-goal is about `tests/unit/` and `tests/e2e/`, not an exemption for this unit's own new
    logic), and names the risk left open: manual review is the only regression check on this logic between reviews
  - P1 (accepted, fixed): `plan.md`'s authentication task and its Verification item both claimed a container was
    "still authenticated" when only a file written under `~/.claude` had been shown to persist. Reworded both to
    say exactly that: named-volume file persistence was tested, a real login, credential refresh and an
    authenticated restart were not, and are the developer's to perform once on the real machine
- 2026-09-20T21:27:45Z [Claude Code, anthropic/claude-sonnet-5] suite run after the fixes, via `./agent.sh` and on
  the host: sandbox `npm ci`, `npm run build`, `npm run test:unit` (56/56) and `PORT=3100 npm test` (86/86) all
  pass, and the normal-path root-drop sanity check reports `uid=1000(agent)` and `CapEff` empty; host
  `npm run test:unit` (56/56) and `PORT=3200 npm test` (86/86) pass
- 2026-09-20T21:40:00Z [Claude Code, anthropic/claude-sonnet-5] on the committed tree (`278fc26`), a sandbox start
  failed closed after all three reachability attempts to `api.github.com` timed out, matching the already-recorded
  availability cost of the startup check; a manual `curl` from the host to `api.github.com` at the same moment
  returned 200, so this was transient. Rebuilt nothing, just retried: `npm ci`, `npm run test:unit` (56/56) and
  `PORT=3100 npm test` (86/86) all passed cleanly on the same commit
- 2026-09-20T21:48:42Z [OpenCode, openai/gpt-5.6-sol] independently re-reviewed unit
  `0033-agent-sandbox-container` at commit `dd2de689d70b5840abf5828a955a11fd3ec0f314`, against merge base
  `f706fcc631e3a354f0ac758c4cb129efd5e4a342`. Returned findings S1, C1, P1, C2 and S2; complete findings and
  verification details are in
  `.reviews/0033-agent-sandbox-container/2026-09-20T214842Z-gpt-5-6-sol-independent-rereview-2.md`. Rebuilt the
  amd64 sandbox; ran its install, build, 56 unit tests and 86 end-to-end tests; ran the host's 56 unit tests, 86
  end-to-end tests and change check; and exercised address sharing, root-ID guards, capabilities, named-volume
  persistence, and firewall false-positive paths. Could not verify native arm64 execution, actual passworded `sudo`,
  real OAuth or authenticated persistence, authenticated harness requests or updater traffic, a local model-server
  response, actual external IPv6 routing, or the historical version-bump experiment. Host tests used Node 24.14.1;
  sandbox tests used Node 26.9.0. Preserved the pre-existing `ideas/roles-tuning-loop.md` worktree modification.
- 2026-09-20T23:52:41Z [human] reviewed the five findings. Directed: fix S1 and P1; for S2, remove the empty file
  from the branch history, not just from a later commit; dismiss C2 (the Dockerfile's leading-zero build-arg check)
  as accepted but not worth fixing; and confirmed C1 (no automated regression suite) needs no new action, since it
  is the same finding round three already declined.
- 2026-09-20T23:52:41Z [Claude Code, anthropic/claude-sonnet-5] took the implementer role to apply the fourth
  review round's findings and the human's decisions on them, added as plan task group 10.
  - S1 (accepted, fixed): reproduced independently first with the reviewer's own repro
    (`FIREWALL_CANARY=review-canary-does-not-exist.invalid`): `curl`'s DNS failure was indistinguishable from a
    firewall block, and the entrypoint declared the firewall verified and started anyway. Rewrote `blocked()` in
    `agent/entrypoint.sh` to resolve the canary first (a resolution failure now dies with a clear message, not a
    false pass), then test the resolved address with a raw TCP `/dev/tcp` connect wrapped in `timeout 6`, which
    only a `DROP` policy's hang-until-killed signature satisfies (`timeout` exits 124); a refusal, a TLS failure or
    a reachable server all return before that and are no longer mistaken for a block. Verified three cases: the
    normal canary (`example.com`) is still correctly found blocked; the unresolvable canary now dies with
    `firewall canary ... does not resolve; nothing to prove blocked` and the container exits 1 instead of starting;
    and a genuinely reachable, allowlisted host used as the canary (`api.anthropic.com`) is still correctly found
    *not* blocked, dying with the original `is reachable but not allowlisted` message, confirming the rewritten
    check is not simply always returning blocked
  - P1 (accepted, fixed): `plan.md` task 3's start-up-verification bullet and the matching `## Verification` item
    both said only "exit non-zero if ... reachable", which the weak implementation satisfied. Reworded both to name
    the actual proof: a TCP connect that hangs until killed, not any `curl` failure, and an unresolvable canary
    aborting the start rather than passing by default
  - S2 (accepted, fixed by rewriting history): confirmed `ideas/roles-tuning-loop.md` entered the branch as a
    committed empty file in `278fc26`, an accident of that commit's `git add` sweeping up an already-staged,
    unrelated file from the developer's own working tree; see that commit's log entry, which did not catch it at
    the time. Removed at the human's direction from the branch's history entirely, not just forward: backed up the
    developer's real uncommitted note in that path byte for byte, made a local safety branch
    (`backup-before-history-scrub-<epoch>`, not pushed), stashed all other uncommitted work, ran
    `git filter-branch --index-filter 'git rm --cached --ignore-unmatch ideas/roles-tuning-loop.md'` over
    `f706fcc..HEAD`, then restored the developer's note as an untracked file exactly as it was before. Only the two
    commits whose tree actually changed got new hashes, since this branch was never pushed and nothing else
    referenced it: `278fc26` is now `8352a8e`, `dd2de68` is now `d32a626`; every earlier commit kept its original
    hash unchanged. `git log --all -- ideas/roles-tuning-loop.md` no longer finds the path on this branch's history
  - C2 (accepted, dismissed): confirmed the reproduction (`AGENT_UID=00 AGENT_GID=00` builds an image with a
    literal root `agent` account, because the Dockerfile compares build args as strings and `groupadd`/`useradd`
    read them numerically). Left as is, at the human's direction: the entrypoint's own defense-in-depth check reads
    the account back with `id -u agent`/`id -g agent`, which always returns the canonical `0` regardless of how it
    was spelled, so that account is still refused at start-up and the property the unit promises, that the agent
    never runs as root, still holds through the second layer. The Dockerfile's own check is narrower than it reads,
    and that gap is now on the record rather than silently present
  - C1 (no new action): the same "no automated regression suite for `agent.sh` or `agent/entrypoint.sh`" finding
    already declined as its own spec decision in round three. Nothing here changes that decision or its reasoning
- 2026-09-20T23:52:41Z [Claude Code, anthropic/claude-sonnet-5] suite run after the fourth-round fixes and the
  history rewrite, via `./agent.sh` and on the host: sandbox `npm ci`, `npm run test:unit` (56/56) and
  `PORT=3100 npm test` (86/86) all pass; host `npm run test:unit` (56/56) and `PORT=3200 npm test` (86/86) pass;
  `npm run check:changes` passes against the rewritten history
- 2026-09-21T00:05:00Z [Claude Code, anthropic/claude-sonnet-5] final suite run on the committed tree (`ae26fbd`)
  via `./agent.sh`: `npm ci`, `npm run test:unit` (56/56) and `PORT=3100 npm test` (86/86) all pass.
  `git status`/`git log` confirm `ideas/roles-tuning-loop.md` is untracked with the developer's original content
  intact and absent from every commit on this branch. A local safety branch,
  `backup-before-history-scrub-<epoch>`, and filter-branch's own `refs/original/...` backup ref both still point
  at the pre-rewrite history; neither is pushed, and both are left for the developer to delete once satisfied
- 2026-09-21T00:08:36Z [human] confirmed the unit is done and directed marking it `implemented` and landing it on
  `master` by fast-forward.
- 2026-09-21T00:08:36Z [Claude Code, anthropic/claude-sonnet-5] confirmed every task, verification item and
  commit point in `plan.md` is ticked (`grep -c '^\s*- \[ \]' plan.md` is 0) and moved `status` to `implemented`.
  `master` had advanced two commits since this branch's merge base (`e56303b` "Add a post on harness telemetry",
  `9541266` its sitemap update), neither touching a file this unit changed, so `master` was not an ancestor of this
  branch's tip and a literal fast-forward was not yet possible. Rebased the branch onto `master` with a plain
  `git rebase master`; all 15 commits replayed with no conflicts, and `git merge-base --is-ancestor master HEAD`
  then confirmed a fast-forward was possible. The untracked `ideas/roles-tuning-loop.md` was unaffected
- 2026-09-21T00:08:36Z [Claude Code, anthropic/claude-sonnet-5] on the rebased tree, `npm run test:unit` still
  passed (56/56 sandbox), but `PORT=3100 npm test` now showed 2 failures neither in this unit's diff nor caused by
  it: `categories.spec.ts:3` and `categories.spec.ts:19` both expect 4 published tech posts and now see 5, because
  `e56303b`'s `harness-telemetry.md` is a fifth published `tech` post and the test's counts were never updated for
  it. Confirmed this is pre-existing on `master` itself, unrelated to the rebase or to anything this unit touches.
  The human, informed of this, chose to land the unit anyway and defer the test fix to a separate bug unit later,
  since `master` already carried the failure independently of this branch
- 2026-09-21T00:08:36Z [Claude Code, anthropic/claude-sonnet-5] fast-forwarded `master` to this branch's rebased
  tip. `master` now carries all of unit 0033 plus the pre-existing `categories.spec.ts` mismatch noted above, which
  this unit did not introduce and does not fix

## Amendments
