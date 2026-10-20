---
kind: feature
status: draft
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

## Amendments
