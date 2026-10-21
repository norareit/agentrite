# 0067 A spec reviewer of this repository

## Context

A spec is the contract of a unit, and the human approves it before anything is planned or built. A spec that
contradicts itself, points at the wrong requirement, leaves a decision unmade or rests on something about a harness
that does not hold is found out by the planner, the implementer or the reviewer, after the approval, when fixing it
costs a correction of an approved spec on the unit's branch. Unit 0065, the orchestrator, grew through many revisions
in one conversation, and the human had it reviewed by a second model, GPT Sol in OpenCode, before approving it. That
review was run by hand, with a prompt written for the occasion.

The kit lets a project add roles of its own since unit 0056, and its `README.md` gives a spec reviewer, which runs
after the specifier while the unit is `draft`, as the first example. This repository has added none. The human asked
on 2026-10-21 for a spec reviewer as a role of this repository, so that the review of a spec is dispatched as a role,
`npx agentrite run spec-reviewer opencode <unit>`, and no longer written as a prompt each time. Whether it becomes a
role of the kit is for later, once it has been used here.

## Requirements

The role:

1. `agentrite.json` names a role `spec-reviewer`, after the four, with the path of its file in this repository
2. The file is `extra-roles/spec-reviewer.md`, and is not in the package
3. The wrappers of the role for Claude Code and OpenCode are written by `refresh` of the installed release and
   committed, and `.agentrite/instructions.md` names the role. `npm run kit -- roles` lists it after the four
4. The file opens with the front matter of a role file, whose description says that it reviews the spec of a `draft`
   unit and reports, and changes nothing but its findings and its record entry

What the file says:

5. That it reads `process.md` and the project's standards first, as the kit's role files say it
6. That it runs after the specifier and before the human approves, on a unit whose status is `draft`, and that on a
   unit of another status it says so and stops. It sets no status
7. What it is given and produces: the unit directory as its input, and its findings, in its response and saved in
   `.reviews/<unit-directory>/`, in a file whose name says that it is a review of the spec and keeps it apart from
   the reviews already there, and one entry in `record.md`
8. What it judges the documents of the unit against: the specifier's role file, for what a spec and a task record
   must hold, `process.md` and the standards, and the repository as it is, for every statement the spec makes about
   what exists today, such as a command, an option, a file, or how a harness behaves
9. What it looks for, each a kind of finding:
    * requirements that contradict each other, or a requirement, a decision or a non-goal that refers to the wrong
      requirement or to one that is not there
    * a requirement that cannot be checked, which the specifier's role file says belongs among the decisions
    * a decision that approving the unit would need and that the spec does not make, such as a behavior the
      requirements leave open
    * a decision whose rationale no longer fits the requirements, as after a revision
    * a statement about what exists today that the repository or the harness does not bear out, or that rests on
      something nobody verified, which it names as such
    * a conflict with `process.md`, the standards or a role file, that no decision records as an exception
    * what the request asked for that no requirement covers, and a requirement that the request did not ask for and
      that is not under "Beyond the request"
10. That it proposes no feature. Something it would add is a finding only where the request needs it
11. How it reports: each finding numbered as `F1`, `F2`, with its location in the documents, what is wrong and why
    it matters, and a kind of fault that is said plainly when it has none
12. That its findings go to the human and the specifier, that the human decides each and the specifier changes the
    spec, and that the findings block nothing: they do not stop the approval, and `process.md` says what blocks
    `implemented`
13. That it changes nothing under review: no document of the unit, and no other file, but its findings file and its
    record entry
14. That a second review of the same unit is a delta review: it verifies the findings of the last one that the
    record says were accepted, and reviews what changed in the unit's documents since that review's commit, and it
    names that commit
15. That its record entry is appended as the kit's log format gives it, `as the spec-reviewer`, and says that it
    reviewed, which documents at which commit, and the labels of its findings, and nothing about their outcomes
16. That its record entry is committed on the default branch, in a commit that holds nothing but that unit's own
    documents, as `process.md` says of what is written before the approval

The documents:

17. "What the repository holds besides the package" of `CONTRIBUTING.md` names `extra-roles/`

## Decisions

* **A role of this repository, not of the kit.** The human decided this. The kit's units 0054 and 0056 built on four
  roles of the kit and extra roles of a project's own, and this is the first extra role anywhere. Using it here first
  shows what it needs before every project gets it. A later unit can move the file into the package
* **The file is in `extra-roles/` at the root.** `roles/` is the kit's and in the package, and `.agentrite/` holds
  the list that `refresh` writes and nothing written by hand. A directory of its own, named for what `README.md` calls
  such a role, keeps the file out of the package without a rule in `package.json`. Rejected: `.agentrite/roles/`,
  which mixes a file of the repository's into a directory of the kit's
* **The findings block nothing.** An extra role's findings do not block `implemented`, as unit 0056 decided, and the
  approval is the human's alone. The spec reviewer informs it
* **Its findings go into `.reviews/`, beside the reviewer's.** The directory is ignored, kept per unit, and mounted
  in a unit run of the sandbox, and a later reader looks there for every review of the unit. A file name that says
  `spec` tells them apart
* **It judges against the repository, not only the documents.** The faults that cost most after the approval are
  statements about what exists that do not hold, as a flag of a harness or a key of `agentrite.json`, and only the
  repository shows them. Where it cannot verify one, as a harness's behavior it cannot run, it says so rather than
  judging
* **It does not grade a spec's choices.** A decision recorded with its rationale is the human's to approve, and the
  spec reviewer finds what is wrong or missing in the documents, not what it would have decided. A decision whose
  rationale no longer fits the requirements is a fault of the documents, and is a finding
* **Its record entry is committed on the default branch.** It is written while the unit is `draft`, before the unit
  has a branch, and `process.md` puts what is written before the approval on the default branch
* **No model is pinned in its wrappers.** Which model reviews is chosen when it is dispatched, with `--model`, as for
  the other roles of this repository

## Non-goals

* A spec reviewer of the kit, shipped in the package
* A plan reviewer, or any other extra role
* A step of the spec reviewer in the orchestrator of unit 0065, which starts at the planner of an approved unit
* A change to the kit's specifier, reviewer, `process.md` or the standards
* Running the spec reviewer on the units already approved or implemented

## Beyond the request

None
