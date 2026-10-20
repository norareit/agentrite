---
kind: feature
status: in-progress
timestamp: 2026-10-19T15:48:11Z
---

# 0059 A project adds software to the sandbox

## Log

- 2026-10-19T15:48:11Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `056ce9b`, on the human's request to specify a scratch note: AloudRite-IntelliJ needs a JDK in the
  sandbox, and a project that uses the kit needs a way to add a JDK, or what else it requires, to the image. Made
  the unit as a feature. Numbered 0059: the highest number in `changes/` is 0058. Read the build of
  `container/compose.yml`, the end of `container/Dockerfile`, how `container/sandbox.sh` decides to build, the
  non-goal of unit 0054 on software in the sandbox, "The image" of `SANDBOX.md`, and the `sandbox/` of
  AloudRite-IntelliJ, which installs release 6.0.0 and adds nothing to its image. Wrote `spec.md`. The status is
  `draft`
- 2026-10-20T13:19:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision that the
  check of "Beyond the request" is part of the unit, so that a developer does not end up without a sandbox by
  accident. Read the end of `container/Dockerfile`, which sets the working directory, the entrypoint and the command,
  and leaves the user root. Changed `spec.md`: requirement 8 refuses, at every start with a `sandbox/Dockerfile`, an
  image whose entrypoint, command, user or working directory differs from the kit's image, and the requirements
  after it are renumbered; `SANDBOX.md` says so; requirement 13 tests the builds and the refusal with Docker. Added
  the decision on the check, replaced the non-goal of the check by one on `sandbox/compose.project.yml`, and left
  "Beyond the request" empty. The status is `draft`
- 2026-10-20T13:28:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question what
  happens when a project's file conflicts with the kit's. Read the checks of `container/entrypoint.sh` at start-up
  and the variables `container/Dockerfile` sets, and set out to the human what is caught and what is not. The human
  decided that a label of the project's file does not change what the kit decides, that `SANDBOX.md` lists what
  else a file must not do, and that `sandbox/compose.project.yml` gets no check. Changed `spec.md`: requirement 9 on
  the labels, and the requirements after it renumbered; the list in the section of `SANDBOX.md`; requirement 14
  tests the labels; two decisions, and the non-goal of the compose file says the human left it out. The status is
  `draft`
- 2026-10-20T13:29:49Z [human] approved the spec. The status is `approved`
- 2026-10-20T13:37:55Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0059-a-project-adds-software-to-the-sandbox` from `master` at `130ac4f`. Read `container/sandbox.sh`,
  `container/compose.yml`, `container/Dockerfile`, the fixtures of the wrapper's tests and the Docker tests of the
  suite, and the sections of `SANDBOX.md` and `README.md` the spec names. Checked on the host's Docker that a build
  takes a `FROM` of an image that is only local without a pull, and that a `--label` of the command line replaces a
  `LABEL` of the same name. Ran the suite: 725 tests, 724 pass, and unit 0054's R24 test of
  `tests/repository-own-files.test.mjs` fails, as it did before this unit. Wrote `plan.md`. The status is
  `approved`
- 2026-10-20T13:45:29Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `feature-0059-a-project-adds-software-to-the-sandbox` at `395dfb0`, began the work. The status is `in-progress`
- 2026-10-20T13:58:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the fixtures. Beyond the
  plan's moving of the `config` answer into a constant, `fakeHost` and `dockerHost` share the making of `bin` with
  its `claude`, `opencode` and `npm`, which the plan has `dockerHost` make as `fakeHost` does. `dockerHost`'s
  `docker` gives the real one the suite's `DOCKER_CONFIG` and `DOCKER_HOST`, since a test runs the wrapper with a
  home of its own, which would otherwise hide a Docker context the suite's host sets. `node --test tests/*.test.mjs`
  on the Linux host with Docker 28.4.0: 725 tests, 724 pass, and unit 0054's R24 test fails, as before
- 2026-10-20T14:31:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the Docker tests of
  `tests/sandbox-project-dockerfile.test.mjs` and ran them against the wrapper of `86b7951`: 18 of the 20 fail, each
  because no project file is built or nothing is refused. The two that pass hold what the wrapper did before the
  unit: a start without a project file builds the kit's image alone, and a failing build of the kit's image ends the
  start. Then built the wrapper. A first run showed BuildKit warning `InvalidDefaultArgInFrom` at every build of a
  project file, for the `FROM ${AGENTRITE_IMAGE}` of the two lines R2 prescribes, although the kit always gives the
  argument. Added a task to `plan.md` and gave the build
  `--build-arg BUILDKIT_DOCKERFILE_CHECK=skip=InvalidDefaultArgInFrom`, which the first Docker test holds. The
  refusal names the instructions that differ separated by commas. `node --test tests/*.test.mjs` on the Linux host
  with Docker 28.4.0: 745 tests, 744 pass, none skipped, and unit 0054's R24 test fails, as before

## Amendments
