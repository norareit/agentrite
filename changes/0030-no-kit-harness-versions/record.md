---
kind: feature
status: in-progress
timestamp: 2026-10-04T20:13:06Z
---

# 0030 The kit names no harness version

## Log

- 2026-10-04T20:13:06Z [human] having been shown what the bump of the kit's pinned harness versions and its check had
  become in unit 0028, and that since 0027 a pin is only what a host without the harness gets, said: "Regarding the pins
  we really need to take a few steps back, because this feels like something is getting very complicated while it should
  be easy." and then: "Mmm I have a hard time finding a good solution. Because no check doesn't feel right either. Maybe
  it just doesn't make sense anymore to have a kit version? Maybe we only need : host version OR pinned version in
  compose.project.yml". The main session laid out three answers to what a sandbox gets when the project holds no version
  and the host does not have that harness: the latest from npm at build time, the Dockerfile's default becoming
  `latest`; that harness left out of the image; or a stop with a message. It recommended the first, and said this takes
  a new unit because 0027 is frozen. The human: "Yes, Go ahead". The human's are that the kit has no version of its own,
  and the go-ahead. The latest as the fallback is the main session's recommendation, which the go-ahead covers. The time
  of this entry is when the words reached the planner, through the dispatching session
- 2026-10-04T20:13:06Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in the main checkout, and wrote
  `spec.md` and `plan.md` on the branch `feature-0030-no-kit-harness-versions`, made from `master` at `94099e9`. A
  feature, because it has decisions. The number was given by the dispatching session: 0028 and 0029 are on branches that
  are not on `master`. Planned under the process of release 2.3.0, read from `node_modules`. Read: `container/agent.sh`,
  `container/Dockerfile`, `container/compose.yml`, the README's "The harness versions" and its other mentions of a pin,
  `tests/harness-versions.test.mjs`, `tests/agent-wrapper.test.mjs`, `tests/wrapper-fixture.mjs`, and 0027's spec and
  record.
  Tried, on Linux with Docker Engine 28.4.0, Compose 2.39.2, node 24.14.1, npm 11.11.0, Claude Code 2.1.289 and
  OpenCode 1.18.34 on the host, in a scratch project holding a copy of `container/` with both defaults in the
  Dockerfile set to `latest`, under the Compose project `ritenoar-agentrite-agent-trial0030`, with a `claude`
  and an `opencode` first on the `PATH` that exit 1:
  * A first start built, installed both packages at `latest`, and the sandbox printed `2.1.289 (Claude Code)`
    and `1.18.34`. 21 seconds in all. The wrapper printed today's line for a command with no version, ending "the
    kit's Claude Code latest."
  * Both labels of the image say `latest`
  * A second start built nothing
  * A start with `--rebuild` ran the build, every step of it `CACHED`, the install among them, and the image's
    id was the same before and after, `c03813dd8450`
  * `npm view @anthropic-ai/claude-code version` took 0.26 seconds and `npm view opencode-ai version` 0.34
  * `npm view opencode-ai version --registry http://127.0.0.1:9/` exited 1 after 70 seconds, and with
    `--fetch-retries=0` after 0.11 seconds
  * `npm view opencode-ai version --registry http://10.255.255.1/ --fetch-retries=0 --fetch-timeout=5000` failed
    with `ETIMEDOUT` after 2 minutes and 15 seconds
  * `npm view 'opencode-ai@' version` printed the latest, as with `@latest`
  Afterwards the trial's volume, network and image were removed. The lists of all images, volumes, networks and
  containers, taken before and after, are the same, compared with `diff`. `ritenoar-agentrite-agent` is still
  `143d91ec452a` and `ritenoar-agentrite-agent-dev` still `d11961d8abb8`. Nothing was logged in to, and no
  tracked file was changed for the trial.
  What the trial changed in the proposal: `latest` is not handed to the build. The wrapper asks the registry on
  the host and hands the build an exact version, so that the label, the comparison and Docker's cache work as
  they do for the host's version.
  Decided by the planner, each with its reason in the spec: the exact version in place of `latest`; that the
  registry is asked only at a build, so a sandbox keeps its version until `--rebuild`; no default in the
  Dockerfile; one line when the latest is taken; a stop when it cannot be found; that the README names no version
  as checked and promises the four version-dependent things for none; that an image of an earlier release is left
  as it is; that the unit does not supersede 0027 and adds an amendment to its record; and that 0028 should reach
  `master` first.
  Not established: anything about the wrapper as the unit describes it, which the plan checks for real; that an
  exact version from the registry installs afresh, which is taken from 0027's record; macOS; and the wrapper
  without `npm` on the `PATH`.
  For the human to decide, besides approval: which of the three answers it is, the latest, the harness left out,
  or a stop, with the costs in the spec; whether a sandbox on a host without a harness keeps its version until
  `--rebuild` or follows the registry at every start; whether the README should name the versions the kit was
  last seen working with; the wrapper's three lines in the plan; the order of 0028 and this unit; and what under
  "Beyond the request" is taken. Status left at `draft` for the human's approval
- 2026-10-04T21:19:19Z [human] approved the spec and the plan as written at `ec0aa5b`, in the main session, in these
  words: "Okay. Go ahead and implement 0030 as the @implementer". The time of this entry is when the words reached
  the implementer, through the dispatching session. Status `draft` to `approved`.
  The dispatching session reports that the human was shown, twice, what the planner left for them to decide, in
  this form: the fallback when neither the project nor the host gives a version (the latest from the npm registry,
  as planned, or the harness left out, or a stop with a message); when the registry is asked (only when a build is
  due, as planned, or at every start); the order of 0028 and this unit; and a time limit on the registry call,
  which is under "Beyond the request" and which the main session said it would take. The human answered none of
  them one by one and gave the approval above. So the unit is built as the spec has it, with the planned answers,
  and nothing under "Beyond the request" is in scope. The time limit on the question to the registry was
  recommended by the main session and not taken up by the human: it is not built, and it is theirs to add later.
  The order is settled by events: 0028 is implemented and on `master`
- 2026-10-04T21:19:19Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main checkout and not
  in a worktree, as the human wants it. Status `approved` to `in-progress`. Read the process of release 2.3.0 from
  `node_modules`, `roles/implementer.md`, the README, and this unit's three documents.
  The branch was brought up to date before any work, by a merge as the plan says: `master` at `32004d6`, which
  holds 0028, merged into the branch at `ec0aa5b`, as `8abd2a0`, with no conflict. It was the first of the plan's
  two cases: `tests/harness-versions.test.mjs` no longer reads `README.md`, and `tests/wrapper-fixture.mjs` has the
  fake host's versions `99.1.0` and `98.2.0`. `npm test` on `8abd2a0`: 230 tests, 230 passing, exit 0.
  The plan against what `master` now holds: its steps stand. `RELEASING.md`, the release skill and `AGENTS.md`
  name no harness version and no pin, checked with `grep`, and are not touched by this unit
- 2026-10-04T21:32:31Z [Claude Code, anthropic/claude-opus-5-5] as implementer, what was built, in the commits
  `19758d9` (the tests), `494d397` (the wrapper), `c1986ff` (the Dockerfile and the Compose comment) and `fc26d58`
  (the README).
  The tests first: on `19758d9`, with the wrapper and the Dockerfile as they were, 57 of 246 tests failed and 189
  passed. The 57 are the new and changed cases and also every other test that runs the wrapper, because the fixture
  no longer links `sed` and no longer puts the Dockerfile beside the wrapper, both of which the old wrapper needed.
  On `494d397` 2 failed, the two that read the Dockerfile. One of those, the search of `container/` and
  `templates/`, failed there for a mistake of mine, a helper removed in `19758d9`, and not for the pins; with the
  helper back it was run against the Dockerfile with the pins and failed, and it passes without them. On `c1986ff`
  and `fc26d58`: 246 tests, 246 passing.
  Where the work differs from the plan's wording, each now under "Adjusted while implementing" in the plan:
  * Both harnesses are asked of the registry before either line of requirement 6 is printed. Otherwise a line would
    say what the image is built with, and the wrapper would then stop for the other harness and build nothing
  * The variables for Compose hold the version the image is built with, the project's included. The plan's step 7
    exports them after the versions are settled, and the base Compose file refuses an empty one, which a host
    without the harness would otherwise give for a harness the project holds
  * The tests no longer put the Dockerfile beside the wrapper, which is how they hold that it reads no version
    from it, and `sed` left the fixture
  * The test of where a pin is written became a search for a version of either harness under `container/` and
    `templates/`, because requirement 16 holds requirement 2 by reading the files. It is a search by name: it finds
    a version written after a name of a harness, its package or its build argument, and no other
  * The plan's `grep` for `pin` in the three files matches "Alpine" in a comment this unit does not touch
  * The lines of requirements 6 and 7 are 125 to 136 characters as printed. Requirement 12 wants the README's
    examples to be the lines the wrapper prints, and the project wraps at 120. The examples are the wrapper's words
    wrapped, with "wrapped here" beside each. The human may prefer shorter lines in the wrapper, which would be a
    change to the plan's three lines
  Not handled, and not tried: a project's file that gives an empty value for a version. Under 0027 the build then
  installed whatever npm takes an empty version for and the label was empty. Now, on a host without that harness,
  the variable handed to Compose is empty and Compose refuses with the base file's message. The README asks for an
  exact version there.
  Not run under bash 3.2: the additions use `[[ =~ ]]`, `local`, here-strings and `${x:+y}`, which the wrapper
  already used, and were run under the host's bash only.
  The README's "The harness versions", paragraph by paragraph against 0027's:
  * The opening sentence and the list: kept, the third item removed, since there is no pin
  * New after the list: what happens with neither source, the line for the latest, that the sandbox keeps it until
    the image is built again, `--rebuild`, that `npm` on the host is needed and when the registry is asked; then
    the latest that cannot be found, its two lines and the two ways past it (requirement 12)
  * "A project holds a version by adding the build argument", its YAML example and "Give an exact version": kept
    as they were
  * "The host's version is what `claude --version` and `opencode --version` print": changed. A harness that is
    absent or behind an alias counts as not installed, with no "gets the kit's version", and so does one that
    prints no version, with the wrapper's new line in place of the old example
  * "At each start the wrapper compares" and its two example lines: kept
  * "So no flag is needed": kept, with a sentence added on a harness with neither source, which has nothing to
    compare. "An image built by a release that did not write the labels" and the failed build: kept
  * "To see what an image holds" and its commands: kept
  * "What follows from that": kept, with one bullet added, that on a host without a harness the version is the
    latest of the day the image was last built
  * "The kit promises less for a version it did not pin": changed to what the kit promises for a harness version,
    now that it checks none. The bullet for any version is kept, with "the order above names" as "the rules above
    name". The bullet "For the pinned versions only" became "For no version", with the same four things. "What a
    developer sees" is kept, with "another version" as "a version". "To recover" holds "a version that works" in
    place of "the version the kit pins, or any that works", and its last sentence is kept
  Elsewhere in the README: the sentence on the login's label says "the one OpenCode used when this was written",
  and the bullet on `./agent-dev.sh` says that it builds on every start and so asks the registry at every start on
  a host without a harness. `grep -n -i 'pin' README.md` shows the three kinds of line the plan names, and
  "keeping" on the line about `package.json`. `RELEASING.md` is not touched and names no harness version
- 2026-10-04T21:32:31Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the check for real, on the host: Linux,
  Docker Engine 28.4.0, Compose 2.39.2, node 24.14.1, npm 11.11.0, Claude Code 2.1.289 at `~/.local/bin/claude`,
  OpenCode 1.18.34 at `~/.opencode/bin/opencode`. `npm view` gave 2.1.289 and 1.18.34 as the latest of the two
  packages. Every step ran the working copy's `container/agent.sh` with the repository as the project root and
  `AGENT_PROJECT_NAME=ritenoar-agentrite-agent-check0030`, with standard input from `/dev/null` and
  `bash -c 'claude --version; opencode --version'` as the command, unless it says otherwise. "No registry" is
  `npm_config_registry=http://127.0.0.1:9/` in the wrapper's environment. The `PATH`s: "no version" is a `claude`
  and an `opencode` that exit 1, first; "neither" is `/usr/bin:/bin` and a directory with only `node` and `npm`.
  The exit codes are the wrapper's own.
  * A, no version, no image: exit 0. The two lines of requirement 8, then the two of requirement 6 with 2.1.289
    and 1.18.34, then the build. The sandbox printed `2.1.289 (Claude Code)` and `1.18.34`, and the labels are
    `2.1.289` and `1.18.34`
  * B, the same again: exit 0, the two lines of requirement 8 and nothing built. With no registry: the same
  * C, `--rebuild` with no registry: exit 2 in under a second, with the lines of requirement 8 and the two lines of
    requirement 7 for Claude Code, nothing on standard output, and the image's id as before
  * D1, neither, with `CLAUDE_CODE_VERSION: 2.1.266` and `OPENCODE_VERSION: 1.18.30` in
    `agent/compose.project.yml`, not committed, and no registry: exit 0, "the image holds Claude Code 2.1.289 and
    2.1.266 is wanted, from the project's compose file. Rebuilding." and the same for OpenCode, the sandbox on
    2.1.266 and 1.18.30 and the labels likewise. So a project's versions need no registry. The file was then
    restored with `git checkout`
  * D2, neither, the file restored, no registry: exit 0, nothing said, nothing built, the sandbox still on 2.1.266
    and 1.18.30. This is requirement 5
  * D3, the same with `--rebuild` and the registry: exit 0, the two lines of requirement 6, the sandbox on 2.1.289
    and 1.18.34 and the labels likewise. The install step was `CACHED`: its command line, with those two exact
    versions, is the one step A had built minutes before. So requirement 17's "does not take the install from the
    cache" was not seen for the latest itself, and cannot be on a host that has built the latest before. What it
    stands for was seen: the image did not keep the older versions' layer
  * D4, neither, with only `CLAUDE_CODE_VERSION: 2.1.287` in the project's file, not committed: exit 0, the line
    of the difference for Claude Code from the project's compose file and the line of requirement 6 for OpenCode,
    and an install that ran, in 7 seconds, for a command line this host had not built: 2.1.287 with 1.18.34. The
    sandbox printed `2.1.287 (Claude Code)` and `1.18.34`. This is the exact version from the registry reaching
    an install that is not cached, which the spec lists as not established. The file was restored with
    `git checkout`
  * E, the host's own `PATH`, with both harnesses, no registry throughout: a start on the image of D4 printed "the
    image holds Claude Code 2.1.287 and 2.1.289 is wanted, from the host. Rebuilding.", built, and ran on 2.1.289
    and 1.18.34; a second start built nothing and said nothing; `--rebuild` built and said nothing. All exit 0. So
    a host with both harnesses never asks the registry, and behaves as 0027's record has it
  * F, no `npm` on the `PATH` and neither harness: `--rebuild` exits 2 with the two lines of requirement 7 and the
    image as it was; a start without `--rebuild` exits 0 and builds nothing. With `claude` alone on the `PATH`
    and no registry, `--rebuild` exits 2 and the two lines name OpenCode, `opencode-ai` and `OPENCODE_VERSION`
  * P1, an image built by release 2.3.0's wrapper, the one in `node_modules`, under the check's name: it holds
    2.1.266 and 1.18.30 and has neither version label, because release 2.3.0 is from before 0027. The working
    copy's wrapper then, with neither harness: exit 0, the two lines of requirement 6, a build, and the sandbox
    on 2.1.289 and 1.18.34. With neither and no registry: exit 2 with the lines of requirement 7, and the sandbox
    does not start although the image exists. With both harnesses and no registry: exit 0, "the image records no
    Claude Code version and 2.1.289 is wanted, from the host. Rebuilding." and the same for OpenCode
  * P2, an image built by `master`'s wrapper, which is 0027's and is in no release, in a scratch project, with
    neither harness: labels 2.1.266 and 1.18.30, the pins. The working copy's wrapper then, with neither and no
    registry: exit 0, nothing said, nothing built, the sandbox on 2.1.266 and 1.18.30. With `--rebuild`: the two
    lines of requirement 6 and the sandbox on 2.1.289 and 1.18.34
  **What P1 shows about requirement 11.** It says that an image built by an earlier release records exact
  versions, so that on a host without a harness the sandbox keeps the pinned version until `--rebuild`. That
  holds for an image built by `master`'s wrapper, as P2 shows. No release has that wrapper: 0027 is not released,
  and the image of release 2.3.0 records no version. So a project that updates from 2.3.0, on a host without a
  harness, gets the latest published version at its first start, by a build, and that start needs the registry.
  The wrapper does what requirements 5 and 11 ask in both cases, and nothing was built differently for it. The
  spec's sentence is the human's to correct or keep, and the release notes below follow what was seen.
  Seen in the build's output and not this unit's: npm in the image warns that the two packages have install
  scripts "not yet covered by allowScripts". Both harnesses printed their versions in the sandbox.
  Removed afterwards: the check's volume, network and image, and the four untagged images its rebuilds left, each
  carrying the check's Compose project label. The lists of image ids, of image names with ids, of volumes, of
  networks and of containers, taken before and after, are the same, compared with `diff`.
  `ritenoar-agentrite-agent` is still `143d91ec452a` and `ritenoar-agentrite-agent-dev` still `d11961d8abb8`.
  `./agent-dev.sh` was not run. Nothing was logged in to. The build cache keeps the layers of the check.
  Not tried: a start at a terminal, since standard input was `/dev/null` in every step; a login, a prompt, the
  status line and self-update in a sandbox on the latest versions, which are the four things the README now
  promises for no version; a registry that swallows the connection, which the planner measured at over two
  minutes for `npm view`; Docker Desktop for macOS and bash 3.2; a project with Playwright.
  For the human, at a terminal, when wanted: `./agent.sh` after the kit is released and installed, on this host,
  should print the two "records no ... version ... from the host. Rebuilding." lines once, since the image
  `ritenoar-agentrite-agent` is from release 2.3.0, and open a shell in which `claude --version` prints the
  host's version; a second `./agent.sh` should build nothing
- 2026-10-04T21:32:31Z [Claude Code, anthropic/claude-opus-5-5] as implementer, for the release notes, which are
  written at the release and not here. What a project that updates the kit will notice:
  * No edit to a file of the project's is needed
  * The kit pins no version of Claude Code or OpenCode any more, and says of no version that it was checked. The
    README's four version-dependent promises are made for no version, and the recovery is a version that works,
    held in the project's `agent/compose.project.yml`
  * On a host that has both harnesses nothing changes beyond what 0027 brings: the sandbox follows the host
  * On a host without a harness, or with one whose command prints no version, that harness in the sandbox is the
    latest published version on the day the image is built, where release 2.3.0 gave 2.1.266 and 1.18.30. The
    wrapper names it in a line. It stays until the image is built again: `./agent.sh --rebuild` brings a newer one
  * Updating from 2.3.0, the first start builds the image again, because that release's image records no
    versions, and on such a host that build installs the latest. Seen in the check, P1
  * A build on such a host runs `npm view <package> version` on the host, so it needs `npm` on the `PATH` and the
    registry in reach. When it has neither, the start stops with two lines and does not fall back to the image
    that exists. A version in the project's file, or the harness on the host, gets past it. A start that builds
    nothing asks the registry nothing
  * Not tested: macOS, and what a harness version nobody tried does in the sandbox
  Recommended by the main session and not taken up by the human, so not built: a time limit on the question to
  the registry. Without it a start on a host without a harness, with a network that swallows the connection,
  hangs at `npm view` until it is interrupted
- 2026-10-04T21:34:23Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the plan's Verification, on `6044e07`,
  on the host, outside any sandbox:
  * `npm test`: 246 tests, 246 passing, 0 failing, exit 0
  * `npm run check-changes`: exit 0, with no output of its own. Against `master`, of 0027 only `record.md`
    differs, by the amendment's 14 lines
  * `bash -n container/agent.sh`: exit 0
  * The `grep` for `pin` in `container/agent.sh`, `container/Dockerfile` and `container/compose.yml`: one line, the
    Dockerfile's on Alpine
  * `grep -rn -E '[0-9]+\.[0-9]+\.[0-9]+' container templates`: eight lines, all addresses in
    `container/egress-proxy.mjs` and `container/entrypoint.sh`, and no version of a harness
  * `npm pack --dry-run --json`: the same 24 paths as in a tree of `master` at `32004d6` taken with `git archive`,
    compared with `diff`
  * No line over 120 characters and no em dash in the files this unit changed, checked with `awk` and `grep`. One
    line of the amendment in 0027's record was 158 characters in `6044e07` and again, after a rewrap that went
    wrong, in `c498aaa`. The commit after that one rewraps the whole amendment, and corrects this sentence
  * `docker image ls`, `docker volume ls` and `docker network ls` show nothing named
    `ritenoar-agentrite-agent-check0030`
  Every task of the plan is ticked. The two commits after `6044e07` change only this record, the ticks in the plan
  and the wrapping of the amendment, and the suite and the change check are run on the last of them once more,
  with the result in the implementer's report to the dispatching session.
  Status stays `in-progress`: the unit waits for a review and for the human. Not pushed, not merged into `master`.
  Open for the human: requirement 11's sentence on an image of an earlier release, given what P1 showed; the
  lines of the wrapper that are longer than 120 characters as printed; and the time limit on the question to the
  registry
- 2026-10-04T21:54:34Z [human] decided what the check left open about requirement 11. Told what P1 and P2 showed,
  that the main session would have the planner correct the sentence to what was seen, and that the alternative is
  to change the behaviour so that an image with no labels is kept, which is more code for a transition made once:
  "Yes, let the planner correct 11". So the behaviour stays as built, and an image that records no version is
  built again. The time of this entry is when the words reached the planner, through the dispatching session
- 2026-10-04T21:54:34Z [Claude Code, anthropic/claude-opus-5-5] as planner, on the branch at `114a6dc`, corrected
  the spec and the plan for that. No behaviour, code, test, README or file under `container/` is changed. What
  changed:
  * R11 no longer says that an image of an earlier release records exact versions. It says what was seen: an
    image of release 2.3.0 records none and is built again at the first start after the update; on a host with
    both harnesses that build takes the host's versions; on a host without one it takes the latest and needs
    `npm` and the registry, and stops without them; an image whose labels record versions is kept until it is
    built again
  * The decision "An image from an earlier release is left as it is" is now about an image whose labels record
    versions, and says what it got wrong as first written
  * A decision is added as the human's: an image that records no version is built again, with the alternative and
    why it was not taken
  * The plan's paragraph for the release notes carried the same premise and is corrected to match
  "Not established" in the spec does not carry the premise and is as it was. Looked for the sentence elsewhere:
  the README's "The harness versions" already says that an image built by a release that did not write the labels
  is built again at the first start, and that the sandbox does not start when that build fails; the comments in
  `container/agent.sh` say that the wrapper builds when the image records no version. Neither repeats the untrue
  sentence, and the implementer's notes for the release, above, follow what was seen. Status stays `in-progress`
- 2026-10-04T22:06:34Z [OpenCode, openai/gpt-6.1-sol] as reviewer, reviewed 0030 at commit
  `e630e7617412474862489bcb60bffac4362f4377`. Full first review, against the merge base with `master`,
  `32004d6c3e60e9a24307ad17b32fb21a8219758c`; no earlier review found and no delta base. Returned S1 and C1;
  no independent plan-fidelity findings. Complete findings saved in
  `.reviews/0030-no-kit-harness-versions/2026-10-04-opencode-gpt-6.1-sol-full-e630e76.md`.
  Ran `npm test`: 246 tests, 246 passing, exit 0; `npm run check-changes`, `bash -n container/agent.sh` and
  `git diff --check` passed. The dry-run package's 24 paths match the merge base. Docker was available; used only
  read-only configuration, image inspection and inventory checks. Could not independently verify the historical
  live-build/cache matrix, registry-failure trials, timings, before/after cleanup comparisons or intermediate
  red-run counts within the review's permitted writes. No macOS/bash 3.2, Playwright-bearing project or interactive
  harness checks were run. Changed no work under review, updated no snapshot and left the untracked tarball alone
- 2026-10-04T22:11:36Z [human] on the review, in the main session, by the dispatching session's account on
  2026-10-05 of the human's calendar: "The reviewer is done reviewing; can you check the remarks and take the
  necessary actions or discuss if required?" The time of this entry is when the words reached the implementer
- 2026-10-04T22:11:36Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the outcome of the review's two
  findings. Under the human's words above, the main session accepted both, and chose the corrections. The
  acceptance and the corrections are the main session's, under that delegation, reported to the human and open to
  their correction. The reviewer's entry was committed as written, in `e65d235`.
  **C1, accepted, applied in `95da010`.** The search of `container/` and `templates/` for a version of a harness
  now also finds a version in single or double quotes and in the JSON form. Two tests hold the matcher: eleven
  examples that must match, and eight that must not, among them the bare argument, the `${...}` forms of
  `container/compose.yml` and the Dockerfile, and two addresses. Test first: with the examples added and the old
  matcher, the test of the examples that must match failed, exit 1, at `ARG OPENCODE_VERSION="1.18.30"`, and the
  old matcher, asked by hand, missed five of them: that one, `OPENCODE_VERSION: "1.2.3"`,
  `CLAUDE_CODE_VERSION: '2.3.4'`, `{"OPENCODE_VERSION": "1.2.3"}` and `{ "CLAUDE_CODE_VERSION":"2.3.4" }`. With the
  new matcher `npm test`: 248 tests, 248 passing, exit 0. It is still a search by name: a version written with no
  name of a harness before it is not found.
  **S1, accepted. Two corrections, of which the first is here and the second is the planner's.** The main
  session's reading of what the criterion is for: the wrapper hands the build an exact version, the install
  step's cache key holds it, so a version this machine has not built is installed afresh, and one it has built
  may come from the cache, which is that same version. The wording of requirement 17 is with the planner, and
  `spec.md` is not edited here.
  The observation, obtained on the host, with Docker Engine 28.4.0, Compose 2.39.2 and npm 11.11.0, under the
  Compose project `ritenoar-agentrite-agent-check0030`, through the working copy's wrapper, with neither harness
  on the `PATH`. What it is: the real wrapper, the real Docker build and the real install from the registry, with
  the answer to "what is the latest" supplied by a stand-in. The stand-in is an `npm` of the check's own, first
  on the `PATH`, that answers `view @anthropic-ai/claude-code version` with `2.1.286` and `view opencode-ai
  version` with `1.18.32`, and hands every other call to the real npm. It was needed because the true latest
  pair, 2.1.289 and 1.18.34, is in this machine's build cache: with the true latest the install was `CACHED`, as
  D3 above has it. The real `npm view <package>@<version> version` confirmed that both versions are published,
  exit 0 each. No record names that pair as built here; the build cache's own listing does not show the versions
  of a step, so that it was not cached was known only from the build's output.
  * S1a, with `CLAUDE_CODE_VERSION: 2.1.266` and `OPENCODE_VERSION: 1.18.30` in `agent/compose.project.yml`, not
    committed, and no image: exit 0, a build whose install step was `CACHED`, the sandbox on
    `2.1.266 (Claude Code)` and `1.18.30`, the labels likewise. The file was then restored with `git checkout`
  * S1b, the file restored, no `--rebuild`: exit 0, nothing said, nothing built, the stand-in not called, the
    sandbox still on 2.1.266 and 1.18.30
  * S1c, `--rebuild`: exit 0. The wrapper printed "agent.sh: neither the project nor the host gives a version of
    Claude Code, so the image is built with the latest published, 2.1.286." and the same for OpenCode with
    1.18.32. The stand-in recorded two calls, `npm view @anthropic-ai/claude-code version --fetch-retries=0` and
    `npm view opencode-ai version --fetch-retries=0`. In the build's output the step
    `RUN npm install -g ... "@anthropic-ai/claude-code@2.1.286" "opencode-ai@1.18.32"` ran: "added 5 packages in
    6s" and `#10 DONE 6.9s`, not `CACHED`, and the seven steps after it ran too. The sandbox printed
    `2.1.286 (Claude Code)` and `1.18.32`, and the labels are `2.1.286` and `1.18.32`
  * S1d, `--rebuild` once more: exit 0, the same two lines, two more calls to the stand-in, and the install step
    `CACHED`, with the image's id the same as after S1c. So a second build of the same exact pair takes the
    install from the cache, and holds that pair
  Removed afterwards: the check's volume, network and image, and the one untagged image the rebuild left, which
  carried the check's Compose project label. The lists of image ids, of image names with ids, of volumes, of
  networks and of containers, taken before and after, are the same, compared with `diff`.
  `ritenoar-agentrite-agent` is still `143d91ec452a` and `ritenoar-agentrite-agent-dev` still `d11961d8abb8`.
  No tracked file is changed. Nothing was logged in to. The build cache keeps the layers of the trial.
  Not shown, and not showable on this machine without removing its build cache: an install that runs for the
  pair the real registry calls the latest.
  The plan's task for the check does not quote the criterion. Its tick stays, and rests on this trial together
  with the planner's rewording, which the plan now says under "Adjusted while implementing".
  Status stays `in-progress`

## Amendments
