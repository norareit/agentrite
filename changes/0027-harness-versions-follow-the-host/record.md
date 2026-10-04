---
kind: feature
status: draft
timestamp: 2026-10-04T13:26:44Z
---

# 0027 The sandbox's harness versions follow the host

## Log

- 2026-10-04T13:19:18Z [human] found in Norareit that the sandbox still had Claude Code 2.1.266 while the host had
  2.1.289, was told that a newer version arrives only through a kit release that bumps the pin, and decided: "I
  think the decision to pin them in the harness is wrong actually. New versions of OpenCode and Claude Code arrive
  almost daily. It makes no sense to have to bump the kit each time this happens. Two options: somehow read the
  version of the host and pass these along. OR at least verify that override and document it as the PREFERRED
  approach. We can still add the bumps in new version everytime (this should probably be added to 'creating the
  release' along with the release notes." The implementer of that session verified the override and proposed both
  options in layers: the project's override, then the host's version, then the kit's pin. The human said yes to
  handing that to a planner, as a starting point. The time of this entry is when the request reached the planner,
  not when each thing was said
- 2026-10-04T13:26:44Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in a worktree of this
  repository, and wrote `spec.md` and `plan.md` on the branch `feature-0027-harness-versions-follow-the-host`, made
  from `master` at `aa4b8b3`. A feature, because it has decisions. The number was given by the session that
  dispatched the planner: 0026 exists on a branch that is not on `master`, and 0028, the release skill that bumps
  the pins, is being planned at the same time. Planned under the process of release 2.3.0, read from the main
  checkout's `node_modules`, since a worktree has none. Read for it: the specs of 0015, 0021, 0022 and 0023, the
  boundary of `history-0039-sni-filtering-proxy`, the record of 0026, `container/`, both wrapper tests and the
  README. What the spec rests on is under "What was found while planning" there, gathered on Linux with Docker
  Engine 28.4.0 and Compose 2.39.2. In short:
  * The host's commands print `2.1.289 (Claude Code)` in 5 ms and `1.18.34` in about 280 ms, and both versions are
    on the npm registry
  * The override was built twice more with the kit's real Dockerfile, at 2.1.288 with 1.18.33 and at 2.1.289 with
    1.18.34, and both harnesses reported those versions from the image. The first build, whose versions this
    machine had not built, took 10.7 seconds, and the second, which the build cache held, 0.6 seconds
  * In a small Dockerfile of the kit's shape: a label set from a build argument is on the image and is read in 6 ms;
    the install step reruns when a version changes and not otherwise; going back to versions built before is a
    cached build; a project's value for a build argument wins over the base file's variable, for that argument alone
  * Every build resolves `docker.io/docker/dockerfile:1` at the registry, also when every layer is cached, which is
    why the spec does not build at every start
  The images built were `agentrite-0027-plan` and `agentrite-0027-real`. Both are removed, with the two untagged
  images the builds left. No container, volume or network was created, the ids of `ritenoar-agentrite-agent` and
  `ritenoar-agentrite-agent-dev` are what they were, and nothing was logged in to
- 2026-10-04T13:26:44Z [Claude Code, anthropic/claude-opus-5-5] as planner, what the spec decides and what it leaves
  to the human:
  * Settled in the spec, each open to the human's correction on approval: the wrapper rebuilds by itself when the
    image's versions differ from the wanted ones, known from two labels on the image; a rebuild that fails stops
    the start and does not fall back to the old image; a harness that is not on the wrapper's `PATH` is silent and
    gets the pin, and one that prints no version says so; the pins stay as the defaults of the two `ARG` lines in
    the Dockerfile, where 0028 is to bump them; the wrapper reads Compose's merged configuration with `node` again,
    as it did until 0017
  * What the kit promises is in the spec's boundary paragraph: the confinement for any version, and the checks of
    0015, 0022 and 0023 and the switched-off self-update for the pinned versions only
  * Not established: Docker Desktop for macOS; that today's host versions start, log in and answer a prompt in the
    sandbox with the kit's allowlist alone, which requirement 12 looks at as far as starting; that every version a
    host can have is on the npm registry; what a harness does with a home volume a newer version wrote; the
    implementer's override was repeated with a third Compose file, as theirs was, and not by editing a project's
    own file, which requirement 12 does
  * For the human, besides approval: the six items under "Beyond the request", of which the choice from the
    environment and the label for the kit's own version are the two the planner would take; and that after this
    unit this repository's own sandboxes run the host's versions, so nothing runs the pinned combination on this
    machine unless someone holds it, which bears on what 0028 checks when it bumps a pin
  * The README sentence that the versions are pinned in the Dockerfile is replaced, not kept, on the spec's
    authority. 0026 adds text to the same README section on another branch. The two do not contradict each other
  Status left at `draft` for the human's approval

## Amendments
