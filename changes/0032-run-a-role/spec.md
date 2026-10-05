# 0032 Run a role in a harness

## Context

A role is taken on today by starting a harness by hand and asking it for the role: `@reviewer` in OpenCode, the
`implementer` agent in Claude Code. Which model does the work is whatever the session runs on, or what the role's
wrapper pins. Nothing in the kit starts a harness as a role, and nothing lists the roles a project has.

The human plans an orchestrator, in a repository of its own, that takes a unit from the implementer in one harness
to the reviewer in another and back. It needs one way to say "this role, in this harness, on this model, for this
unit". The same command is useful without an orchestrator, to a human who starts the role by hand.

### What the human asked for

On 2026-10-05: "One thing we will definitely need (and is even useful for Agentrite without an orchestrator) are
those wrappers to call Claude Code and OpenCode with a given role and model. I think we should also be able to see
the available roles somewhow with "agentrite list-roles" or something like that. When running "agentrite run" it
should also show how the run command can be used."

Asked four questions by the planner, the human chose:

* **Interactive and headless.** The command opens the harness as the role, and a flag runs it without a session,
  for scripts
* **The wrappers carry the role.** The command passes the role to the harness as its agent, and the OpenCode
  wrappers change so that OpenCode accepts that
* **One flag of the kit's for permissions**, which maps to each harness's own, over passing the harness's flags
  through and over the command adding it by itself inside the sandbox
* **A unit, and optional text after it**, over a free prompt

Everything else in this spec is the planner's, and has not been read by the human yet.

### What the human added during the implementation

On 2026-10-05, with a first implementation committed on the unit's branch, up to `1ff7e9f`: "During
implementation I realised I might want the "passing further arguments" in the beyond the request of 0032 after
all. This is really useful for the --resume use-case and I don't see a reason to NOT support this. Besides that,
the --json for the roles seems like a useful thing to have as well. Could you act as the @planner and add these
in the spec after all. Take into account that a first version of the implementation has already been made. So
check the record.md!"

So two things that stood under "Beyond the request" are the human's now: the command passes further arguments
on to the harness, and `agentrite roles --json`. They are requirements 20 to 24, and requirements 1, 2, 9, 12,
14 and 17 changed with them. No requirement was renumbered, so the record's entries name what they named. What
the first implementation does that these change is said under Decisions.

### What the human changed after the second implementation

On 2026-10-05, with the additions above implemented on the unit's branch, up to `f136f75`, in the implementer's
session. First: "Doesn't it make more sense to NOT have the -- arguments AFTER the prompt? The prompt should be the
last part IMO." The implementer answered that an option of a harness that takes several values, placed before the
prompt, takes the prompt for one, and showed a run of Claude Code that failed so. Then: "What about making the
prompt an argument itself? --p "some prompt" ?" The implementer found that Claude Code has no option for a prompt,
that both harnesses take a `--` in front of the prompt, and proposed both together. The human: "go ahead and act
as the planner to make that change. Then implement it."

So two things changed, both the human's:

* The text is an option of the command, `--prompt <text>`, and no longer the words after the unit
* The harness gets the caller's arguments before the prompt, and the prompt last

Requirements 2, 5, 12, 13, 17, 21, 23 and 24 changed with them, and none was renumbered. What the second
implementation does that these change is said under Decisions.

### What was found while planning

On `master` at `9f03a06`, with Claude Code 2.1.289 and OpenCode 1.18.34 on the host.

* `agentrite` has two commands, `init` and `refresh`. Both take harnesses and nothing else, and the entry point
  parses those for every command
* The roles and their descriptions are a list inside `scripts/agentrite-roles.mjs`, which nothing outside that file
  can read
* The OpenCode wrappers are written with `mode: subagent`. `opencode run --agent <name>` and `opencode --agent
  <name>` do not take such an agent: OpenCode's code prints `agent "<name>" is a subagent, not a primary agent.
  Falling back to default agent`, and goes on as its default agent. The role file is then never read, and the run
  looks like any other. OpenCode knows three modes: `subagent`, `primary` and `all`
* Both harnesses take an agent, a model and a first prompt, with a session and without one:
    * `claude --agent <role> --model <id> <prompt>`, and the same with `--print` for a run without a session
    * `opencode --agent <role> --model <id> --prompt <prompt>`, and `opencode run --agent <role> --model <id>
      <prompt>` for a run without a session
* Each has one flag that ends the questions about permissions: `--dangerously-skip-permissions` in Claude Code,
  which bypasses every check, and `--auto` in OpenCode, which approves what is not explicitly denied. The two do
  not do the same
* The README says of the wrappers that they hold nothing but what the kit put there, and that `refresh` keeps
  only a pinned model
* A unit run of the sandbox mounts a clone that has no `node_modules`, so `npx agentrite` is there only after
  `npm ci` in the clone. The README says so already

**Not established.**

* That a wrapper with `mode: all` is taken by `opencode run --agent` and by `opencode --agent`, and is still
  offered as a subagent. Read from OpenCode's code, not run
* That the model pinned in a wrapper is the one a harness uses when it is started with `--agent` and no model.
  Not run in either harness
* What Claude Code does with `--agent` and a name it has no agent for. Not run
* That each harness takes its prompt last, as requirement 21 places it: after a `--` in Claude Code and in
  `opencode run`, and as the value of `--prompt` in a session of OpenCode, with the caller's arguments in front.
  Run before this was written, once each and with a harness started by hand, not by the command: Claude Code
  headless and in a session on a pseudo-terminal, each with `--allowedTools Read -- <prompt>`, and
  `opencode run --agent reviewer -- <prompt>`. All three answered the prompt. Not run: a session of OpenCode
  with arguments of the caller's before its `--prompt`
* That a session is resumed with the caller's arguments in that place: in Claude Code by a `--session-id` on the
  first run and a `--resume` on the next, and in OpenCode by a `--session`. With the arguments after the prompt
  it was run and worked, as the record's entry of 15:21:47Z says. With them before the prompt it is not run
* How each harness ends when it is interrupted, and whether an interactive session of either leaves the terminal
  as it found it when it is started by a command that waits for it

## Requirements

The roles:

1. `agentrite roles` prints each role the kit has, in the order the kit holds them: its name, and its
   description as the wrappers hold it. It exits 0, reads nothing of the project and takes no argument but the
   `--json` of requirement 20. With any other, it prints its usage on standard error and exits 2

Running a role:

2. `agentrite run <role> <harness> <unit>` starts the harness in the directory it is run from, which is the
   project root, as that role. The options are `--prompt <text>`, `--model <id>`, `--headless` and
   `--skip-permissions`, and each may stand anywhere among the arguments before a `--`. What a `--` does is in
   requirement 21
3. `<role>` is one of the roles `agentrite roles` prints, and `<harness>` is one of the harnesses `init` takes
4. `<unit>` names one directory of `changes/`: by its name, by its name after `changes/` and with or without a
   closing slash, or by the four digits its name opens with. The command stops, says so on standard error, exits 1 and
   starts nothing when `changes/` holds no such directory, and names the directories when the digits open more
   than one
5. The harness gets the role as its agent, and one prompt: `The unit is changes/<directory>/.`, and, when
   `--prompt <text>` is given, an empty line and the text as it is written. The text is one argument. When
   `--prompt` is given more than once, the last one counts
6. With `--model <id>` the harness gets the id as it is written, as its own model option. Without it the harness
   gets no model, and decides by itself
7. Without `--headless` the harness is started with a session, on the terminal the command was run on. With it,
   the harness is started without one: it works on the prompt and ends
8. With `--skip-permissions` Claude Code gets `--dangerously-skip-permissions` and OpenCode gets `--auto`, in both
   modes. Without it the harness gets neither
9. The harness's standard input, output and error are those of the command, and the harness gets no argument
   beyond what requirements 5 to 8 and 21 give
10. The command exits with the status the harness exited with, and with a status other than 0 when the harness
    was ended by a signal
11. The command stops before it starts anything, says why on standard error and exits 1 when:
    * the role's wrapper for the harness is not in the project, or is not the file `refresh` would leave there.
      It names the file and `npx agentrite refresh <harness>`
    * the harness's command is not on the `PATH`. It names the command

The usage:

12. `agentrite run` with no argument prints the usage of `run` on standard error and exits 2, and starts nothing. The
    usage holds the form of requirement 2 with the `--` of requirement 21, the roles, the harnesses, what a unit may
    be given as, each option with what it does, and what follows a `--`. It says of `--skip-permissions` which flag
    each harness gets, and that it is meant for the sandbox
13. A role or a harness the command does not know, a missing unit, an argument beyond the unit, an option it
    does not know, a `--model` with no id and a `--prompt` with no text are each named on standard error,
    followed by the usage of `run`, with exit 2 and nothing started
14. `agentrite` with no command, and with one it does not know, prints the usage of every command, `roles` and `run`
    among them, with the `--json` of `roles` and the `--` of `run`, and exits 2 as today. `init` and `refresh` take
    what they took and print what they printed

The wrappers:

15. The OpenCode wrappers are written with `mode: all`, by `init`, by `refresh` and by `agentrite-roles`. Nothing
    else of a wrapper changes, and the Claude Code wrappers are byte for byte what they were
16. `refresh` in a project whose OpenCode wrappers hold `mode: subagent` reports each as refreshed, and keeps a
    pinned model as before

The package and the documents:

17. The README describes `roles` and `run`: the form, a unit run by its number in each harness, the two modes,
    that the harness's own model id is what `--model` takes, that a pinned model is what a run without `--model`
    is expected to use, what `--skip-permissions` gives each harness and that it belongs in the sandbox, and that
    the command needs the wrappers as `refresh` leaves them, `--prompt` and what it adds, what follows a `--`
    and where the harness gets it, with a session resumed in each harness as its example, and `roles --json`
    with what it prints. Where the
    README describes the wrappers it says that
    the OpenCode ones are both a primary agent and a subagent, and why
18. `npm pack --dry-run` lists every file the two commands need, and nothing of `tests/`
19. `CHANGELOG.md`, `process.md`, `roles/`, `templates/`, `container/`, `AGENTS.md` and `RELEASING.md` are
    unchanged, and so are this repository's own wrappers under `.claude/agents/` and `.opencode/agents/`

What the human added during the implementation:

20. `agentrite roles --json` prints one JSON document on standard output, ended by a line break, and exits 0. The
    document is an object with one key, `roles`: an array that holds, for each role the kit has and in the order
    the kit holds them, an object with the role's `name` and its `description`. The description is the one the
    wrappers hold, as one line. Without `--json` the command prints what requirement 1 says
21. In `agentrite run`, a `--` ends the command's own arguments. Every argument after it is given to the harness
    as it is written and in the order given, after the agent, the model and the permission flag that
    requirements 5 to 8 give, and before the prompt. The prompt is the last argument the harness gets. Claude
    Code in both modes, and OpenCode without a session, get a `--` of the command's own straight before it,
    whether or not the caller gave arguments; a session of OpenCode gets the prompt as the value of its
    `--prompt`. The command reads none of the caller's arguments: it does not look whether one repeats,
    contradicts or undoes an argument of its own. With no `--`, or with nothing after it, the harness gets
    nothing more
22. The role, the harness and the unit stand before the `--`. One that is missing there is named as requirement
    13 says, whatever follows the `--`
23. A word before the `--` that opens with a dash is read as an option of the command, and is refused as
    requirement 13 says when the command has no such option. The text of `--prompt` may hold any word. A text
    that itself opens with a dash is given as `--prompt=<text>`: after `--prompt` as an argument of its own,
    such a text counts as no text
24. The usage of `roles` holds `--json`, and the usage of `run` holds `--prompt`, the `--`, and that what follows
    the `--` is given to the harness as written, before the prompt

## Decisions

* **One command, `agentrite run`, and not one per harness. The planner's.** The human's example was a command per
  harness, "cc-agent" and "oc-agent". The harness is an argument instead: the kit already takes harnesses by name
  in `init` and `refresh`, a third harness is then a new entry and not a new command, and a script that picks the
  harness from its own configuration passes a word and does not pick a command
* **The role first, then the harness, then the unit. The planner's.** It reads as the request does: run the
  reviewer, in OpenCode, on 0007
* **`agentrite roles`, not `list-roles`. The planner's.** The human said "or something like that". The other
  commands are one word, and a noun that prints what it names needs no verb
* **The roles are listed with their descriptions, and nothing of the project. The planner's.** The description is
  what tells someone which role to run. The list is the kit's, so the command needs no project to run in
* **Interactive unless `--headless`. The human's choice, the flag's name the planner's.** A human at a terminal is
  the caller today, and a script says what it is
* **The role is the harness's agent. The human's.** The wrappers already are how a role reaches a harness, and a
  model pinned in one then stays what the project chose for that role. Weighed and not taken: a prompt that tells
  the harness's default agent to read the role file, which needs no wrapper and no change to one, and ignores the
  pin
* **The OpenCode wrappers become `mode: all`. The human's.** OpenCode takes only a primary agent on its command
  line, and a role is also dispatched as a subagent from a session, so it has to be both. The cost is that the
  roles are also offered among the primary agents in OpenCode's own interface. Every project gets the
  change with its next `refresh`
* **A wrapper that is not what `refresh` leaves stops the run. The planner's.** A project that updates the kit
  and does not run `refresh` keeps `mode: subagent`, and OpenCode then runs its default agent and says so in one
  line that is easy to miss: the review is made, by something that never read the reviewer's file. That failure
  is silent, so the command looks before it starts. It compares with what `refresh` would write, which is the
  one rule that holds for both harnesses and for whatever a later release changes in a wrapper, and it is what
  the README already says a wrapper is. It costs a project that added a key of its own to a wrapper a `refresh`
  that removes the key, which `refresh` is documented to do. Weighed and not taken: looking only for
  `mode: subagent`, which is a rule about one harness and one release
* **The model is the harness's own id. The planner's.** `claude-sonnet-5-5` and `openai/gpt-6.1-sol` are passed
  as written. A table of the kit's that maps a name to each harness's id is wrong after every model release, and
  the command would then refuse a model the harness has
* **No model is no model option. The planner's.** The harness then uses what the wrapper pins or its own default,
  and the kit does not read the pin to pass it again
* **`--skip-permissions`, one flag for both harnesses. The human's choice, the name the planner's.** The name
  says what it does and promises no more than both harnesses give. The usage and the README say that the two
  flags differ. The command does not look where it runs: the human chose a flag the caller gives over one the
  command adds inside the sandbox
* **The unit is resolved, and the prompt names its directory. The planner's.** Every role file takes the unit
  directory as its input, and a number is what a human and a branch name hold. The digits match only a name that
  opens with them, so a directory under an older naming is given by its name
* **The prompt is one sentence. The planner's.** The wrapper sends the agent to its role file, and the role file
  says what to do with a unit. Anything more in the prompt would say it twice
* **The command adds no argument of its own beyond those, and passes on what follows a `--`. The human's, in
  place of the planner's.** The planner had the command take nothing to pass on: a session id, an output format
  and a budget are what an orchestrator will ask for, and which of them was not known yet. The human, with the
  first implementation in hand: it is what resuming a session needs, and there is no reason not to. Passing on
  whatever is given also answers the planner's doubt, because the command then needs to know none of them
* **`--` is the marker, and the text loses it. The planner's.** It is what `npm run`, `docker run` and the
  sandbox's own wrapper use to hand arguments on, so it is what a caller tries first. The first implementation
  gave `--` another meaning, from this spec as it stood: it ended the options, so that text could hold a word
  that opens with a dash. A marker cannot mean both. Text with such a word is rare and has another way, which
  since the human's last change is the value of `--prompt`, and arguments for the harness have none. Weighed
  and not taken: an option of the command's own that is repeated for each argument, which reads badly and has
  to be told apart from the harness's options by eye
* **The prompt is the harness's last argument, behind a `--`, and the caller's arguments stand before it. The
  human's, in place of the planner's.** The planner had the caller's arguments after the prompt, because both
  harnesses have options that take several values, such as the tools Claude Code is allowed, and such an option
  before the prompt takes the prompt for one of its values. That is so: `claude --print --agent implementer
  --allowedTools Read <prompt>` ended with "Input must be provided either through stdin or as a prompt
  argument". The human wants the prompt last all the same, as a reader of a command line expects it. A `--` in
  front of the prompt gives both: it ends the harness's options, so none of them reaches the prompt. The
  command adds it in every run, so that there is one argument list per harness and mode and not two. A session
  of OpenCode needs none, since its prompt is the value of an option. The cost: a caller cannot hand the
  harness a bare word as a second prompt or a path, only options and their values. Nobody asked for that
* **The text is an option, `--prompt`, and not the words after the unit. The human's, in place of an earlier
  choice of the human's.** Asked while planning, the human chose a unit with optional text after it. With the
  `--` taken for the harness's arguments, text that held a word with a dash had to be quoted as one argument
  that opens with another word, which is a rule nobody guesses. As the value of an option the text is one
  argument that holds whatever it holds, and the command line reads as what it is: three positions, options,
  and the harness's arguments. The human wrote `--p`. It is `--prompt`: OpenCode names its own so, and `-p` is
  Claude Code's `--print`, which is what `--headless` gives it, so a short form would read as the opposite.
  The words of a text are no longer joined by the command, because a shell's quotes already make them one
  argument
* **What the second implementation does that this changes.** At `f136f75` the words after the unit are the text,
  and what follows the `--` goes to the harness after the prompt. The usages, the README and the tests hold
  that. The plan has tasks that change those tests first. `roles --json` is not touched
* **The command reads nothing of what it passes on. The planner's.** A caller that gives `--model` twice, once
  as the command's and once after the `--`, gets what the harness makes of that. A list of the harness's
  arguments that the command refuses would be a list the kit has to keep true for two harnesses and every
  release of each
* **The kit still has no session. The planner's.** The example in the README is a session resumed with the
  harness's own options. The command neither makes an id nor remembers one
* **The JSON is an object with a key `roles`, and not an array. The planner's.** A script reads it, so it is the
  kit's to keep from the day it ships. An object can get a second key later, the harnesses for one, and a
  script that reads `roles` goes on working. The description is one line, because the wrapping at 120 is for a
  reader
* **`--json` is an option of `roles`, and the listing without it stays as it is.** The human named it so, and a
  human who runs `agentrite roles` wants to read it
* **What the first implementation does that this changes.** At `1ff7e9f` a `--` ends the options and what
  follows it is text, `roles` refuses every argument, and the usage of both says so. Its tests hold that. The
  plan has tasks that change those tests first. Nothing else of the first implementation is touched by this
* **The command waits and hands the status on. The planner's.** A script reads the status, and a human gets the
  prompt back when the session ends
* **The release notes are the release's.** The change of the OpenCode wrappers is worth knowing when updating,
  and `AGENTS.md` says that a unit writes nothing in `CHANGELOG.md`
* **This repository's own wrappers stay as they are.** They are written by the released kit it depends on, and
  move with the release that holds this unit, by the step of `RELEASING.md` that runs `refresh`. Until then
  `agentrite run` in this repository refuses for OpenCode, by requirement 11, when it is run from the working
  copy

## Non-goals

* The orchestrator, and anything that decides what runs after what
* A verdict, a structured result, or a log of what the harness did
* A session of the kit's own: making an id, remembering one, or an option of the command that resumes. A caller
  passes the harness's own options after the `--`
* A check of what follows the `--`
* Returning to a human from a headless run
* Hooks on a harness's tool calls
* Starting the sandbox. The command starts a harness where it is run, on the host or in the sandbox, and
  `./agent.sh` is still what starts the sandbox
* A name of the kit's own for a model
* Running the planner for a unit that has no directory yet
* A check that `--skip-permissions` is given inside the sandbox only
* A harness besides the two the kit has

## Beyond the request

* **The planner for a unit that does not exist yet.** The planner's role file takes a request where there is no
  unit, and `run` takes a unit. It would cost a second form of the command, with no unit and the text as the
  request. Without it, a new unit is planned from a session started by hand, as today
* **A command that prints a unit's status, for a script.** The orchestrator will read it. It costs a format
  that is then the kit's to keep. Without it, a script reads the status from `record.md`. The listing of the
  roles that stood here with it is requirement 20 now
* **The pinned model per harness in `agentrite roles`.** It would show what a run without `--model` uses. It costs
  reading the project's wrappers in a command that otherwise needs no project. Without it, the wrapper says it
* **Refusing `--skip-permissions` outside the sandbox.** It costs a way to tell the sandbox from the host that
  the kit then has to keep true. Without it, someone who gives the flag on the host gets what its name says
