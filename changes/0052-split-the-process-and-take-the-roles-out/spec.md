# 0052 Split `process.md`, and take the roles out of it

## Context

Some who would adopt the kit accept its units, a spec, a plan and a review, and not its rules on how code, tests,
text and commits are written. The human worked out in a conversation with an agent on 2026-10-13 that the kit should
serve them first, in three actions: load the instructions through the harness, which unit 0048 did for
`process.md`; this unit; and then a project's own roles and rules in the place of the kit's. This unit makes the
two things the third action replaces separable, and changes nothing a project can configure.

Two things stand in the way today:

* **One file holds both the process and the rules.** `process.md` holds where instructions belong, the text and
  documentation rules, how reported problems are verified, the commit rules, the changes process, the roles, and
  the code and testing rules. A project that would replace the rules on code would replace the process with them
* **The process depends on the roles.** `process.md` names a role in about ten places, lists the four role files,
  takes the meaning of "blocking" from `roles/reviewer.md`, and has a status, `planned`, that says one role is done.
  A role cannot be replaced or added without rewriting the process. The role files already say most of what they
  do themselves: `roles/implementer.md` gives its input, its output and the status it sets

Unit 0048 loads exactly one kit file, `process.md`, into every session: `CLAUDE.md` imports it, `opencode.json`
lists it, and `init` and `refresh` check both files for it. A second file has to be loaded the same way, or the rules
moved out of `process.md` stop reaching a session that does not follow its links.

No code reads a unit's status apart from the change check, which compares it with `implemented` and nothing else,
so dropping `planned` changes text and no behavior. No unit in this repository has the status `planned` now.

The conversation set the scope of this unit, the cut along what gets replaced, and the dropping of `planned`. The
decisions under "Decisions" that it did not settle are the specifier's, and approving the unit approves them.

## Requirements

The split:

1. The kit has two instruction files at the root of its package: `process.md` and `standards.md`. The package ships
   both
2. `process.md` holds, of what it holds today:
    * Where instructions belong
    * Verifying reported problems
    * The commit prefixes `feature-<number>`, `bugfix-<number>` and `task-<number>`
    * Changes, with its Features, Bugs and Tasks
    * Roles, as requirement 8 says
3. `standards.md` holds, of what `process.md` holds today:
    * Text
    * Documentation changes
    * The commit rules on `Co-Authored-By` and on `Claude-Session` and other harness-injected trailers
    * Code, with How code is written
    * Testing
4. Every rule of today's `process.md` is in one of the two files, with its meaning, its exact commands and its
   strength, apart from what requirements 5 to 13 change. Nothing of it is dropped
5. Each file opens by saying what it holds. `process.md` says that the rules on how text, documentation, commits,
   code and tests are written are in `standards.md`, with a link to it. `standards.md` says that it holds those
   rules, that they hold for every role and for work in no role, and that the process is in `process.md`, with a
   link to it. Both say, as `process.md` does today, that what is specific to a project is in its own `AGENTS.md`

The roles out of `process.md`:

6. `process.md` does not name any of the four roles, `specifier`, `planner`, `implementer` and `reviewer`, in any
   form, apart from in the example log entry of requirement 7. Where it says today who does something, it names the
   document, the status or the human instead, as "`approved` says that the human approved the spec, or for a task
   its record" and "a review's findings are saved in full in `.reviews/<unit-directory>/`"
7. The log format says that an agent that acts in a role writes `as the <role>`, with the name of the role it acts
   in, and no longer "one of the four roles below". Its example holds two entries: the human's approval of the spec,
   and an agent's entry `as the implementer` that began the work and set the status to `in-progress`
8. The section Roles of `process.md` says: that a role's file is read at the point the role is taken on, whether or
   not the tool running the session can delegate to a separate agent; that a session that takes on several roles in
   turn reads each one's file as it takes that role on; that the project's `AGENTS.md` names the role files; and that
   work in no role follows `process.md`, `standards.md` and the project's `AGENTS.md` alone. It does not list the role
   files and does not say how many roles there are
9. What blocks `implemented` is defined in `process.md`. A finding of a review blocks in exactly two cases: a
   requirement in `spec.md` is false, under the usage the spec says the unit supports and the threat model it states;
   or a rule in `process.md` or in `standards.md` is broken, and no decision in `spec.md` or `record.md` records an
   exception to it. Every other finding does not block, and neither does a limitation recorded as a decision.
   `roles/reviewer.md` no longer states the two cases. It refers to `process.md` for them and keeps how a blocking
   finding is reported: which case it falls in, and the requirement or the rule it rests on

Dropping `planned`:

10. The statuses are `draft`, `approved`, `in-progress` and `implemented`, and every kind of unit goes through them
    in that order
11. `process.md` says when an approved unit may be built: a task always; a bug when it has a `plan.md`, or a log
    entry in its `record.md` that says it needs no plan; a feature when it has a `plan.md`. It also says that nobody
    approves a plan
12. `process.md` says that the unit's branch is cut from the head of the default branch when work on the unit
    starts after its approval: the planning of a feature or a bug, and the work itself of a task
13. No text of the kit names the status `planned`: not `process.md`, `standards.md`, a role file, a template, a
    role's description, the role wrappers written from it, or `README.md`. The kit's `CHANGELOG.md` and the units in
    this repository's `changes/` are history, and keep it
14. `roles/planner.md` gives as its output `plan.md` where the unit gets one, or a log entry that the unit needs no
    plan, and says that the planner does not change the status. Such a log entry holds the words "needs no plan"
15. `roles/implementer.md` stops, saying what is missing, when given a unit that may not be built by requirement 11,
    and moves the status to `in-progress` when it begins, as it does today
16. The implementer's description, from which its wrappers are written, says when to use the role without the
    status `planned`: once the unit is approved, with its plan where its kind needs one. `refresh` writes the
    wrappers with it, as for any description the kit changes

The role files and the templates:

17. Each of the four role files opens by saying to read `process.md` and `standards.md` first, with a link to each
    from the role file. `roles/reviewer.md` then names the three other role files, as it does today. Where a role
    file or a template names "the code and testing rules in `process.md`", or a rule that moves to `standards.md`, it
    names `standards.md`
18. `standards.md` is loaded into every session as unit 0048 loads `process.md`:
    * `CLAUDE.md` as `init` writes it holds the line `@node_modules/agentrite/standards.md` between the line
      `@node_modules/agentrite/process.md` and the line `@AGENTS.md`
    * The `opencode.json` that `init` writes holds `node_modules/agentrite/process.md` and
      `node_modules/agentrite/standards.md` in its `instructions` list, in that order. `init` amends one that exists
      by adding whichever of the two its list lacks at the end, in that order
    * The rule by which `init` and `refresh` judge whether a file loads the kit's instructions counts each of the two
      paths: a `CLAUDE.md` loads them when it holds all three lines, and an `opencode.json` when it loads both paths,
      a file that is not JSON when its text holds each path in quotes. Each notice of `init` and `refresh` names what
      is missing, as it does for `process.md` today
19. The project's `AGENTS.md` as `init` writes it calls both `process.md` and `standards.md` required reading, each in
    a link, and says what each holds. Its comment on what goes in the section for the project says that what holds
    for every project is in the kit's `process.md` and `standards.md` already. `CLAUDE.md` as `init` writes it names
    both files in its text as well as in its imports

The documents:

20. `README.md` is true of the kit after the unit:
    * "What is here" has a row for `standards.md`, and its row for `process.md` says what that file now holds
    * "How it works" says that the rules each role works by are in `process.md`, `standards.md` and the role's own
      file, and its table gives what the implementer is given without the status `planned`
    * "How the kit's instructions reach an agent", "agentrite init", "agentrite refresh" and "Installing it into a
      project" give the three lines of `CLAUDE.md` and the two paths of `opencode.json`, and the files and notices as
      requirement 18 has them

## Decisions

* **One unit for the split, the roles and `planned`.** The three rewrite the same text of `process.md` and the same
  references to it in the role files, and apart they would rewrite it twice. The conversation settled this
* **Two files, cut along what gets replaced.** The cut is between what a project keeps when it brings its own rules,
  the units and their documents, and the rules it would bring. Rejected: a file per topic. "Commits" is 9 lines and
  "Testing" 7, and a file that small adds a hop and a loaded file and nothing else. A further split waits for a
  project that needs to replace one part alone. The conversation settled the cut, and the specifier checked it
  against the text: requirements 2 and 3 are that check
* **The second file is `standards.md`.** It holds rules on code structure, tests, text, documentation and commits,
  and `README.md` and the `AGENTS.md` template already call the code part "the code and testing standards".
  Rejected: `style.md`, which the conversation used as a working name, and which undersells the rules on separation
  of concerns and on tests, which are not style; and `conventions.md`, which reads as the commit and naming rules
  only
* **Verifying reported problems stays in `process.md`.** It is neither the process of a unit nor a rule on how
  something is written. It follows from the kit's sandbox, in which an agent's shell is not the developer's machine,
  and the sandbox is what a project keeps when it brings its own rules. In `standards.md` a project that replaced
  that file would lose it without meaning to. Where instructions belong stays for the same reason: it is about the
  kit's way of keeping instructions in files, not about how one is written
* **The commit rules are split.** The prefixes tie a commit to a unit and its branch, which is the process. The rules
  on trailers are about how a commit message is written, which a project may want otherwise
* **A broken rule in `standards.md` blocks, as one in `process.md` does today.** The rules are what the code quality
  of a review is judged against, and today every one of them can block. Making them advisory would change the kit's
  contract as a side effect of moving text. Rejected: only `process.md` blocks
* **What blocks is defined in `process.md`.** `implemented` waits on every blocking finding, so the meaning of a
  status depended on a role file. With the definition in `process.md`, a project that replaces the reviewer keeps
  what `implemented` means. `roles/reviewer.md` keeps its other sections, among them "Recorded decisions are
  settled", which is how to review and not what a status means
* **The example log entry still names a role.** The format is `as the <role>`, and an example of it that names no
  role does not show the format. An example is not a dependency: a project with other roles reads it as one.
  `as the implementer` is chosen over the `as the planner` of today because it also shows a status change that
  still exists
* **Planning is done when the documents say so, and not the status.** `planned` was the one place that said it
  without reading the log, also for a bug that needs no plan. Without it, a feature has a `plan.md`, and a bug has
  a `plan.md` or a log entry that it needs none. The words "needs no plan" in that entry let a later reader, or the
  orchestrator the conversation foresees, find it by searching. Rejected: a frontmatter field that says a unit needs
  no plan, which is a status by another name; and a `plan.md` for every bug, which reverses "a single-commit fix
  needs only `spec.md` and `record.md`"
* **That nobody approves a plan stays said, in `process.md`.** It is a fact about the documents and the approval,
  which is the process. `roles/planner.md` says it today as well, and drops it, since nothing is stated in two places
* **Every role file says to read both files first.** Every role writes text, a record entry at the least, and
  `standards.md` holds the rules on text. The instruction is the fallback that unit 0048 kept for what the loading
  does not reach, and it covers both files for the same reason
* **A unit whose status is `planned` when a project updates is set to `approved`.** It has been planned, so it may be
  built by requirement 11, and its log already says so. The release notes say so and give the change, when the
  release is made. Rejected: the kit still taking `planned` as `approved`, which keeps the word in the text this
  unit takes it out of
* **The specifier's description keeps "before anything is planned or implemented".** That is English for what has
  not happened yet, and names no status. Only text that names the status changes

## Non-goals

* A project's own `standards.md` or role files in the place of the kit's, and any key of `agentrite.json`. That is
  the third action
* An extra role, or a role that `agentrite roles`, `init` or `refresh` do not have
* Rewording a rule beyond what the requirements of this unit change. The text moves; it is not edited
* A status for a stage of its own, such as `tested`. The statuses still fix which stages a unit goes through
* This repository's own `AGENTS.md`, `CLAUDE.md` and `opencode.json`. This repository installs the kit's release, and
  takes them over when it moves to the release that holds this unit, as unit 0048 did
* `CHANGELOG.md`, which is written when the release is made, and the units in `changes/`, which are history
* The sandbox, which runs the same harnesses on the same files

## Beyond the request

* **The change check refusing a status the process does not have.** It would find a unit left at `planned` after an
  update, and any misspelled status. Cost: the check reads the status of every unit, not only of the implemented
  ones, and an older project with an unknown status in a historical unit is refused until it is changed. Without it,
  a unit left at `planned` has its plan, and whether an implementer builds it or stops over the status is up to the
  model. The release notes say what to change, and the change is one line of a tracked file
* **A further split of `standards.md`**, as one file for code and tests and one for text and commits. Cost: a third
  file to load and to wire. Without it, a project that wants to replace only one part replaces both and copies the
  other, which is the case to split for when it comes
