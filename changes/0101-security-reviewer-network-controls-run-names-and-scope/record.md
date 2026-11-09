---
kind: feature
status: implemented
timestamp: 2026-11-08T23:43:58Z
---

# 0101 The security reviewer: network controls, run names, audit scope, accepted risks and audit scripts

## Log

- 2026-11-08T23:43:58Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `0db3055`, on the
  human's request to change the security reviewer in three ways agreed after an audit run was stopped partway: no
  proofs of concept against the network controls, a findings file named by commit and instant with audits in a
  directory of their own, and a limited audit naming its scope. Read `extra-roles/security-reviewer.md`, its
  wrappers, "Security findings" of `AGENTS.md`, `extra-roles/spec-reviewer.md` for its instant, and the parts of
  `SANDBOX.md` on `.reviews` and the network controls, and searched the repository for every place that names a
  findings file. Wrote `spec.md`. The status is `draft`
- 2026-11-09T00:18:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `8d3a315`, on the
  human's request to add two parts to the unit: a list of the risks the human accepted, which the role reads and reports
  repeats of apart from its findings, and a script that sets up the clone of an audit with a second that finishes
  it. Read the role file again, the exit statuses of `COMMANDS.md`, the mounts of `SANDBOX.md` and "Commands" and
  the table of `CONTRIBUTING.md`. Added the two parts to `spec.md`, renumbering its last requirement, and retitled
  the unit, keeping its directory's name. The status is `draft`
- 2026-11-09T10:51:22Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `1a94de0`, on the
  human's request to fix the form of an entry of the list of accepted risks to the layout they use, with the commit
  at which the entry's file and line hold. Did not read `.reviews/security-accepted.md`, by "Security findings" of
  `AGENTS.md`, and worked from the empty layout the human gave. Rewrote requirement 19 to name the subsections,
  added to requirement 21 how the place is judged by the entry's commit, and added two decisions. The status is
  `draft`
- 2026-11-09T10:56:58Z [human] approved the spec. The status is `approved`
- 2026-11-09T11:01:02Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut
  `feature-0101-security-reviewer-network-controls-run-names-and-scope` from `master` at `81c0f00` and stopped
  before writing `plan.md`. Requirement 40 leaves open the exit status of `finish-security-audit.sh` when the clone
  holds no findings file, so the planner asked the human. The human answered that the script should then remove the
  clone as well, since a run that wrote nothing is of no use and a new clone is made for the next one. That
  contradicts requirement 38, the decision that a clone with no findings file is kept, and item 8 of "Beyond the
  request", which the planner cannot change. The unit goes back to the specifier and the human. The status stays
  `approved`
- 2026-11-09T11:04:06Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the unit's branch at `fe19e85`,
  at the human's request, corrected `spec.md` so that the finish script removes the clone of an audit also when it
  holds no findings file. Requirement 38 now says the script says so, moves nothing, removes the clone and exits
  `0`, and requirement 39 removes the clone once every file is moved or none was found. The decision that such a
  clone is kept is replaced by one that it is removed too, with the reason, and item 8 of "Beyond the request", an
  option to discard such a clone, is gone as moot, being the last item so that no other is renumbered. No other
  requirement changes. The status stays `approved`
- 2026-11-09T11:10:54Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the unit's branch at `59e79d8`,
  wrote `plan.md` against the corrected spec. Took two readings: the setup script's clone is
  `git clone --branch <default branch> -- <repository> <clone>`, the `--` keeping a `<clone>` that begins with `-`
  from being read as an option; and it records the clone in `clones` right after making it, before copying the
  list, so that a clone a later step fails in can still be finished. The default branch is read with the settings
  reader the sandbox's wrapper uses. The status stays `approved`
- 2026-11-09T11:30:19Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the unit's branch at
  `f09bc37`, began the work. The status is `in-progress`
- 2026-11-09T11:37:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, took the one reading
  of requirement 35 that keeps requirement 38: a `.reviews` or `.reviews/security-audits` of the clone that is not
  there at all is no refusal, and the clone then holds no findings file, as a run stopped before it saved its file
  leaves it. Added it to step 4 of the finish script and to its case of no findings file in `plan.md`, before writing
  the script
- 2026-11-09T11:43:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the unit by `plan.md` in the
  commits `8270fdb`, `c5298fc` and `fce5e64`: `setup-security-audit.sh`, `finish-security-audit.sh` and their 34 cases
  in `tests/security-audit-scripts.test.mjs`, their sections and rows in `CONTRIBUTING.md`, and the changed role file
  with its two wrappers, which `npm run kit -- refresh` rewrote alone. Each case of the scripts was seen to fail before
  its script was written. Beyond the cases the plan lists, the tests cover the setup script exiting `1` with the
  reader's message for an `agentrite.json` at fault, and the finish script refusing when there is no list of clones. The
  case of R34 plants four hooks, a `git status` alias and a `core.fsmonitor` program in the clone, where the plan named
  a hook and an alias, since an alias runs only when it is called; that git does run the hook and the `core.fsmonitor`
  program of such a clone was checked by hand with `git status` and `git checkout`. In the role file, "Accepted risks
  seen again" is a subsection at the end of "Reporting". The search of R43 found the paths of a findings file only in
  the role file, in the new form. The suites on the tree of `fce5e64`, which the commit of this entry changes only in
  `record.md` and `plan.md`: `npm test` passed 1754 of 1754 on the host, and `./sandbox.sh --in-place npm test` passed
  1720 with 34 skipped and none failed. `npm run check-changes` exited `0`. The status stays `in-progress`, for the
  review
- 2026-11-09T12:31:19Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0101 at
  `01f9b48b480d567d4878acbe6d6df67f8d08afa1`, against merge base `81c0f005b945f025262081828f8ac01d470bd552`.
  Returned S1 in `.reviews/0101-security-reviewer-network-controls-run-names-and-scope/review-01f9b48-20261109T123119Z.md`.
  `npm test` passed 1754, and `./sandbox.sh --in-place npm test` passed 1720 with 34 Docker-dependent skips;
  `npm run check-changes` and `git diff --check master...HEAD` exited 0. Could not independently verify that the
  script tests failed before implementation; assessed the role instructions as text, without conducting an audit.
- 2026-11-09T12:34:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, accepted S1 of the review of
  `01f9b48`: the setup script passes a relative `<clone>` that begins with `-` to `mkdir` as an option, after the clone
  is made and recorded, so that it ends before it makes `.reviews/`, copies the list and prints the steps. Added its fix
  and cases to `plan.md` under "The review", with a commit point of their own
- 2026-11-09T12:37:32Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied S1: the setup script passes
  the clone's path to `mkdir` after `--`. The new case sets up and finishes a `<clone>` named `-clone`, given relative
  to the directory the scripts are run from, with a list of accepted risks; it failed before the fix with `mkdir:
  invalid option -- 'c'` and passes after it. No other command of either script is given a path from `<clone>` without
  `--`; the rest are given paths that begin with `/`. On the tree of this entry's commit, but for this entry and the
  ticks of `plan.md`: `npm test` passed 1755 of 1755 on the host, and `./sandbox.sh --in-place npm test` passed 1721
  with 34 skipped and none failed. The outcome of S1 is applied. The status stays `in-progress`
- 2026-11-09T12:51:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, at the human's request, set the
  status to `implemented`. The review of `01f9b48` returned S1, blocking, applied in `e867a19`, and the human accepted
  that fix as the decision on it. Every task of `plan.md` is ticked. The status is `implemented`

## Amendments
