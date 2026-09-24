# 0030 Role instructions

Give the planner, implementer and reviewer their own instruction files, in a location no harness owns, and leave
AGENTS.md holding only what every role needs.

## Context

`0025` moved the change records out of `.claude/` because that location named a single harness. AGENTS.md has the
same property in reverse: it is harness-neutral, but it is one undifferentiated file read in full by every agent on
every turn, whatever it is doing.

That costs in two directions. Guidance that only a reviewer needs is context an implementer pays for on every turn,
which caps how detailed the reviewer guidance can afford to be. And guidance that a role needs but no one has written
down stays unwritten, because there is no obvious place to put it. Both showed up in practice: the three review axes
occupy a single paragraph, which is why the plan-fidelity rule had to be explained in conversation three separate
times, and the rule that an implemented plan has its boxes ticked was never written at all until `0028`.

The three roles are already how the work happens. The `0025`, `0026` and `0028` records each show the same shape: a
spec and plan written, then implemented, then reviewed against both.

## Requirements

1. Each of the three roles has its own instruction file
2. The files name no harness and no vendor, and are readable by a session that has no concept of subagents
3. AGENTS.md holds only what applies to every role, or to work that fits none of them
4. No instruction that exists today is lost, weakened, or duplicated
5. A harness that does support subagents can be pointed at the files without the substance moving into its config
6. The setup is portable together with the `changes/` convention it describes: adopting it elsewhere is copying
   `roles/`, `changes/_templates/`, the freeze check, and the `Changes` and `Roles` sections of AGENTS.md
7. A plain session that takes on a role reads that role's file at the point it does so, whether or not the harness
   has subagents, and a session that moves through several roles reads each file in turn

## Decisions

* The directory is `roles/` in the project root, holding `planner.md`, `implementer.md` and `reviewer.md`. It sits
  beside AGENTS.md for the same reason `changes/` does: the content is the project's, not a tool's
* No file in `roles/` is named `AGENTS.md`. Several tools treat a nested AGENTS.md as directory-scoped instructions
  and would load it for anything under `roles/`
* AGENTS.md carries a `Roles` section that is an instruction, not a listing: before planning, implementing or
  reviewing, read the corresponding file. A bare index would only work under a harness that has subagents and has
  been wired up; an instruction makes a plain session under any tool load the file at the moment it needs it, and
  makes a session that does all three jobs in turn, as the `0025` record shows one did, pick each up as it goes.
  That matters more than usual here, since surviving harness changes is the point
* Role files reference AGENTS.md rather than restating it. A second copy of the freeze rule is a copy that will drift,
  and only one of them will get fixed
* The split is by audience, not by topic. Guidance two or three roles need stays shared even when it reads as
  belonging to one of them. `Code` and `Testing` stay in AGENTS.md because work that fits no role, such as a small
  task, still has to follow them, and `Verifying reported problems` stays because it is about this environment
  rather than about a role
* The reviewer reads all three role files, since it judges the planner's and implementer's work against the
  guidance they were given. That the reviewer checks a rule is therefore never by itself a reason to keep the rule in
  AGENTS.md; the regression-test-first rule moves to the implementer even though the reviewer verifies it was
  followed
* The reviewer returns findings and changes nothing, with one bounded exception: it appends one entry to the unit's
  `record.md` saying that it reviewed, against what, and what it could not verify. It is the only party that knows
  first-hand that a review happened, and the failure is not hypothetical: the first review of this unit ran and
  nothing recorded it, because the party that knew was forbidden to write and the party permitted to write forgot.
  The entry states the event, never the verdict. Which findings are accepted stays the human's decision and the
  implementer's to record, so that a later reader cannot mistake a reviewer's opinion of its own work for a decision
* The dispatching session writes the returned findings to `.reviews/<unit>/`, the human decides which are accepted,
  and the implementer applies accepted findings. Review outcomes are recorded in the `record.md` log while the unit
  is not frozen and as amendments after it is frozen. This outcome-recording rule is shared and stays in AGENTS.md;
  only the axes and the findings location move to the reviewer
* Each role takes the unit directory as its input. The planner writes `spec.md` and `plan.md`, the implementer ticks
  `plan.md` and logs in `record.md`, and the reviewer returns findings for the dispatching session to store. A fresh
  subagent therefore needs only these explicit inputs and nothing else from the context of the session that
  dispatched it
* The reviewer produces its own diff and runs the suites itself. Finishing a unit requires a `record.md` entry saying
  the suites were run on the final tree and what they reported, and that entry is a claim like any other: a reviewer
  that cannot run them can only take it on trust, which makes the requirement unenforceable and the code-quality
  axis partly blind
* That the reviewer changes nothing is an instruction, not a configured restriction. The first attempt enforced it
  with tool denials, command allowlists and a hook. Three review rounds then found three ways through that
  enforcement, `--output`, quotes assembling a denied option, and shell redirection, and every one of them was a
  defect in the guardrail rather than in the work it guarded. Meanwhile every refusal actually observed came from
  the role file: the reviewer declined to write a file, to run the suites, and to use `--output` on its own, before
  any harness rule was consulted. Commands had to be chosen specifically for having no reason to be refused before
  the enforcement layer could be tested at all. The instruction was doing the work and the enforcement was adding
  bugs, so the enforcement goes. What remains is git, which makes anything a reviewer touches visible and
  revertible, the same footing a human reviewer with push access stands on
* The cost is accepted with open eyes: the guarantee weakens from cannot to should not. That matters where nobody
  inspects the tree afterward, or where the diff under review might carry text aimed at the reviewer. Neither holds
  for a single-author repository whose working tree is read before every commit
* What moves out is therefore smaller than the role files themselves. Most of each file is guidance that did not
  exist anywhere, which is the point of making room for it. The rules that guidance introduces are decided here, not
  in the role files, so that approving this spec approves them:
    * Every task in a `plan.md` traces to a requirement in its `spec.md`, and every requirement has at least one
      task. A task that traces to nothing is either a missing requirement or work that does not belong in the unit;
      a requirement with no task is a plan that will not deliver the spec
    * A plan holds no placeholders. A step that says "TBD", "to be decided" or "fill in later" is a planning failure,
      not a task
    * Necessary work the plan does not list is added to `plan.md` before it is done, with the reason logged in
      `record.md`, so the plan stays a true map of what was built. The implementer may extend `plan.md` this way but
      never changes `spec.md`: a change the spec does not cover sends the unit back to planning and to the human
    * Finishing a unit means a `record.md` entry stating that the suites were run on the final tree and what they
      reported. A green run proves only the tree it ran on, so an earlier run does not count. Concerns and blockers
      are logged in the same place rather than worked around silently
    * The reviewer reads `spec.md`, `plan.md`, `record.md` and the diff against the merge base. Record
      entries are claims to verify against the diff, not evidence. Findings are labeled by axis and numbered, as the
      `0025` review's S1, P1 and C1 to C4 already were. Work the spec did not ask for is a spec-conformance finding,
      and every finding says whether it blocks `implemented`
    * A declined finding is recorded with its reason, as the `0025` record already does, so that pushing back is
      visible and argued rather than silent
    * A unit that has not reached `implemented` is corrected in place and review outcomes go in its log. Amendments
      are for units that are frozen, and a superseding unit is for corrections that would make a frozen record
      misleading
* The commands a role needs are granted at the project level, not per agent. The reviewer runs `git log`,
  `git show`, `git rev-parse` and the suites, and with no permission block of its own it would stop on a prompt for
  each. Granting them to every agent is the opposite of the enforcement this unit removed: it buys convenience,
  carries no invariant, and treats the roles as ordinary agents rather than as accounts to be contained. Commands
  that would disturb the developer's machine, such as the one holding the development server's port, keep prompting
* Thin per-harness stubs are included for both harnesses in use, each one loading its role file and holding no
  substance of its own. Instructions no harness loads are not introduced, and the stub is the smallest thing that
  makes them load. No stub carries tool restrictions, permission rules or hooks: a stub says which file to load and
  nothing else, and the dispatching session stores the findings the reviewer returns
* Claude Code takes markdown files under `.claude/agents/`, whose frontmatter `description` is what drives automatic
  delegation and whose body is the subagent's instruction. It has no file include, so the body is an explicit
  instruction to read the role file first. OpenCode takes named entries under the `agent` key of `opencode.json`,
  whose schema defines `description`, `mode`, `prompt` and `permission`; `mode: subagent` is the value that makes an
  agent dispatchable rather than a primary session, and `prompt` accepts `{file:./roles/<role>.md}`, which inlines
  the file rather than asking the agent to go and read it. Adding a third harness is the same few lines in its own
  format, with the substance still in `roles/`
* Role files reference AGENTS.md on the assumption that the harness hands it to a subagent. Claude Code documents
  that custom subagents receive the project instructions; OpenCode does not say. If OpenCode subagents turn out not
  to receive AGENTS.md, its stubs include `{file:./AGENTS.md}` as well, since a role file without the shared rules is
  worse than no role file

## Non-goals

* Changing any rule that exists today, apart from correcting the statement that every accepted review outcome is an
  amendment. This unit otherwise relocates existing guidance unaltered; the only new rules are the ones listed under
  Decisions, which write down how the work is already done
* Per-task dispatch. Other frameworks hand a fresh subagent one task with its own brief and report; here a role takes
  a whole unit, which is the right grain while units are single-commit sized
* Writing role files for anything but the three roles. Proofreading and social posts are already covered by skills
* Making the roles mandatory. Work that fits none of them follows AGENTS.md alone, as it does today
