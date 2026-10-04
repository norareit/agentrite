# 0027 The sandbox's harness versions follow the host

## Approach

Three files of the kit change, and the README.

**The Dockerfile** keeps the two `ARG` lines at its top, with the pins as their defaults, in the form
`ARG CLAUDE_CODE_VERSION=<version>` at the start of a line. In the last stage, after the `RUN` that installs the
harnesses, it gains:

```dockerfile
LABEL com.ritenoar.agentrite.claude-code-version="${CLAUDE_CODE_VERSION}" \
      com.ritenoar.agentrite.opencode-version="${OPENCODE_VERSION}"
```

A `LABEL` after the install does not change the install layer's cache key.

**The base Compose file** gains two build arguments beside `AGENT_UID`, each from a variable the wrapper sets, with
the error `AGENTRITE_CONTAINER` already gives when the wrapper is bypassed:

```yaml
CLAUDE_CODE_VERSION: ${AGENT_CLAUDE_CODE_VERSION:?run the sandbox through the project's agent.sh}
OPENCODE_VERSION: ${AGENT_OPENCODE_VERSION:?run the sandbox through the project's agent.sh}
```

A project's file that names either argument replaces that one value in the merged configuration.

**The wrapper**, in this order, after the root check and before anything asks Compose a question:

1. For each harness, work out the version to hand to Compose: the host's, by requirement 2, or else the kit's pin,
   read from the wrapper's own directory with `sed -n 's/^ARG CLAUDE_CODE_VERSION=//p' "$here/Dockerfile"` and the
   same for OpenCode. A pin that cannot be read is an error that names the Dockerfile and exits 2. Remember for
   each whether it came from the host or the kit
2. Export `AGENT_CLAUDE_CODE_VERSION` and `AGENT_OPENCODE_VERSION` with those values, assigning them
   unconditionally so that a caller's value is not used
3. Ask Compose once for the merged configuration, capturing it first so that a configuration Compose refuses stops
   the wrapper with Compose's own error, as today: `config="$("${compose[@]}" config --format json)"`. Then have
   `node` print three lines from it, `services.agent.image` and the two values under `services.agent.build.args`.
   This replaces the `config --images` call
4. A version in the merged configuration that differs from what the wrapper exported comes from the project's
   file. That is the only way the wrapper learns of an override, and it is all it needs: the version to compare is
   always the merged one
5. Unless `--rebuild` was given, read the image's two labels in one
   `docker image inspect --format '{{ index .Config.Labels "<label>" }}|{{ index .Config.Labels "<label>" }}'`. A
   non-zero exit is a missing image, and builds as today. Otherwise compare each label with the merged version,
   print the line of requirement 6 for each that differs, and build when either does
6. Build and run as today

The lines the wrapper prints, with the source as one of `the project's compose file`, `the host` and `the kit`:

```
agent.sh: 'claude --version' printed no version, so the sandbox gets the kit's Claude Code 2.1.266.
agent.sh: the image holds Claude Code 2.1.266 and 2.1.289 is wanted, from the host. Rebuilding.
agent.sh: the image records no OpenCode version and 1.18.34 is wanted, from the host. Rebuilding.
```

Keep the additions within bash 3.2: no `mapfile`, no associative arrays, no `${var,,}`, and an array expanded only
in the guarded form the wrapper already uses. The host's command runs with `</dev/null 2>/dev/null`, and under
`set -euo pipefail` its failure must not end the wrapper.

The tests run no Docker. The fixtures of `tests/agent-wrapper.test.mjs` and `tests/agent-dev.test.mjs` put a fake
`docker` first on the `PATH`, with the `PATH` of whoever runs the suite behind it, where a real `claude` may be. From
this unit on the wrapper runs with a `PATH` that holds the fixture's `bin` and nothing else. The fixture links into
it the few commands the wrapper runs, `bash`, `node` and the core utilities it uses, each found on the suite's own
`PATH`, and writes a fake `claude` and a fake `opencode` there that print a fixed version. A test that wants a
harness absent removes its fake, and one that wants it to misbehave rewrites it. A node's directory cannot be put on
the `PATH` instead, because a harness installed with `npm install -g` sits in it.

The fake `docker` answers `config --format json` with the image name and with build arguments taken from the two
variables it sees, unless the test gives it a project's value for one, and answers `image inspect` with the labels
the test gives it or with exit 1. It records the two variables with each call it records, in the way it records
`AGENTRITE_CONTAINER`. Until the wrapper is changed it answers `config --images` as well, and that answer is
removed with the call. The fixture copies the working copy's `container/Dockerfile` beside the wrapper, so that the
pins the tests see are the real ones, read from the file by the test and not written into it.

Requirement 12 runs Docker, on the host. The wrapper is run from the working copy under a name of the check's own,
for example `AGENT_PROJECT_NAME=agentrite-0027-check container/agent.sh "$PWD" claude --version`, which this
repository's project Compose file turns into the Compose project, the image and the home volume. `./agent-dev.sh`
is not used for it, because it always rebuilds. A session whose permissions refuse a shell in a container gives the
command to run directly, as above, and leaves the terminal interfaces to the human.

Unit 0026, a task on another branch, adds text under "Running the sandbox" in the README. Whichever lands second
places its text beside the other's. Nothing 0026 says is made untrue by this unit: the image is still built on
first use, and `--rebuild` still builds.

## Files

- `tests/agent-wrapper.test.mjs`: the fixture, and the tests below
- `tests/agent-dev.test.mjs`: the fixture only, so that its three tests of the shim pass against the new wrapper
- `tests/wrapper-fixture.mjs`: new, added while implementing. The `PATH` of the fixture's own and the fake `docker`,
  `claude` and `opencode`, which both fixtures above use, so that they are written once
- `tests/harness-versions.test.mjs`: new, the tests that read `container/Dockerfile` and `container/compose.yml`
- `container/Dockerfile`: the two labels, and the two comments that call the kit the single place a version is
  pinned and the harnesses pinned
- `container/compose.yml`: the two build arguments with a comment, and the header comment's sentence on what the
  wrapper adds
- `container/agent.sh`: as above, and its header comment
- `README.md`: the sentence under "Running the sandbox", a new subsection "The harness versions" after "The home
  volume", one sentence under "Logging in to a model provider", and one bullet under "Trying the working copy's
  sandbox"
- `changes/0027-harness-versions-follow-the-host/record.md`: the log

Not touched: `templates/`, `scripts/`, `agent/compose.project.yml`, `agent-dev.sh`, `package.json` and
`CHANGELOG.md`.

## Tasks

- [x] Change the two fixtures as the approach describes, with nothing else changed, and see the existing tests
  pass on the unchanged wrapper. Commit this on its own: it is a refactoring of the tests (R11)
- [ ] Write `tests/harness-versions.test.mjs`. The first and the last test pass on the unchanged tree and guard
  what 0028 will bump; see the other two fail (R4, R5, R11):
    * `container/Dockerfile` has exactly one line that starts `ARG CLAUDE_CODE_VERSION=` and one that starts
      `ARG OPENCODE_VERSION=`, each followed by a version in the shape of requirement 2 and nothing else
    * its last stage sets the two labels of requirement 5 from the two build arguments, after the install
    * `container/compose.yml` gives both build arguments from `AGENT_CLAUDE_CODE_VERSION` and
      `AGENT_OPENCODE_VERSION`
    * no other file in `container/`, and no file in `templates/`, holds either pinned version number
- [ ] Add to `tests/agent-wrapper.test.mjs`, and see each fail on the unchanged wrapper (R11):
    * with both fakes printing versions, in the two forms the real commands use, `2.1.289 (Claude Code)` and
      `1.18.34`, every Compose call sees those two versions in the two variables (R1, R2)
    * with neither harness on the `PATH`, the calls see the Dockerfile's two pins, and standard error is empty
      (R1, R3, R4)
    * with only one harness on the `PATH`, that one is the host's and the other the pin (R1)
    * a pre-release version such as `0.0.0-dev-202610030456` is passed on (R2)
    * for each of a fake that exits 1 after printing a version, one that prints nothing, and one that prints
      `error: not a version`, `1.2` and `1.2.3; rm -rf x`: the pin is used, and standard error names the command in
      one line (R2, R3)
    * with the caller's environment holding other values for the two variables, the calls see the host's (R9)
    * an image whose labels equal the wanted versions: no `build` call, one `run` call, and nothing on standard
      error (R6)
    * an image with one label that differs: one line on standard error naming that harness, both versions and
      `the host`, then `build`, then `run`. With both differing, two lines (R6)
    * an image with no labels: two lines saying that it records none, then `build`, then `run` (R7)
    * the project's value for one harness in the merged configuration: with the image holding that value and the
      host's for the other, no build; with the image holding the host's for both, one line naming
      `the project's compose file`, then `build` (R1, R6)
    * neither harness on the `PATH` and an image labelled with other versions than the pins: two lines naming
      `the kit`, then `build` (R1, R6)
    * `--rebuild` with labels that match: `build`, then `run`, and no line (R8)
    * a `build` that exits non-zero: the wrapper exits non-zero and no `run` call is recorded (R8)
    * the existing test of a configuration Compose refuses still holds: Compose's error, nothing from `node`, no
      call recorded (R8)
- [ ] Add the labels to `container/Dockerfile` and the two build arguments to `container/compose.yml`, each with
  its comment. `tests/harness-versions.test.mjs` passes (R4, R5)
- [ ] Change `container/agent.sh` as the approach describes. The whole suite passes, the three tests of
  `tests/agent-dev.test.mjs` among them (R1, R2, R3, R6, R7, R8, R9)
- [ ] Make every comment in `container/` true: the Dockerfile's "single place either version is pinned" and "Both
  harness CLIs, pinned", the wrapper's header, and the base Compose file's sentence on what the wrapper adds. Search
  what ships and the README for `pinned`, `pin` and both version numbers, and leave nothing that says the kit alone
  decides the versions (R14)
- [ ] `npm pack --dry-run` lists the same 23 files as on `master`, and
  `git diff master -- templates scripts agent agent-dev.sh package.json CHANGELOG.md` is empty (R10)
- [ ] In `README.md` (R13, R14):
    * under "Running the sandbox", replace the sentence "The harness versions are pinned in `container/Dockerfile`,
      so a project updates Claude Code and OpenCode by updating the kit, as below, and rebuilding." with one that
      points to the new subsection. The spec approves replacing it: it is no longer true
    * add the subsection "The harness versions" after "The home volume", saying, in this order:
        * the image holds Claude Code and OpenCode, each at the first of: the version the project's
          `agent/compose.project.yml` gives, the version installed on the host, the version the kit pins in
          `container/Dockerfile`
        * the lines a project adds to hold a version, as a YAML block with `build:`, `args:` and the two
          arguments under `services.agent`, either or both, each an exact version. A tag such as `latest` is
          installed once, when the image is built, and not again
        * the host's version is what `claude --version` and `opencode --version` print for the command on the
          `PATH` of whoever runs `./agent.sh`. A harness that is not there, or is reached only through a shell
          alias, counts as not installed, and the sandbox gets the kit's version of it
        * at each start the wrapper compares the wanted versions with those the image was built with, which the
          image holds as two labels, and rebuilds by itself when they differ, saying which and why. No flag is
          needed after a harness is updated on the host. When that build fails, the sandbox does not start
        * how to see what an image holds: `docker image inspect` with the two labels, or `claude --version` in the
          sandbox
        * the image is per machine, so two developers on one project run what their hosts have, until the project
          holds a version
        * each rebuild leaves the image it replaced behind, untagged, at about 0.6 GB. `docker image prune` removes
          them
        * self-update stays off inside the sandbox: its root is read-only
        * what the kit promises for a version it did not pin and what it does not, what a developer sees, and the
          recovery, each as the spec's boundary paragraph lists them
    * under "Logging in to a model provider", after the command, one sentence: the method's label is the one the
      version of OpenCode the kit pins uses, and another version may name it differently
    * under "Trying the working copy's sandbox", one bullet: it takes the harness versions as `./agent.sh` does,
      so on a host with the harnesses it runs the host's and not the pinned ones
- [ ] Check it for real on a host with Docker, as requirement 12 lists, under the name `agentrite-0027-check`, and
  log what was seen with the Docker and Compose versions and the host's harness versions. Note the ids of the images
  `ritenoar-agentrite-agent` and `ritenoar-agentrite-agent-dev` before and after, which must be the same. The fake
  `claude` is a script in a temporary directory put first on the `PATH` for that one command. The image built
  from `master`'s Dockerfile comes from a `git worktree` of `master`, with its own wrapper run under the check's
  name, and not from a stash, which every worktree of the repository shares. Revert the uncommitted
  edit to `agent/compose.project.yml`. Remove the image, the volume `agentrite-0027-check_agent-home`, the network
  `agentrite-0027-check_default` and the untagged images the check left. For the last item of requirement 12, read
  `/run/egress-proxy.log` in the sandbox with `grep 'not allowlisted'`, and leave the terminal interfaces to the
  human when the session cannot drive them, saying so in the record (R12)

## Verification

- [ ] `npm test` exits 0 on the host, which has both harnesses, and reports the same count with a `claude` and an
  `opencode` that print nonsense put first on the `PATH`
- [ ] `npm run check-changes` exits 0 on the committed branch
- [ ] No line of a changed file is over 120 characters, and none holds an em dash
- [ ] `git status --short` shows nothing left of the real check's temporary edits, and `docker image ls`,
  `docker volume ls` and `docker network ls` show nothing named `agentrite-0027-check`
- [ ] Each requirement of the spec is met by a ticked task above, and anything requirement 12 found that the spec
  does not expect is in the record, named to the human

## Commit Points

- [x] `feature-0027` the fixtures of the two wrapper tests, with no behavior changed
- [ ] `feature-0027` the tests, the labels, the build arguments and the wrapper
- [ ] `feature-0027` the comments in `container/`
- [ ] `feature-0027` the README
- [ ] `feature-0027` the record of the real check
