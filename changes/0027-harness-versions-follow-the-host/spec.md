# 0027 The sandbox's harness versions follow the host

## Context

The sandbox image holds Claude Code and OpenCode at versions the kit pins, as the defaults of two build arguments in
`container/Dockerfile`, with self-update switched off in the image. Every release up to 2.3.0 carries the same two
pins, 2.1.266 and 1.18.30. A newer version reaches a sandbox only through a kit release that bumps a pin, followed by
an update and a `--rebuild` in each project.

The human found this in Norareit on 2026-10-04, where the sandbox still had Claude Code 2.1.266 while the host had
2.1.289, and decided: "I think the decision to pin them in the harness is wrong actually. New versions of OpenCode
and Claude Code arrive almost daily. It makes no sense to have to bump the kit each time this happens. Two options:
somehow read the version of the host and pass these along. OR at least verify that override and document it as the
PREFERRED approach. We can still add the bumps in new version everytime (this should probably be added to 'creating
the release' along with the release notes."

The implementer of that session verified the override and proposed doing both options in layers, which the human
accepted as the starting point for this unit:

1. the project's own override, for a project that wants to hold a version
2. the version installed on the host, as the default for a developer who has the harness there
3. the kit's pin, as the fallback for a host without the harness, bumped at each release

The implementer's reason for not stopping at the override: with near-daily releases, an override in a tracked file
only moves the chore from the kit to each project. Bumping the pin at release time is unit 0028's. This unit says
what the pin is for.

### What was found while planning

On Linux with Docker Engine 28.4.0 and Compose 2.39.2, node 24.14.1, in a git worktree of this repository at `master`
(`aa4b8b3`). Every image built had a name of its own, `agentrite-0027-plan` or `agentrite-0027-real`, and was removed
afterwards with the untagged images the builds left. No container, volume or image of the human's was touched, and
nothing was logged in to.

* **The host's commands.** `claude --version` prints `2.1.289 (Claude Code)` and takes 5 ms. `opencode --version`
  prints `1.18.34` and takes 270 to 290 ms. Both exit 0. `npm view` finds both versions on the npm registry, which is
  where the image installs from. OpenCode's registry entry also holds versions such as `0.0.0-dev-202610030456`
* **The override.** The implementer had built the image with 2.1.289 and 1.18.34 given in a third Compose file.
  Repeated here, twice: a third Compose file with `CLAUDE_CODE_VERSION` and `OPENCODE_VERSION` under
  `services.agent.build.args`, over the base file and this repository's project file of `master`, built the kit's
  real image, and `claude --version` and `opencode --version` run in it printed `2.1.288 (Claude Code)` and
  `1.18.33`, and in the second build `2.1.289 (Claude Code)` and `1.18.34`. As in the implementer's check, the
  versions were not written into a project's own `agent/compose.project.yml`
* **How a version reaches the build with the project's value on top.** A build argument in the base Compose file
  whose value is a variable, with the same argument given a literal value in the project's file, resolves to the
  project's value, and to the variable's value when the project's file does not name it. One argument overridden
  leaves the other following the variable. Seen with `docker compose config --format json`, whose output holds the
  image name and each build argument's resolved value
* **A label carries the build argument.** A `LABEL` in the last stage of a Dockerfile, set from a build argument,
  is on the built image, and `docker image inspect --format` prints it in 6 ms. It prints an empty value, and exits
  0, for an image without the label, and exits 1 for an image that does not exist
* **What makes the install layer rerun.** In a Dockerfile shaped like the kit's, a build with unchanged arguments
  ran nothing again: the install step's output was the earlier build's, and the image id was the same. A build
  with changed versions ran the install step again. Going back to the first versions ran nothing: the build cache
  still held that layer, and the image id was the first one's again. So `--rebuild` alone never installs anything
  new, and switching between two version pairs that were both built before costs a cached build
* **What a rebuild costs.** With the kit's real Dockerfile, a build whose versions had not been built before on this
  machine took 10.7 seconds, nearly all of it the install step. The same build with versions that were in the build
  cache took 0.6 seconds. The install step's layer is 587 MB in the existing image, and each rebuild leaves the
  image it replaces behind, untagged
* **A build reaches the network even when everything is cached.** The Dockerfile's `# syntax=` line makes every
  build resolve `docker.io/docker/dockerfile:1` at the registry
* **What a start costs today.** One `docker compose config --images`, 33 ms, and one `docker image inspect`, 6 ms,
  before `docker compose run`
* **The environment a wrapper may be run from.** Claude Code exports variables named `CLAUDE_CODE_...` into the
  shells it starts, and agents run the wrapper from such shells
* **The login label of 0023.** The host's OpenCode 1.18.34 binary still holds the string
  `ChatGPT Pro/Plus (headless)`
* **Node on the host.** Until 0017 the wrapper read Compose's merged configuration with `node`, on the grounds that
  the host has node for npm already. The code was removed with the check it served, not because of node

Not established:

* Docker Desktop for macOS, and any Docker or Compose version but the ones above
* That either harness, at the versions this host has today, starts in the sandbox, logs in or answers a prompt with
  the kit's allowlist alone. Only `--version` was run in the image. Requirement 12 looks
* That every version a host can have is on the npm registry. Both of today's are
* What a harness does with a home volume that a newer version of it wrote
* How long the install step takes on another network

## Requirements

1. For each harness on its own, the version the sandbox image is built with is the first of these that exists:
   the value the project's `agent/compose.project.yml` gives under `services.agent.build.args`, as
   `CLAUDE_CODE_VERSION` or `OPENCODE_VERSION`; the version the harness's command on the host reports; the kit's
   pin
2. The host's version of Claude Code is what `claude --version` prints, and of OpenCode what `opencode --version`
   prints, for the command the wrapper finds on its `PATH`. It is the first word of the first line of standard
   output, and it counts only when the command exits 0 and that word is a version: three numbers separated by
   dots, optionally followed by a hyphen and a pre-release part of letters, digits, dots and hyphens. The command is
   given no input, and its standard error is not shown
3. When the command is not on the `PATH`, the kit's pin is used and nothing is said. When it is there but exits
   non-zero or prints something that is not a version, the kit's pin is used and the wrapper says so in one line on
   standard error, naming the command
4. The kit's pin of each harness is the default of its build argument in `container/Dockerfile`, written there
   once, and nowhere else in what ships
5. The image records the two versions it was built with, as the labels `com.ritenoar.agentrite.claude-code-version`
   and `com.ritenoar.agentrite.opencode-version`
6. A start without `--rebuild`, with an image whose two labels equal the two versions of requirement 1, builds
   nothing. When either differs, the wrapper builds the image before it runs, with no flag. Before that build it
   prints, on standard error, one line for each harness that differs: the harness, the version the image holds or
   that it records none, the version it will be built with, and which of the three sources of requirement 1 that
   version comes from
7. An image built before this unit, which has neither label, is rebuilt at the first start, by requirement 6
8. `--rebuild` builds whatever the labels say, and a missing image is built, both as before. When a build fails,
   the wrapper exits non-zero with the build's own error and runs nothing. It does not fall back to the image that
   exists
9. A value the caller's environment already holds for a variable the wrapper uses to hand a version to Compose is
   not used. The three sources of requirement 1 are the only ones
10. Nothing else about the sandbox changes. Self-update stays switched off in the image, for both harnesses, as it
    is today. The allowlist, the mounts, the capabilities, the entrypoint and the proxy are untouched. `init` and
    `refresh` write what they wrote, the package holds the same files, and a project needs no edit to a file of its
    own to move to the release that holds this
11. The suite, which runs no Docker, holds requirements 1 to 3 and 6 to 9 by running the wrapper with a `docker`,
    a `claude` and an `opencode` of its own, and holds requirements 4 and 5 and the base Compose file's part by
    reading the files. No test depends on which harnesses the host that runs the suite has, or at which version
12. The behavior is checked for real on a host with Docker, through the working copy's wrapper, under a Compose
    project, image and home volume of the check's own, which are removed afterwards. What was seen is in the record,
    with the Docker and Compose versions and the harness versions of the host:
    * a first start builds, and `claude --version` and `opencode --version` in the sandbox print the host's
      versions
    * a second start builds nothing
    * with a `claude` first on the `PATH` that prints another released version, a start prints the line of
      requirement 6, builds, and the sandbox holds that version; with one that prints no version, the line of
      requirement 3, and the sandbox holds the kit's pin
    * with a version given in the project's Compose file, by an edit that is not committed, the sandbox holds that
      version whatever the host has
    * an image built from `master`'s Dockerfile under the check's name is rebuilt at the next start
    * with the host's versions of that day and an empty home, each harness is started in the sandbox, and the
      record names every host the egress proxy refused for want of an allowlist entry. Nothing is logged in to for
      this. When the session cannot drive a terminal interface, this last check is the human's, and the record says
      so
13. The README has a subsection under "Running the sandbox" that says: the three sources and their order; how a
    project holds a version, with the lines to add to `agent/compose.project.yml`; that the version given there is
    an exact version; that the wrapper rebuilds by itself when a version it wants differs from what the image
    holds, and what it prints; what the host's version is read from, and that a harness the wrapper's `PATH` does
    not show counts as not installed; that the image is per machine, so two developers on one project may run
    different versions until the project holds one; that each rebuild leaves the replaced image behind, and how to
    remove those; how to see what an image holds; and what the kit does and does not promise for a version it did
    not pin, with what a developer sees and how to recover, as the boundary paragraph below states it
14. Every place in what ships, and in this repository's README, that says the harness versions are pinned in the
    kit alone, or that a project updates them by updating the kit, is true again. The README's instruction for
    OpenCode's login says that the method's label is the one the kit's pinned version of OpenCode uses

## Decisions

* **Both of the human's options, in layers, as proposed.** The override alone leaves a chore in every project for
  every harness release. Following the host alone leaves a host without the harness with nothing to install, and a
  project with no way to hold a version. The order puts the most deliberate choice first: a line in a tracked file
  of the project's own stands above what happens to be installed on one machine, and both stand above the kit's
  default
* **The wrapper rebuilds by itself.** This is the first thing the request left to the planner. The alternative is
  that the developer runs `--rebuild` after each update of a harness on the host. Unit 0021 found what that
  becomes: a start on the old image exits 0 and says nothing, so the sandbox would follow the host only for a
  developer who remembers a flag nearly every day, which is the chore this unit exists to remove. What the
  automatic rebuild costs, as measured: about 0.3 seconds more at every start, nearly all of it
  `opencode --version`; and about 11 seconds at the first start after a harness update, on this machine and
  network. Rejected as well:
    * *Building at every start, and leaving it to Docker's cache*, as `./agent-dev.sh` does. It needs no label and
      no comparison. But a build reaches the registry even when every layer is cached, so every start would depend
      on the network and on Docker Hub, and a base image that moved would rebuild the whole image at a start
      nobody chose
    * *Asking the image*, by running `claude --version` in a container before each start. It starts a container to
      learn two strings that a label holds
* **A failed rebuild stops the start.** When the versions differ and the build fails, for example with no network,
  the sandbox does not start, although an image exists. Running that image instead would be 0021's trap with a
  warning above it. A developer who needs the sandbox while the build cannot run holds the image's versions in the
  project's Compose file, uncommitted, which is the recovery the README names. A switch that needs no edit is under
  "Beyond the request"
* **The labels record what the build was asked for.** The build installs exactly the version in the build
  argument, so for an exact version the label is what the image holds. The project's value is passed to npm as it
  is, so npm would accept a tag such as `latest` there. The label would then say `latest`, the comparison would
  hold for ever, and neither a start nor `--rebuild` would install a newer version, because the build cache holds
  the layer. So the README says the override is an exact version. A tag is not refused, since nothing fails and
  the project's file is the project's own
* **The pins stay where they are, as the defaults of the two `ARG` lines at the top of the Dockerfile, and the
  wrapper reads them there.** The wrapper has to know the pin to compare it with the image's label, so that a kit
  release with a new pin rebuilds the image on a host without the harness. Keeping the number in the Dockerfile
  keeps one place to bump, which is what 0028 is told to bump. Rejected: a file of the kit's holding the two
  numbers, which is one more shipped file for the same two lines
* **The wrapper always hands Compose a version, under names of its own.** The base Compose file takes each build
  argument from a variable the wrapper sets, `AGENT_CLAUDE_CODE_VERSION` and `AGENT_OPENCODE_VERSION`, in the way
  it takes `AGENT_UID`. Rejected: a build argument with no value, which Compose fills from an environment variable
  of the same name and leaves out when there is none. It was seen to work, and it would let the Dockerfile's
  default apply untouched. But the variable would be `CLAUDE_CODE_VERSION`, in a namespace Claude Code itself
  exports into every shell it starts, and agents run the wrapper from those shells
* **The wrapper reads the merged configuration with `node`, in one call that also gives the image name.** Whether
  the project overrides a version is only in the merged configuration, and Compose prints it as JSON. The host has
  node, since the kit is an npm package and the wrapper runs from `node_modules`, and the wrapper did this until
  0017. The one call replaces today's `config --images`, so a start makes as many Compose calls as before
* **The host's output is checked for shape, and the project's value is not.** What the host's command prints
  becomes part of an `npm install` that runs as root in the build, so only something that looks like a version is
  passed on. The pre-release part is accepted because OpenCode publishes such versions and a host may run one. The
  project's value is the project's own tracked file, which already decides the allowlist and the limits
* **A harness that is absent is silent, and one that misbehaves is not.** A host without OpenCode is ordinary and
  wants no line at every start. A command that is there and prints no version is a fault the developer would
  otherwise meet as a sandbox that is unaccountably on the kit's version
* **No line at an ordinary start.** The wrapper says which versions it builds with when it builds for a difference,
  and nothing when the image already matches. The image's labels and `claude --version` in the sandbox answer the
  question at any other time
* **`./agent-dev.sh` is not changed.** It runs the same wrapper with `--rebuild`, so it builds every time and with
  the same three sources. On a host with the harnesses, the working copy's sandbox therefore runs the host's
  versions and not the pin
* **What the pin is for.** It is what a host without the harness gets, and it is the combination the kit's own
  checks were made against. It is no longer what most sandboxes run. Which checks are made when it is bumped is
  0028's to say
* **The wrapper's additions run under bash 3.2**, which macOS ships and the wrapper already allows for

This unit changes what decides the contents of the image, so its boundary is stated.

The adversary and the supported usage are those of `history-0039-sni-filtering-proxy`, unchanged: the agent itself,
and whatever it is tricked into running, which reaches only the allowlisted hosts. Nothing that confines the
container depends on a harness's version: the firewall, the proxy, the read-only root, the capabilities and the
mounts are the same whichever version is installed, and a harness that contacts a host the kit does not admit is
refused as before. The build itself was never behind the firewall, and still installs from the npm registry.

What is new is who chooses the version. Until now it was the kit, for every project and machine. Now it is the
project's file, or else whatever the developer runs on the host, which is a version the developer already runs
outside any sandbox with their own account's rights. The wrapper runs two more commands on the host, `claude` and
`opencode` as the `PATH` finds them. The agent gains no new way to influence either: it can already write the
project's Compose file and the installed kit under the working directory, both of which act on the host at the next
start, which 0022 recorded and did not change. A developer whose `PATH` holds a directory the agent can write was
already running the agent's `docker` there. Not defended: a hostile or broken harness on the host, which is the
developer's own, and a version of a harness that is itself malicious, which the host would be running too.

What the kit promises for a version it did not pin, and what it does not:

* Promised for any version: the confinement above, and that the image holds exactly the version requirement 1
  names, or the start fails
* Promised for the pinned versions only, because each was checked against them and nothing else: that both
  harnesses start with the kit's allowlist alone (0015); that the README's login command for OpenCode names a
  method that exists (0023); that the developer's status line shows through the managed settings (0022); and that
  the environment variables and the configuration file the image sets do switch self-update off
* What a developer sees when another version breaks one of these: the harness's own error, such as
  `Unable to connect`, or a feature that is missing, with the refused host in `/run/egress-proxy.log`; a login
  method OpenCode does not know; a blank status line; an update attempt that fails against the read-only root and
  the firewall; or, for a version that is not on the npm registry, a build that fails with npm's error
* The recovery, in the order of least effort: add the refused host to the project's `ALLOWLIST`; or hold the
  version the kit pins, or any that works, in the project's Compose file. A host every project needs is then a
  change to the kit, as 0015 and 0023 were
* What a project gets by updating, without having asked: at the first start the image is rebuilt, and on a host
  that has the harnesses the sandbox moves from the pinned versions to the host's. From then on the image is
  rebuilt whenever the host's harness has been updated, which leaves an image of about 0.6 GB behind each time. Two
  developers on one project run what their own hosts have

## Non-goals

* Bumping the pins, and what a release checks when it bumps them. That is 0028. The two `ARG` lines keep their
  place and form, so that 0028 can name them
* Admitting any host. If requirement 12 finds that today's versions need one, that is a new unit, as it was for
  0015
* Rebuilding the image when the kit itself changed, for example its entrypoint. A release that needs a rebuild
  still says so in its notes. See "Beyond the request"
* Removing the untagged images that rebuilds leave. The README says how, and Docker's own pruning does the rest, as
  0021 decided for `./agent-dev.sh`
* Refusing a tag or a range as the project's value
* Making a project's sandbox the same on every machine. A project that wants that holds both versions
* Installing a harness the host has by another route than npm, or copying the host's binary into the image. The
  image is Linux whatever the host is
* Self-update inside the sandbox. It stays off, so that the read-only root holds what the build installed
* Any other harness, and the versions of node, of Playwright or of the base image
* Changing what `init` writes into a project's Compose file, or this repository's own
* Docker Desktop for macOS. Requirement 12 asks for the host the implementer has. Nothing in the design is specific
  to Linux, and it was not run on macOS
* The release that holds this, and its notes, which are written at release time from this spec

## Beyond the request

* **A choice from the environment, for one machine or one run.** For example `AGENT_CLAUDE_CODE_VERSION` and
  `AGENT_OPENCODE_VERSION` honored when the caller has set them, as `AGENT_MEM_LIMIT` is, above the host and below
  the project. It would give a developer a way out that touches no tracked file when the host's version does not
  work in the sandbox or cannot be built, and it would give this repository a way to run the pinned combination on
  a host that has the harnesses, which a release may want before it ships a pin. It costs a few lines in the
  wrapper, two tests, a README sentence, and a fourth layer to explain. Without it both are done by an uncommitted
  edit to the project's Compose file, which works and is easy to commit by mistake
* **A label for the kit's own version, so that an update of the kit rebuilds the image by itself.** The mechanism
  of requirement 6 would carry it for one more label and one more comparison. Without it, a release that changes
  what the image holds still depends on the developer reading the notes and running `--rebuild`, and a start on
  the old image exits 0, which is a failure nobody sees. It is left out because nobody asked for it here, and
  because for `./agent-dev.sh` the kit's version says nothing about the working copy
* **The override as a commented example in what `init` writes**, so that a new project finds it in its own file.
  It costs a change to the template and to `init`'s tests, and reaches no existing project. Without it the README
  is where it is found
* **Removing the replaced image after a rebuild.** It would cost a few lines and a decision about an image another
  container still runs on. Without it the disk fills slowly and visibly, and `docker image prune` empties it
* **A line at every start that names the versions and where they come from.** It costs one line of output before
  every command, including scripted ones. Without it the answer is one command away
* **A time limit on the host's version commands.** A harness that hangs on `--version` would hang the start.
  macOS has no `timeout` command, so it would cost more than a line. Without it the developer sees the hang and
  interrupts it
