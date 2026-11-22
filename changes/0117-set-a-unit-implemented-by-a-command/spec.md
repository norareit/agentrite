# 0117 Set a unit to implemented by a rule the record shows, and by a command

## Context

`process.md` says that a unit is set to `implemented` only after the human has decided every blocking finding the
review returned and every task of `plan.md` is ticked. The reviewer's role file says that `implemented` waits on the
human deciding every blocking finding, and that the human decides which findings are accepted. The implementer's
role file says that the implementer applies an accepted finding and proposes declining one it disagrees with, and that
only the human turns a proposed decline into a decision.

The orchestrator already stops a run for what is really the human's to decide: a step whose outcome proposes a
decline, and a blocking finding still open after the last round of a repeat. Its default definition tells the
implementer that it accepts the findings it agrees with, and the request of every step says that such a finding is
recorded as accepted by the definition and not as a decision of the human. Once a run ends, though, a session that
checks whether the unit may be set to `implemented` follows the rule as written, and asks the human to accept findings
that were fixed, or declines that were decided, during the run. The human is asked for decisions that carry no
information, and needs a separate session of a harness after every run only to have the status set.

The human wants to decide only what is theirs to decide. The rule is to say what the record must show for a unit to
be `implemented`: a last review of the work as it stands with no blocking finding, a decision of the human on every
proposed decline, and a ticked plan. A finding the implementer accepted and fixed needs no decision of the human,
since the review after the fix verifies it. A command then sets the status when the record shows that, as
`npx agentrite approve` and `npx agentrite cancel` set theirs, and works with no terminal, so that a later loop that
takes several units through their roles can run it as one of its steps.

For a command to judge the record, the record must say what it judges in a fixed form. Today the entries that matter
are habits: a reviewer's entry names the commit it reviewed and the labels it returned in words of its own, as
"reviewed `0116-no-branch-for-a-draft-unit` at `dc65325` in full", and says whether a finding blocks in a sentence of
its own, as "Returned non-blocking P1"; a proposed decline and the human's decision on it have no form at all.

The human is concerned that the instructions every session reads keep growing. `process.md` is read by every session
of every project that uses the kit, so the change of the rule aims not to make it longer. At `ed8c644`,
`wc -w process.md` in the root of this repository, the copy that ships in the package, prints `2406`. The count is
not a limit the unit fails by: it is logged before and after, and a growth is put to the human at the end.

## Requirements

### The rule

1. `process.md` says that a unit may be set to `implemented` once all of these hold, and states the rule of the
   human deciding every blocking finding nowhere:
    * the last review of the run, as R6 defines both, was of the work as it stands: no file outside the unit's own
      directory under `changes/` differs between the commit it reviewed and the commit checked out
    * that review lists no blocking finding still open, as R7 gives the list
    * every proposed decline of the run has the human's decision, and a finding the human decided to be fixed was
      reviewed after that decision: the last review stands after the decision in `## Log`
    * every task of `plan.md` is ticked, where the unit has a `plan.md`

   It says that a finding the implementer accepted and fixed needs no decision of the human, since the review after
   the fix verifies it, and the rule holds alike for a unit built by hand and for one built by the orchestrator. What
   blocks, its two cases, is as it is now
2. `process.md` names `npx agentrite complete <unit>` as the command that sets a unit to `implemented` on its branch
   when the rule holds, and says that an agent runs it only when the human has asked for that unit to be set to
   `implemented`, and never on its own judgement
3. `record.md` logs what `wc -w process.md` in the root of this repository prints on the commit the unit's branch is
   cut from and on the tree once the unit is done. When the count grew, the entry says what the added words are for.
   The review of this unit then says that `process.md` grew, by how many words and what for, as an item of the list
   under `**Needed from you**` of its response, which in a step of the orchestrator is an item of `afterwards`, so
   that the human reassesses the growth at the end, and not as a finding. A growth fails no requirement of the unit.
   No rule of `process.md` other than the one R1 replaces loses its meaning or its strength, and the text the change
   needs is made room for as the decision on the length of `process.md` says
4. `roles/reviewer.md` says neither that `implemented` waits on the human deciding every blocking finding nor that the
   human decides which findings are accepted. It says that the implementer applies the findings it agrees with and
   proposes declining the others, that the human decides a proposed decline, and that a blocking finding still open
   after the last review holds back `implemented`. It keeps that the reviewer changes nothing under review and fixes
   nothing it reported. Its "Re-reviewing a unit" says that every review of a run after its first, a delta or a full
   one, verifies every finding of the review before it in its run, and not only the accepted ones: a finding whose
   proposed decline the human decided `declined`, in the form of R9, is settled and is not reported again, and every
   other finding is either seen corrected or reported again, by the label it had, with whether it blocks. It says that
   a label is never used twice in a run: a review continues the numbering of each axis from the reviews of its run
   before it, so that a new finding takes the next number, as `S3` after `S1` and `S2`, and a finding reported again
   keeps its label
5. `roles/implementer.md` says that the implementer applies a finding it agrees with, by hand as in a step of the
   orchestrator, unless the human decided otherwise, and proposes declining a finding it disagrees with. It keeps that
   only the human turns a proposed decline into a decision. It says that once the human's decision on a proposed
   decline is recorded, in the form of R9, as when a run is resumed after it, the implementer acts on it: a finding
   decided `declined` is not proposed for declining again, neither in `record.md` nor in the `declines` of the step's
   outcome, and a finding decided `to be fixed` is applied. The orchestrator still stops a run after a step whose
   `declines` is not empty, as it does now

### The forms of the record

6. An entry of `## Log` belongs to the run of a variant when its text, after who made it and, for an agent in a role,
   after `as the <role>, `, opens with ``on the variant `<name>`, ``, with the variant's name in backticks, and
   otherwise to the run of the unit's branch. The run of the branch checked out is that of its variant, on a variant's
   branch, and that of the unit's branch otherwise. The reviews of a run are the entries of the reviewer,
   `as the reviewer`, that belong to it, and its last review is the last of them in the order of `## Log`. An entry
   wrapped over several lines is read as its lines joined, each continuation line's indent taken as one space
7. `roles/reviewer.md` gives the form of the reviewer's entry, with an example, and the reviewer writes it so: the text,
   after the variant's phrase of R6 on a variant's branch, opens with ``reviewed the unit at `<commit>` ``, with the
   commit reviewed by its hash, of 7 to 40 lowercase hexadecimal characters, in backticks, and holds exactly one
   sentence that is `Blocking findings: none.` or `Blocking findings: ` followed by the labels of the blocking
   findings still open after this review, those it found and those of the reviews before it that it reported again
   by R4, each in backticks, separated by a comma and a space, and a full stop, as ``Blocking findings: `S1`, `C2`.``.
   What else the entry says is as the role file has it now: whether the review was a delta or a full one, the labels
   returned, the file of the findings, and what could not be verified
8. `roles/implementer.md` gives the form of a proposed decline, with an example, and the implementer writes it so, by
   hand as in a step of the orchestrator, beside the `declines` of the step's outcome: one entry for each finding it
   proposes to decline, whose text, after the variant's phrase of R6 on a variant's branch, opens with
   ``proposed to decline `<label>`: ``, with the finding's label, and then gives the reason
9. `roles/implementer.md` gives the form of the human's decision on a proposed decline, with an example: an entry of
   `[human]`, whose text, after the variant's phrase of R6 on a variant's branch, opens with
   ``decided the proposed decline of `<label>`: ``, with the label of the proposed decline, followed by `declined`
   when the finding is declined or `to be fixed` when it is to be applied. It says that the entry is written as
   `[human]` whether the human writes it or an agent records the decision the human gave it, as a resume's `--prompt`
   or the human's message in a session gives it, and that an agent writes it only for a decision of the human.
   `process.md`, where it says that an entry of an agent made on a variant's branch names the variant, says the same
   of the human's decision on a proposed decline, which still names no role
10. `ORCHESTRATOR.md` says that the human sets `implemented` after a run with `npx agentrite complete`, when the rule
    of `process.md` holds, and no longer that the findings of the run's last review are decided first. Where it says
    that the human decides the proposed declines a run stopped for, it says that the decision is recorded in the form
    of R9, by the human or by the step a resume reruns with the decision in its `--prompt`
11. Every other statement of the kit agrees with R1 to R10. `README.md` gives, in its table of the statuses, when a
    unit becomes `implemented` by the rule of R1 and that the human sets it with `npx agentrite complete`; in its quick
    start, a step that runs the command before the merge; and the same step in the workflow diagram of `diagrams/`,
    with its SVG generated from its source and the diagram's description in `README.md` agreeing. `SETUP.md` says, of
    a project's own reviewer and implementer files, that they write the entries of R7 and R8, that every review after
    the first in a run accounts for every finding still open of the review before it, as R4 says, and that a label is
    never used for two findings within a run, and names
    `agentrite complete` among the commands that read `agentrite.json`. `SANDBOX.md` says, in "Getting the work back",
    that the wrapper moves the unit's branch, or the variant's, while the developer stays on the branch checked out,
    which is usually the default branch, and that the unit is set to `implemented` by checking out the unit's branch,
    or the variant's, and running `npx agentrite complete`. Where it says how a variant is taken into the unit's
    branch, it says that a variant's run is set to `implemented` on the variant's branch before it is taken, since on
    the unit's branch the command reads the reviews of the unit's branch only, and that a completed variant is taken
    by moving the unit's branch to it or by a merge that fast-forwards the unit's branch to it. The wrapper still
    checks out and moves no other branch. No document, role file or prompt of the kit
    says that the human decides every blocking finding before `implemented`, or decides which findings are accepted

### The command

12. `npx agentrite complete <unit>` takes exactly one `<unit>`, given as `approve` takes it, and no option. With no
    `<unit>`, a second one, or an option, it prints what is wrong, then its usage, and exits 2. The usage of
    `agentrite` lists its form after that of `cancel`
13. It runs from the project root, on the unit's branch or on a variant's branch of the unit. The unit's branch is the
    prefix of the unit's kind, `feature`, `bugfix` or `task`, a hyphen and the name of its directory, as
    `feature-0117-set-a-unit-implemented-by-a-command`, and a variant's branch is the unit's branch, `--` and a
    variant's name of the form `agentrite orchestrate` takes
14. It writes, commits and prints on standard output nothing, and exits 1 with one message on standard error, for the
    first of these that holds, in this order:
    * `agentrite.json` is missing or is not valid, as for `approve`
    * the project root is in no git repository, or no branch is checked out, as on a detached `HEAD`
    * `changes/` holds no directory for the unit, or more than one for its digits
    * the unit's `record.md` is missing, or has no `status` field, no `kind` field or no `## Log` heading, or gives a
      kind that is not `feature`, `bug` or `task`. The message names the file and what is wrong
    * the branch checked out is neither the unit's branch nor a variant's branch of it. The message names the branch
      checked out and the unit's branch, and says that a unit is set to `implemented` on its branch
    * the status is not `in-progress`, with a message for each status: for `implemented`, that the unit is
      implemented already on the branch checked out, and that a later correction is an amendment or a new unit that
      names it in `supersedes`; for `cancelled`, that a cancelled unit is never set back, and that taking it up again
      is a new unit that names it in `supersedes`; for `draft`, that the unit is not approved, and is approved on the
      default branch with `npx agentrite approve`; for `approved`, that its work has not begun, and that the
      implementer moves it to `in-progress` as it begins; for any other, the status, and that a unit is set to
      `implemented` from `in-progress`
    * the unit is a feature and has no `plan.md`, or has a `plan.md` with a task that is not ticked, as the change
      check counts one. The message names the file and the count of the tasks not ticked. A bug or a task without a
      `plan.md` passes
    * a file of the unit's directory differs from what the commit checked out holds: changed, staged, or not tracked.
      The message names each file with its state, and says that the files are committed or discarded first
    * the change check fails on the repository. The message gives what the check reported
    * the run of the branch checked out has no review. The message names the run, the unit's branch or the variant,
      and says that the reviewer reviews the unit first
    * the last review of the run is not of the form of R7. The message names the entry by its timestamp, says that it
      is not of the form the command reads, and that a review in that form, as a delta review of the commit checked
      out, lets the command go on
    * the commit the last review names is not a commit of the repository, or names more than one
    * a file outside the unit's directory differs between the commit the last review names and the commit checked
      out, on either side of a rename. The message names those files and says that the work changed after the last
      review, so that it is reviewed again
    * the last review lists a blocking finding still open. The message names its labels
    * a proposed decline of the run, in the form of R8, has no entry of the form of R9 of the same run after it with
      the same label. The message names each such decline by its label, and says that the human decides it
    * an entry of the form of R9 of the run that decides a finding `to be fixed` stands after the last review. The
      message names it, and says that the fix is reviewed first
15. Otherwise it sets the `status` of the front matter of `record.md` to `implemented`, and changes nothing else of
    the front matter. It adds one entry to `## Log`, directly after its last entry, with the instant the command runs
    in UTC and the commit of the last review as that review's entry names it, wrapped at 120 characters as `cancel`
    wraps its entry:

    ```text
    - 2026-11-22T14:02:11Z [human] set the unit to implemented, on the review at `ff437ce`. The status is `implemented`
    ```
16. It then commits `record.md` alone, on the branch checked out, with the message
    `<prefix>-<number> Set the unit to implemented`, as `bugfix-0116 Set the unit to implemented`, by the kind of the
    unit and the four digits of its directory. Whatever else the working tree or the index holds is left as it was,
    and is not in the commit. The commit is made as any `git commit` of the developer is, with their identity and the
    repository's hooks. When it fails, `record.md` and the index are as they were before the command, what git printed
    goes to standard error, and the command exits 1
17. On success it prints one line, the unit's directory, the new status, the branch and the commit by its short hash
    and its message, and exits 0. It merges, pushes, cuts, moves, deletes and checks out no branch:

    ```text
    changes/0042-a-unit/ is implemented on feature-0042-a-unit, in 1a2b3c4 feature-0042 Set the unit to implemented
    ```
18. It reads `agentrite.json`, the unit's `record.md` and `plan.md`, what git gives of the repository, and what the
    change check reads. It reads nothing under `.reviews/` or `.orchestrator/`
19. It asks nothing, reads nothing from its standard input, opens no editor, and needs no terminal: run with its
    standard input closed and no terminal, it does what R14 to R17 say
20. `COMMANDS.md` describes the command in a section of its own after that of `agentrite cancel`, with every argument,
    each refusal of R14, the entry of R15, the commit of R16, the line of R17, the forms of R7 to R9 it reads and its
    exit statuses, `0`, `1` and `2`, as "Exit statuses" gives them. The table at the top of `COMMANDS.md` holds its
    row after that of `cancel`

### Tests

21. Unit tests show the reading of the forms of R6 to R9: an entry in each form, on one line and wrapped, on the unit's
    branch and on a variant's, and a reviewer's entry of the habit before this unit, which is not of the form of R7.
    Tests that run the command on a temporary repository show R12, each refusal of R14, R15 to R17 on the unit's
    branch and on a variant's, a commit after the last review that changes only `record.md`, which passes, a merge
    after it that brings in a file outside the unit's directory, which is refused, a reviewed commit that is not an
    ancestor of the commit checked out with the same tree outside the unit's directory, which passes, a decision of
    one variant that does not decide the decline of another, a hook that refuses the commit, a run with its standard
    input closed, and a run with no controlling terminal, as one started detached in a session of its own

## Decisions

* **A finding the implementer fixed needs no decision of the human.** The review after the fix sees it, and a fix
  that is wrong is a finding of that review. The human's decision added nothing to that, and asking for it is what
  the human wants gone. What only the human may decide stays theirs: a proposed decline, since it leaves a finding
  unfixed on the implementer's word alone. The rule holds for a unit built by hand too, and so the implementer applies
  the findings it agrees with by hand as it does in a step of the orchestrator. Keeping the human's choice of the
  findings for a unit built by hand was rejected: one unit would then need decisions the other does not, by how it was
  built, and the human is in the session of a unit built by hand to say otherwise when they want to
* **Every review after the first of a run accounts for every finding of the review before it.** The rule rests on
  what the last review says is still open, so that review must say it of every finding, and not only of the new ones
  and the accepted ones. A delta review taken before the implementer acted would otherwise report no blocking finding
  over a defect that is still there, and the command would pass. A full review is held to the same, since a full
  review that samples anew could leave out a finding that is still open as well. A finding is therefore seen
  corrected, reported again by its label, or settled by the human's decision to decline it, and `Blocking findings:`
  lists every blocking finding still open after the review
* **A label is never used twice in a run, and names the finding across its reviews.** A review continues the
  numbering of each axis from the reviews of its run before it, and a finding reported again keeps its label. A
  proposed decline and the human's decision then name the finding by its label alone. Naming it by its label and the
  commit of the review that found it was rejected: a finding carried from one review to the next has two such
  commits, and a later review could not tell whether a decision on one of them settles it, while a label that may be
  reused could take a decision on an old finding for a new one. The run, which R6 gives each entry, keeps the labels
  of two variants apart
* **A blocking finding the human declined needs one review after the decision.** A declined finding is settled, so
  the next delta review does not report it and its `Blocking findings:` sentence leaves it out. The review the
  decision followed still lists it, though, and the command reads only the last review's list, so a review after the
  decision is still needed. It costs one delta round, which a run of the orchestrator makes anyway once a resume
  reruns the implementer. Letting the command strike declined labels from the last review's list was rejected: it
  would be a second way of being done, to test and to describe. It is BTR1, which the human left out
* **A finding the human decided to be fixed is reviewed after the decision, as a condition of the rule.** Such a
  decision is a finding the human wants applied that no review has seen applied while the last review stands before
  it: either the fix came after that review, and the work changed, or it was not made. The condition is in the rule
  of `process.md`, and not only in the command, so that a unit set to `implemented` by hand and one set by the
  command meet the same conditions
* **`to be fixed` asks for a fix and a review of it, and does not make a finding blocking.** The implementer applies
  the finding and the next review checks it. When it is still open, that review reports it again, and whether it
  blocks follows the two cases of `process.md`, as for any finding. A finding decided `to be fixed` that is not
  blocking and is still open after the last review therefore does not hold back `implemented`, and the human sees it
  in that review. Making the human's decision a reason to block would add a third case of what blocks, which is a
  change of its own and beyond this unit
* **The reviewed commit need not be an ancestor of the commit checked out.** Whether the work changed is the tree
  comparison's to say, and a reviewed commit with the same tree outside the unit's directory saw the work as it
  stands, as after a rebase the human asked for. The rule and the command then state the same conditions
* **The command is named `complete`, and the name is the human's to change.** `implement` reads as running the
  implementer. `implemented` names the status and not what the command does, unlike `approve` and `cancel`.
  `finish` was the other candidate and says the same as `complete`; `complete` was taken as the more usual verb for
  setting a piece of work done. The entry of R15 and the commit message of R16 do not hold the name, so that a rename
  changes the command's form and its documents and not what it writes. The commit message is the one units of this
  repository already use for the step, as `bugfix-0116 Set the unit to implemented`
* **It reads `record.md` and git, and neither `.reviews/` nor `.orchestrator/`.** The "Code on the host" section of
  `AGENTS.md` treats what a unit run brings back under those two as written by an adversary, while the content of the
  commits of the unit's branch is outside that rule. The record is in those commits, and the forms of R7 to R9 are
  what put there what the command needs. The command requires the unit's directory to be committed, so that what it
  reads is what the commit checked out holds
* **The threat model is the roles following their files.** The command defends against a mistake: a unit set to
  `implemented` with a review that saw other work, with a blocking finding, or with a decline the human has not
  decided. It does not defend against an agent that writes a false entry, as a `[human]` decision the human did not
  make or a reviewer's entry for a review that did not happen: the content of the unit branch's commits is outside
  what the kit defends against, and the human reviews the branch before merging it. Its supported usage is a unit
  whose roles follow the kit's role files, or a project's own that write the forms of R7 and R8, account in every
  review after the first of a run for every finding still open of the review before it, and never use a label for two
  findings within a run. The command does not check those two rules
* **A record written before the forms gets no reading of its own.** A reviewer's entry of the old habit is not of the
  form of R7, and when it is the last review of the run the command refuses and says that a review in the form lets
  it go on. A delta review of the commit checked out is one round of the reviewer, and it is needed once, for a unit
  that was in progress when its project updated the kit. Reading the old habit was rejected, since its words vary
  from entry to entry and a wrong reading would set a unit `implemented`. A proposed decline of the old habit is not
  seen at all, which is a limitation of a unit that was in progress at the update: the human, who decided such
  declines under the old rule, checks them before running the command on it. Refusing on an entry that speaks of
  declining in other words is BTR3, which the human left out
* **The order of `## Log`, and not the timestamps, says which review is last.** Entries are appended, and the
  timestamps of entries made in the sandbox and on the host have stood out of order, as in the record of 0116
* **Whether the work changed after the review is judged on the trees, not on the commits.** The tree of the commit
  reviewed and that of the commit checked out are compared. A merge after the review, which a list of each commit's
  files does not show, is then judged by what it brought in, and a change undone after the review leaves the work as
  it was reviewed. Every file of the unit's directory may differ, its `plan.md` and `spec.md` among them, as the
  request agreed with the human allows the unit's own documents: a plan whose last task is ticked after the review,
  as in 0116, is the common case
* **It runs on the unit's branch and its variants only.** Everything after the approval is done on the unit's branch,
  as `process.md` says, and the status set there reaches the default branch with the merge. Merging is the human's,
  and a later improvement may build it on this command
* **Only the reviewer's entries are reviews.** The spec-reviewer reviews a draft spec, before the work exists. The
  security reviewer of this repository keeps its findings out of everything committed, so its entry says nothing a
  command could judge, and a security finding is the human's to act on before the merge, as `AGENTS.md` says
* **The human's decision is a `[human]` entry, whoever writes it.** The decision is the human's alone, as an approval
  is, and `approve` and `cancel` write `[human]` entries when an agent runs them at the human's request. An agent
  that records the decision the human gave it writes the same entry, so that the command has one form to read
* **The human's decision on a variant's branch names the variant.** A decision that named no run would either belong
  to the unit's branch by R6, and then decide no variant's decline, or be read across runs, and then one run's
  decision could settle or hold back another's, since variants may start at the same commit and a variant's history
  may be taken into the unit's branch. The phrase stands after `[human]` where an agent's entry has it after its
  role, so the entry still names no role. The entry `complete` writes names no variant, as those of `approve` and
  `cancel` do: no command reads it, and the commit of the review it names already ties it to one run
* **Where the developer completes a unit after a unit run is said in `SANDBOX.md`, and the command does not move.**
  The developer usually stays on the default branch while the wrapper brings the unit's branch up to date, and the
  command refuses there. Saying in "Getting the work back" to check out the unit's branch, or the variant's, keeps
  the wrapper from checking out branches and the command from running on the default branch. A variant is completed
  on its own branch before it is taken, since its reviews are those of its own run
* **A completed variant is taken by moving the unit's branch to it, or by a merge that fast-forwards.** Either way
  the unit's branch then holds the tree the variant's last review saw, with the status `implemented`. Merging a
  completed variant into a unit's branch that holds work of its own is outside the supported usage: the merged tree
  is one no review saw, and the status `implemented` comes with it from the variant, while the command refuses a
  unit that is `implemented` already. A developer who wants to combine the two does so before the variant is
  completed, and has the combined work reviewed
* **A feature without a `plan.md` is refused.** `process.md` requires a plan of a feature before its implementation,
  and a feature in progress without one was built outside the process. A bug or a task may have none
* **One refusal, the first in a fixed order.** As `approve` and `cancel` do, the command names one thing wrong at a
  time. The order puts what makes the later checks meaningless first, as the branch before the record's entries
* **The change check runs as part of the command.** The status it sets would make an implemented unit of a plan with
  open tasks, which the check rejects, and the rest of the check is what `process.md` asks before work is submitted
* **The length of `process.md` is logged and put to the human, not limited.** A hard limit would fail the unit over
  a few words that the rule may need, and the human wants to weigh the growth rather than forbid it. A growth is not
  a finding, since a finding asks the implementer for a change, while the growth is the human's to reassess. Under
  the default definition's `until` of `"no-findings"`, a non-blocking finding goes back to the implementer to be
  applied, and the implementer would trim words to make the finding go away, or propose to decline it, which stops
  the run for a decision the human wants to take at the end. The reviewer of this unit says it as an item under
  `**Needed from you**`, which reaches the human in its response by hand and in `afterwards`, and so in the end
  report, in a step of the orchestrator, without stopping the run. It is not put in the findings file, which the
  implementer takes findings from. The requirement is of this unit, and not a rule of the role files, since the
  length of `process.md` is a concern of the kit's own repository and not of a project that uses it
* **The length of `process.md` is aimed to hold by merging the paragraphs of the three commands.** The new rule takes
  more words than the old one, and the command needs its sentence beside those of `approve` and `cancel`. The paragraphs
  of `approve` and `cancel` say the same thing twice: that the command sets the status, adds the human's entry to
  `## Log` and commits `record.md` alone, and that an agent runs it only when the human decided and asked, never on
  its own judgement. They are written as one paragraph for the three commands, which keeps what each says: the
  branch each commits on, the reason and `--by` of a cancellation, that a cancellation is recorded on the branch the
  human chose, and that its reason is written in the agent's own words. No other text of `process.md` is condensed.
  A draft of the merged paragraph and the new rule took no more words than the text it replaces, before R1 gained the
  condition on a finding to be fixed and R9 the variant's phrase of a decision. Moving the rules on the files of a
  variant's reviews, which the role files restate, out of `process.md` was considered and rejected as a change of its
  own, beyond the request
* **The implementer may still set `implemented` by hand, by the same rule.** The command is the human's way, and it
  checks what the rule asks. A step of the orchestrator still sets no status later than `in-progress`

## Non-goals

* Running the project's tests. They are each project's own commands, and `agentrite.json` has no setting for them
* Merging the unit's branch into the default branch, pushing, and deleting the branch
* Reading the findings files under `.reviews/` or anything under `.orchestrator/`, and judging a security review
* Changing when the orchestrator stops a run, the outcome of a step, or what the request of a step says
* A command that records the human's decision on a proposed decline
* Rewriting the entries of records written before the forms, in this repository or in a project
* Changing the change check, which judges neither the forms nor whether an `implemented` status meets the rule
* The later kind of unit that takes several units through their roles, and its loop
* The release notes, which `CHANGELOG.md` gets when a release is made

## Beyond the request

1. Let a blocking finding of the last review pass when the human declined it in the form of R9. It would save one
   delta review after such a decision, at the cost of matching the labels of the last review against the decisions
   after it, and a second way of being done in the rule, the command and its tests. Without it the command refuses,
   naming the finding, and a delta review lets it go on
2. A command that writes the human's decision on a proposed decline, as `npx agentrite decide <unit> <label>
   --declined`. It would spare the human the form of R9, at the cost of a command, its section and its tests. Without
   it the human writes the entry, or has an agent or a resume's `--prompt` record it, and the command's refusal names
   a decline that has none
3. Refuse a unit whose record holds an entry of the implementer that speaks of declining in words other than the form
   of R8. It would catch a proposed decline of the old habit in a unit that was in progress when the kit was updated,
   at the cost of a reading by words that may refuse an entry that only mentions a decline. Without it such a decline
   passes unseen, for those units alone
4. Have the change check reject a status of `implemented` that the record does not show the rule for, so that a unit
   set by hand is held to it as the command is. It would cost a second reader of the forms in the check, and refusing
   every unit implemented before the forms unless the check reads only what the branch changed. Without it a unit
   set by hand is checked by whoever sets it, as now
