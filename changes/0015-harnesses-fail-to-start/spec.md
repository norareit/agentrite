# 0015 Neither harness starts in a new sandbox

## Context

The sandbox image installs Claude Code and OpenCode at the versions `container/Dockerfile` pins, and
`container/compose.yml` confines the container they run in. On kit 2.1.0, in a sandbox whose home volume holds no
login, neither harness starts: OpenCode cannot load its own rendering library, and Claude Code cannot reach a host it
contacts before anything else. A project that sets the sandbox up on a new machine therefore gets a sandbox in which
no agent can run.

It was found in Norareit, on the MacBook, the first time `./agent.sh` was started there after the move to 2.1.0. The
`container/` directory is the same in 2.0.0 and 2.1.0, so the release did not cause it.

## Observed behavior

In Norareit on kit 2.1.0, macOS with Docker Desktop, Docker Engine 24.0.7, Compose 2.23.3, with the image built on
2026-10-02 holding Claude Code 2.1.266 and OpenCode 1.18.30. The start-up self-check passes and the shell opens.

`opencode` stops at once:

```
Error: Unexpected error

Failed to initialize OpenTUI render library: Failed to open library "/tmp/.dcdfd7d77ced3c3f-00000002.so":
/tmp/.dcdfd7d77ced3c3f-00000002.so: failed to map segment from shared object
```

`claude` shows its welcome banner and then:

```
Unable to connect to Anthropic services

Failed to connect to platform.claude.com: UNKNOWN_CERTIFICATE_VERIFICATION_ERROR
```

Once each harness was let past its failure, as described under the root cause, the proxy's log showed two more
refusals at start-up. Neither stopped a harness from reaching its first screen:

* `models.opencode.ai`, three times, while OpenCode started
* `raw.githubusercontent.com`, once, while Claude Code started

## Expected behavior

In a new sandbox both harnesses start, and no host that a harness needs in order to start or to load its model
catalog is refused.

## Steps to reproduce

In a project on kit 2.1.0, with a home volume that holds no login for either harness:

1. `./agent.sh`
2. `opencode`, and observe the OpenTUI error
3. `claude`, and observe the `platform.claude.com` error
4. `grep refused /run/egress-proxy.log`, and observe `refused platform.claude.com: not allowlisted`

## Root cause

All of it was observed in Norareit's sandbox on the machine above.

**OpenCode.** `container/compose.yml` lists `/tmp` under `tmpfs` with no options, and Docker mounts such a tmpfs
`noexec`. In the container `/proc/mounts` shows `tmpfs /tmp tmpfs rw,nosuid,nodev,noexec,relatime`. A copy of
`/bin/true` placed in `/tmp` fails with `Permission denied`, and the same copy placed in `/home/agent` runs. OpenCode
1.18.30 writes its rendering library to `/tmp` as a hidden `.so` file and loads it from there, and a shared object
cannot be mapped for execution from a `noexec` mount.

**Claude Code.** The egress proxy refuses `platform.claude.com`, which is in neither allowlist. Its log records
`refused platform.claude.com: not allowlisted`, and `curl https://platform.claude.com` in the sandbox fails with
`tlsv1 unrecognized name`, which is the alert the proxy sends in place of a ServerHello. Claude Code 2.1.266 reports
that alert as a certificate error. Norareit's `history-0039-sni-filtering-proxy` records that the host was reachable
before it, only because it is served from the same address as `api.anthropic.com`; the hostname boundary closed that,
and no unit added the host back.

**`models.opencode.ai`.** OpenCode 1.18.30 contacts it at start-up, and the proxy refuses it for the same reason. The
OpenCode binary names the host only as `https://models.opencode.ai`, with no path. The human identifies it as where
OpenCode fetches its model catalog, and needs that catalog.

**`raw.githubusercontent.com`.** Claude Code 2.1.266 contacts it once at start-up, and the proxy refuses it. It is
not needed by either harness to start. Searching both installed binaries for the host found:

* In Claude Code, one URL it would fetch: `anthropics/claude-code/refs/heads/main/CHANGELOG.md`, its own release
  notes. The only other is the identifier of a JSON schema from the `ajv` library, which OpenCode's binary holds too
* In OpenCode, the tree-sitter query files, `highlights.scm` and the like, of each language it highlights, most from
  `nvim-treesitter/nvim-treesitter`. The grammars they go with are `.wasm` files, all on `github.com`, as release
  downloads. OpenTUI's documentation says it stores what it downloads under its data path and reuses it, and a pull
  request to OpenCode, closed unmerged, describes these downloads as made "at runtime when a file is written".
  OpenCode did not contact the host in the runs here, in which no file was shown

**Checked.** With `/tmp` mounted `exec` and the three hosts admitted, through an extra Compose file passed after the
project's and changing no file of the kit or of Norareit, `/proc/mounts` shows `tmpfs /tmp tmpfs
rw,nosuid,nodev,relatime`, OpenCode initializes its interface, Claude Code reaches its first-run theme screen, and
the proxy's log holds no refusal but the canary's. Each harness ran for about twenty seconds.

**Not established.**

* What a refused `models.opencode.ai` breaks in OpenCode. No prompt was sent in either harness
* What OpenCode shows when it cannot fetch a language's grammar and queries: plain text, or an error
* Whether logging in to Claude Code contacts a host beyond these. No login was carried out
* Whether Claude Code with a saved login contacts `platform.claude.com` at all, which would explain a sandbox that
  was logged in before `history-0039` still starting

## Fix description

`container/compose.yml` mounts the `/tmp` tmpfs with `exec`, and its `KIT_ALLOWLIST` gains `platform.claude.com` and
`models.opencode.ai`. The README names the kit's hosts in two places, and both gain the two.

## Requirements

1. In a sandbox started from the kit's base configuration, `/tmp` is a tmpfs mounted without `noexec` and still with
   `nosuid` and `nodev`, and a file the agent writes there can be executed. The comment beside the mount says why
2. `KIT_ALLOWLIST` holds `platform.claude.com` and `models.opencode.ai`, each under a comment naming the harness that
   contacts it, and does not hold `raw.githubusercontent.com`
3. A unit test fails on `container/compose.yml` as it is in 2.1.0 and passes on the fix. It checks that the `/tmp`
   tmpfs entry carries `exec` and that `KIT_ALLOWLIST` holds the two hosts
4. In a project's rebuilt sandbox, with a home volume that holds no login, `opencode` and `claude` each reach their
   first screen, and the proxy's log records no refusal during either start-up but the canary's and that of
   `raw.githubusercontent.com`
5. The README names the two hosts wherever it lists the hosts the kit admits itself

## Decisions

* **`/tmp` becomes executable, rather than moving the harness's temporary directory.** Setting `TMPDIR` to a
  directory in the home volume was tried and also lets OpenCode start. It was rejected: OpenCode leaves its unpacked
  libraries behind on every start, and the home volume is never cleared, while a tmpfs goes with the container.
  `noexec` on `/tmp` protects little in this container, since the agent can already write and execute files in
  `/work` and in `/home/agent`. `nosuid` and `nodev` stay, which is what Docker leaves when `exec` is the only
  option given
* **`/run` and `/dev/shm` stay `noexec`.** Nothing was observed to need otherwise
* **The two hosts go in `KIT_ALLOWLIST`, not in the harness hosts `init` writes.** 0010 put `models.dev` in the
  project's generated allowlist, as a host the OpenCode harness needs. That route does not fix this bug: `init`
  writes `agent/compose.project.yml` once and `refresh` does not touch it, so a host added there reaches no existing
  project. The Dockerfile installs both harnesses in every image, at versions the kit pins, and what a pinned
  version contacts at start-up changes with the pin. That makes these hosts the kit's own, and 0010's rule for those
  is that a release that needs a new host adds it with no change to any project. The price is that a project using
  only one harness admits the other's host
* **`models.opencode.ai` is admitted on the human's word that OpenCode needs it.** No failure was demonstrated here,
  but the human needs the model catalog it serves, and the host serves nothing but OpenCode's own data
* **`raw.githubusercontent.com` is not admitted.** The human set the rule: a host is admitted only once it is known
  to be necessary. It is not. Claude Code uses it for its release notes, and starts without them. OpenCode uses it
  for syntax highlighting, and would also need `github.com` for the grammars, which the kit does not admit either.
  Against that, the host serves the files of every public repository, so admitting it in the kit would let every
  project's sandbox read them, including a project that does not admit GitHub. A project that wants OpenCode's
  highlighting lists both hosts in its own `ALLOWLIST`, where that choice belongs. The first draft of this unit
  admitted the host, before this was looked up
* **The test reads `container/compose.yml` as text.** The kit has no YAML parser among its dependencies, and
  `tests/agentrite-init.test.mjs` already checks a compose file's allowlist the same way

This unit loosens the sandbox, so its boundary is stated. The adversary and the supported usage are those of
`history-0039-sni-filtering-proxy` and the README's "Agent sandbox" section, unchanged: an agent that may be induced
to reach hosts the project did not choose. This unit widens what the kit chooses for every project by two hosts,
and lets the agent execute from one more place it could already write. It defends against nothing new.

## Non-goals

* Moving `models.dev` into `KIT_ALLOWLIST`, or changing what `init` writes for a harness
* Changing the pinned versions of Claude Code or OpenCode
* OpenCode's syntax highlighting in a sandbox, and Claude Code's release notes. Both stay refused by the kit
* Any host a login, or a harness in use after start-up, turns out to need. The plan's verification looks for one,
  and a host found there is a new unit
* Releasing the fix, and moving Norareit to that release
