# 0068 A round of the orchestrator leaves the record wrong

## Approach

Three changes of text, each pinned by the suite where the suite can read it.

The default definition's implementer prompt becomes the one of requirement 1. Every place that holds the old prompt
holds the new one: `orchestrator.json`, the README's example, and the three tests that pin it, which then fail on the
tree this unit is cut from and pass after the change.

`outcomeRequest` of `scripts/agentrite-outcome.mjs` gets a closing paragraph after its list of keys, so that its
start, which the tests of 0065 pin as `AgentRite's orchestrator runs this step... and reads`, stays as it is. The
paragraph, as the implementer writes it and the tests pin it, is:

```text
Record a finding that the prompt of this step accepts in record.md as accepted by the definition of the
orchestrator, and not as a decision of the human. Set the status of the unit to no status later than in-progress,
since the human sets implemented after the run.
```

It is one line of the request, preceded by an empty line, as the list is. It names no file in backticks, as the rest
of the request names `json` without them. The README's section "The outcome of a step" says the same of the request.

The reviewer's role file, `roles/reviewer.md`, has the reviewer commit its entry as its last act. Before it appends
its entry it checks that `record.md` holds no uncommitted change, with `git status --porcelain -- <record.md>`. When
it holds none, the reviewer appends its entry and commits that path alone with `git commit --only <record.md>`, so
that whatever else is staged or changed stays out of the commit, with the message `<prefix> Record the review of
<commit>`, where `<prefix>` is the prefix of the unit's commits, as `bugfix-0068`, and `<commit>` the commit it
reviewed. When it holds one, the reviewer appends its entry, commits nothing, and says in its response that its entry
is left uncommitted and why. The rule that it changes nothing under review, its "Output", and its description all
allow that one commit and no other.

`tests/agentrite-roles.test.mjs` checks that each kit role file's description is the one its fixture wrapper under
`tests/fixtures/` holds. The reviewer's description changes, so the description of both reviewer fixtures changes
with it. The wrappers at the root, `.claude/agents/reviewer.md` and `.opencode/agents/reviewer.md`, are written by
the installed release's `refresh` and are left as they are, as "Working on the kit" of `CONTRIBUTING.md` has it.

## Files

- `orchestrator.json`: the implementer's `prompt` of requirement 1
- `README.md`: the definition's example in "The definition" with the new prompt; a paragraph in "The outcome of a
  step" on what the request says of accepted findings and of the status, and that the human sets `implemented` after
  a run
- `scripts/agentrite-outcome.mjs`: the closing paragraph of `outcomeRequest`, and its doc comment
- `roles/reviewer.md`: the description, "Output", "You change nothing under review", "Saving them is where your
  writing stops", and "Record that you reviewed"
- `tests/fixtures/claude-agents/reviewer.md`, `tests/fixtures/opencode-agents/reviewer.md`: the reviewer's new
  description
- `tests/agentrite-definition.test.mjs`: the prompt in the test of the default definition
- `tests/package-documents.test.mjs`: the prompt in `DEFAULT_DEFINITION`, which pins `orchestrator.json` and the
  README's example
- `tests/agentrite-orchestrate.test.mjs`: `IMPLEMENTER_PROMPT`
- `tests/agentrite-outcome.test.mjs`: the closing paragraph in `request`, and a test that the request says it inside
  a repeat and outside one

## Tasks

- [x] In `tests/agentrite-definition.test.mjs`, `tests/package-documents.test.mjs` and
  `tests/agentrite-orchestrate.test.mjs`, replace the old implementer prompt by the prompt of requirement 1, wrapped
  at 120 characters. Run `npm test` and see the three fail on the old prompt (R1, R6)
- [x] In `tests/agentrite-outcome.test.mjs`, add the closing paragraph of "Approach" to `request`, after
  `...REQUEST_LIST` and an empty line, and add a test, under a comment `// R2 of unit 0068`, that
  `outcomeRequest(undefined)` and `outcomeRequest({ at: 2, of: 3 })` each end with the paragraph. Run `npm test` and
  see them fail (R2, R6)
- [x] Set the implementer's `prompt` of `orchestrator.json`, and of the example in "The definition" of `README.md`, to
  the prompt of requirement 1. Run `npm test` and see the tests of the first task pass (R1)
- [x] Add the closing paragraph to `outcomeRequest`, as `''` and the paragraph after the list, its source lines within
  120 characters, and say in its doc comment that the request also says how a step records an accepted finding and
  which status it sets at the latest. Run `npm test` and see the tests of the second task pass (R2)
- [x] In "The outcome of a step" of `README.md`, after the list of the outcome's keys and before the example, add a
  paragraph: the request also says that a finding the step's prompt accepts is recorded in `record.md` as accepted by
  the orchestrator's definition, and not as a decision of the human, and that the step sets the unit's status to no
  status later than `in-progress`; the human sets `implemented` after the run, once the last review's findings are
  decided. Check that "A run neither sets the unit's status nor commits" in "How a run ends" still holds beside it
  (R3)
- [x] In `roles/reviewer.md`, change the description to say that the reviewer appends one entry to the unit's
  `record.md` saying that it reviewed and commits it alone, and changes nothing else under review; change "Output" to
  name the commit of the entry; change "No edit, no fix, no commit" in "You change nothing under review" so that the
  commit of the entry is the one commit it makes; and keep the folded description within 120 characters a line (R4)
- [x] In "Record that you reviewed" of `roles/reviewer.md`, say that the entry and its commit are the last act: before
  appending, check with `git status --porcelain -- <record.md>` that `record.md` holds no uncommitted change; when it
  holds none, append the entry and commit it with `git commit --only <record.md>`, on the branch reviewed, with the
  message `<prefix> Record the review of <commit>` and the prefix of the unit's commits, so that the commit holds the
  entry and nothing else; the findings file is under the ignored `.reviews/` and is not committed (R4)
- [x] In the same section, say that when `record.md` holds an uncommitted change before the entry is appended, the
  reviewer appends its entry, commits nothing, and says in its response that its entry is left uncommitted because
  `record.md` holds changes of another, which committing would put under its commit (R5)
- [x] Change the description of `tests/fixtures/claude-agents/reviewer.md` and
  `tests/fixtures/opencode-agents/reviewer.md` to the new folded description of `roles/reviewer.md`, line for line.
  Run `npm test` and see `each kit role file opens with its description in the folded form` pass (R4)
- [x] Run the check by hand of requirement 7, on the host, as the amendment of 0065 records the run it repeats: a
  project under the scratch directory, with the kit of this unit's last commit installed from the tarball of
  `npm pack`, a feature `0001-greet` of two requirements, approved and committed on `master`, and a `trial.json` that
  is the new default definition changed only in that the implementer's prompt also tells it to break the second
  requirement in round 1. Run `./sandbox-dev.sh --workdir <project> npx agentrite orchestrate 0001 --definition
  trial.json --skip-permissions`. Confirm, from the project's `record.md`, `git log` and `git status`: the status is
  `in-progress`; no entry says that the human accepted a finding; the entries of both reviews are under `## Log` and
  each is in a commit of its own; `record.md` holds no uncommitted change. Log the result, with the versions of Claude
  Code and OpenCode, in `record.md`. Where the run takes no second round, say so and run it again (R7)

## Verification

- [x] `npm test` passes on the final tree
- [x] Every line the unit changes in `orchestrator.json`, `README.md`, `scripts/agentrite-outcome.mjs`,
  `roles/reviewer.md`, the fixtures and the tests fits 120 characters
- [x] `npm run check-changes` passes after the last commit
- [x] The check by hand of the last task ends as requirement 7 says

## Commit Points

- [x] `bugfix-0068 Plan the fix`: `plan.md` and the planner's entry in `record.md`
- [x] `bugfix-0068 Record accepted findings as the definition's, and keep the status in progress`: the first five
  tasks
- [x] `bugfix-0068 Have the reviewer commit its record entry`: the reviewer's role file and the fixtures
- [x] `bugfix-0068 Record the check by hand of a second round`: the check by hand's entry in `record.md`
