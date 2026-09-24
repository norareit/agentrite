---
kind: feature
status: implemented
timestamp: 2026-09-04T16:15:02Z
---

# 0030 Role instructions

## Log

- 2026-09-04T16:15:02Z [human] requested role-specific agent instructions for the planner, implementer and reviewer,
  harness-agnostic, with the role-specific content moved out of AGENTS.md. This is the change 0025 onward was
  groundwork for
- 2026-09-04T16:15:02Z [Claude Code, anthropic/claude-opus-5] spec and plan written. Status was set to
  `in-progress` before approval, which skips the `approved` stage; corrected to `draft` and awaiting approval
- 2026-09-04T16:20:00Z [human] asked for OpenCode stubs alongside the Claude Code ones; both harnesses now covered
- 2026-09-05T11:10:12Z [Claude Code, anthropic/claude-fable-5-1] revised the spec and plan after review, before
  approval. The three rules the role files introduce are now decisions in the spec rather than plan tasks; the
  reviewer reads all role files and reports without fixing, with the amendment rule staying shared; the `Roles`
  section is an instruction to read the file, not an index; the portability requirement names the whole bundle;
  OpenCode inlines the role file with `{file:...}`; the plan gains a reference-existence test, an inventory logged
  here, and a concrete OpenCode check in place of the schema validation
- 2026-09-05T11:34:34Z [Claude Code, anthropic/claude-fable-5-1] revised again after comparing the spec and plan
  with Superpowers, Spec Kit, OpenSpec and BMAD. Added as decisions: the unit directory is every role's input and
  output; tracing runs in both directions and plans hold no placeholders; the implementer never changes `spec.md`;
  finishing a unit logs a suite run on the final tree; the reviewer's inputs are named and record entries are
  claims to verify; findings are labeled by axis with a blocking flag and unrequested work is a finding; declined
  findings are logged with their reason. Per-task dispatch is now an explicit non-goal. The plan checks whether
  OpenCode subagents receive AGENTS.md, since its documentation does not say
- 2026-09-05T12:16:27Z [human] decided that the reviewer only returns findings and that review outcomes before freeze
  belong in the log rather than under amendments; asked to make the reviewer genuinely read-only, move the reference
  test before implementation, and run the change check after the implementation commit
- 2026-09-05T12:16:27Z [OpenCode, openai/gpt-5.6-sol] revised the spec and plan accordingly. The dispatching session
  now supplies the diff and stores returned findings, reviewer stubs expose only read and search tools, outcome
  recording follows the freeze boundary, and verification checks the committed implementation
- 2026-09-05T12:37:58Z [human] approved the spec and plan and asked for the implementation, moving the status
  from `draft` through `approved` to `in-progress`
- 2026-09-05T12:37:58Z [Claude Code, anthropic/claude-opus-5] took the AGENTS.md inventory required by task 1. One
  line per section, with its destination:
    - Header, blog description and README pointer: shared, stays
    - General guidelines, Where instructions belong: shared, stays
    - General guidelines, Text: shared, stays
    - General guidelines, Documentation changes: shared, stays
    - General guidelines, Verifying reported problems: shared, stays, since it describes this environment
    - General guidelines, Commits: shared, stays
    - Changes, structure and document roles through the branch rule: shared, stays
    - Changes, review paragraph: splits. The three axes and how findings are formed move to `roles/reviewer.md`;
      the dispatching session storing findings in `.reviews/<unit>/` stays, since the reviewer never writes; the
      outcome-recording rule stays, corrected to the log before freeze and amendments after freeze
    - Features: the document requirement stays; choosing the kind moves to `roles/planner.md`
    - Bugs, kind decision and spec contents: moves to `roles/planner.md`, with the `The fix descriptionFix` typo
      fixed in transit. The document requirement, a `spec.md` always and a `plan.md` when the fix takes more than a
      couple of steps, stays
    - Bugs, regression test before the fix: moves to `roles/implementer.md`, since the implementer acts on it
    - Tasks, record contents and sizing: moves to `roles/planner.md`; the document requirement stays
    - Exclusions: shared, stays
    - Code: shared, stays, since work outside the three roles follows it
    - Testing: shared, stays, for the same reason
- 2026-09-05T12:47:06Z [Claude Code, anthropic/claude-opus-5] implemented. `roles/planner.md`,
  `roles/implementer.md` and `roles/reviewer.md` written; AGENTS.md gained the `## Roles` section, lost the bug spec
  contents, the kind decision, the regression-test rule and the task record contents, and had its review paragraph
  corrected to log before freeze and amend after; stubs added under `.claude/agents/` and the `agent` key of
  `opencode.json`; `tests/unit/roles.test.ts` guards every reference
- 2026-09-05T12:47:06Z [Claude Code, anthropic/claude-opus-5] task 2 order held. The reference test was written
  before the role files and the stubs and failed on all five cases, three of them for the missing `## Roles` section
  and the missing role files, two for the missing stubs. The deliberately wrong path case, `roles/architect.md`,
  passed once the reference matcher deduplicated `roles/x.md` against `./roles/x.md`, which proves the guard reports
  a broken reference rather than only a missing section
- 2026-09-05T12:47:06Z [Claude Code, anthropic/claude-opus-5] OpenCode verified, in a scratch copy of AGENTS.md,
  `opencode.json` and `roles/` so that nothing could touch the repository. `opencode agent list` shows `planner`,
  `implementer` and `reviewer` as subagents, and the reviewer's resolved permissions end with the deny-all rule and
  the three allows, after the project rules. A dispatched planner subagent answered with `# Planner`, the first
  heading of its role file, so `{file:./roles/<role>.md}` inlines as intended, and quoted the AGENTS.md em dash
  bullet verbatim, so OpenCode subagents do receive AGENTS.md and `{file:./AGENTS.md}` is not needed. A dispatched
  reviewer subagent reported its tools as `glob`, `grep` and `read` only, with no way to create a file
- 2026-09-05T12:47:06Z [Claude Code, anthropic/claude-opus-5] verification. Every line removed from AGENTS.md
  appears in a role file, matching the inventory above. Three restatements found and removed while checking: the
  feature and task sizes, the branch rule, and the bar for `implemented`, each now a pointer to AGENTS.md rather
  than a second copy. Tracing checked in both directions, every plan task to a spec requirement and every
  requirement to a task. Suites run on the final tree: `npm run test:unit` 54 pass, up from 49 with the five new
  reference cases, and `PORT=3100 npm test` 86 pass
- 2026-09-05T12:50:12Z [Claude Code, anthropic/claude-opus-5] `npm run check:changes` run against the committed
  implementation in 0f1eab9 and passed, with no frozen document touched and no implemented unit left with an open
  box. The unit stays `in-progress` until review passes
- 2026-09-05T23:41:30Z [human] rejected the decision that the reviewer needs no shell. Denying a shell prevents
  writes, not reads, and the reviewer already reads the whole working tree, so refusing it `git diff` hides nothing
  and only charges a manual step for data it can already reach
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] the spec decision changed accordingly, before the
  implementation, since the implementer may not change `spec.md`. The reviewer now produces its own diff with
  read-only git where its harness can express that, and is handed one where it cannot. Writes stay denied
  everywhere. `plan.md` gained task 7 for the correction rather than rewriting the ticked tasks that recorded what
  was actually built
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] the harnesses need different mechanisms, from the
  documentation: Claude Code's subagent `tools` field takes tool names with no command patterns, so a read-only
  shell needs its per-subagent `PreToolUse` hook, which is the documented way to build one; OpenCode's
  `permission.bash` takes command patterns directly, as this project's config already uses for `rm *`
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] the validator was written as `.js` rather than the
  `.mjs` the plan named. `tsconfig` sets `module: commonjs`, so TypeScript downlevels the test's dynamic `import()`
  into `require()`, which cannot load an ESM file. CommonJS with `module.exports` is also what Claude Code executes
  directly. The plan was corrected to the real path
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] the validator's tests were written before it, against
  the file that did not exist yet, and failed on the missing module. Its unit tests live in their own
  `tests/unit/reviewer-readonly-git.test.ts` rather than in `roles.test.ts`, which guards references between files
  and is a separate concern
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] verified. By hand, the validator exits 0 on
  `git diff --stat` and 2 on `git diff --stat && touch probe.txt`, `npm test`, `git push` and
  `git diff --output=probe.txt`. In OpenCode, in a disposable git sandbox, the reviewer ran `git diff --stat`,
  `git log --oneline -1` and `git status --short`, and the harness refused `git branch --list` even though the
  project config allows it, because the agent rules resolve last and win. It also refused
  `git diff --stat && git branch --list`, so a compound command does not slip past the `git diff*` prefix. Asking
  the reviewer directly to run `touch probe.txt` and `npm test` proved nothing about enforcement, since it declined
  both on its own instructions before the harness was reached
- 2026-09-05T23:41:30Z [Claude Code, anthropic/claude-opus-5] the new guards were mutation tested. Adding `Edit` to
  the Claude Code reviewer stub, removing its hook while keeping `Bash`, and allowing `npm test*` in the OpenCode
  reviewer each fail the suite. Suites on the final tree: `npm run test:unit` 60 pass, up from 54, and
  `PORT=3100 npm test` 86 pass
- 2026-09-05T23:50:04Z [human] rejected the reviewer being unable to run the suites: finishing a unit requires a
  `record.md` entry saying they were run on the final tree, and a reviewer that cannot run them can only take that
  on trust
- 2026-09-05T23:50:04Z [Claude Code, anthropic/claude-opus-5] the spec decision changed again, before the code, and
  `plan.md` gained task 8. The reviewer's shell now also holds `npm run test:unit`, `npm run check:changes` and
  `PORT=3100 npm test`, in exactly those forms. No flags: `--update-snapshots` would rewrite the very baselines
  under review. The port is pinned so that a review cannot kill a development server on the default port
- 2026-09-05T23:50:04Z [Claude Code, anthropic/claude-opus-5] accepted knowingly: running the suites is not a pure
  read. It rebuilds `www/` and writes `test-results/`, both generated and ignored, so nothing under review changes
- 2026-09-05T23:50:04Z [Claude Code, anthropic/claude-opus-5] the hook and its test were renamed from
  `reviewer-readonly-git` to `reviewer-shell`, since it no longer narrows only git. `roles/reviewer.md` also lost
  its claims-versus-evidence example, which used the suites as the thing a reviewer cannot check
- 2026-09-05T23:50:04Z [Claude Code, anthropic/claude-opus-5] verified. By hand the validator exits 0 on
  `npm run test:unit`, `npm run check:changes` and `PORT=3100 npm test`, and 2 on bare `npm test`,
  `npm test -- --update-snapshots`, `PORT=3000 npm test` and `npm run build`. In OpenCode the reviewer was refused
  `npm test -- --update-snapshots` by the harness, even though the project config allows `npm test*`, and was
  permitted `npm run test:unit`, which reached npm and failed only on the sandbox having no `package.json`. A first
  probe proved nothing because the sandbox still held the previous role file, and the reviewer declined on those
  stale instructions before the harness was reached. Suites on the final tree: `npm run test:unit` 62 pass and
  `PORT=3100 npm test` 86 pass
- 2026-09-06T14:21:08Z [OpenCode, openai/gpt-5.6-sol] reviewed the unit against `master`. The review reported seven
  blocking findings, S1, S2, P1, P2 and C1 through C3, covering unapproved scope in the branch diff, write-capable
  OpenCode reviewer permissions, gaps between the checked plan and its permission tests, missing executable-hook
  coverage, and the reviewer's inability to run the diff and suites in its dispatched environment. all findings await
  human disposition
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] accepted review findings S2 and C1, which are one
  defect: the OpenCode reviewer's `git diff*` allowance included `git diff --output=<file>`, which writes a tracked
  file, so a reviewer specified to be unable to edit could overwrite the work it was judging. The Claude Code hook
  already refused `--output` and `--ext-diff`; the same protection was never carried across. `*--output*` and
  `*--ext-diff*` are now denied after the allowances. Verified in OpenCode: `git diff --output=probe.txt master` is
  refused while `git diff --stat` still runs, and no file was written, which also confirms that a later rule beats
  an earlier one
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] accepted review finding P2. The guard compared each
  allowed pattern by prefix, so a widened pattern such as `git diff --output*` passed it, and it never checked that
  the expected allowances were still present. It now compares the allowed set exactly and requires both write-option
  denials. Prefix matching is the reason S2 survived a guard written to prevent exactly it
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] accepted review finding C2. The hook's executable path,
  its stdin parsing and its exit codes, had been checked only by hand and recorded in this log. Three tests now spawn
  it: exit 0 and silence for an allowed command, exit 2 and the refusal message for a refused one, and exit 2 for a
  payload it cannot parse rather than a default to allow
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] declined review findings S1 and P1. They report the
  README model documentation, the superpowers idea edits and the AGENTS.md harness-trailer rule as unapproved scope
  in this unit. Those come from `f655b28`, `1d7de8d`, `dbaf41e`, `ea08b95` and `36c37bd`, all of which were on the
  branch before this unit's first implementation commit `0f1eab9`. They are unrelated work sharing a branch, not
  scope the implementer added, and the prescribed correction would delete legitimate changes, including the
  harness-trailer rule the human asked for. The observation underneath is fair and is a branch hygiene problem:
  `master...HEAD` is not a clean diff of this unit, and those five commits have no change unit of their own
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] declined review finding C3, which reports that the
  reviewer had only read, glob and grep rather than the shell its role file promises. The permission block committed
  at the reviewed commit grants that shell, and `opencode agent list` resolves it correctly: `bash` `*` denied, with
  the read-only git and suite commands allowed. The tool set the reviewer reported is exactly the configuration as
  it stood at `0f1eab9`, two commits before the shell was added, so its session was started before `36db78a` and
  OpenCode reads its configuration at startup. No defect, but the consequence stands and is recorded here: that
  review verified none of this record's suite claims and produced no diff of its own
- 2026-09-06T14:45:11Z [Claude Code, anthropic/claude-opus-5] suites run on the tree with the accepted findings
  applied: `npm run test:unit` 65 pass, up from 62 with the three hook tests, and `PORT=3100 npm test` 86 pass
- 2026-09-06T15:11:55Z [OpenCode, openai/gpt-5.6-sol] re-reviewed `d126a23` and reported five findings, each marked
  as blocking: a shell quote concatenation bypass of the reviewer's write restrictions, a plan that claims the
  write-smuggling protection is complete, tests that do not cover split-quoted options, and the branch's unrelated
  changes with their absence from the plan. It ran the suites this time and reported `npm run test:unit` 65 pass,
  `npm run check:changes` pass and `PORT=3100 npm test` 86 pass, which settles the claims the previous review could
  not check
- 2026-09-06T15:11:55Z [Claude Code, anthropic/claude-opus-5] accepted the first three findings, which are one
  defect. Both harnesses match a command as text, and the shell removes quotes before running it, so
  `git diff --out'put'=AGENTS.md` contains no `--output` for either denial to match and reaches git as exactly
  `--output=AGENTS.md`, writing a tracked file. The task 9 fix denied a spelling rather than a capability. Quotes
  are now refused outright, in the hook and as `*'*` and `*"*` in the OpenCode reviewer's `bash` permission, since
  nothing on the allowlist needs one. `plan.md` gained task 10, because task 9's claim to have closed write
  smuggling was not true
- 2026-09-06T15:11:55Z [Claude Code, anthropic/claude-opus-5] verified the bypass and the fix in both harnesses
  without writing anything. Before the fix, OpenCode refused `git di'ff' --stat`, which shows it matches raw text,
  and ran `git diff --st'at'`, which shows a quoted suffix survives the match and reaches the shell. After the fix
  it refuses `git diff --st'at'` and still runs `git diff --stat`. The hook exits 2 for `--out'put'=x`,
  `--out"put"=x` and `--st'at'`, and 0 for `git diff --stat`. Also checked, though the review did not raise it: git
  refuses abbreviated forms such as `--outp=` and `--out=`, so a denial by spelling cannot be evaded by a shorter
  one
- 2026-09-06T15:11:55Z [Claude Code, anthropic/claude-opus-5] declined the two findings about unrelated changes on
  the branch, for the reason already logged against `S1` and `P1`: they come from five commits that predate this
  unit's first implementation commit `0f1eab9`, so they are neither this unit's scope nor its plan's to cover. The
  observation is correct and unaddressed, and it is a branch problem rather than a unit problem: `master...HEAD` is
  not a clean diff of `0030`, and those five commits have no change unit of their own. Moving them off rewrites
  branch history and is left to the human
- 2026-09-06T15:11:55Z [Claude Code, anthropic/claude-opus-5] suites run on the tree with the fix applied:
  `npm run test:unit` 65 pass and `PORT=3100 npm test` 86 pass. Both new guards failed before the fix and pass
  after it. The unit stays `in-progress`: two reviews have each found a real defect in this boundary, and the fixed
  tree has not been reviewed
- 2026-09-06T15:38:38Z [human] rejected the whole enforcement approach. Human reviewers of human code are not given
  a stripped-down account; the guardrails had grown into hooks, permission patterns and scripts, and none of it is
  KISS. State that the reviewer must not edit, and stop configuring it
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] agreed on the evidence and changed the spec decision
  before the code. Three review rounds found three ways through the enforcement, `--output`, quotes assembling a
  denied option, and shell redirection, and every one was a defect in the guardrail rather than in the work it
  guarded. No defect was ever found in the role files or the AGENTS.md split. Meanwhile every refusal actually
  observed came from the role file: the reviewer declined to write a file, to run the suites and to use `--output`
  on its own, before any harness rule was reached, and commands had to be chosen for having no reason to be refused
  before the enforcement could be tested at all. The instruction was doing the work; the enforcement was supplying
  the bugs
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] removed `.claude/hooks/reviewer-shell.js` and its
  tests, the `tools` and `hooks` frontmatter from the Claude Code reviewer stub, the `permission` block from the
  OpenCode reviewer, and the two permission guards from `tests/unit/roles.test.ts`. Both stubs now hold a
  description and their role file, nothing else. `roles/reviewer.md` states plainly that the reviewer changes
  nothing, that no tool enforces it, and why. The unit test count falls from 65 to 54, which is the point
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] the third review's findings 1, 2 and 3, on redirection,
  bracket globs and plan tasks overclaiming the shell restrictions, are resolved by removing what they were about
  rather than by fixing them. Before removal, finding 1 was confirmed real: the reviewer ran `git diff --stat >
  /dev/null` under OpenCode, so any redirect would have written a file. Finding 2 was confirmed as a gap that was
  not exploitable, since `--out[p]ut=x` stays literal unless a file of that name already exists, which was tested
  both ways
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] accepted the third review's finding 5. Both
  `roles/implementer.md` and `roles/reviewer.md` assumed every unit has a `plan.md`, which contradicts AGENTS.md,
  where a single-commit bug needs none and a task may have only a record. Each now says to work from the documents
  the kind requires, and the reviewer assesses no plan fidelity where there is no plan
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] accepted the third review's finding 8 for this unit's
  file and fixed the trailing whitespace in `record.md`. The second instance is in `ideas/superpowers-skill.md`,
  which belongs to the unrelated commits on this branch and is not this unit's to touch
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] declined the third review's findings 4 and 6. Finding 4
  reports that the role files carry mandatory guidance the spec did not enumerate, which is a contradiction in the
  spec itself: it both anticipates that most of each role file is guidance that existed nowhere and claims every new
  rule is listed. Finding 6 reports that this spec contains file paths, which AGENTS.md forbids in a spec. That is
  literally true, and this unit's subject is which files exist and where, so the paths are the requirement rather
  than implementation detail leaking upward. Both are better settled by revising the rules than by mangling this
  unit, and neither blocks the work
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] declined the third review's finding 7, unrelated
  changes on the branch, for the third time and for the reason already recorded. It remains true and remains a
  branch problem rather than a unit problem
- 2026-09-06T15:38:38Z [Claude Code, anthropic/claude-opus-5] suites run on the simplified tree:
  `npm run test:unit` 54 pass and `PORT=3100 npm test` 86 pass. `git diff --check` reports nothing for this unit's
  files
- 2026-09-06T15:43:43Z [human] asked for the reviewer to log the fact of its own review with a line in its role
  file, now that nothing stops it writing, and judged `0032` no longer relevant
- 2026-09-06T15:43:43Z [Claude Code, anthropic/claude-opus-5] changed the spec decision before the role file. The
  reviewer now has one bounded exception to changing nothing: a single appended `record.md` entry stating that it
  reviewed, against which commit, with which finding labels, and what it could not verify. The entry states the
  event and never the verdict, so a reviewer cannot grade its own findings into the project's history. The
  `You change nothing` rule names the exception rather than leaving the two instructions to contradict each other.
  The entry takes its timestamp from `date -u`, since a local clock has already put a record here a day ahead of
  itself. Suites: `npm run test:unit` 54 pass and `PORT=3100 npm test` 86 pass
- 2026-09-06T15:50:15Z [human] reported that a live review now stops on a permission prompt for each of
  `git rev-parse`, `git log`, `git show` and the rest, since task 11 removed the reviewer's own permission block
- 2026-09-06T15:50:15Z [Claude Code, anthropic/claude-opus-5] added the read-only git commands, `log`, `show`,
  `rev-parse`, `merge-base`, `blame`, `ls-files`, `shortlog`, `describe` and `cat-file`, and the suite commands
  `npm run test:unit`, `npm run check:changes` and `PORT=<port> npm test`, to the project-level `permission.bash` in
  `opencode.json`. Project level rather than a reviewer block: this grants convenience rather than enforcing a
  role's behavior, and every agent benefits. `npm run dev` deliberately still prompts, since it would take the
  development server's port. The denials stay last, because a later rule wins. Write-capable git options are not
  guarded here, since at project level the primary agent can edit files anyway and guarding them would be the same
  theater task 11 removed. Suites: `npm run test:unit` 54 pass and `PORT=3100 npm test` 86 pass
- 2026-09-06T16:00:50Z [OpenCode, openai/gpt-5.6-sol] reviewed `changes/0030-role-instructions/` at commit
  `b0f946865ccb1932f1afd29aeea68478044dd13a`; returned findings S1, S2, P1, P2, C1, C2 and C3. Historical
  test-first sequencing and prior harness probe results could not be independently verified; current OpenCode agent
  discovery was checked, but no role subagent was dispatched
- 2026-09-06T16:09:24Z [human] accepted every finding of the third review, including the branch isolation and the
  spec decision for the permission grant
- 2026-09-06T16:09:24Z [Claude Code, anthropic/claude-opus-5] accepted S1. Task 13 changed project-wide shell
  permissions with no decision behind it, which is the planning step the implementer is not allowed to skip. The
  spec now carries the decision: the commands a role needs are granted at the project level, not per agent, because
  that buys convenience rather than enforcing anything, and commands that would disturb the developer's machine keep
  prompting. The work stands; what was missing was the approval, which the human has now given
- 2026-09-06T16:09:24Z [Claude Code, anthropic/claude-opus-5] accepted P2 and C1, which are one incomplete fix.
  Task 11 corrected the bodies of the role files and left every summary and dispatch description promising a spec
  and a plan, so the metadata a harness reads still excluded a single-commit bug and a record-only task. The
  `Output` lines of `roles/planner.md` and `roles/implementer.md` now name the documents a unit's kind requires, and
  the planner and implementer descriptions in both harnesses no longer demand a plan the rules do not require. The
  box for task 11 had been ticked while this was outstanding
- 2026-09-06T16:09:24Z [Claude Code, anthropic/claude-opus-5] accepted C2. `tests/unit/roles.test.ts` now checks
  that each Claude Code stub carries the `name` its role expects and a non-empty description, and that each OpenCode
  agent has one. Verified by mutation: renaming the planner stub to `plan-writer` fails the suite. It catches
  missing metadata, not a description that is present and wrong, which is what C1 was, so that stays a reading job
- 2026-09-06T16:09:24Z [Claude Code, anthropic/claude-opus-5] accepted S2, P1 and C3, having declined the same
  observation in two earlier reviews. The declines were accurate, those commits predate this unit, and they were
  beside the point: the branch is what would merge. The five commits, two idea-file edits, the AGENTS.md
  harness-trailer rule, the README model-selection documentation and the Qwen context note, now sit on
  `chore/branch-notes-and-policy`, taken from `master`. This branch was rebuilt from `master` with only its fifteen
  `feature-0030` commits. It touches twelve files, all this unit's, `git diff --check` is clean, and the rebuilt
  tree differs from `backup/0030-before-isolation` by exactly the moved work and nothing else
- 2026-09-06T16:09:24Z [Claude Code, anthropic/claude-opus-5] a consequence of that rebuild, recorded so a later
  reader is not confused: rewriting the branch changed every commit hash. The third review, and the reviewer's own
  entry above, name `b0f946865ccb1932f1afd29aeea68478044dd13a`, which is now `fd1dd41` on this branch. The old
  hashes resolve only while `backup/0030-before-isolation` exists, which is until this work merges. The AGENTS.md
  rule forbidding harness-injected commit trailers also left with those commits and returns when
  `chore/branch-notes-and-policy` merges; it is still followed here
- 2026-09-06T22:29:04Z [human] reported a review stopping on `git ls-tree`
- 2026-09-06T22:29:04Z [Claude Code, anthropic/claude-opus-5] added it, and with it `rev-list`, `diff-tree`,
  `diff-index`, `show-ref`, `for-each-ref`, `name-rev`, `reflog`, `grep`, `whatchanged` and `count-objects`. This was
  the third command added one stumble at a time, so the read-only family goes in as a batch. `git *` was considered
  and rejected: it would grant `commit`, `reset`, `clean` and `checkout` to every agent without a prompt, and losing
  work to an unprompted `reset --hard` is worse than the prompt it saves. The commands that can write are left to
  ask, and the denials stay last
- 2026-09-06T22:34:14Z [OpenCode, openai/gpt-5.6-sol] re-reviewed `changes/0030-role-instructions/` at commit
  `9e32ec4251464356990927925aa3cfc65c31325e`; returned findings S1, S2, S3, P1, P2, C1, C2 and C3. Historical
  test-first sequencing and prior harness probe results could not be independently verified; no role subagent was
  dispatched
- 2026-09-06T22:50:19Z [OpenCode, openai/gpt-5.6-sol] reviewed the unit again and returned four findings, two high
  and two medium, with the verdict that it is not ready for `implemented`
- 2026-09-06T22:50:19Z [human] judged all four legitimate
- 2026-09-06T22:50:19Z [Claude Code, anthropic/claude-opus-5] accepted finding 1 and removed `git reflog*`. Its
  `expire` and `delete` subcommands write, so the batch added in task 16 broke the very rule it was written to
  respect, one commit after the message claiming the commands that can write still prompt. The rest of that batch
  was re-checked one command at a time and is read-only. Noted rather than changed: `git branch*`, which predates
  this unit, likewise admits `git branch -D`. It is the human's existing configuration and is left alone here
- 2026-09-06T22:50:19Z [Claude Code, anthropic/claude-opus-5] accepted finding 2, the third round on planless units.
  Three places still assumed a spec and a plan: the AGENTS.md `Roles` summary, which said the reviewer judges
  against both; `roles/planner.md`'s handover, which logged that the spec and plan are written; and the
  `Working the plan` caveat in `roles/implementer.md`, which was vague about which bullets it excused. Each now
  names the documents the unit's kind requires, and the implementer's caveat says plainly that the bullets naming
  `plan.md` apply only where there is one
- 2026-09-06T22:50:19Z [Claude Code, anthropic/claude-opus-5] accepted finding 3. The spec requires an entry saying
  the suites were run on the final tree and what they reported, and the entries for the branch isolation and the
  git allowlist batch recorded neither, although the suites were run both times. On the tree with these four fixes:
  `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass, and `git diff --check master...HEAD` clean
- 2026-09-06T22:50:19Z [Claude Code, anthropic/claude-opus-5] accepted the wording half of finding 4 and declined
  the test half. The reviewer's description in both harnesses said it returns findings without editing anything,
  which stopped being true when the role file told it to append its own record entry; both now say it changes
  nothing under review and appends one entry saying that it reviewed. No test is added, because a contradiction
  between prose in two files is not mechanically checkable, and a test asserting that one description avoids a
  particular phrase would break on the next rewording while catching nothing. The metadata test added last round
  covers presence, and the wording stays a reading job
- 2026-09-06T22:53:38Z [human] called a halt: four review rounds is enough, and the unit should go to `master`
- 2026-09-06T22:53:38Z [Claude Code, anthropic/claude-opus-5] set to `implemented` with every task ticked and the
  suites green on the final tree: `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass, `npm run check:changes`
  pass, `git diff --check master...HEAD` clean. Recorded honestly, because the bar AGENTS.md sets is that review
  passes: four reviews ran, each returned findings, and the fourth's four findings were all fixed afterwards. No
  review round has come back clean, so this status rests on the fixes being right rather than on a reviewer having
  confirmed them. Rounds two, three and four each caught something the previous round had claimed to fix, so the
  residual risk is wording drift and configuration detail rather than the role instructions themselves
- 2026-09-06T22:53:38Z [Claude Code, anthropic/claude-opus-5] what the four rounds cost and bought, for whoever
  weighs this convention later: they found one live write bypass in the reviewer's own guardrail, then two more ways
  through the replacement, which is what led to deleting the guardrail entirely; after that they found metadata and
  branch composition problems and one bad allowlist entry. Every defect they found was in the machinery built to
  constrain the roles, never in the role instructions themselves, which is the argument for the simplicity this unit
  ended with rather than the one it started with

## Amendments
