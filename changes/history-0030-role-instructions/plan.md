# 0030 Role instructions

## Approach

Take an inventory of AGENTS.md first, deciding for each section whether it is shared or belongs to one role. Move
what is role-specific, then write the guidance each role needs that has never been written down. Verify at the end
that every line removed from AGENTS.md is accounted for.

## Files

- `roles/planner.md`: choosing the kind, writing `spec.md` and `plan.md`
- `roles/implementer.md`: executing a plan, keeping it accurate, finishing a unit
- `roles/reviewer.md`: the three axes, returning findings, and the routing and outcome rules
- `AGENTS.md`: the role index, and the per-kind sections reduced to what everyone needs
- `.claude/agents/planner.md`, `implementer.md`, `reviewer.md`: Claude Code stubs pointing at the role files
- `opencode.json`: three `agent` entries inlining the same files
- `tests/unit/roles.test.ts`: the three roles are named consistently and every referenced role file exists

## Tasks

### 1. Inventory

- [x] For each section of AGENTS.md, record whether it is shared, or which single role it belongs to. Shared means
      two or more roles act on it, or work outside the three roles does
- [x] Confirm the shared set: the header and README pointer, Where instructions belong, Text, Documentation changes,
      Verifying reported problems, Commits, the `Changes` structure through the branch rule, Exclusions, Code,
      Testing
- [x] Confirm what moves: the per-kind document requirements under Features, Bugs and Tasks, the regression-test
      instruction, and the review axes and findings location. The review-outcome recording rule stays, corrected to
      use the log before freeze and amendments after freeze, since the implementer acts on it
- [x] Log the inventory in `record.md`, one line per section with its destination, so task 6 has something to check
      against

### 2. Guard the references

- [x] Write `tests/unit/roles.test.ts` first, asserting that the AGENTS.md `Roles` section names planner,
      implementer and reviewer and that their named `roles/*.md` paths, `.claude/agents/*.md` body references, and
      `opencode.json` prompt references exist on disk
- [x] Run the test before adding the role files and references and confirm it fails, then confirm it passes after
      tasks 3 through 5. Also confirm it fails against a deliberately wrong path

### 3. Write the role files

- [x] `roles/planner.md`: how to choose feature, bug or task; what belongs in `spec.md` and what does not; the bug
      spec's required contents, with the `The fix descriptionFix` typo fixed in transit; when a bug needs a
      `plan.md`; what a task record contains; task sizing; tracing in both directions, every task to a requirement
      and every requirement to a task; no placeholders
- [x] `roles/implementer.md`: work the plan in order and tick as you go; tests before implementation; the regression
      test before a bug fix; unplanned necessary work is added to the plan before it is done and the reason logged;
      never change `spec.md`, a gap in the spec goes back to planning; keeping `plan.md` a true map; applying an
      accepted review finding and recording its outcome, and recording a declined one with its reason; review
      outcomes go in the log before freeze and under amendments after freeze; finishing a unit means running the
      suites on the final tree and logging what they reported, with concerns and blockers logged rather than worked
      around
- [x] `roles/reviewer.md`: read the other two role files first, since they are what the work is judged against; the
      inputs are `spec.md`, `plan.md`, `record.md` and the supplied diff against the merge base, and record entries
      are claims to verify against the diff; the three axes and how they differ; unrequested work is a
      spec-conformance finding; findings are labeled by axis and numbered, and each says whether it blocks
      `implemented`; that the reviewer returns findings and never edits files; how to route a finding of each kind;
      that the session coordinating the work stores findings in `.reviews/<unit>/`; amendment against superseding
      unit; that a pre-freeze unit is corrected in place and outcomes are logged rather than amended
- [x] Each file opens by naming its role, stating its inputs and where its output goes, and pointing at AGENTS.md for
      everything shared. The reviewer names both the unit directory and the supplied diff as inputs and its response
      as its only output

### 4. Rewrite AGENTS.md

- [x] Add a `## Roles` section that instructs: before planning, implementing or reviewing, read the named file; a
      session that moves between roles reads each in turn; work fitting none of them follows this file alone
- [x] Reduce Features, Bugs and Tasks to the facts every role needs: which documents each kind requires
- [x] Reduce the review paragraph to the shared rules: the session coordinating the work stores returned findings in
      `.reviews/<unit>/`; review outcomes are recorded as timestamped log entries before freeze and as amendments
      after freeze; the full review is not recorded in `record.md`

### 5. Harness stubs

- [x] Add `.claude/agents/planner.md`, `implementer.md` and `reviewer.md`, each with `name` and a `description` that
      states when to delegate to it and that it is dispatched with a unit directory. The reviewer description also
      requires the diff against the merge base. Each body instructs the agent to read the role file first and holds
      nothing else
- [x] Restrict the reviewer stub's `tools` to reading and searching, so it cannot edit
- [x] Add the same three under the `agent` key of `opencode.json`, each with `description`, `mode: subagent`, and a
      `prompt` of `{file:./roles/<role>.md}`. Give the reviewer a `permission` that denies all tools and then allows
      only `read`, `glob` and `grep`, so Bash and subagent dispatch cannot bypass the edit denial. Its description
      requires the dispatching session to supply the diff against the merge base
- [x] Start OpenCode and confirm the three agents can be selected and the reviewer's prompt shows the inlined file
- [x] Dispatch an OpenCode subagent and ask it to quote a rule that exists only in AGENTS.md. If it cannot, add
      `{file:./AGENTS.md}` to each OpenCode prompt and log the finding in `record.md`

### 6. Verify

- [x] Diff AGENTS.md against its previous revision and confirm every removed line appears in a role file, or was
      deliberately dropped as a duplicate, matching the inventory logged in task 1
- [x] Confirm no role file restates a rule that AGENTS.md still holds
- [x] Confirm every task in this plan traces to a requirement in the spec and every requirement to a task, as the
      new planner rule requires
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the final implementation tree
- [x] Commit the role files, AGENTS.md, the stubs, the reference test and the recorded verification results
- [x] Run `npm run check:changes` after that commit so it checks the committed implementation. If it finds a problem,
      correct and commit it, then run the check again

### 7. Let the reviewer produce its own diff

Task 5 restricted the reviewer stubs to reading and searching, which also denied them `git diff`. The spec decision
behind that changed after implementation: denying a shell prevents writes, not reads, and the reviewer already reads
the whole tree. The reason is logged in `record.md`.

- [x] Add `.claude/hooks/reviewer-readonly-git.js`, a `PreToolUse` validator that permits only `git diff`, `git log`,
      `git show` and `git status`, and rejects anything else, including compound commands, redirection, substitution
      and `--output`
- [x] Unit test the validator's decision function against the commands it must allow and the ways a write could be
      smuggled past it
- [x] Give the Claude Code reviewer stub `Bash` and the `PreToolUse` hook that runs the validator
- [x] Give the OpenCode reviewer a `bash` permission that denies everything and allows the same four commands
- [x] Extend `tests/unit/roles.test.ts` so that a reviewer stub which gains a writing tool, or a bash allowance
      outside read-only git, fails the suite
- [x] Update `roles/reviewer.md`: the diff is produced with read-only git where the harness allows it and supplied
      otherwise, and the suites remain something the reviewer cannot run
- [x] Probe both harnesses: confirm the OpenCode reviewer can run `git diff` and cannot run a command that writes,
      and confirm the validator rejects the same command by hand for Claude Code

### 8. Let the reviewer run the suites

Task 7 left the reviewer unable to run anything but git, so `record.md` saying the suites passed stayed a claim it
could not settle. The spec decision changed again, and the hook is no longer only about git, so it is renamed for
what it now does.

- [x] Rename the validator and its test to `.claude/hooks/reviewer-shell.js` and
      `tests/unit/reviewer-shell.test.ts`, since it now narrows a shell rather than only git
- [x] Extend the tests first: the suite commands are allowed in exactly the project's own forms, and rejected with
      any flag, any other port, or anything appended
- [x] Allow `npm run test:unit`, `npm run check:changes` and `PORT=3100 npm test` in the validator and in the
      OpenCode reviewer's `bash` permission, pinning the port away from the development server's default
- [x] Update the `roles.test.ts` guard to the same allowlist, so a reviewer that gains a wider shell still fails
- [x] Update `roles/reviewer.md`: the suites can be run, what running them touches, and that no flag is available
- [x] Probe OpenCode: confirm the reviewer can run `npm run test:unit` and cannot run `npm test -- --update-snapshots`

### 9. Close the review's accepted findings

The `8b6f817` review found that the OpenCode reviewer's `git diff*` allowance includes `git diff --output=<file>`,
which writes a tracked file, and that the guard meant to catch exactly that compares by prefix, so a widened pattern
passes it. The Claude Code hook already refuses `--output` and `--ext-diff`; the protection was never carried across.
Accepted and declined outcomes are logged in `record.md`.

- [x] Tighten the `roles.test.ts` guard first: the reviewer's allowed patterns must equal the expected set exactly
      rather than start with an approved command, every expected allowance must be present, and the write-option
      denials must be present. Confirm it fails against the configuration as it stands
- [x] Deny `--output` and `--ext-diff` in the OpenCode reviewer's `bash` permission, after the allowances, and
      confirm the tightened guard passes
- [x] Probe OpenCode to confirm the denial beats the allowance in practice, since the fix rests on later rules
      winning: `git diff --output=probe.txt master...HEAD` must be refused while `git diff --stat` still runs
- [x] Cover the hook's executable path, which the review found untested: spawn it with a real payload and assert the
      exit code and the refusal message, for an allowed command and a refused one

### 10. Close the re-review's findings

The re-review of `d126a23` found that both harnesses match a command as text while the shell strips quotes before
running it, so `git diff --out'put'=AGENTS.md` passed the `--output` denial in each and would have written a tracked
file. The task 9 fix was correct and incomplete: it denied a spelling rather than a capability.

- [x] Add the quote-smuggled forms to `tests/unit/reviewer-shell.test.ts`, require the quote denials in the
      `roles.test.ts` guard, and confirm both fail against the configuration as it stands
- [x] Refuse quotes outright in the hook and deny them in the OpenCode reviewer's `bash` permission. Nothing on the
      allowlist needs a quote, so refusing them is cheaper and safer than lexing the command the way the shell will
- [x] Confirm in both harnesses that the quoted forms are refused and the plain ones still run, proving it in
      OpenCode with a harmless command rather than an actual write
- [x] Confirm that git refuses abbreviated forms such as `--outp=` and `--out=`, so that a denial by spelling cannot
      be evaded by a shorter one

### 11. Drop the enforcement and keep the instruction

Three review rounds found three ways through the reviewer's configured restrictions, and every refusal actually
observed came from the role file rather than from a harness rule. The spec decision changed: the reviewer's
restraint is an instruction, and git is the safety net. The re-review's findings 1, 2 and 3 are resolved by removing
what they were about. Findings 5 and 8 are fixed here too.

- [x] Delete `.claude/hooks/reviewer-shell.js` and `tests/unit/reviewer-shell.test.ts`
- [x] Remove the `tools` and `hooks` frontmatter from `.claude/agents/reviewer.md`, and the `permission` block from
      the OpenCode reviewer, leaving both stubs holding only a description and their role file
- [x] Remove the permission guards from `tests/unit/roles.test.ts`, keeping the reference checks that still mean
      something
- [x] Rewrite the shell paragraph in `roles/reviewer.md`: it runs what it needs to judge the work, and changes
      nothing. State the rule plainly, since it is now the whole mechanism
- [x] Fix re-review finding 5: `roles/implementer.md` and `roles/reviewer.md` assume every unit has a `plan.md`,
      which contradicts AGENTS.md, where a single-commit bug needs none and a task may have only a record
- [x] Fix re-review finding 8: the trailing whitespace in this unit's `record.md`. The second instance is in
      `ideas/superpowers-skill.md`, which belongs to the unrelated commits and is not this unit's to touch
- [x] Confirm `git diff --check` reports nothing for this unit's files, and run both suites

### 12. Let the reviewer record that it reviewed

With the enforcement gone the reviewer can write, so the record entry that says a review happened no longer needs a
command to carry it. The spec decision changed to allow that one entry and nothing else.

- [x] `roles/reviewer.md`: name the record entry as an output, bound the exception to the `You change nothing` rule,
      and say what the entry contains: a UTC timestamp taken from `date -u`, the harness and model, the unit and the
      commit reviewed, the finding labels, and what could not be verified
- [x] Say plainly that the entry states the event and never the verdict, and that it is appended rather than edited
      over anything already there

### 13. Let the reviewer's commands run without prompting

Removing the reviewer's permission block in task 11 left it falling back to the project rules, which cover
`git diff` and `git status` but not `git log`, `git show`, `git rev-parse` or the suite commands, so a live review
stopped on a permission prompt for each. This grants convenience rather than enforcing behavior, and it applies to
every agent, so it belongs at the project level.

- [x] Allow the read-only git commands a reviewer reaches for, and the suite commands in the forms this project
      uses, in `opencode.json`'s project-level `permission.bash`
- [x] Keep the denials last, since a later rule wins, and leave `npm run dev` prompting so an agent cannot take over
      the development server's port

### 14. Finish the planless-unit correction

Task 11 changed the bodies of the role files and left every summary line and dispatch description promising a spec
and a plan, so a single-commit bug or a record-only task is still excluded by the metadata a harness reads. The
third review found this as P2 and C1, and as C2 that no test would notice.

- [x] Correct the `Output` lines of `roles/planner.md` and `roles/implementer.md` to the documents a unit's kind
      requires rather than to a spec and a plan
- [x] Correct the planner and implementer descriptions in `.claude/agents/` and `opencode.json` so that neither
      excludes a unit without a plan
- [x] Extend `tests/unit/roles.test.ts` to check each stub's `name` and description metadata, so that a stub cannot
      lose them silently. Note in the record that this catches missing metadata, not contradictory wording

### 15. Isolate the branch

Three reviews reported unrelated commits in `master...HEAD`, and declining them as out of scope was true and beside
the point: the branch is the deliverable. The five commits move to their own branch, and 0030 is rebuilt from
`master` with only its own work.

- [x] Cherry-pick the five unrelated commits onto `chore/branch-notes-and-policy`, taken from `master`
- [x] Rebuild `feature-0030-role-instructions` from `master` with only the `feature-0030` commits, keeping
      `backup/0030-before-isolation` until the work merges
- [x] Confirm the branch touches only this unit's files, that `git diff --check` is clean, and that the rebuilt tree
      differs from the backup by exactly the unrelated work

### 16. Grant the rest of the read-only git commands

A review stopped on `git ls-tree`, the third command added to the allowlist one stumble at a time. The decision
behind task 13 already covers this, so the work is to stop doing it piecemeal.

- [x] Add the read-only git commands a reviewer plausibly reaches for, in one batch, rather than the one that just
      failed
- [x] Leave the family alone that can write, so that `git *` is not granted wholesale and a commit, reset or clean
      still prompts

### 17. Close the fourth review

Four findings, all accepted. The batch in task 16 included `git reflog*`, whose `expire` and `delete` subcommands
write, which is the rule that batch was written to respect. The planless-unit correction still had three places
left. The record stopped carrying suite results. And the reviewer's descriptions still promised it edits nothing,
which stopped being true when it was told to append its own record entry.

- [x] Remove `git reflog*` from the allowlist, since `reflog expire` and `reflog delete` are writes
- [x] Correct the three remaining places that assume every unit has a plan: the AGENTS.md `Roles` summary,
      `roles/planner.md`'s handover, and the `Working the plan` caveat in `roles/implementer.md`
- [x] Correct the reviewer's description in both harnesses to match the record entry its role file requires
- [x] Record the suites run on the final tree, which the last two entries omitted

## Verification

- [x] Every line removed from AGENTS.md is accounted for
- [x] `tests/unit/roles.test.ts` passes, and fails when a referenced path is broken
- [x] `npm run check:changes` passes against the committed implementation
- [x] The end-to-end suite passes unchanged, since this unit touches no generator code

## Commit Points

- [x] Spec and plan
- [x] Role files, AGENTS.md, the stubs, the reference test, and verification results
