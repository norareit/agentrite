# 0059 A project adds software to the sandbox

## Approach

Written against `130ac4f` on `feature-0059-a-project-adds-software-to-the-sandbox`. Before the work,
`node --test tests/*.test.mjs` on the Linux host, with Docker, reports 725 tests: 724 pass and 1 fails. The failing
one is unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which holds the root `agentrite.json` byte for
byte against the installed 7.1.0 template, and fails since the root file gained `standards`, `roles` and `bell`. It
is no part of this spec and stays failing. Every other test is kept green at every commit point.

The work is in four steps. The tests of step 2 fail until step 3, so the two are one commit:

1. **The fixtures.** The fake `docker` of `tests/wrapper-fixture.mjs` learns the one new question the wrapper asks
   of every image, and a second host is added whose `docker` is the real one but for Compose, so that the builds
   and the refusal are tested with Docker and without the network (R14)
2. **The Docker tests**, failing against today's wrapper (R5, R6, R7, R8, R9, R10, R14)
3. **The wrapper.** `container/sandbox.sh` builds the project's file on the kit's image, decides when, and refuses an
   image that changes how a container starts (R1 to R3, R5 to R10)
4. **The documents** (R11 to R13, and the comments the unit makes untrue)

Last comes the check by hand of R4, on the host with Docker and the network.

### Decided here, so that the implementer does not re-derive it

**The names.** `image` is what the merged configuration gives as `services.sandbox.image`, as today. With a
`sandbox/Dockerfile`, the kit's image is `$image-base`, and `$image` is the project's file built on it. Without one,
`$image` is the kit's image, as today, and `$image-base` is not looked at (R1, R3).

**How the two are built (R2, R3, R6, R7).** The kit's image is built as today, with `"${compose[@]}" build`, which
tags it `$image`. With a `sandbox/Dockerfile`, the wrapper then tags it `$image-base` with `docker tag`, and builds
the project's file with

```sh
docker build --build-arg "AGENTRITE_IMAGE=$image-base" \
  --label "com.ritenoar.agentrite.project-dockerfile=$project_dockerfile_digest" \
  --file "$root/sandbox/Dockerfile" --tag "$image" "$root"
```

which retags `$image`. Plain `docker build` and no Compose: a second service would need a file of the kit's that
every project merges, and a named build context is what the spec's decision rejected. Checked on the host's Docker
29 with its default builder: a `FROM` of an image that is only local is taken from the local store with no pull,
and a `--label` given on the command line replaces a `LABEL` of the same name in the file. A failing build ends the
wrapper under `set -e` with the build's own output and status (R7). When the kit's build succeeds and the project's
then fails, `$image` is left the kit's image, without the label below, so the next start builds again.

**What is recorded and read (R5, R9).**

* The project's file is recorded on `$image` as the label `com.ritenoar.agentrite.project-dockerfile`, whose value
  is `sha256:` and the SHA-256 of the file's bytes, in hex. The wrapper computes it with `node`, which the host has
  already, reading the file's bytes, so that `sha256sum` and `shasum` are not needed on Linux and macOS alike. It is
  given with `--label`, so a label of that name in the file does not count (R9)
* The harness versions are read from the kit's image: `$image-base` with a `sandbox/Dockerfile`, `$image` without.
  So a label of either version that the file sets does not count (R9)
* A label of the project's file is read only from `$image`, and is taken to be there only when it has the shape of
  a recorded one, `sha256:` and 64 hex digits, so that Docker's `<no value>` for an image with no labels reads as
  none

**When a start builds (R5, R6).** The two decisions, in this order:

* The kit's image is built on `--rebuild`, when the kit's image is not there, when a harness needs it as today, and,
  without a `sandbox/Dockerfile`, when `$image` holds a label of a project's file: the file was removed since. The
  registry is asked for a latest version only when the kit's image is built, as today
* With a `sandbox/Dockerfile`, the project's file is built when the kit's image was built in this start (R6), when
  `$image` is not there, and when the label `$image` holds is not the digest of the file, which covers a file added
  since, as an image without the label, and a file changed since

Neither holds, and nothing is built and nothing is asked of the network. Each build the wrapper starts by itself
says why, as the harness builds do today:

* `sandbox.sh: sandbox/Dockerfile is not the file the image was built from. Rebuilding.`, for a file added or
  changed since
* `sandbox.sh: the image was built from a sandbox/Dockerfile that is no longer there. Rebuilding.`, for a file
  removed since

A missing image is built without a line, as today. A `$image-base` left from a file since removed is left on the
host; "Where things are kept on the host" says how to remove it.

**The refusal (R8).** At every start with a `sandbox/Dockerfile` that runs a container, after the builds and before
the log directory, the clone and the container are made, the wrapper reads, of both `$image` and `$image-base`, with
one `docker image inspect --format` each:

| What                  | Read as                       | Set in the file by |
|-----------------------|-------------------------------|--------------------|
| the entrypoint        | `{{json .Config.Entrypoint}}` | `ENTRYPOINT`       |
| the command           | `{{json .Config.Cmd}}`        | `CMD`              |
| the user              | `{{.Config.User}}`            | `USER`             |
| the working directory | `{{.Config.WorkingDir}}`      | `WORKDIR`          |

For each that differs it prints one line, `sandbox.sh: the image <image> has the <what> <value>, and the kit's image
<image>-base has <value>.`, with an empty value written as `none`. After them, once: that the kit's entrypoint is
what installs the firewall and drops to the agent, so nothing was started, and to remove from `sandbox/Dockerfile`
what sets each of them, naming the instructions of the table for those that differ, then to start again, which
builds the image anew. It exits with 2, as the wrapper's other refusals do. A file that sets `ENTRYPOINT` also
empties the command, so both are named, and removing the `ENTRYPOINT` corrects both.

**The forms (R10).** The build and the refusal sit where the build is today, which every form that starts a
container passes through: a unit run, `--in-place` and `--workdir`. A unit run reaches it after its two refusals
of today and before its clone is made, so a refused unit run leaves no clone. `--connect` starts no container and
is left as it is. `./sandbox-dev.sh` passes `--rebuild` and so builds both images at every start but `--connect`.

**The Docker host of the tests (R14).** Building the kit's real image needs the network and minutes, so the tests
build a stand-in for it. `dockerHost(base, recorded)` in `tests/wrapper-fixture.mjs` makes a `bin` as `fakeHost`
does, with the same `claude`, `opencode` and `npm`, and a `docker` that:

* answers `compose ... config --format json` as `fakeHost`'s does. The node script that answers it moves into a
  constant of the fixture that both hosts use, rather than being written twice
* for `compose ... build`, records the call and runs the real `docker build` of a stand-in kit file, written by the
  fixture under `base`: `FROM scratch`, a `COPY` of one marker file, the two harness labels from
  `SANDBOX_CLAUDE_CODE_VERSION` and `SANDBOX_OPENCODE_VERSION`, `WORKDIR /work`,
  `ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]` and `CMD ["bash"]`, tagged with the image name of the merged
  configuration. A file named `buildFails` makes it fail, as in `fakeHost`
* for `compose ... run`, records the call and runs nothing
* passes every other call to the real `docker`, found on the suite's `PATH` when the fixture is made, recording
  `build` and `tag` calls as it passes them

Every project file of the tests builds from the stand-in with `COPY` and `LABEL`, `ENTRYPOINT`, `CMD`, `USER` and
`WORKDIR` alone, so no build pulls an image or runs a command. The project's `sandbox/compose.project.yml` holds a
`name:` unique to the test, which the fake `config` makes the image's name, and each test removes `$image` and
`$image-base` with `docker image rm --force` when it ends. Without Docker the tests are skipped with the reason the
Docker tests of `tests/bell.test.mjs` and `tests/sandbox-signal.test.mjs` give.

## Files

- `tests/wrapper-fixture.mjs`: the fake `docker` answers an `image inspect` whose format names the project's file's
  label with the content of a new file `imageProjectDockerfile`, empty by default; the shared `config` answer;
  the new `dockerHost`
- `tests/sandbox-project-dockerfile.test.mjs`: new, the Docker tests of R5 to R10
- `container/sandbox.sh`: the digest, the two build decisions, the build of the project's file, the refusal, and its
  header comment
- `container/compose.yml`: its header comment, which says what a project layers over the kit
- `SANDBOX.md`: the section "Adding software to the sandbox" and its line in the contents, "Where things are kept on
  the host", the entry "The sandbox does not start, although an image exists." of "When something goes wrong"
- `README.md`: the row of `--rebuild` in "Commands", and the list of the files a project configures the sandbox with
  in "The sandbox"

## Tasks

### The fixtures

- [x] In `tests/wrapper-fixture.mjs`, move the node script that answers `config --format json` into a constant used
  by `fakeHost`, with no change of behavior, and run `tests/sandbox-wrapper.test.mjs`,
  `tests/sandbox-unit-run.test.mjs` and `tests/sandbox-dev.test.mjs` green (R14)
- [x] Have `fakeHost`'s `docker` answer an `image inspect` whose format names
  `com.ritenoar.agentrite.project-dockerfile` with the content of `imageProjectDockerfile`, empty unless a test
  writes it, and every other `image inspect` as today. Return the path from `fakeHost` and describe it in the
  fixture's comment (R5)
- [x] Add `dockerHost(base, recorded)` to `tests/wrapper-fixture.mjs` as "The Docker host of the tests" says, with
  a comment in the manner of `fakeHost`'s that lists what its `docker` answers itself, what it records and what it
  passes on (R14)

### The Docker tests

Each in `tests/sandbox-project-dockerfile.test.mjs`, with a project set up as `setUp` of
`tests/sandbox-wrapper.test.mjs` does, on `dockerHost`, run as `--in-place echo hi` unless it says otherwise. A test
that says a start builds nothing holds that the second start records no `build`. Run them, and see each fail
against today's wrapper for the reason it is there.

- [ ] A project file that copies a file in: the first start builds the kit's image and then the project's, `$image`
  holds the copied file and the stand-in's marker, `$image-base` holds the marker and not the copied file, and
  `$image` holds the label of the file's digest. A second start builds nothing and runs (R1, R2, R3, R5)
- [ ] Without a project file, a start builds the kit's image under `$image` and no `$image-base`, as today (R1)
- [ ] A project file changed after a build: the next start says the file is not the one the image was built from,
  builds the project's file and not the kit's image, and `$image` holds the new file's digest (R5)
- [ ] A project file added after a build without one, and one removed after a build with one: each next start says
  why and builds, and the start after it builds nothing. After the removal, `$image` holds no label of a project's
  file (R5)
- [ ] A kit's image built anew, by `--rebuild` and by a host whose `claude` reports another version: the project's
  file is built in the same start, and `$image` holds the new version's label, inherited from `$image-base` (R6)
- [ ] A project file whose build fails, by a `COPY` of a file that is not there: the start exits with a status
  other than 0, prints Docker's own output, and records no `run`. With `buildFails`, the kit's build that fails
  ends the start before the project's file is built (R7)
- [ ] One test each for a project file that sets `ENTRYPOINT`, `CMD`, `USER` and `WORKDIR`: the start exits with 2
  and records no `run`, its message names what differs with both values, the firewall and the drop to the agent,
  and the instruction to remove. A second start, which builds nothing, is refused the same. With the instruction
  removed from the file, the next start builds and runs (R8)
- [ ] A project file that sets `ENTRYPOINT` is refused in a unit run before its clone is made: no directory under
  the state home, and no `run` recorded (R8, R10)
- [ ] One test each for a project file that sets `com.ritenoar.agentrite.claude-code-version`,
  `com.ritenoar.agentrite.opencode-version` and `com.ritenoar.agentrite.project-dockerfile` to another value: the
  second start builds nothing. For the version labels, a host whose `claude` reports another version still builds
  both images, and a file whose label names the host's new version while `$image-base` holds the old one does not
  stop that build (R9)
- [ ] The dev shim, run as `tests/sandbox-dev.test.mjs` runs it, on `dockerHost`, with a project file: a start
  builds both images although they exist, and `--connect` builds nothing (R10)

### The wrapper

- [ ] In `container/sandbox.sh`, compute the digest of `sandbox/Dockerfile` when there is one, with `node`, and
  name the kit's image `$image-base` or `$image` as "The names" says (R1, R3, R5)
- [ ] Read the harness versions from the kit's image, and decide the kit's build as "When a start builds" says,
  with its line for a file removed since. Keep the registry asked only when the kit's image is built (R5, R9)
- [ ] Decide the project's build as "When a start builds" says, with its line for a file added or changed since
  (R5, R6)
- [ ] Build: the kit's image as today, then, with a project file, its tag `$image-base` and the `docker build` of
  "How the two are built" (R2, R3, R6, R7)
- [ ] Refuse an image that changes how a container starts, as "The refusal" says, at every start with a project
  file that runs a container, before the log directory is made (R8, R10)
- [ ] Update the header comment of `container/sandbox.sh`, which says how the wrapper decides to build, and the
  usage line of `--rebuild`, which then builds both images. Update the header comment of `container/compose.yml`,
  which says what a project layers over the kit, to name `sandbox/Dockerfile`. No requirement names them: the
  comments would otherwise be untrue
- [ ] Run the whole suite on the host with Docker: the new tests pass, and every other but the R24 test of unit 0054
  (R14)

### The documents

- [ ] In `SANDBOX.md`, add "Adding software to the sandbox" after "Holding a harness version", and its line in the
  contents. It says each point of R11, in its order: where the file is, the two lines, that it is built on the
  kit's image as root with the project root as the context; the JDK example, which installs `openjdk-17-jdk-headless`
  from bookworm's packages with `apt-get` and sets `JAVA_HOME` to `/usr/lib/jvm/java-17-openjdk-${arch}` through
  the `TARGETARCH` that BuildKit gives, so it holds on amd64 and arm64; what must not be changed and that a start
  refuses it; the build on the host's network; the committed file and the checkout it is read from; when the image
  is built anew and that `--rebuild` builds both; the `ALLOWLIST` with a link to "Reaching more hosts"; and the four
  things a file must not do, each with what goes wrong and what to do instead (R11)
- [ ] In "Where things are kept on the host" of `SANDBOX.md`, add the kit's image `<image>-base` to the table, with
  `docker image rm <image>-base`, and say under "The image" when it is there, that it is the base of the project's
  file, and that the next start with a project file builds it again (R12)
- [ ] In "When something goes wrong" of `SANDBOX.md`, extend "The sandbox does not start, although an image exists."
  with a failing build of `sandbox/Dockerfile`: Docker's output names the instruction that failed; correct the file,
  or remove it without committing the removal to start while it cannot build. No requirement names it: the rule of
  `AGENTS.md` that a failure a reader recovers from is an entry of that section does
- [ ] In `README.md`, list `sandbox/Dockerfile` among the files a project configures the sandbox with in "The
  sandbox", as a file the project may add, which `init` and `refresh` do not write, with a link to its section of
  `SANDBOX.md`. Say in the row of `--rebuild` in "Commands" that it builds the project's file too (R13)
- [ ] Check that every line touched in the four documents and the two comments fits 120 characters, and that the
  documents hold no em dash

### The check by hand

- [ ] On the host with Docker and the network, put the example of `SANDBOX.md` in this repository's
  `sandbox/Dockerfile`, uncommitted, and run
  `./sandbox-dev.sh --in-place bash -c 'java -version && javac -version && grep CapEff /proc/self/status'`. The
  sandbox starts, so the entrypoint's checks passed, both commands succeed, and `CapEff` is `0000000000000000`.
  Remove the file again, and record the outcome in `record.md` (R4)

## Verification

- [ ] `node --test tests/*.test.mjs` on a host with Docker: every test passes but the R24 test of unit 0054, and
  none of the new ones is skipped
- [ ] `npm run check-changes` passes on the committed branch

## Commit Points

- [x] `feature-0059 Plan the unit`: `plan.md` and the log entry of `record.md`
- [x] `feature-0059 Give the tests a host whose Docker is real but for Compose`: the fixtures, with every test as
  green as before
- [ ] `feature-0059 Build a project's Dockerfile on the kit's image, and refuse one that changes how it starts`: the
  Docker tests, the wrapper and its two comments
- [ ] `feature-0059 Describe a project's Dockerfile`: `SANDBOX.md` and `README.md`
