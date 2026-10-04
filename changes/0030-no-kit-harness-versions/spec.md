# 0030 The kit names no harness version

## Context

Since 0027 the sandbox image holds, for Claude Code and for OpenCode each on its own, the first of three versions:
the one the project's `agent/compose.project.yml` gives, the one installed on the host, and the one the kit pins as
the default of a build argument in `container/Dockerfile`. The pin is what a sandbox gets on a host that does not
have the harness, and it is the pair the kit's own checks were made against.

Unit 0028 was then to bump the two pins at every release and to check the new pair in a sandbox. Built, that step
was a run of the suite and a check of some 90 lines of `RELEASING.md`, which needed a `claude` and an `opencode`
that report no version on the `PATH` for the wrapper to use the pins at all.

### What the human decided

On 2026-10-04, shown that step and that a pin is only what a host without the harness gets:

* "Regarding the pins we really need to take a few steps back, because this feels like something is getting very
  complicated while it should be easy."
* "Mmm I have a hard time finding a good solution. Because no check doesn't feel right either. Maybe it just
  doesn't make sense anymore to have a kit version? Maybe we only need : host version OR pinned version in
  compose.project.yml"

The main session laid out three answers to what a sandbox gets when the project holds no version and the host does
not have that harness: the latest from npm at build time, with the Dockerfile's default becoming `latest`; that
harness left out of the image; or a stop with a message. It recommended the first, said that this takes a new unit
because 0027 is frozen, and that the bump and the check come out of 0028. The human: "Yes, Go ahead".

So the human's are: the kit has no version of its own, and the go-ahead for the proposal. That the latest
published version is what a sandbox gets when neither the project nor the host gives one is the main session's
recommendation, which the go-ahead covers. The other two answers are under "Decisions" with what each costs, so
that the human can still choose on reading.

### What was found while planning

On `master` at `94099e9`, on Linux with Docker Engine 28.4.0, Docker Compose 2.39.2, node 24.14.1 and npm 11.11.0.
The host has Claude Code 2.1.289 and OpenCode 1.18.34, and those were npm's latest of both on that day.

**Where the pins are.** `container/Dockerfile` holds `ARG CLAUDE_CODE_VERSION=2.1.266` and
`ARG OPENCODE_VERSION=1.18.30`, before the first `FROM`. `container/agent.sh` reads the two lines with `sed`, hands
Compose the host's version or else the pin, and refuses to run when a line is missing. The last stage declares
both arguments again, with no default, installs `"@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"` and
`"opencode-ai@${OPENCODE_VERSION}"` in one `npm install -g`, and writes each argument into a label. The base
Compose file takes each argument from a variable of the wrapper's and refuses to run without it.

**`latest` as the build argument, tried.** In a scratch project that held a copy of `container/` with the two
defaults set to `latest`, under a Compose project, image and home volume of its own, with a `claude` and an
`opencode` first on the `PATH` that report no version:

* The first start built the image and installed `@anthropic-ai/claude-code@latest` and `opencode-ai@latest`. In
  the sandbox `claude --version` printed `2.1.289 (Claude Code)` and `opencode --version` printed `1.18.34`. The
  whole start took 21 seconds
* The image's two labels both say `latest`. Nothing in the image records which versions it holds
* A second start built nothing: the wrapper wants `latest`, the label says `latest`, and they are equal. They
  stay equal whatever is published afterwards
* A start with `--rebuild` built nothing new either. Every step of the build was `CACHED`, the install among them,
  and the image's id was the same before and after. The install's command line is the same text as before, so
  Docker's cache answers it. A newer version would reach the image only after the cache is pruned or an earlier
  layer changes

So with `latest` handed to the build, a sandbox never moves to a newer version by anything the README offers, and
nothing says which version it has. 0027's spec had foreseen this for a tag in the project's file.

**Asking the registry from the host, tried.**

* `npm view @anthropic-ai/claude-code version` printed `2.1.289` in 0.26 seconds, and `npm view opencode-ai
  version` printed `1.18.34` in 0.34 seconds. An exact version in the build argument makes the install's command
  line, and so its cache key, and the label, that version: this is how the pins and the host's versions work today
* With the registry refusing connections, `npm view` took 70 seconds to fail with its default of two retries, and
  0.11 seconds with `--fetch-retries=0`. It exits 1
* With a registry address that does not answer at all, `npm view --fetch-retries=0 --fetch-timeout=5000` took 2
  minutes and 15 seconds to fail. The timeout option did not shorten the connection attempt
* `opencode-ai` has many tags besides `latest`, snapshots among them. `latest` was a plain three-part version for
  both packages

**What was created and removed.** The image, the volume and the network of the trial, named
`ritenoar-agentrite-agent-trial0030`. The lists of all images, volumes, networks and containers, taken before and
after, are the same, compared with `diff`. `ritenoar-agentrite-agent` is still `143d91ec452a` and
`ritenoar-agentrite-agent-dev` still `d11961d8abb8`. Nothing was logged in to. The build cache keeps the layers.

**Not established.**

* Anything about the wrapper as this unit describes it. The trials ran today's wrapper with a changed Dockerfile,
  and `npm view` by hand. The plan has a task that checks the built wrapper for real
* That an exact version, found by the wrapper and handed to the build, installs afresh when it differs from the
  cached one. It is how a changed pin and a changed host version behave under 0027, whose record has it, and was
  not tried again here. It was seen later, in the check for real, which the record has
* Docker Desktop for macOS, and a host whose `npm` is not the one beside its `node`
* What a developer sees in a sandbox whose harness is a version nobody tried. It cannot be established: it is
  what this unit accepts

### What this unit depends on

0028 is `in-progress` on its own branch, which is not on `master`. Its release no longer reads or edits the pins.
Its branch changes three test files of 0027's that this unit rewrites: `tests/harness-versions.test.mjs`, where
the test of where a pin is written no longer reads `README.md`, and `tests/wrapper-fixture.mjs` and
`tests/agent-wrapper.test.mjs`, where the fake host and an earlier-built image have versions no pin equals. This
unit is planned from `master`, which has none of that. The decision on the order says how the two meet.

0029 is a draft on a branch of its own and changes only its own directory so far.

## Requirements

The versions:

1. For each harness on its own, the version the sandbox image is built with is the first of these that exists: the
   value the project's `agent/compose.project.yml` gives under `services.agent.build.args`, as
   `CLAUDE_CODE_VERSION` or `OPENCODE_VERSION`; the version the harness's command on the host reports, as 0027
   defines it. When neither exists, it is the latest published version of the harness, found when the image is
   built
2. The kit names no version of either harness. `container/Dockerfile` gives neither build argument a default, and
   `container/agent.sh` reads no version from it. No file under `container/` or `templates/` holds a version of
   Claude Code or of OpenCode
3. The latest published version of a harness is what `npm view <package> version` prints on the host, for the
   package the Dockerfile's install line names, asked without retries. It counts only when the command exits 0 and
   its output is a version of the shape 0027 asks of the host's: three numbers separated by dots, optionally
   followed by a hyphen and a pre-release part. It is handed to the build as that exact version, and never as a
   tag
4. The registry is asked only when the wrapper is about to build and a harness has neither a project's nor a
   host's version. A start that builds nothing asks it nothing, and neither does a build for which the project or
   the host gives both versions
5. At a start without `--rebuild`, a harness with neither a project's nor a host's version does not cause a build
   when the image records a version of it: the sandbox keeps that version. When the image records none, or
   something that is not a version, the wrapper builds
6. Before a build in which a version comes from the registry, the wrapper prints one line on standard error for
   each such harness, naming the harness and the version the image is built with
7. When the latest version of a harness is needed and cannot be found, because `npm` is not on the `PATH`, the
   command fails or its output is not a version, the wrapper exits non-zero, builds nothing and runs nothing. It
   names the harness and the command, and says that giving a version in the project's Compose file or installing
   the harness on the host gets past it. It does not fall back to the image that exists
8. A harness whose command is on the `PATH` and prints no version counts as not installed, and the wrapper says so
   in one line on standard error at each start, naming the command, as it does today for the pin
9. The image's two labels hold the exact versions it was built with, whichever source each came from
10. What 0027 built otherwise holds: the project's value stands above the host's; a version that differs from the
    image's label rebuilds, with a line that names the harness, both versions and the source, which is now the
    project's compose file or the host; `--rebuild` builds whatever the labels say; a failed build stops the
    start; a value the caller's environment holds for a variable of the wrapper's is not used. Nothing that
    confines the sandbox changes, self-update stays off in the image, and `init` and `refresh` write what they
    wrote

A project that updates:

11. A project needs no edit to a file of its own. What its image becomes follows from requirements 5 and 10, and
    from what the image records:
    * An image of release 2.3.0 records no version of either harness, so the first start after the update builds
      it again. On a host that has both harnesses that build installs the host's versions. On a host without a
      harness it installs the latest published version of it, and so needs `npm` on the host and the registry in
      reach: without them that first start stops, as requirement 7 says, although an image exists
    * An image whose labels record versions is used as it is. For a harness the host does not have, the sandbox
      keeps the recorded version until the image is built again, for example with `./agent.sh --rebuild`

The documents:

12. The README's subsection "The harness versions" says: the two sources and their order; that with neither, the
    image gets the latest published version at the time it is built, and keeps it until it is built again; that
    `--rebuild` is how such a sandbox gets a newer one; what the wrapper prints when it takes the latest, and when
    it cannot find it, with how to get past that; and that the build needs `npm` on the host for this. Its
    examples of the wrapper's lines are the lines the wrapper prints. Everything 0027 gave the subsection that
    still holds is kept, with its commands
13. The README says what the kit promises for a harness version, now that it checks none. For any version: the
    confinement, and that the image holds exactly the version requirement 1 names, or the start fails. For no
    version: that both harnesses start with the kit's allowlist alone, that the login command for OpenCode names a
    method that exists, that the developer's status line shows, and that self-update is switched off. It keeps
    what a developer sees when one of these does not hold and how to recover, with holding a version that works in
    the project's file as the recovery, and no longer the version the kit pins
14. Every other place in what ships and in this repository's README that speaks of a version the kit pins is true
    again: the comments in `container/Dockerfile`, `container/compose.yml` and `container/agent.sh`, the README's
    sentence on the label of OpenCode's login method, and its sentence on which versions `./agent-dev.sh` runs.
    The sentence on the login says that the label depends on OpenCode's version and may differ, without calling
    any version the kit's
15. 0027's record has an amendment that names this unit and which of 0027's requirements it changed

The tests and the check:

16. The suite, which runs no Docker and no network, holds requirements 1 and 3 to 10 by running the wrapper with a
    `docker`, a `claude`, an `opencode` and an `npm` of its own, and requirement 2 by reading the files. No test
    depends on which harnesses the host that runs the suite has, on their versions, or on what the registry holds.
    The tests that held the pins are gone or changed: that the Dockerfile pins each harness once, that no other
    file holds a pin, that the wrapper refuses a Dockerfile with no pin, and every case in which the wrapper took
    a pin
17. The behavior is checked for real on a host with Docker, through the working copy's wrapper, under a Compose
    project, image and home volume of the check's own, which are removed afterwards, with nothing logged in to.
    What was seen is in the record, with the versions of Docker, Compose, npm and the host's harnesses:
    * with a `claude` and an `opencode` first on the `PATH` that print no version, a first start prints the lines
      of requirements 8 and 6, builds, and the sandbox and the labels hold the versions `npm view` printed
    * a second start builds nothing, also with the registry unreachable, which
      `npm_config_registry=http://127.0.0.1:9/` gives
    * `--rebuild` with the registry unreachable stops as requirement 7 says, and the image is as it was
    * with an older exact version of each harness in the image, put there by a version in the project's Compose
      file that is not committed and is then taken out again, a start without `--rebuild` keeps the older
      versions, and one with `--rebuild` installs the exact versions the registry's answer gives, which the
      sandbox and the labels then hold. When the machine has not built that pair before, the install runs and
      is not taken from the cache. When it has, the install may come from the cache, which holds that same pair.
      Where the true latest pair is already in the machine's build cache, the check shows the first of the two
      with an `npm` of its own, first on the `PATH`, that answers with a published pair the machine has not built
    * with the host's own harnesses on the `PATH`, a start behaves as 0027's record has it

## Decisions

* **The kit has no harness version of its own. The human's decision.** A pin needs keeping: someone bumps it, and
  someone checks what it is bumped to, and 0028 showed what an honest check costs. Since 0027 the pin reaches only
  a host that does not have the harness. The human: "Maybe it just doesn't make sense anymore to have a kit
  version? Maybe we only need : host version OR pinned version in compose.project.yml"
* **With neither a project's nor a host's version, the image gets the latest published one. The main session's
  recommendation, under the human's go-ahead, and open to the human's correction.** It keeps what 0027 promised:
  a sandbox starts on any host with no edit to the project, and holds both harnesses. The two other answers, with
  what each would cost:
  * *The harness is left out of the image.* The image then holds only what somebody chose, and the build asks
    the registry for nothing but an exact version. It costs an install step that takes one harness, both or none,
    and labels to match; a sandbox in which `claude` or `opencode` is `command not found`, which wants a message
    of the kit's saying why and what to do; a README that explains a sandbox with one harness; and the cases in
    the tests. A project whose developers use both harnesses on hosts that have one each would find the other
    missing on each machine until the project holds a version
  * *The wrapper stops with a message.* It is the least code: no install to change, no registry to ask. It costs
    every developer whose host lacks one harness a line in the project's Compose file, or an install on the host
    of a harness they do not use, before the first start, and a project created by `init` on such a host does not
    start as created. 0027's requirement that a project needs no edit of its own would no longer hold
* **The wrapper asks the registry for the version and hands the build an exact one. The planner's, from the
  trial, and not the proposal's `latest` as the Dockerfile's default.** With `latest` in the build argument the
  label says `latest`, a start never rebuilds, `--rebuild` takes the install from Docker's cache, and nothing
  records what the image holds. With an exact version each of those works as it does for the host's version
  today: the label is the version, the install's cache key changes with it, and `docker image inspect` answers
  what the sandbox runs. It costs one `npm view` per harness, about a third of a second each, at a build.
  Rejected as well: an argument that breaks the cache, such as the date, with `latest` kept. It would still
  record nothing, and a label written by the build cannot take the output of a command
* **What the check shows of the cache is that the version decides it, not that a build never uses it. The main
  session's, under the human's delegation, on the review's finding S1, and open to the human's correction.**
  Requirement 17 first asked that `--rebuild` "installs the latest and does not take the install from the cache".
  That asked for more than the unit is for, and for something a machine cannot always show: the cache is keyed
  by the install's command line, so a pair the machine has built before is answered from the cache, and rightly,
  since the cached layer holds exactly that pair. The check's own earlier case had built the latest pair, and the
  case for this criterion was then `CACHED`, which the reviewer found. What the exact version is for is the
  other half: a version the machine has not built is installed afresh, where `latest` never was. The reviewer
  offered two corrections, an observation with a cold cache or a criterion that permits the reuse, and both were
  taken: the requirement says both halves, and the check shows the first with a stand-in for the registry's
  answer, because the true latest cannot be shown uncached on a machine that has built it without removing its
  build cache. The stand-in answers with a real published pair, so the install itself is real. The delegation
  and the outcome are in the record, in the entries of 2026-10-04T22:11:36Z
* **The registry is asked only at a build, and a sandbox keeps its version between builds. The planner's.** The
  request says "at build time". Asking at every start would make the sandbox follow the registry as it follows
  the host, and it would put a network call in front of every start on a host without the harness: a third of a
  second when the registry answers, and over two minutes when the network swallows the connection, as tried. A
  start that builds nothing should need no network, which 0027 held to when it rejected building at every start.
  So `--rebuild` is how such a sandbox gets a newer version, and a build for another reason, such as an update of
  the other harness on the host, brings one too. Following the registry at every start is under "Beyond the
  request"
* **No default in the Dockerfile at all.** The wrapper always hands the build both versions, and the base Compose
  file refuses to run without them. A default would be a second answer to a question the wrapper already
  answers, and `latest` there is the trap the trial showed. The two `ARG` lines before the first `FROM` exist only
  to hold the defaults, and go
* **One line when the latest is taken, at the build and not at every start.** Nobody chose that number, so the
  developer is told which it is when it enters the image. Between builds the labels answer, as 0027 decided for
  an ordinary start
* **When the latest cannot be found, the start stops.** This is 0027's decision for a build that fails, applied
  to the step before it: running the image that exists instead would be a `--rebuild` that silently did nothing.
  It happens only when a build was wanted, and a build needs the network anyway. `npm view` is run without
  retries, which took a refused connection from 70 seconds to a tenth of one. A connection that is swallowed
  still takes minutes, as the build's own pulls do then, and a time limit of the wrapper's own is under "Beyond
  the request"
* **A command that prints no version counts as not installed, and still gets its line.** 0027 decided that an
  absent harness is silent and one that misbehaves is not, because the developer would otherwise meet a sandbox
  that is unaccountably not on the host's version. That reason is unchanged. Only the end of the line changes,
  since there is no kit's version to name
* **The host needs `npm`, which it has.** The kit is an npm package, the wrapper already runs `node`, and `npm`
  comes with it. The output is checked for the shape of a version before it becomes part of an install that runs
  as root in the build, as the host's own version is
* **An image whose labels record versions is left as it is.** For a harness the host has, nothing changes. For
  one it does not, the wrapper has no way to tell a version the kit once pinned from one the registry gave last
  month, and needs none: both are what the image holds until it is built again. As first written, this decision
  and requirement 11 said that of every image of an earlier release. That was wrong: the labels are 0027's, and
  0027 is in no release
* **An image that records no version is built again, also on a host without the harness. The human's decision,
  after the check for real.** The check showed that the image of release 2.3.0 has neither label. The wrapper
  cannot know what such an image holds, so by requirement 5 it builds, and on a host without a harness that
  build takes the latest and needs `npm` and the registry. With the registry out of reach the first start after
  the update stops with exit 2, although an image exists. The alternative was to change the behaviour so that an
  image with no labels is kept for a harness that has no source. It is more code and more cases in the tests for
  a transition each sandbox makes once, and it would keep, unseen, a version the wrapper cannot name. Told both,
  the human had the sentence corrected to what was seen and the behaviour left as built, in the words the record
  has. The release notes say that the first start after the update builds, and what that build needs
* **The README names no version as checked. The planner's.** The kit could say which versions it was last seen
  working with, and 0028's record has such a pair. Written in the README it would be a pin again in all but
  name: a number that is stale unless somebody bumps and checks it. So the README says plainly that the four
  things 0027 promised for the pinned versions are promised for none, what a developer sees when one fails, and
  that the recovery is a version that works, held in the project's file. The examples of a held version in the
  README are examples and stay
* **A new unit that does not supersede 0027, with an amendment in 0027's record.** By the process a frozen unit
  is corrected by an amendment when the correction is small, and by a superseding unit when the original record
  would mislead. This is neither a correction: 0027's record is a true account of what was built, most of it
  stands, and this unit changes one of its three sources by a later decision. `supersedes` would say that 0027
  is replaced, and it is not. The amendment is the pointer from 0027 to here, so that a reader of its
  requirements 1, 3 and 4, its decisions on the pins and its boundary paragraph learns that they were changed
* **0028 reaches `master` first, and the plan copes with the other order.** 0028 is close to done and no longer
  touches the pins, and its branch changes three test files this unit rewrites. With 0028 on `master`, this
  unit's branch merges `master` before any work, as 0028's did for 0027, and its tests start from the fixture
  0028 left. Should this unit land first, 0028's branch merges `master` and takes this unit's version of
  `tests/harness-versions.test.mjs`, whose test of where a pin is written is gone, and 0028's requirement 18,
  which holds those three files to what its branch has, has to be withdrawn by its planner. That is the reason
  for the preferred order

This unit changes what decides the contents of the image, so its boundary is stated.

The adversary and the supported usage are those of `history-0039-sni-filtering-proxy` and of 0027, unchanged: the
agent itself, and whatever it is tricked into running, which reaches only the allowlisted hosts. Nothing that
confines the container depends on a harness's version.

What is new is that, for a harness neither the project nor the host gives a version of, nobody chooses the
version: it is whatever the registry calls the latest when the image is built. Until now that case got a version
the kit had named and, once, tried. The wrapper runs one more command on the host for it, `npm`, as the `PATH`
finds it, and passes on only output that has the shape of a version. The agent gains no new way to influence the
build: it can already write the project's Compose file and the installed kit, as 0022 and 0027 recorded. Not
defended: a version of a harness that is published broken or malicious and is the latest on the day of a build.
A host that has the harness, and a project that holds a version, are not exposed to that.

## Non-goals

* Checking a harness version, at a release or at any other time. The kit checks none
* Leaving a harness out of the image, or stopping when the host lacks one. Both are weighed above and not taken
* A change to how the host's version is found, to the labels, or to when a difference rebuilds
* Refusing or resolving a tag such as `latest` in the project's own file. The README still asks for an exact
  version there, as 0027 has it
* `./agent-dev.sh`. It runs the same wrapper with `--rebuild`, so on a host without a harness it asks the registry
  at every start of the working copy's sandbox
* The release, which is 0028's and no longer has a step for the harness versions
* Docker Desktop for macOS in the check for real, which is made on the human's host

## Beyond the request

* **Asking the registry at every start**, so that a sandbox on a host without the harness moves to a new version
  at the first start after it is published. It costs a network call before every such start, and a rule for a
  start with no network. Without it the developer runs `./agent.sh --rebuild` to get a newer version, which the
  README says
* **A time limit on the question to the registry.** It would end a swallowed connection in seconds. macOS has no
  `timeout` command, so it costs a watchdog written in the wrapper, and its tests. Without it the developer
  interrupts a start that hangs with no network, as they would the build that follows
* **Resolving a tag in the project's file the same way**, so that `latest` there means the latest at each build.
  It is the general form of what this unit does for one case. It costs a rule for which values are tags. Without
  it the README says to give an exact version
* **A line at every start that says which versions the sandbox holds.** Without it the labels and `claude
  --version` in the sandbox answer, as the README says
* **A harness-free image for a project that wants only one harness**, by a setting in the project's file. Nobody
  asked for it. Without it the image holds both, as it always has
