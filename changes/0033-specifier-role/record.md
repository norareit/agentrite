---
kind: feature
status: draft
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
