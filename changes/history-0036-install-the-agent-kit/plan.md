# 0036 Install the agent kit with a script

## Approach

Build the installer in the kit first and prove it against a scratch project, so that its dangerous behavior, the
clearing of the target directory, is exercised somewhere disposable before it is ever pointed at this repository.
Only then switch this project over: add the tracked `agent-kit.md` and the bootstrap check, untrack the installed
files, and remove the subtree remote.

The order matters for one reason beyond caution. The moment `agent-kit/` stops being tracked, every suite in this
project depends on the installer having run, so the installer has to be correct and the bootstrap check has to give
a usable message before the switch, not after.

The work spans two repositories again, as 0035 did, and the kit has no `changes/` of its own yet. Kit commits are
named in `record.md` by their message.

Two things are deliberately verified by breaking them: the installer's refusal to clear a directory it does not own,
and the bootstrap check's three outcomes. Neither has a natural failing case once the tree is correct, so each is
provoked on purpose and then restored.

## Files

In `~/projects/agent-kit`:

- `install.sh`: new, the installer, holding the payload list
- `tests/install.test.mjs`: new, the installer's behavior against a scratch kit and project
- `README.md`: install and update replace the `git subtree` instructions

In this project:

- `agent-kit.md`: new, tracked, the pin first and the do-not-edit statement
- `scripts/check-agent-kit.mjs`: new, tracked, the bootstrap check, dependency-free so it runs with no kit present
- `tests/unit/check-agent-kit.test.ts`: new, the bootstrap check's three outcomes
- `.gitignore`: `agent-kit/` added
- `agent-kit/`: untracked, its files left on disk for the installer to own
- `package.json`: the bootstrap check runs ahead of `build`, `test` and `test:unit`
- `README.md`: "Update the agent kit" becomes install and update; the subtree commands and the host-task note go
- `AGENTS.md`: the sentence pointing at `git subtree` for kit updates
- `agent.sh`: its comment names `agent-kit/README.md`, which the installer does not install
- `tests/unit/roles.test.ts`: `agent-kit.md` added to the instruction files the stale-reference test reads

## Tasks

Kit repository:

- [x] Write `tests/install.test.mjs` against a scratch kit repository and project, covering the payload, a
      reinstall, an install over a newer commit, the refusal, the pin with and without `--update`, and the
      untouched kit clone, and see it fail before `install.sh` exists (R1 to R4, R6, R7, R9)
- [x] Write `install.sh`: take a target project and an optional `--update`, resolve the pin from the target's
      `agent-kit.md`, and extract the payload with `git archive` so the kit clone is never checked out or modified
      (R1, R4, R6)
- [x] Give it the payload list, the roles, the process document, the templates, the check script and the container
      files, and confirm an installation contains no `changes/`, `tests/`, `package.json` or kit README (R1)
- [x] Make it extract beside the target directory and then replace it with the extraction, so that a failed
      extraction leaves the previous installation as it was, and refuse when the target is neither empty nor a
      previous installation (R2, R3)
- [x] Count a directory as a previous installation only when its marker holds the full hash of a commit in the kit
      clone, test a foreign directory whose marker holds anything else, and test that an installation with an
      extra file at its top level is still replaced (R2, R3, review findings S2 and S3)
- [x] Have it write the installed commit into the installed tree (R9)
- [x] Add `--update`: install the kit's current `master`, rewrite the pin, and create `agent-kit.md` when the target
      has none (R7)
- [x] After installing, compare the pin against the kit's `master` and report how far behind it is, without acting
      on it (R8)
- [x] Prove the installer against a scratch project before this repository is switched over: install, reinstall,
      install over an older commit, and attempt a non-empty foreign directory (R2, R3)
- [x] Replace the `git subtree` sections of the kit's `README.md` with install and update (R13)

This project:

- [x] Write `agent-kit.md` with the pinned commit as its first field and the do-not-edit statement (R5)
- [x] Write `tests/unit/check-agent-kit.test.ts` for the missing, stale and matching outcomes, and see it fail
      before the check exists (R10)
- [x] Write `scripts/check-agent-kit.mjs`, reporting missing, stale and matching differently, and naming the command
      that fixes the first two (R10)
- [x] Wire the check ahead of `build`, `test` and `test:unit` in `package.json`, and see it fail with the kit
      removed before it passes with the kit installed (R10)
- [x] Add `agent-kit/` to `.gitignore` and untrack it with `git rm -r --cached`, leaving the files on disk (R11)
- [x] Remove the `agent-kit` git remote (R11, R13)
- [x] Add `agent-kit.md` to the instruction files in `tests/unit/roles.test.ts`, so a stale path there is caught
      like any other (R10)
- [x] Rewrite "Update the agent kit" in `README.md` for install and update, and drop the subtree commands and the
      host-task note that existed because `bitbucket.org` is off the sandbox allowlist (R13)
- [x] Update the one sentence in `AGENTS.md` that sends the reader to `git subtree` (R13)
- [x] Point the comment in `agent.sh`, and the links in `README.md` and `AGENTS.md`, away from
      `agent-kit/README.md`, which the payload excludes (R1)

After everything above is implemented and verified:

- [x] Revise the draft of the kit's `changes/0001-kit-change-process/`: remove the requirement scoping unit
      numbering per repository, along with its decision, tasks, commit point and verification items, because the
      installer's payload excludes the kit's `changes/` and the collision it guarded against can no longer happen.
      Renumber the requirements it leaves behind (R14)
- [x] In the same revision, remove that unit's claim that the roles are always dispatched with a unit directory
      rather than a bare number, which was shown false, and log both changes in its `record.md` with the reason,
      so a removed rule is distinguishable from one never considered (R14)

## Verification

- [x] A second run with an unchanged pin leaves the installed tree byte-identical, compared with `diff -r` (R2)
- [x] Installing an older commit over a newer installation leaves no file absent from the older commit (R2)
- [x] The installer refuses a non-empty directory holding no installation marker, and leaves it untouched (R3)
- [x] `git -C ~/projects/agent-kit status` and its current branch are unchanged by an install (R4)
- [x] The installed tree contains no `changes/`, `tests/`, `package.json` or kit `README.md` (R1)
- [x] `--update` rewrites only the pin line of `agent-kit.md`, and `git status` in the project shows that one
      tracked file changed and nothing else (R7, R11)
- [x] Without `--update`, `agent-kit.md` is unchanged and the installed commit equals the pin (R6, R9)
- [x] With the kit deleted, `npm test` fails naming the installer command; with a pin edited to a different commit
      it fails as stale; with the kit installed it passes (R10)
- [x] A clone of this repository into a scratch directory contains no `agent-kit/`, and its `npm test` fails the
      bootstrap check until the installer is run (R11)
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the installed tree (R12)
- [x] `opencode debug agent` resolves the three roles, and the three Claude Code stubs still name existing files
      (R12)
- [x] `./agent.sh` builds and starts, the firewall self-check passes and the agent lands unprivileged, from the
      installed container files (R12)
- [x] `grep -rn 'subtree' README.md AGENTS.md agent-kit.md ~/projects/agent-kit/README.md` returns nothing (R13)
- [x] `npm run check:changes` passes, and `changes/0035-shared-agent-kit/` is untouched by this branch's diff
- [x] The kit's `changes/0001-kit-change-process/spec.md` holds no requirement about unit numbering across
      repositories and no claim that a role is dispatched with a directory rather than a number, and its
      `record.md` says why each was removed (R14)

## Commit Points

- [x] `feature-0036 Add the spec and plan for installing the agent kit`
- [x] `feature-0036 Add the agent kit installer` (kit: `install.sh`, `tests/install.test.mjs`)
- [x] `feature-0036 Document installing and updating the kit` (kit: `README.md`)
- [x] `feature-0036 Require more than a marker file before replacing a directory` (kit: `install.sh`,
      `tests/install.test.mjs`, on the kit branch `feature-0036-install-the-agent-kit`)
- [x] `feature-0036 Stop refusing an installation that has gained a file` (kit: `install.sh`,
      `tests/install.test.mjs`, on the same kit branch)
- [x] `feature-0036 Check the agent kit is installed` (`agent-kit.md`, `scripts/check-agent-kit.mjs`,
      `package.json`, the roles test, the check's test)
- [x] `feature-0036 Stop tracking the installed agent kit` (`.gitignore`, the untracking, the remote)
- [x] `feature-0036 Document the installed agent kit` (`README.md`, `AGENTS.md`, `agent.sh`)
- [x] `feature-0001 Drop the numbering rule the installer makes unnecessary` (kit: the draft of
      `0001-kit-change-process`, committed on that unit's own branch, last)
