---
kind: feature
status: planned
timestamp: 2026-10-08T19:58:16Z
---

# 0041 `sandbox.sh` replaces `agent.sh`

## Log

- 2026-10-08T19:58:16Z [human] in a session of Claude Code on the host, after the README was refactored in unit 0037,
  found `agent.sh` a weird name for what starts the sandbox's container, and named `sandbox` and `container` in its
  place. Was answered that `sandbox` fits, and that renaming `agent/compose.project.yml` and the Compose service makes
  every project change a file of its own, so that the scripts alone might be renamed. Refused that: "I want this to be a
  clean sweep. There's only a handful of projects already using the kit. Just make sure to add clear instructions in the
  release notes." Said that the release is made in the same session afterwards, and asked for the spec
- 2026-10-08T19:58:16Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on `master` at `1f840fa`. Read `process.md` and `roles/specifier.md` of the working copy, which are ahead of the
  installed release 4.2.0 by the entry format of unit 0040. Made the unit as a feature: a rename, and one that takes
  decisions on where it stops. Numbered 0041: the plain directories run from 0001 to 0040 without a gap, and 0042 and
  the `history-` directories do not count. Wrote `spec.md`. The human's are the name `sandbox`, the clean sweep and the
  instructions in the release notes. The specifier's, for the human to approve: that the account `agent`, its home and
  the home volume keep their names; that a project's Compose project and image names stay what its file says while this
  repository changes its own, which costs a login on each host; that this repository's own shim and compose file move in
  this unit, so that `./sandbox.sh` does not start here until the release; and the refusal of requirement 6, which the
  human did not ask for. Read for it: `container/agent.sh`, `container/compose.yml`, `container/unit-clone.sh`,
  `scripts/agentrite.mjs`, the two shims, both compose files of the project, and step 6 of `RELEASING.md`. Tried on the
  host: `docker compose config` with the kit's service renamed and this repository's file as it is, which merged without
  an error into two services. Not checked: what the script then does with an empty image name, and how far the suites
  can test requirements 6 and 7 without Docker, which is the planner's. Status left at `draft`
- 2026-10-08T20:24:52Z [human] approved the spec as it stands on `master` at `ab0d8bf`
- 2026-10-08T20:24:52Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host, on `master` at
  `ab0d8bf`, set the status to `approved`
- 2026-10-08T20:30:19Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the Linux host.
  Cut `feature-0041-sandbox-sh-replaces-agent-sh` from `master` at `c818fa2`, where `npm test` passes with 411 tests.
  Read `roles/planner.md` of the installed release 4.2.0, which is the working copy's, and `process.md` of the working
  copy, which is ahead of the release by the entry format of unit 0040 and the rule on one-character variables. Wrote
  `plan.md`: the rename of the code in one commit, then the refusal and the tests that hold an old name, then the four
  documents. The planner's, on how and not on what: the refusal of requirement 6 is made where the script reads the
  configuration Compose merges, so it covers a run and `--connect` and comes before a build, a clone and a container,
  and after the branch of a unit that has none is cut, as every refusal that follows that reading does. The fake
  `docker` of the suites is made to answer from the project's compose file, so that the test of requirement 7 does
  the four steps and nothing else. That test holds the two files of release 4.2.0 as strings, and no tracked file is
  named after an old name. The tests' own names derived from the old ones are renamed, and what plays the agent in
  them is kept. Tried on the host, with Compose v2.39.2: the kit's file with the service `sandbox` and this
  repository's file as it is merge into the services `agent` and `sandbox`, with exit 0 and no image for `sandbox`,
  so the refusal is made before the image name is used. Replaced the names in a copy of the tree: five lines pass 120
  characters, which the plan names. Not run: anything that builds or starts a container. The status is `planned`

## Amendments
