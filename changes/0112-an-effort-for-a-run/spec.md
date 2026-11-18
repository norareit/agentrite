# 0112 Give a run of a harness an effort

## Context

`npx agentrite run` starts a harness in a role, and gives it a model when `--model` names one. A step of the
orchestrator's definition names its model in `model`, and the orchestrator runs the step as `agentrite run` with
`--model`. Nothing gives the harness an effort, the level of reasoning the model works at. Each of the three harnesses
takes one of its own:

* Claude Code takes `--effort <level>`, with the levels `low`, `medium`, `high`, `xhigh` and `max` of its version on
  2026-11-18
* OpenCode takes `--variant <name>`, a variant of the model, which is the provider's own reasoning effort, as `high`,
  `max` or `minimal`
* Codex takes its configuration key `model_reasoning_effort`, which `-c model_reasoning_effort=<level>` sets for one
  run

Without the kit, the effort is the harness's default, or what the harness's own configuration sets. A developer who
starts `agentrite run` can give it after `--`, as an argument of the harness's own, as `-- --variant high`, which
differs per harness. A step of the orchestrator cannot give it at all, since a step has no field for the arguments of
its harness. A review in OpenCode on GPT Sol therefore always runs at the effort OpenCode chooses.

This unit adds an effort, optional wherever it is given, to `agentrite run` and to a step of the definition, and makes
the way a harness takes it a part of what a harness module implements, and so of what adding a harness takes.

## Requirements

1. `agentrite run` takes the option `--effort <level>`, which may stand anywhere among the arguments before a `--`, as
   the other options do, and may be given as `--effort=<level>`. The level is a text that is not empty. Without
   `--effort` the harness gets no effort, and its command line is what it is now
2. With `--effort`, the harness gets the level as it is written, in the form its module gives:
    * Claude Code gets the one argument `--effort=<level>`
    * OpenCode gets the one argument `--variant=<level>`
    * Codex gets the two arguments `-c` and `model_reasoning_effort=<level>`

   The level is joined to its option or to its key in one argument, so that a level that opens with a dash is not
   taken for an option of the harness. The command does not judge whether the harness or the model knows the level,
   and what the harness makes of a level it does not know is the harness's
3. The harness gets the effort in both modes, with `--headless` and without it, after the model and before the
   permission flag, so that what the harness is given is, in this order: the role, the model, the effort and the
   permission flag; every argument after the `--`; the prompt
4. `--effort` given without a level, or with an empty one, is refused as `--model` is: the command names the option,
   says what it takes, prints its usage, and starts no harness. `--effort` without `--model` is refused too: the
   command says that an effort is given only with the model it is for, prints its usage, and starts no harness
5. The usage of `agentrite run` names `--effort <level>` in its form and in its list of options, with what each
   harness gets for it
6. A step of the orchestrator's definition may hold `effort`, a string that is not empty, in a repeat or not. A step
   without it runs as it does now. A step with it runs its `agentrite run` with `--effort` and its value. An `effort`
   of another form is refused before anything runs, as a fault of any other key is, with its place in the
   definition, as `steps[1].repeat.steps[1].effort`, and what it must hold
7. The lines the orchestrator prints before and after a step, and so the line of `agentrite runs` for a running run,
   name a step's effort after its model, as `, effort <level>`, as
   `step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol, effort high: started`. The line of a step without an
   effort is what it is now
8. The table of the steps of the end report gives a step's effort after its model, in the same cell, as
   `openai/gpt-6.1-sol, effort high`. The cell of a step without an effort is the model alone, and the table of a run
   whose steps have no effort is what it is now
9. The `step` of a run in `agentrite runs --json` holds `effort`, the step's effort as a string, or `null` for a step
   without one
10. An ask again runs with the effort of the step it asks again. A resumed run runs each step with the effort the
    definition kept in the run's directory gives it, as it does with the model
11. The harness contract of `scripts/agentrite-harness.mjs` holds a member `start.effort`, a function from the level to
    the arguments the harness gets for it, and each of the three harness modules implements it as R2 gives. The
    command that starts a harness names no option of its own for the effort. The test of the contract fails, naming
    the harness and the member, for a module that lacks the member or has it of another kind, as for every member
12. `CONTRIBUTING.md` says, in "Adding a harness", what `start.effort` asks of a new harness, beside `start.role`, and
    that the usage of `agentrite run` names what `--effort` gives each harness, beside what `--skip-permissions` gives
    each
13. `COMMANDS.md` describes `--effort` in the section of `agentrite run`, with what each harness gets, and in its list
    of what the harness is given, and gives `effort` in the `step` of `agentrite runs --json`. `ORCHESTRATOR.md` gives
    `effort` among the keys of a step, the effort in the lines of a step and in the table of the end report, and the
    default definition of R14, in its example and in the text that says what the default does
14. The kit's default definition, `orchestrator.json`, gives each of its steps an effort: `"medium"` for the planner in
    Claude Code on Opus, `"medium"` for the implementer in Claude Code on Sonnet, and `"high"` for the reviewer in
    OpenCode on GPT Sol. Its steps are otherwise what they are now
15. Unit tests show R1 to R4 for each harness, R6 for a step with an effort, one without and an `effort` of another
    form, R7 to R9 for a step with an effort and one without, R11 for a module that lacks `start.effort`, and R14 for
    the default definition, which is a valid definition that gives those efforts. A test of the orchestrator with its
    fake harnesses shows that a step with an effort gives its harness the arguments of R2

## Decisions

* **One word for the three harnesses, `effort`, and each harness's own option behind it.** It is the word Claude Code
  and Codex use, and the one a reader of the definition brings. OpenCode's `--variant` is the same thing under
  another name, and the kit already hides such a difference behind its own option, as with `--skip-permissions`.
  Rejected: passing harness arguments from a step of the definition, which would let a step give its effort as the
  harness writes it, but make every definition name each harness's option, and is a general form of this one wish
* **The level is the harness's own word, unjudged, as the model id is.** The levels differ per harness, per model and
  per version: OpenCode's variants are the provider's, and Claude Code's levels have grown between versions. A list of
  the kit's own would refuse a level a harness takes, or need a release for each new one. The harness refuses a level
  it does not know, with its own message, as it does a model it does not know. Rejected: the kit's own scale mapped
  onto each harness, which would have to know every model's variants
* **Joined to its option, and for Codex to its key.** It is how `--model` is given, for the same reason. Codex has no
  option for the effort, and `-c` with the key is how its documentation sets one configuration value for a run
* **An effort only with its model.** A level means something only for a known model: OpenCode's variants are the
  provider's for one model, and the levels Claude Code and Codex take can differ between models. Without `--model`,
  the model is the one the harness or the role's wrapper chooses, which the kit does not know, so the same level could
  be refused, or mean another thing, for each model the harness happens to choose. The human chose to refuse it.
  Rejected: taking it, as `--model` is optional, which was the first reading of this spec. A step of the definition
  holds its `model` already, so the refusal changes nothing for the orchestrator
* **The default definition gives an effort to each step, `medium` on Opus and Sonnet and `high` on GPT Sol.** The
  human chose the levels, which give the review more reasoning than the planning and the implementing. A project that
  wants others copies the definition and changes them
* **Optional everywhere, and nothing when it is not given.** The request asks for it to be optional, and a project
  that gives no effort keeps the command lines, the lines of a run and the end report it has now
* **A member of the contract, not a case in the run command.** How a harness takes an effort is knowledge of the
  harness, like how it takes its role, and so belongs in its module, where the test of the contract makes a new
  harness implement it. The run command iterates over no harness by name, as now. A harness without any way to take an
  effort is not catered for, since the three have one, and a harness added later without one is decided when it comes
* **In the same cell of the end report, not a column of its own.** A column would change the table of every run,
  also of the runs with no effort, and would be empty for most steps. The model and its effort are read together

## Non-goals

* An effort pinned in a role's wrapper, as a model can be, and its keeping by `refresh`
* Checking a level against what the harness or the model takes, or listing the levels of each
* Passing arguments of the harness's own from a step of the definition
* An effort for the specifier's session, or any session a developer starts without `agentrite run`
* The sandbox: `./sandbox.sh` passes the arguments of `agentrite run` on as they are, `--effort` among them, and needs
  no change

## Beyond the request

1. Taken by the human, with levels of their own, as R14: an effort in the default definition
2. An effort pinned in a role's wrapper, which Claude Code's agent files take as `effort` and OpenCode's as `variant`,
   kept by `refresh` as a pinned model is. It costs a case in each module's `refreshed` and `isKit`, and their tests.
   Without it, an effort is given per run or per step, and a line of an effort that a developer adds to a wrapper by
   hand is not kept by `refresh`. Declined by the human
