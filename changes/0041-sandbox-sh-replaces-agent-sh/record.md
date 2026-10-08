---
kind: feature
status: draft
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

## Amendments
