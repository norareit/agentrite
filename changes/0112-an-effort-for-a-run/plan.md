# 0112 Give a run of a harness an effort

## Approach

A new member of the harness contract, `start.effort: (level: string) => string[]`, gives the arguments a harness
gets for an effort. Each module implements it as R2 gives: Claude Code the one argument `--effort=<level>`, OpenCode
the one argument `--variant=<level>`, and Codex the two arguments `-c` and `model_reasoning_effort=<level>`.
`harnessCommand` of `scripts/agentrite-run.mjs` puts `start.effort(effort)` between the model and the permission flag
when an effort is given, and names no harness (R11, R3).

`parseRunArgs` takes `effort` as a string option, beside `model`. An empty or missing level is refused by the
existing `optionError`, through a new entry of `OPTION_VALUES`, so that the refusal reads as that of `--model`:
`--effort takes a level, and none was given`. An effort without a model is refused after the options and the
positions are judged, with the line `--effort is given only with --model, the model the level is for`, followed by
the usage, as every other refusal of `run` (R1, R4).

A step of the definition takes an optional `effort` in `parseStep` of `scripts/agentrite-definition.mjs`, a string
that is not empty, judged after `model` and kept on the step only when given (R6). `runStep` of
`scripts/agentrite.mjs` passes `--effort=<effort>` after `--model=<model>` when the step has one (R6). An ask again
and a resume reuse the `Step` of the definition they run, so they need no code of their own, only tests (R10).

`stepHead` of `scripts/agentrite-orchestrate.mjs` gives the model, and after it `, effort <level>` for a step that
has one. Since the lines before and after a step, the opening line of a resume and the head of `agentrite runs` are
all built on `stepHead`, they follow (R7). `ranTable` builds its model cell by the same helper, `modelText(step)`,
exported from `scripts/agentrite-orchestrate.mjs`, which `stepHead` uses too, so the two cannot drift apart (R8).
`runFrom` of `scripts/agentrite-runs.mjs` gives `effort: found.effort ?? null` in its `step` (R9).

The default `orchestrator.json` gains `"effort"` on each of its three steps, after `model` (R14).

## Files

- `scripts/agentrite-harness.mjs`: `start.effort` in the JSDoc type `Harness` and in `HARNESS_CONTRACT`, after
  `start.role`
- `scripts/harnesses/claude.mjs`, `scripts/harnesses/opencode.mjs`, `scripts/harnesses/codex.mjs`: `start.effort`
- `scripts/agentrite-run.mjs`: `RUN_FORM`, `runUsage`, `RUN_OPTIONS`, `OPTION_VALUES`, `parseRunArgs` and its
  JSDoc, `harnessCommand` and its JSDoc
- `scripts/agentrite.mjs`: the call of `harnessCommand` in the command `run`, which passes `effort` from the parsed
  arguments, and `runStep`, which passes `--effort=<effort>`
- `scripts/agentrite-definition.mjs`: the typedef `Step`, `PLACES.step` and its `holds`, `parseStep`
- `scripts/agentrite-orchestrate.mjs`: `modelText`, `stepHead`, `ranTable` and their JSDoc
- `scripts/agentrite-runs.mjs`: the typedef `RunStep` and `runFrom`
- `orchestrator.json`: an `effort` for each step
- `tests/agentrite-harness.test.mjs`, `tests/agentrite-run.test.mjs`, `tests/agentrite-definition.test.mjs`,
  `tests/agentrite-orchestrate.test.mjs`, `tests/agentrite-runs.test.mjs`: the tests of R15
- `COMMANDS.md`, `ORCHESTRATOR.md`, `CONTRIBUTING.md`: R12 and R13

## Tasks

### The harness contract

- [x] In `tests/agentrite-harness.test.mjs`, add `start.effort` after `start.role` in the list of the test of the
  members of the contract, and rename that test from thirty-one to thirty-two members. In the test that names a
  harness lacking a member, add a module without `start.effort`, which gives `['claude lacks start.effort']`, and
  one whose `start.effort` is a string, which gives the fault the test already expects of a member of another kind
  (R11, R15)
- [x] Add a test that each harness's `start.effort('high')` is `['--effort=high']` for claude, `['--variant=high']`
  for opencode and `['-c', 'model_reasoning_effort=high']` for codex, and that `start.effort('-x')` gives the level
  joined in one argument the same way (R2, R11, R15)
- [x] Add `start.effort` to the JSDoc type `Harness` as `effort: (level: string) => string[]`, and to
  `HARNESS_CONTRACT` after `start.role`, of kind `function`, with the purpose "the arguments that give the harness
  an effort, from its level as it was given" (R11)
- [x] Implement `start.effort` in each of the three modules as R2 gives, after `role`. In the Codex module, a comment
  says that Codex has no option for the effort and that `-c` sets one configuration key for the run (R2, R11)

### agentrite run

- [x] In `tests/agentrite-run.test.mjs`, add `effort: undefined` to `PLAIN` and to `START`, and `effort` to the
  options of the test that takes them before, between and after the positions, as `--effort high` and as
  `--effort=high`. Add to "each option of run is taken alone" that `--model m --effort high` gives both, and that
  `--effort=-x` with a model gives the level `-x` (R1, R15)
- [x] Add to "each argument run does not take is named" the cases `--effort` at the end, `--effort` followed by
  `--headless`, `--effort=` and `--effort ''`, each with a model, which give `--effort takes a level, and none was
  given`, and `--effort high` without `--model`, which gives `--effort is given only with --model, the model the
  level is for`, each followed by the usage (R4, R15)
- [x] Extend "the argument list of each harness in each mode is the row of the table" with a loop over the efforts
  `undefined` and `high`, where the options of the row are the role, the model, `start.effort` of the row's harness
  as written in the test (`['--effort=high']`, `['--variant=high']`, `['-c', 'model_reasoning_effort=high']`) and the
  permission flag, in that order. Add a test that, for each harness in each mode, an effort of `high` and of `-x`
  stands after `--model=<model>` and before the permission flag and the harness arguments, and that the level never
  stands as an argument of its own. The test that gives a harness no effort keeps its exact argument lists (R1, R2,
  R3, R15)
- [x] Update `RUN_USAGE` in the test to the usage below, and add an end-to-end test beside "run gives the harness the
  model, the permission flag and the text" that runs `agentrite run` with `--model` and `--effort` for each harness,
  once with `--headless` and once without, and finds the arguments of R2 and R3 in what the fake harness was given,
  and one that `--effort high` without `--model` exits 1, prints the refusal and the usage on standard error, and
  starts no harness (R1 to R5, R15)
- [x] In `scripts/agentrite-run.mjs`, add `effort: { type: 'string' }` to `RUN_OPTIONS` and `effort: 'a level'` to
  `OPTION_VALUES`. In `parseRunArgs`, return `effort: values.effort`, and refuse an effort without a model after
  `positionError`, with the line of the task above and the usage. Update its JSDoc return type (R1, R4)
- [x] Change `RUN_FORM` so that both lines stay within 120 characters, as
  `usage: agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--effort <level>]` and, under the
  first argument, `[--headless] [--skip-permissions] [-- <harness arguments...>]`. Add to `runUsage`, after
  `--model <id>`, the option `--effort <level>` with: the level of reasoning, as the harness's own word, such as
  high, given only with --model: --effort=<level> for claude, --variant=<level> for opencode and -c
  model_reasoning_effort=<level> for codex. It is wrapped as the other options are (R5)
- [x] In `harnessCommand`, take `effort` from the run and put `...(effort === undefined ? [] : start.effort(effort))`
  after the model and before the permission flag. Update its JSDoc. In `scripts/agentrite.mjs`, pass `effort` from
  the parsed arguments to `harnessCommand` in the command `run` (R2, R3, R11)
- [x] Run `npm test`

Commit point 1: `feature-0112 Give agentrite run an effort through each harness's module`.

### The definition and the orchestrator

- [ ] In `tests/agentrite-definition.test.mjs`, update `STEP_KEYS` to
  `A step holds role, harness and model, and may hold effort, prompt, stopWhen and timeoutMinutes`. Add a test that a
  step with `effort: 'high'`, outside a repeat and inside one, is taken with it, and that one without it has no key
  `effort`. Add a test that an `effort` of `''`, `3`, `true`, `null`, `[]` and `{}` is refused at
  `steps[0].effort` and at `steps[1].repeat.steps[1].effort`, with the must `a string that is not empty` (R6, R15)
- [ ] Update the test of the default definition so that the planner, the implementer and the reviewer hold
  `effort: 'medium'`, `'medium'` and `'high'`, after `model` (R14, R15)
- [ ] In `scripts/agentrite-definition.mjs`, add `effort?: string` to the typedef `Step`, `effort` after `model` in
  `PLACES.step.keys` and in its `holds`, as `STEP_KEYS` above, and in `parseStep` take `effort` after `model`, when
  given, by `valueAt` with `isFilledString` and the must `a string that is not empty` (R6)
- [ ] In `orchestrator.json`, add `"effort": "medium"` to the planner and the implementer and `"effort": "high"` to
  the reviewer, each after `model`. The planner's step stays on one line if it fits 120 characters, as now (R14)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add to the tests of the head and of the line before and after a
  step a step with `effort: 'high'`, whose head is
  `step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol, effort high`, and keep the cases without an effort
  as they are. Add to the tests of the table a run with one step with an effort and one without, whose model cells
  are `openai/gpt-6.1-sol, effort high` and the model alone, with the columns aligned to the widest cell, and keep
  the spec example of a run without an effort line for line (R7, R8, R15)
- [ ] Add to the tests of the opening line of a resume one for a step with an effort (R7)
- [ ] Implement `modelText(step)`, which gives `step.model`, followed by `, effort <level>` when `step.effort` is
  given, and use it in `stepHead` and in the model cell of `ranTable` (R7, R8)
- [ ] Update the end-to-end test that runs the default definition with its fake harnesses: its step lines name the
  efforts, as `step 0, planner, claude, claude-opus-5-5, effort medium: started`, and its calls show
  `--effort=medium` after `--model=claude-opus-5-5` for the planner and the implementer, and `--variant=high` after
  `--model=openai/gpt-6.1-sol` for the reviewer. In the test of a definition given with `--definition`, whose step
  has no effort, assert that no argument of the call opens with `--variant` (R6, R14, R15)
- [ ] Add an end-to-end test that a step of Codex with `effort: 'high'` in a definition given with `--definition` is
  called with `-c` and `model_reasoning_effort=high` after `--model=<model>` (R2, R6, R15)
- [ ] Add end-to-end tests that an ask again of a step with an effort gives the harness the same effort argument as
  the step it asks again, beside "a step without a block is asked again in its session", and that a resume of a run
  whose kept `definition.json` gives a step an effort runs the rerun with it, also when the definition that
  `agentrite.json` names gives none, beside "a resume runs the definition of the run it resumes" (R10, R15)
- [ ] In `runStep` of `scripts/agentrite.mjs`, add the one argument `--effort=<effort>` for a step with an effort,
  and nothing for one without, after `--model=<model>`, under the comment that already says the values are written
  onto their options (R6)
- [ ] In `tests/agentrite-runs.test.mjs`, add a test that the `step` of a run at a step with an effort holds
  `effort: 'high'` and its head names it, and that the `step` of one without holds `effort: null`. Update the
  existing expected `step` objects with `effort: null` (R7, R9, R15)
- [ ] In `scripts/agentrite-runs.mjs`, add `effort` of type `string | null` to `RunStep` and
  `effort: found.effort ?? null` to the `step` of `runFrom` (R9)
- [ ] Run `npm test`

Commit point 2: `feature-0112 Give a step of the orchestrator an effort, and the default definition its efforts`.

### The documents

- [ ] `COMMANDS.md`, the table at the top and the form of "agentrite run": the form of `RUN_FORM`. The table of its
  options gains `--effort <level>`: the harness's own level of reasoning, given only with `--model`, passed on as
  each harness takes it. Also `--effort=<level>`. The list of the options gains a bullet after `--model`: the level
  is the harness's own word and is not judged; Claude Code gets `--effort=<level>`, OpenCode `--variant=<level>`, a
  variant of the model, and Codex `-c` and `model_reasoning_effort=<level>`, each joined in one argument so that a
  level that opens with a dash is not taken for an option; `--effort` without `--model` is refused, since a level is
  meant for a model; without `--effort` the harness gets no effort. Item 1 of "What the harness is given" reads: the
  role, as an option for Claude Code and OpenCode, the model as `--model=<id>`, the effort as the harness takes it,
  and the permission flag (R13)
- [ ] `COMMANDS.md`, "agentrite runs": the `step` of `--json` holds `effort`, its effort, or `null` for a step
  without one, after `model`, and the example line of a running run stays as it is unless its step has an effort
  (R9, R13)
- [ ] `ORCHESTRATOR.md`, "The definition": the example is the new `orchestrator.json`, and the text before it says
  that the planner and the implementer run at the effort `medium` and the review at `high`. The bullet of the keys
  of a step names `effort`, the harness's own level of reasoning for the model, a string that is not empty, which
  the step's `agentrite run` gets as `--effort`. The example of a fault place stays valid (R13)
- [ ] `ORCHESTRATOR.md`, "How a run ends" and wherever it gives step lines, the end report table and the opening
  line of a resume of the default definition: the lines name the efforts of the default, as `, effort medium` and
  `, effort high` after the model, and the table's model cells hold the effort, re-aligned. A sentence says that a
  step without an effort has its line and its cell without it (R7, R8, R13)
- [ ] `CONTRIBUTING.md`, "Adding a harness": a bullet after `start.role` says what `start.effort` asks of a new
  harness: the arguments that give it an effort from the level, joined in one argument with its option or key, as
  `--effort=<level>` for Claude Code, `--variant=<level>` for OpenCode and `-c` with `model_reasoning_effort=<level>`
  for Codex, and that the command that starts the harness names no option of its own
  for the effort. The item of the help texts names what `--effort` gives each harness beside what
  `--skip-permissions` gives each (R12)
- [ ] Check that every changed line of the documents and the code is within 120 characters, a table row aside
- [ ] Run `npm test` and `npm run check-changes`

Commit point 3: `feature-0112 Document the effort of a run and of a step`.

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed branch
- [ ] Each requirement R1 to R15 has its task, traced above, and no task traces to nothing

## Commit Points

- [x] `feature-0112 Give agentrite run an effort through each harness's module`
- [ ] `feature-0112 Give a step of the orchestrator an effort, and the default definition its efforts`
- [ ] `feature-0112 Document the effort of a run and of a step`
