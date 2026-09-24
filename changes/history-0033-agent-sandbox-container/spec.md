# 0033 Agent sandbox container

Give Claude Code and OpenCode a container to run in, so that an unattended agent's mistakes are held by a boundary
rather than by a human watching every tool call.

## Context

The three roles already have their instructions, their harnesses and their models: `roles/` holds what each role
does, `opencode.json` and `.claude/agents/` register them in the two harnesses, and the model selection table in
README.md says which model runs which role. What is missing is the place they run.

Today they run on the host as the developer, with the whole home directory in reach. The per-call permission prompts
in `opencode.json` and Claude Code's own prompts are the only thing between an agent and a file it should never
touch, which means the safety of a session depends on a human reading every prompt. That is exactly what has to stop
for the plan, implement and review loop to run unattended.

`ideas/harnass-container.md` asks for the same thing from the other direction: a container that keeps the harness
state, mounts one working directory easily, and can take extra directories on demand.

The container is also the precondition for two later units. Both harnesses in one container over one working
directory is what will let them shell out to each other, and a container is what makes an unattended loop safe to
start. Neither is built here.

## Requirements

1. A single container image, built from files in this repository, runs both Claude Code and OpenCode as a non-root
   user
2. The image runs the project's own suites: `npm ci`, `npm run build`, `npm run test:unit` and `npm test` all pass
   inside it, against the committed `*-chromium-linux.png` baselines, with Playwright's Chromium already present so
   no download is needed at run time
3. The image builds and runs on `linux/amd64` and `linux/arm64` without an explicit `--platform`, so an Apple
   Silicon Mac and the Linux machine get the same container
4. One command from the repository root builds the image if needed and drops the developer into a shell in the
   container, with the working directory mounted read-write at a fixed path and nothing else of the host reachable
5. Additional host directories can be mounted, read-only or read-write, by repeating one flag on that command
6. Every runtime confinement setting is declarative. The only shell logic in the sandbox is the entrypoint, which
   exists because iptables rules cannot be baked into an image
7. The container's filesystem is confined: the root filesystem is read-only, and the agent can write only to the
   mounted working directory, its own home, and the `/tmp` and `/dev/shm` scratch tmpfs. No host path outside the
   mounts is visible
8. The container drops all Linux capabilities except the three the entrypoint needs: `NET_ADMIN` to install the
   firewall, and `SETUID`/`SETGID` to drop from root to the agent user afterwards. The agent process and everything
   it runs have an empty capability set. `no-new-privileges` is set, and configurable memory and CPU limits default
   to values that leave the host usable
9. Network egress is denied by default. Only the addresses that the hosts and CIDR ranges named in a checked-in
   allowlist resolve to, or lie within, are reachable, plus the host gateway address on the port the local model
   server listens on. The allowlist covers what the two harnesses, the toolchain and the project's own pages need to
   reach, and nothing more. This is an address boundary, not a hostname boundary: any TLS host that happens to be
   served from an already-permitted address, for instance a second service behind the same CDN edge, is also
   reachable, and requirement 10's proof only checks the addresses, not which hostname was asked for
10. The firewall proves itself at start-up: the container fails to start if a host outside the allowlist does not
    resolve to an address the firewall then blocks, or if an allowlisted host is not reachable at its resolved
    address
11. Both harness versions are pinned in one place in `agent/Dockerfile`, and neither harness updates itself at
    launch. A single documented command rebuilds the image at new versions, and README.md gives the two steps: which
    lines to edit and which command to run
12. Harness credentials and state persist across container runs without any host dotfile being mounted
13. The agent inside the container commits as the developer, with the same name and email as on the host
14. README.md documents the sandbox: what it is for, the command, how to mount extra directories, how to change the
    allowlist, how to update the harness versions, and what does not work inside it
15. Nothing about how the site is built, tested or deployed changes. The sandbox is additive

## Decisions

* **Docker, not a virtual machine or a language-level sandbox.** It is the one option that is turnkey and identical
  on macOS and Linux and needs nothing on the host but Docker itself. Anthropic ships a reference dev container for
  exactly this purpose, so the hardening pattern is documented rather than invented here. A virtual machine gives a
  stronger boundary and costs setup on both platforms; a language-level sandbox does not confine the shell commands
  an agent runs, which is where the risk is.
* **Docker Sandboxes (`sbx`) evaluated and not adopted.** Docker's own microVM agent sandbox does out of the box the
  parallel git-worktree branching this unit leaves as a non-goal, and its microVM is a stronger boundary than a
  container. It was rejected for the plan, implement and review loop on three counts. It has no OpenCode template,
  and the implementer and reviewer both run under OpenCode with local and non-Anthropic models. Its local-model
  support is experimental and does not address reaching a model server on the host from a microVM, which is how the
  implementer's primary model runs. And its configuration, the network policy and the agent image, lives in the
  developer's Docker install rather than in checked-in files, so it neither travels between machines nor pins a
  harness version, both of which requirements 11 and the repository's own rules demand. The strengths are real and
  the tool is young, so the later parallel-instance unit should re-evaluate `sbx` and Dagger's `container-use`,
  which already solve that problem, before hand-building it, and should recheck whether OpenCode and host-model
  support have landed.
* **Debian, from the `node:26` image, rather than Alpine.** `tests/e2e/callouts.spec.ts-snapshots/` holds committed
  pixel baselines, and `task-012` put the `*-chromium-linux.png` set in git deliberately so a checkout on either
  platform has something to compare against. Those baselines came from Playwright's own Chromium build, which is
  glibc-linked and supported only on Debian and Ubuntu. Alpine has no Playwright browser build, so it would mean
  installing the distribution's Chromium and pointing Playwright at it, which renders differently and fails those
  baselines. The official `node:26` image is Debian already, so this is also the smaller image definition. One side
  effect is worth having: inside the container macOS reports as `linux`, so a sandboxed run on either machine
  compares against the same committed baselines.
* **One shared container, not one per agent.** Claude Code and OpenCode are to be able to delegate to each other,
  which requires them to see the same filesystem and to be able to invoke each other's binaries. The cost is
  accepted and named here: running both on the same task and diffing the results does not work in this shape,
  because two agents sharing a working directory do not produce two independent implementations. That experiment is
  a separate mode and a separate unit, and it is a non-goal below.
* **When delegation is built, it is a shell-out rather than an MCP bridge.** Both harnesses already expose the three
  roles as subagents in `.claude/agents/` and in the `agent` block of `opencode.json`, and both have a headless
  invocation. Shelling out reuses all of that and adds no component to maintain against two harness release
  cadences. An MCP bridge buys a typed call and response and better auditing, which is worth having once there is
  evidence that untyped delegation is going wrong. It is not built now and it is not foreclosed. The decision is
  recorded here so that the later unit inherits it rather than reopening it.
* **Compose holds the configuration and one entrypoint holds the logic.** Everything about how the container runs,
  meaning the read-only root filesystem, the tmpfs mounts, the capability set, `no-new-privileges`, the resource
  limits, the volumes, the host gateway and the allowlist, is declarative in `agent/compose.yml`, where a wrong
  value is visible rather than buried in shell arguments. The firewall cannot follow it there: a build captures
  filesystem layers, while iptables rules are kernel state in a network namespace that does not exist until the
  container is run, and the build container has no `NET_ADMIN` to set them with. So the firewall runs at start-up,
  and `agent/entrypoint.sh` is the one script with logic.
* **`agent.sh` survives only as a thin wrapper.** Compose cannot take an ad-hoc extra mount per invocation, which is
  requirement 5, so the wrapper translates repeated mount flags and the working directory into what Compose needs,
  and carries the rebuild flag. It holds no confinement setting of its own.
* **Harness versions are pinned and auto-update is off.** Two `ARG` lines at the top of `agent/Dockerfile` name the
  exact versions, and each harness's auto-updater is disabled explicitly rather than left to fail against the
  firewall. The pins live in the Dockerfile rather than as Compose build arguments because that is where the install
  happens and where a reader looks for it, and stating a version in two files is one more thing to drift. An agent
  running unattended for hours should not silently change underneath the developer, and a reproducible container is
  what makes a bad run attributable. Because nothing self-updates, the harnesses are installed globally as root,
  which the read-only root filesystem then protects. The cost, that the container drifts behind the host until it is
  rebuilt, is accepted, and requirement 11 makes the rebuild a documented step rather than folklore.
* **Named volumes for harness state rather than bind-mounted host dotfiles.** Mounting `~/.claude` would give the
  container the developer's Claude Code history for every project on the machine, which is the opposite of confining
  it, and it would not work on macOS anyway, where Claude Code keeps its credentials in the login keychain that a
  container cannot read. Volumes mean authenticating once inside the container, with the credential surviving every
  later run, identically on both platforms. `~/.gitconfig` is the exception and is mounted read-only, because
  requirement 13 needs the developer's identity and that file holds nothing else worth protecting.
* **The mounted directory is a full checkout, not a `git worktree`.** A worktree's `.git` is a file pointing at an
  absolute path inside the parent repository, which does not resolve inside the container unless the parent is also
  mounted at that same absolute path. That aliasing is a trap for an unattended agent. The two documented options
  are mounting this repository directly and working on a branch, or mounting a separate clone of it and pushing
  branches back, which is the stronger isolation of the two.
* **The entrypoint keeps three capabilities; the agent keeps none.** The entrypoint runs as root and needs
  `NET_ADMIN` to install the firewall and `SETUID`/`SETGID` to drop to the unprivileged agent user at the end,
  because changing uid away from 0 is itself a privileged operation. This is the same start-as-root, drop-to-a-user
  pattern the official database and web-server images use, and Docker's own default capability set includes all
  three for it. The drop clears the process's effective, permitted, inheritable and ambient capability sets, so the
  agent and its children run with nothing; with `no-new-privileges` set and no `sudo` or setuid-root binary in the
  image, the entries left in the bounding set cannot be reached. The agent therefore cannot alter the rules that
  confine it. An earlier design used an `ipset` for the allowlist, which forced a fourth capability (`NET_RAW`,
  which iptables' set match wants); plain per-address rules removed it.
* **What the allowlist contains.** The hosts the harnesses and the toolchain reach: the Anthropic and OpenAI APIs;
  `models.dev`, which OpenCode reads its model catalog from at start-up and cannot run without; the npm registry;
  and GitHub, meaning its web, API and tarball or release hosts. Plus what the site's own pages load: Google's
  font-serving address ranges, because `www/style.css` imports three faces from Google Fonts and the end-to-end
  tests wait for every page's `load` event. Google's font edge rotates through addresses faster than one start-up
  DNS lookup tracks, so its allowlist entries are CIDR ranges, Google's front-end serving blocks only and not GCP
  customer space, rather than hostnames. Every entry is annotated in `agent/compose.yml` with what needs it. Adding
  a harness, a model provider or a dependency host is an allowlist edit and a rebuild, and README.md says so. The
  narrower alternative, allowlisting only the harness APIs, was rejected because it leaves `npm ci` and the test
  suite broken inside the container, which requirement 2 forbids.
* **The firewall is an address boundary, and that is stated plainly rather than fixed.** `iptables` filters on
  destination IP and port; it cannot see the TLS SNI hostname a connection asks for, so once an address is
  permitted, every hostname that happens to resolve there is reachable, not only the one named in the allowlist.
  Reviewing this unit reproduced it: allowlisting `api.anthropic.com` also reached `claude.ai`,
  `platform.claude.com` and `console.anthropic.com`, none of them listed, because all four are served from the same
  address. The Google Fonts CIDR ranges are the sharpest version of this, since they were added precisely to cover
  a whole rotating edge rather than one address, which means they admit whatever else that edge serves. The
  narrower, more correct fix is a small SNI-filtering proxy that reads the ClientHello hostname before a connection
  is allowed through, needing no certificate or TLS interception since SNI is sent in the clear; that was
  considered and declined for this unit; it is new infrastructure, with a new failure mode and its own testing
  burden, for a residual risk the checked-in allowlist already bounds to specific providers rather than the open
  internet. Requirements 9 and 10 say the real boundary is addresses, not hostnames, so the promise made is the one
  kept, and README.md and `agent/compose.yml` say the same for whoever edits the allowlist next.
* **No automated regression suite covers `agent.sh` or `agent/entrypoint.sh`, and that stands.** This has been
  raised three times across two reviews, twice after catching a real defect in this exact untested logic: a
  hostname-sharing bypass and, separately, a root uid or gid surviving the privilege drop when the wrapper is run
  with `sudo`. It is not resolved by requirement 15's non-goal that this unit does not change "the test suites",
  which is about `tests/unit/` and `tests/e2e/`, the site's own suites, and was never an exemption for logic this
  unit adds; citing it that way was a mistake in an earlier pass. The honest reason is scope and cost: trustworthy
  coverage means building and running the actual image with `NET_ADMIN` and root, which is a kind of test this
  repository has never had, since `npm test` and `npm run test:unit` both run without Docker today, and a
  Docker-dependent suite would need to live apart from them or force Docker onto every future run of either. That
  is real, separate test infrastructure, and after weighing it a third time the decision is still not to build it
  now. The risk is named, not hidden: manual review is the only regression check on this logic between reviews, and
  a future change to the firewall, the privilege drop or the wrapper can reintroduce either defect without a test
  failing to say so.
* **The build refuses a root uid or gid.** `agent.sh` forwards the caller's uid and gid into the image build so a
  Linux bind mount is writable without a host `chown`. Invoking it with `sudo`, a foreseeable move when Docker is
  not in the caller's group, makes both 0; the Dockerfile would then create an "agent" account that is root, and
  the entrypoint's drop from root to root is a no-op that leaves the firewall capabilities in place, exactly what
  requirement 1's non-root user and requirement 8's empty agent capability set forbid. `agent/Dockerfile` refuses to
  build when either value is 0, which is the one enforcement point that catches every invocation path, including a
  direct `docker compose build` that bypasses `agent.sh` entirely; `agent.sh` also refuses early with a clearer
  message naming the fix (join the `docker` group, do not `sudo`); and `agent/entrypoint.sh` refuses to drop into
  an `agent` account it finds at uid or gid 0, in case a future image is ever built some other way.
* **The firewall verifies itself and refuses to start otherwise.** A silently broken allowlist is worse than no
  allowlist, because it produces exactly the false confidence that lets the developer stop watching. Start-up is the
  last moment at which a human is still present to notice, so that is where the check belongs and why it is fatal
  rather than a warning. What counts as proof matters as much as the check running at all: a first version treated
  any `curl` failure against the canary as proof of blocking, which a canary that simply failed to resolve also
  satisfied, so a broken DNS lookup could certify a wide-open firewall. The canary is now resolved first, on its
  own, and a resolution failure is a setup error, not proof; the resolved address is then tested with a raw TCP
  connect that has to hang until killed, which is what a `DROP` policy actually produces and what a refusal, a TLS
  failure or a reachable server do not, so only that specific signature counts as blocked.
* **`ideas/harnass-container.md` is deleted by this unit.** The idea has become a change unit, and keeping both
  leaves two records of one intent to drift apart.

## Non-goals

* Delegation between the two harnesses. The container makes it possible; nothing here wires it up
* The unattended plan, implement and review loop. This unit produces a shell that a human starts
* The compare-two-implementations mode, with a container and a working directory per agent. When it is built it
  should first evaluate Docker Sandboxes (`sbx`) and Dagger's `container-use`, which already do this, rather than
  hand-build it (see the decision above)
* A `devcontainer.json` or any IDE integration
* Automating the creation of worktrees or clones
* Running `npm run image` inside the container. It shells out to the macOS `sips` tool in `src/image.ts`, which does
  not exist on Linux. Image import stays a host task, and README.md says so
* Any change to the site generator, the CDK application, the test suites, or the deployment script
* Secrets beyond the harness credentials in their volumes. No AWS credentials enter the container, so `./deploy.sh`
  is not runnable inside it
