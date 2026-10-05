---
kind: feature
status: in-progress
timestamp: 2026-10-05T13:45:27Z
---

# 0033 Specifying apart from planning

## Log

- 2026-10-05T13:45:27Z [human] said: "Act as the @planner and create a new change where we split the planner into
  two parts: a speccer and a planner (im a bit unsure about the term speccer...). The idea is that the human can
  generate several specs without needing plans or implementations. But if several features exist at the same time
  and a plan is made for all of them, by the time the first few are implemented the plan of the rest might no
  longer be correct. While the spec should most often stay intact if it is well made. Right?! Eventually the human
  can then focus on creating specs, and have the orchestrator create a plan, implement it, review it and come back
  to the human when everything is done."
- 2026-10-05T13:45:27Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session, asked the
  human for the role's name and for who lets a plan through. The human chose `specifier`, and no gate with a new
  status `planned`
- 2026-10-05T13:45:27Z [Claude Code, anthropic/claude-opus-5-5] asked where an approved spec waits, and proposed
  `master`, by a merge of the specifier's branch. The human: "On master seems to make sense, but doesn't that
  conflict with how we start the agent.sh? Or does it create a new branch if specifying a unit that only lives on
  master?" Answered that `./agent.sh` refuses a unit with no local branch and makes none, and asked who cuts the
  branch. The human: "What about creating it on master, committing it and THEN creating a branch? Best of both
  worlds?"
- 2026-10-05T13:47:23Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md` and `plan.md`. The unit is a feature.
  Its number is 0033: 0032 is a draft on its own branch and is not on `master`, where this unit's branch was cut. Of
  the human's last answer the spec takes that the specifier commits on `master`, and not that the branch is cut right
  after: the spec cuts it when planning starts, and says why under Decisions. The human has not read that. Two things
  are not established and are in the spec. The status stays `draft`
- 2026-10-05T13:51:43Z [human] read the planner's summary and said: "The problem with the cutting branch when planning
  starts is that that requires ME to create the branch, before I launch the agent.sh... That's kinda awkward. Maybe
  there should be an option to bake this into agent.sh? Like "git branch -c"?"
- 2026-10-05T13:51:43Z [Claude Code, anthropic/claude-opus-5-5] took that into the unit: `./agent.sh` cuts the branch
  of a unit that `master` holds and that has none, as requirements 17 to 20, with tasks for it in the plan. It was
  under "Beyond the request" before. The spec does it without an option, where the human said "maybe an option", and
  says why. One thing it leaves open is now under "Beyond the request": a branch that a run cut and left empty stays
  where it was cut
- 2026-10-05T16:57:42Z [human] said: "Okay... 0032 is done. Can you check it out? I've ff'ed it to master and rebased
  this branch on master. So all changes should be here. Use the @planner role to change anything that needs changing
  in 0033."
- 2026-10-05T16:57:42Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session, on the branch as
  the human rebased it, where the plan's commit is `253863b` on `master` at `39251d6`. Read 0032's record to its end,
  the README's "Running a role", `scripts/agentrite-run.mjs` and the tests 0032 added, and searched the scripts, the
  tests and the README for the roles' names and for counts of them. What changed in `spec.md`: the findings say that
  0032 is on `master` and what it added; requirements 21 and 22 are new, for `roles`, `roles --json` and `run` with a
  fourth role; requirement 15 names two more places of the README; the decision on 0032 is rewritten, and one is added
  that `run` still takes a unit that exists; that case is a non-goal and under "Beyond the request". What changed in
  `plan.md`: `tests/agentrite-run.test.mjs` is among the files, the first task changes the line of the usage of `run`
  that names the roles and adds a run of the specifier, and the README's task has four places. Found to need no
  change: the tasks on the role files, on `process.md`, on the templates and on the sandbox's wrapper, since 0032
  touched none of those files, and the counts of files in the tests the plan changes, which 0032 left as they were.
  Not run: the suite. The status stays `draft`
- 2026-10-05T17:09:15Z [human] said, in a new session of Claude Code on the host: "Act as the @implementer and
  implement feature 0033"
- 2026-10-05T17:09:15Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main session, in
  the main checkout on the host, on the branch `feature-0033-specifier-role` at `9f1c083`. The status was `draft`,
  and no entry says `approved`. The human's instruction above is taken as the approval of `spec.md` and `plan.md` as
  they stand at `9f1c083`: that is the implementer's reading, as it was for 0032, and the human did not say the word.
  The spec says of itself that everything beyond the four choices had not been read by the human; whether it was read
  since is not known here. Read `process.md` and `roles/implementer.md` of the release 3.0.0 in `node_modules`, and
  this unit's spec, plan and record whole. `npm test` on `9f1c083` before any change: 337 tests, 337 passed. Status
  `in-progress`
- 2026-10-05T17:11:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did the plan's first two groups of
  tasks.
  * The wrappers, `542b1f5`. The tests and the fixtures first: `npm test` reported 339 tests, 16 failed. With the
    specifier in the list of roles, the three descriptions and the template, 339 passed. The new test of `refresh`
    builds the wrappers of the release before from the two descriptions 3.0.0 wrote, which it holds as that release
    wrapped them; the planner's was compared once, by hand, with `.claude/agents/planner.md` of this repository,
    which 3.0.0 wrote, and is the same. The test of `init` did not need the specifier's wrapper added by name: it
    already compares what `init` plans with what `agentrite-roles` plans. The start of the implementation is a
    commit of its own, `e830f69`, which is not among the plan's commit points
  * The role files. `roles/planner.md` on `master` was cut into 64 pieces: its headings, and each sentence of its
    paragraphs and bullets. A script looked for each piece, with its line breaks folded, in the two new files.
    63 are in one of them word for word, and those of "Read process.md first" in both. One was reworded, and two
    are word for word in the specifier's file and reworded in the planner's, where the plan's table says "both":
    * The output. Was: "**Output**: the documents the unit's kind requires, which for a feature is `spec.md` and
      `plan.md` and for a task may be nothing but the record, and a log entry in its `record.md`". In the
      specifier's: "**Output**: the documents the unit's kind requires of you, which for a feature or a bug is
      `spec.md` and for a task may be nothing but the record, and a log entry in its `record.md`. You write no
      `plan.md`". In the planner's: "**Output**: `plan.md` where the unit gets one, a log entry in its `record.md`,
      and the status `planned`"
    * The opening. "You turn a request into a change unit that someone else can implement without coming back to
      ask what was meant." is the specifier's. The planner's: "You turn an approved unit into a plan that someone
      else can implement without coming back to ask what was meant."
    * The handing over. "Log in `record.md` that the unit's documents are written, and leave the status at
      `draft`. Approval is the human's, and the status moves on when they give it." is the specifier's. The
      planner's: "Log in `record.md` that the plan is written, or that the unit needs none, and set the status to
      `planned`. Nobody approves the plan: once the unit is `planned`, the implementer may begin."
    * The input, "the request, and the unit directory `changes/<number>-<kebab-name>/`, which you create or
      continue", is the specifier's word for word. The planner's is requirement 3's
    * "This file holds only what planning adds." is the planner's, and reads "specifying" in the specifier's
  * New text, which the old file did not hold: the planner's "Before starting", and the second paragraph of the
    specifier's "Handing over". The implementer's file changed in the three places the plan names and the
    reviewer's in one sentence. `npm test` on the tree with the four role files: 339 passed. No test reads a role
    file's text
- 2026-10-05T17:12:29Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, changed `process.md` in the four places the
  plan names, and the two change templates. Beyond what the plan's approach spells out:
  * The paragraph on the status is two paragraphs now, the second opening at "Set `implemented` only after", and
    that second one is wrapped anew. Its words are as they were
  * Of the paragraph that opened "Work on a branch", the sentence "Commit the change documents first, then the
    implementation." is kept as it was, in the paragraph on where each document is committed. The plan says the
    paragraph is replaced and names only the freeze sentence as staying; the requirements say nothing against the
    sentence, and it still holds on the unit's branch
  * In "Roles", "A session that plans, then implements, then reviews" became "A session that specifies, then plans,
    then implements, then reviews"
  * "Features", "Bugs" and "Tasks" were read against requirement 10 and are unchanged: each sentence still holds
  `npm test`: 339 passed. No test reads `process.md` or the change templates
