---
kind: feature
status: implemented
timestamp: 2026-09-22T23:48:42Z
---

# 0036 Install the agent kit with a script

## Log

- 2026-09-22T23:48:42Z [human] raised that a reviewer dispatched with a bare number, "@reviewer review change
  0001", would have no way to tell the kit's unit from the project's once both exist in one tree
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] had claimed the roles are always dispatched with a
  unit directory, which was wrong: that is what the role file states as its input, not how the roles are actually
  called. In this project the failure is worse than ambiguity, because no root-level `0001-*` unit exists, so the
  kit's unit would be the only match and would be acted on with nothing signalling a problem
- 2026-09-22T23:48:42Z [human] asked whether the kit's `changes/` could be stripped from the vendored copy instead,
  and whether that would break pushing changes back
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] tested it on a pair of scratch repositories rather
  than reasoning about it. A project vendored a kit holding `roles/` and `changes/`, deleted its local
  `agent-kit/changes/`, then sent a genuine improvement to `roles/planner.md` back with `git subtree push`. The push
  reported success, the improvement landed, and the kit's entire `changes/` history was gone from its `master`.
  Stripping is not merely awkward with push-back; contributing a fix silently destroys unrelated history in another
  repository
- 2026-09-22T23:48:42Z [human] judged the whole subtree approach wrong, on the grounds that it is not intuitive
  that changing something in one repository can destroy things in another, and proposed the replacement: check out
  the kit, run a script that installs its files into a named directory of a project, gitignore them so editing them
  is not sensical, and carry a non-ignored `agent-kit.md` explaining the mechanism and saying to re-run the script
  for a newer kit. The script to be idempotent, including over an existing or different version
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] agreed, and raised two gaps in the sketch: nothing
  recorded which kit version was installed, and a gitignored kit means a fresh clone has none, which breaks
  `npm run check:changes` and the sandbox build until the script runs
- 2026-09-22T23:48:42Z [human] wanted the version pin as the first field of `agent-kit.md`, and wanted a project
  with an `agent-kit.md` to fail its build when the kit is not installed. Then asked what a colleague cloning three
  months later should get, when the pin names an old commit and the kit has moved on
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] answered that the pin wins and staleness is reported
  rather than applied, because installing the kit's latest would mean two people cloning the same project on
  different days run agents under different instructions with nothing in history showing it. Confirmed the
  extraction primitive first: `git archive <commit> <paths>` takes an exact commit and a path list, excludes the
  kit's `changes/` and `tests/` naturally, and leaves the kit clone's branch and working tree untouched
- 2026-09-22T23:48:42Z [human] confirmed the two modes, plain install for the pin and `--update` to move to the
  kit's current master, and asked for the plan, for 0035 to be marked done, and for this unit to branch from the
  0035 branch and be implemented before anything returns to `master`
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] took the planner role. `spec.md` and `plan.md`
  written, status `draft`, awaiting approval. Thirteen requirements, nine decisions and six non-goals; eight kit
  tasks, eight here, fourteen verification items and six commit points. Recorded in this project rather than the
  kit because the kit's own change process, its unit 0001, is still `draft`. Judged that this could not be folded
  into 0035, which names `git subtree` in an approved requirement and whose record documents subtree behavior that
  was genuinely verified; 0035 is marked `implemented` and amended to point here instead of being rewritten
- 2026-09-22T23:48:42Z [human] asked that the revision of the kit's draft unit 0001 be a deliberate plan item, so
  that it must be addressed once everything else is implemented
- 2026-09-22T23:48:42Z [Claude Code, anthropic/claude-opus-5] added it as requirement 14, with a decision, two
  tasks under a heading that puts them after all other work, a verification item and a commit point. A task rather
  than a note because the gate is mechanical: `check:changes` rejects an implemented unit whose `plan.md` still has
  an unticked box, so this unit cannot reach `implemented` while the revision is outstanding. The decision the
  tasks carry out is written into `spec.md` rather than left open, since the planner instructions forbid a task
  that defers a decision: the numbering requirement goes, because the installer's payload excludes the kit's
  `changes/` and the collision cannot occur, and the false claim about dispatch goes regardless of this unit
- 2026-09-22T23:58:57Z [human] approved the unit. Status `draft` to `approved`, ready to implement
- 2026-09-23T00:01:36Z [Claude Code, anthropic/claude-opus-5.5] took the implementer role. Status `approved` to
  `in-progress`
- 2026-09-23T00:01:36Z [Claude Code, anthropic/claude-opus-5.5] added two tasks and two files to `plan.md`: a test
  for `install.sh` in the kit's `tests/`, and a unit test for the bootstrap check here. The plan verified both by
  provoking them by hand, which proves them once, while `process.md` requires a unit test for all newly added
  logic. Each test is written before the code it covers
- 2026-09-23T00:07:52Z [Claude Code, anthropic/claude-opus-5.5] kit commits `feature-0036 Add the agent kit
  installer` (055a32f) and `feature-0036 Document installing and updating the kit` (97258c9) are on the kit's
  `master`, as 0035's kit commits were, since `--update` and the staleness report both read `master`. They are not
  pushed. `tests/install.test.mjs` failed on the missing `install.sh` before it was written, and the kit's
  `npm test` then passed 30 of 30. Against a scratch project with the real kit, a reinstall was identical under
  `diff -r`, the installed tree held `process.md`, `roles/`, `templates/`, `scripts/check-changes.mjs` and
  `container/` and none of `changes/`, `tests/`, `package.json` or `README.md`, a non-empty foreign directory was
  refused and left holding its one file, and the kit clone's `git status --porcelain`, branch and HEAD were the same
  before and after. The target is replaced by extracting beside it and moving it into place, rather than clearing it
  first as the plan's task words it, so a failed extraction leaves the previous installation intact
- 2026-09-23T00:07:52Z [Claude Code, anthropic/claude-opus-5.5] the plan leaves the subtree copy "on disk for the
  installer to own", which the installer refuses by design (R3): the copy has no `.installed-commit`. Run on this
  project, it reported the directory as not empty and holding no previous installation and left it alone. The copy
  was deleted by hand, after confirming it was clean and its files matched kit `651ecf8`, and the kit installed
  with `--update` at `97258c9`. Its payload is byte-identical to the subtree copy: `git status` showed only
  `.gitignore`, `README.md`, `package.json` and `tests/check-changes.test.mjs` deleted and nothing modified. The
  installer chooses the directory name per project, and accepts only a direct child of the project because
  `container/agent.sh` finds the project root one level up
- 2026-09-23T00:07:52Z [Claude Code, anthropic/claude-opus-5.5] `tests/unit/check-agent-kit.test.ts` failed on
  the missing module before `scripts/check-agent-kit.mjs` was written, then passed. With the check wired into
  `package.json`: with `agent-kit/` moved aside, `PORT=3100 npm test` failed at the check with the install command;
  with the pin edited to `651ecf8`, `npm run build` failed naming both commits; restored, `npm run check:agent-kit`
  exited 0. With a moved path appended to `agent-kit.md`, the roles test failed naming that file, and with it
  removed `npm run test:unit` passed 52 of 52
- 2026-09-23T08:06:52Z [Claude Code, anthropic/claude-opus-5.5] ran the plan's verification on this project at `ae59902` with the
  kit installed at `97258c9`. A reinstall left `agent-kit/` identical under `diff -r`, and left `agent-kit.md`
  unchanged with `.installed-commit` equal to the pin. The kit clone stayed on `master` at `97258c9` with an empty
  `git status --porcelain`. The installed tree holds `process.md`, the three role files, the three templates,
  `scripts/check-changes.mjs`, the four container files and `.installed-commit`, and no `changes/`, `tests/`,
  `package.json` or `README.md`. With the pin edited to the older kit commit `03112fb`, an install held exactly that
  commit's payload and reported master 3 commits past it; `--update` then rewrote the pin back, leaving
  `agent-kit.md` equal to `HEAD` and `git status` clean apart from the untracked `ideas/roles-tuning-loop.md` that
  predates this unit. That verifies `--update` touched only the pin line here; that it changes exactly that line and
  no other is what the kit's own test measures. A clone of this branch into a scratch directory had no `agent-kit/`,
  its `npm test` failed at the check naming the install command, and after an install the check passed and
  `git status` stayed clean. `opencode debug agent` resolved all three roles as subagents whose prompts inline
  the installed role files. `npm run check:changes` passed, and `git diff 2c93b61 HEAD` touches nothing under
  `changes/0035-shared-agent-kit/`. `grep -rn subtree` over `README.md`, `AGENTS.md`, `agent-kit.md` and the kit's
  `README.md` found nothing
- 2026-09-23T08:06:52Z [Claude Code, anthropic/claude-opus-5.5] verified the sandbox. As in 0035, this session's shell predates the
  `docker` group, so the `docker` calls went through an uncommitted `sg docker` shim in the scratch directory.
  `./agent.sh --rebuild` built `norareit-agent` from the installed `agent-kit/container/Dockerfile` and started it.
  The entrypoint allowlisted every host and range, confirmed the `example.com` canary blocked and the
  `api.anthropic.com` probe reachable, and dropped to `uid=1000(agent) gid=1000(agent)`, with `CapInh`, `CapPrm`,
  `CapEff` and `CapAmb` all zero and `/etc` read-only. Inside it, `/work/agent-kit/.installed-commit` read
  `97258c9` and `node scripts/check-agent-kit.mjs` passed. The suites were not run inside the sandbox; they were run
  on the host
- 2026-09-23T08:06:52Z [Claude Code, anthropic/claude-opus-5.5] raised that the kit's draft 0001 rested on `git subtree` in two
  places beyond the two this plan names: its requirement 6, that a vendoring project's check keep passing with the
  kit's `changes/` in its tree, and its decision that the kit's units travel with it into every consumer.
  Requirement 14 of this unit covers both, and nothing here decided how to revise them
- 2026-09-23T08:06:52Z [human] decided that the revision should cover both too
- 2026-09-23T08:06:52Z [Claude Code, anthropic/claude-opus-5.5] revised the kit's `changes/0001-kit-change-process/` on its branch
  `feature-0001-kit-change-process`, in kit commit `feature-0001 Drop the numbering rule the installer makes
  unnecessary` (da66f9d), through a temporary worktree so that the kit clone's `master` checkout was not touched.
  Removed: the numbering requirement with its decision, task, commit point and verification item; the dispatch
  claim; requirement 6 with its plan paragraph and two verification items. Replaced the "travel with it" decision
  with one saying the kit's units stay in the kit. Requirements renumbered 1 to 4. Its `record.md` logs each change
  with the reason, and its spec now holds no requirement about numbering across repositories and no dispatch claim.
  The kit's `master` is 2 commits ahead of `origin/master`, and its 0001 branch has one new commit. Neither is
  pushed, and this project's pin, `97258c9`, names a commit that exists only in this machine's kit clone until
  `master` is pushed
- 2026-09-23T08:06:52Z [Claude Code, anthropic/claude-opus-5.5] every task, verification item and commit point in `plan.md` is
  ticked. The unit stays `in-progress`: no review has run, and `implemented` waits on the human deciding its
  blocking findings
- 2026-09-23T08:07:22Z [Claude Code, anthropic/claude-opus-5.5] final suite run on `0b7ef4e`, with the kit installed at
  `97258c9`: `npm run test:unit` 52 tests, 52 passing; `PORT=3100 npm test`, which runs the kit check and the change
  check first, 86 end-to-end tests, 86 passing. In the kit at `97258c9`, `npm test` 30 tests, 30 passing
- 2026-09-23T09:18:39Z [OpenCode, openai/gpt-6-sol] full review of `0036-install-the-agent-kit` at project commit
  `dbeb57ea8a8db97e6fdf2252a861398347b21d91` (kit `97258c9`, kit 0001 revision `da66f9d`): findings S1, S2,
  P1, C1 in `.reviews/0036-install-the-agent-kit/2026-09-23-full-dbeb57e.md`. Could not independently verify the
  prior red-before-green, scratch-clone, real-kit reinstall/update or sandbox/firewall runs; the attempted
  `opencode debug agent` invocation without a role name did not verify role resolution
- 2026-09-23T09:32:24Z [Claude Code, anthropic/claude-opus-5.5] took the implementer role for the review's findings
- 2026-09-23T09:32:24Z [Claude Code, anthropic/claude-opus-5.5] S2 accepted and applied. A directory holding any regular file named
  `.installed-commit` was taken as a previous installation and deleted, which the reviewer is right breaks R3 for a
  mistyped target. Two tests were added first and failed, one for a marker that is not a commit and one for a marker
  naming a real kit commit in a directory holding `src/`. `install.sh` now counts a directory as an installation
  only when its marker is a full hash of a commit in the kit clone and nothing at its top level lies outside the
  payload. Edits inside the payload's directories are still replaced, as the existing test requires. Kit commit
  `feature-0036 Require more than a marker file before replacing a directory` (279dcc7), on the kit branch
  `feature-0036-install-the-agent-kit` rather than on `master`, following C1. The kit's `npm test` passes 32 of
  32, and reinstalling into this project with it was accepted and left `git status` clean. The fix is not on the
  kit's `master` yet, so a fresh clone of the kit gets the installer without it until that branch is merged
- 2026-09-23T09:32:24Z [human] chose to resolve S1 by pushing the kit's `master` as it stands, leaving the S2 fix on its branch
- 2026-09-23T09:32:24Z [Claude Code, anthropic/claude-opus-5.5] S1 applied. Pushed kit `97258c9` to `origin/master`, which moved
  from `651ecf8`; `git branch -r --contains` now lists `origin/master` for the pin. In a scratch directory, a clone
  of the kit from `git@bitbucket.org:ritenoar/agent-kit.git` installed the pin into a clone of this branch and the
  bootstrap check passed. The kit's 0001 branch and this project's branch are not pushed
- 2026-09-23T09:32:24Z [Claude Code, anthropic/claude-opus-5.5] P1 accepted and applied. The plan's task now says the installer
  extracts beside the target and replaces it, which is what was built. The S2 work is added to the plan as a
  ticked task and a commit point
- 2026-09-23T09:32:24Z [Claude Code, anthropic/claude-opus-5.5] C1 acknowledged; it asks for no change, and the choice it names is
  logged above. The S2 fix was committed on a kit branch accordingly. Neither blocking finding is marked decided
  here: that is the human's call, and the unit stays `in-progress` until it is made
- 2026-09-23T09:32:50Z [Claude Code, anthropic/claude-opus-5.5] suite run on `9eaa3c1`, with the kit installed at `97258c9`:
  `npm run test:unit` 52 tests, 52 passing; `PORT=3100 npm test` 86 end-to-end tests, 86 passing, after the kit
  check and the change check. The kit's `npm test` on its branch at `279dcc7`: 32 tests, 32 passing
- 2026-09-23T09:44:34Z [OpenCode, openai/gpt-6-sol] delta review of `0036-install-the-agent-kit` at project commit
  `1e49afc80b97c3494804c8982eb46dbc4dae2a33` (kit fix `279dcc7088fad9b6253485d0df43f88c496b1899`),
  compared with prior full review commit `dbeb57ea8a8db97e6fdf2252a861398347b21d91`: findings S2 and S3 in
  `.reviews/0036-install-the-agent-kit/2026-09-23-delta-dbeb57e-to-1e49afc.md`. The earlier scratch-clone
  installation, red-before-green and sandbox/firewall runs were not independently repeated; the kit's
  `check:changes` command is not defined on its current branch
- 2026-09-23T09:49:03Z [human] asked for the kit branch holding the S2 fix to be fast-forwarded into the kit's `master`
- 2026-09-23T09:49:03Z [Claude Code, anthropic/claude-opus-5.5] fast-forwarded the kit's `master` from `97258c9` to `279dcc7`, and
  the kit's `npm test` passes 32 of 32 there. The pin stays `97258c9`: the fix is in `install.sh`, which is not in
  the payload, so the installed files are identical either way. The kit's `master` is 1 commit ahead of
  `origin/master`, not pushed
- 2026-09-23T09:52:51Z [OpenCode, openai/gpt-6-sol] delta review from `dbeb57e` to `1e49afc`, kit `97258c9` to `279dcc7`,
  saved in `.reviews/0036-install-the-agent-kit/2026-09-23-delta-dbeb57e-to-1e49afc.md`: S1 and P1 corrected, C1
  unchanged; S2 still open because the fix was not on the kit's published `master`; new S3, blocking on R2
- 2026-09-23T09:52:51Z [Claude Code, anthropic/claude-opus-5.5] S3 accepted and applied. The S2 fix's check that a directory held
  nothing at its top level outside the payload made the next install refuse a genuine installation with a
  `.DS_Store` beside it, as the reviewer says. A regression test for that case was written first and failed. The
  contents check is removed. A directory is now an installation when its marker holds the full hash of a commit in
  the kit clone, which only an install writes. The S2 test that asserted refusal of a valid marker beside `src/`
  encoded the regression, so it is replaced by one refusing a well-formed hash that is no commit in the clone. The
  test for a junk marker stays. Kit commit `feature-0036 Stop refusing an installation that has gained a file`
  (4087835), on the kit branch, then fast-forwarded into the kit's `master`; `npm test` 33 of 33. The plan's S2
  task is reworded to match and gains S3, with a commit point
- 2026-09-23T09:52:51Z [human] asked for the kit's `master` to be pushed
- 2026-09-23T09:52:51Z [Claude Code, anthropic/claude-opus-5.5] S2 applied to the published installer. Pushed the kit's `master`
  from `97258c9` to `4087835`, and `git ls-remote origin refs/heads/master` returns `4087835`. In a fresh clone of
  the kit from Bitbucket, the installer refused a directory holding `notes.md` and a junk `.installed-commit`,
  leaving both, and a reinstall over an installation with a `.DS_Store` added removed it. The pin stays `97258c9`,
  since `install.sh` is not in the payload and the installed files are unchanged; installs therefore report the
  kit's `master` 2 commits past it. The kit's feature branches and this project's branch are not pushed
- 2026-09-23T09:53:15Z [Claude Code, anthropic/claude-opus-5.5] suite run on `872689e`, with the kit installed at `97258c9`:
  `npm run test:unit` 52 of 52; `PORT=3100 npm test` 86 of 86 after the kit check and the change check. The kit's
  `npm test` at `4087835`: 33 of 33. S2 and S3 await the human's decision; the unit stays `in-progress`
- 2026-09-23T09:58:36Z [OpenCode, openai/gpt-6-sol] delta review of `0036-install-the-agent-kit` at project commit
  `854fa1f23df19dd86e08978559ca2dbe171936ae` (kit `408783589c43b90069418db7a2f6882c1198c77d`),
  compared with prior review project commit `1e49afc80b97c3494804c8982eb46dbc4dae2a33` (kit `279dcc7`): no
  findings returned; review saved in `.reviews/0036-install-the-agent-kit/2026-09-23-delta-1e49afc-to-854fa1f.md`.
  Did not independently repeat the earlier live fresh-clone, red-before-green, or sandbox/firewall experiments
- 2026-09-23T10:09:49Z [human] passed the review, deciding the blocking findings S1, S2 and S3, all of which were accepted and
  applied, along with P1, and C1 as a recorded exception. Status moved to `implemented`, freezing `spec.md` and
  `plan.md`

## Amendments
