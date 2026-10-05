---
kind: feature
status: in-progress
timestamp: 2026-10-05T12:51:34Z
---

# 0032 Run a role in a harness

## Log

- 2026-10-05T12:51:34Z [human] in a session about an orchestrator that is to live in a repository of its own,
  said: "One thing we will definitely need (and is even useful for Agentrite without an orchestrator) are those
  wrappers to call Claude Code and OpenCode with a given role and model. I think we should also be able to see the
  available roles somewhow with "agentrite list-roles" or something like that. When running "agentrite run" it
  should also show how the run command can be used. Can you act as the @planner and help me plan this unit of
  work?"
- 2026-10-05T12:51:34Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session, found that
  OpenCode does not take the kit's wrappers on its command line: they are `mode: subagent`, and `opencode run
  --agent <role>` then falls back to its default agent. Asked the human four questions
- 2026-10-05T12:51:34Z [human] chose: interactive by default with a flag for a headless run; the wrappers carry
  the role, and the OpenCode wrappers become `mode: all`; one flag of the kit's for permissions, over passing the
  harness's flags through and over adding it inside the sandbox; a unit with optional text after it
- 2026-10-05T12:53:48Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md` and `plan.md`. The unit is a
  feature: it adds two commands and changes what the OpenCode wrappers hold. Its number is 0032, the one after
  0031, as every unit since 0002 was numbered beside the `history-` directories. Four things about the harnesses
  are not established and are in the spec; the plan has a run on the real harnesses for each. The status stays
  `draft`
- 2026-10-05T13:58:59Z [Claude Code, anthropic/claude-opus-5-5] on the human's word, reworded requirement 1 so that it
  no longer names the three roles and their order: `agentrite roles` prints each role the kit has, in the order the
  kit holds them. The plan's test of the listing and two sentences that said "the three roles" follow. The reason is
  0033, a draft on its own branch, which adds a fourth role: this unit is built first, and its spec is frozen by then.
  Nothing else changed, and the status stays `draft`
- 2026-10-05T14:02:07Z [human] said, in a new session of Claude Code on the host: "Act as the @implementer and
  implement feature 0032"
- 2026-10-05T14:02:07Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main session, in
  the main checkout on the host, on the branch `feature-0032-run-a-role` at `c1c83f2`. The status was `draft`, and
  no entry says `approved`. The human's instruction above is taken as the approval of `spec.md` and `plan.md` as
  they stand at `c1c83f2`: that is the implementer's reading, and the human did not say the word. The spec says of
  itself that everything beyond the four choices had not been read by the human, and the plan gives the usage of
  `run` "for the human to read and correct before approving"; whether either was read since is not known here. Read
  `process.md` and `roles/implementer.md` of the release 3.0.0 in `node_modules`, the README, and this unit's spec,
  plan and record whole. `npm test` on `c1c83f2` before any change: 286 tests, 286 passed. Claude Code 2.1.289 and
  OpenCode 1.18.34 are on the host. Status `in-progress`
- 2026-10-05T14:18:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did the plan's tasks in order, on
  the host, on Linux, in a session with no terminal of its own.
  * The wrappers, `92c55d6`. The tests first: with `mode: all` expected and `mode: subagent` written, `npm test`
    reported 287 tests, 2 failed, the two new expectations. With `mode: all` written, 287 passed. The Claude Code
    fixture test passed unchanged
  * The refactoring, `56e38fb`. `npm test` reported the same 287 passed, with no test changed. It is not what the
    plan's task says in one respect: the task has a command take "the project root and the arguments after the
    command's name", and also has the suite pass as it is. The two do not go together, because
    `tests/agentrite-init.test.mjs` asserts that the exported `parseArgs` returns the harnesses. So a command is a
    pair, `parse` and `run`: `parse` reads the arguments after the command's name, and `run` takes the project
    root and what `parse` returned. The parsing of the harnesses did move to `init` and `refresh`, as their `parse`
  * The roles, `d1ab6d0`. The tests first, which failed on the missing module. The usage of every command is now
    built from a line each command holds, and the test of it in `tests/agentrite-init.test.mjs` got its third line
    here and its fourth in the next commit, and a name that no longer says "both commands"
  * `run`, `63e5bfc`. The tests of what it computes first, which failed on the missing exports, then the
    functions; then the tests of the command, 15 failed of 324, then the command. `npm test` on `63e5bfc`: 324
    tests, 324 passed
  * The README, `8a96f29`. Two things are not as the plan's task says. `roles` and `run` are named in a sentence
    under the table of "What is here" and not in the row of `scripts/`: the row is 116 characters wide, a table
    row cannot wrap, and the two names do not fit in the four characters left without rewording what the row
    says, which the same task forbids. And the sentence that lists what a project receives now holds
    `scripts/agentrite-run.mjs`: it would have been false without it, so a task for it was added to the plan
  * `git diff master --stat` at `8a96f29` names `README.md`, `package.json`, the three scripts, the four test
    files and this unit's documents, and no file requirement 19 names. `git status --short` shows the human's
    untracked tarball and nothing else, so this repository's own wrappers are as they were
- 2026-10-05T14:18:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, what the spec and the plan left
  open and how it was built. None of it is in the spec, so each is the implementer's and the human may want
  another:
  * The lines that name what `run` does not take: `unknown role: <word>`, `unknown harness: <word>`,
    `unknown option: <option>`, `no role given`, `no harness given`, `no unit given`,
    `--model takes an id, and none was given` and `<option> takes no value`. Only the first one found is named,
    the options before the positions
  * `--model` counts as having no id when nothing follows it, when `--model=` is empty, and when what follows it
    apart opens with a dash, as in `--model --headless`. `--model=-x` passes `-x`
  * Only a directory of `changes/` is a unit: a file or a symbolic link there is not, and does not make digits
    name two. The digits match a name that opens with them and a dash. Of what is given, one `changes/` at the
    front and one slash at the end are taken off, and nothing else, so `./changes/0007-x` names nothing
  * A unit that is not found exits 1 after `agentrite: changes/ holds no directory for the unit <as given>`, and
    so does a project with no `changes/`
  * The unit is resolved before the wrapper is looked at. Only the wrapper of the role and the harness that are
    run is looked at
  * A harness that a signal ended gives the status 1
  * That the harness's command is not on the `PATH` is read from the start failing with `ENOENT`, not from a
    search of the `PATH`. Not checked: a command that is on the `PATH` and whose interpreter is missing fails the
    same way, and would be reported with the same line
  * The listing and the usage wrap at 120 through a constant of `scripts/agentrite-run.mjs` of its own, beside the
    one `scripts/agentrite-roles.mjs` holds for the wrappers
- 2026-10-05T14:18:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the plan's runs on the real
  harnesses, Claude Code 2.1.289 and OpenCode 1.18.34, on the host. The project: `npm pack` of the working copy at
  `8a96f29`, installed from the tarball in a new directory with a `package.json` and a `git init`, then
  `npx agentrite init claude opencode`, and one unit made by hand, `changes/0001-say-hello/`, a task with a
  record. Every run gave text after the unit that told the agent to change nothing and to answer with the first
  heading of the file its instructions sent it to, so no run did a role's work on the unit.
  * `run reviewer opencode 0001 --headless`: exit 0. OpenCode printed `> reviewer · gpt-6.1-sol` and
    `Read node_modules/@ritenoar/agentrite/roles/reviewer.md`, and no line about falling back. The answer was the
    path of the reviewer's role file and `# Reviewer`
  * `run implementer claude 0001 --headless`: exit 0, nothing on standard error. The answer was the path of the
    implementer's role file, `# Implementer` and, asked for it, the model `claude-opus-5-5`
  * The roles as subagents in OpenCode. `opencode agent list` in the project gives `implementer (all)`,
    `planner (all)` and `reviewer (all)`. `opencode run`, as its default agent `build`, asked which subagents its
    task tool offers, named `explore`, `general`, `implementer`, `planner` and `reviewer`, and dispatched
    `reviewer`, which answered with its role file's path and heading. This was a run without a session, not
    OpenCode's interface: what the interface lists was not looked at
  * A pinned model, without `--model`. OpenCode with `model: openai/gpt-6-luna` in the reviewer's wrapper printed
    `> reviewer · gpt-6-luna`. Claude Code with `model: claude-haiku-4-5-20251001` in the implementer's wrapper:
    the transcript it wrote for the run names `claude-haiku-4-5-20251001` in every message, where the run before
    the pin named `claude-opus-5-5`. So in both the pin is what a run without `--model` used, as the README
    expects. `refresh` reported both pinned wrappers as up to date, and `run` did not refuse them
  * With `--model`, over the same pins. OpenCode with `--model openai/gpt-6-sol` printed `> reviewer · gpt-6-sol`,
    and Claude Code with `--model claude-sonnet-5-5` wrote a transcript that names `claude-sonnet-5-5`. So the
    option wins over the pin in both
  * A first pin in OpenCode, `openai/gpt-5.4-mini`, was a model the human's account does not have: OpenCode printed
    `> reviewer · gpt-5.4-mini` and then `Error: Bad Request`, with the provider's reason. The exit status of that
    run was not captured
  * The sessions. This session has no terminal, so each ran on a pseudo-terminal that a script of the
    implementer's made, typed into and read, of 40 lines by 120 columns. No human saw a screen, and "the terminal
    is as it was" means here that the terminal's settings, read before the command started and after it ended,
    were equal.
    * OpenCode: the session opened showing the prompt, as `Reviewer · GPT-6 Luna`, read the role file and
      answered. Left with `/exit`: the command ended with status 0, the settings were as before, and no process
      of the run was left
    * Claude Code: the same, as `@reviewer` on Opus 5.5, left with `/exit`, status 0, settings as before, no
      process left. Before that, in the new directory, Claude Code asked whether the folder is trusted, with
      "No, exit" selected: Enter alone ended it with status 1 before any prompt was read, which `run` handed on.
      The run that worked chose "Yes, I trust this folder" first. The headless runs before it had asked nothing
  * An interrupt, as Ctrl-C typed on that pseudo-terminal while the agent was reading files:
    * `--headless`, both harnesses: the command ended at once, by the signal itself, not with a status. A shell
      shows that as 130. No process of the run was left a few seconds later. OpenCode printed nothing further and
      Claude Code printed `Execution error`
    * An OpenCode session: one Ctrl-C ended the session and the command, with status 0 and the settings as before
    * A Claude Code session: one Ctrl-C did not end it. A second showed "Press Ctrl-C again to exit", and a third
      within a second ended the session and the command, with status 0 and the settings as before. Three seconds
      apart, the same line showed twice and the session stayed
  * In this repository, `node scripts/agentrite.mjs run reviewer opencode 0032 --headless` refuses, naming
    `.opencode/agents/reviewer.md` and `npx agentrite refresh opencode`, as the spec's last decision says it
    would until the release
- 2026-10-05T14:18:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, concerns for the human. None is
  worked around, and none was taken to show a requirement or the README wrong:
  * The approval is the implementer's reading of the instruction to implement, as the entry of 14:02:07Z says
  * Requirement 10 and an interrupt. When Ctrl-C reaches a headless run, the command does not exit with a status:
    the signal ends it too, since the terminal sends it to the command and the harness alike and the command
    waits without handling it. A caller sees a failure either way
  * A signal sent to the command alone, not typed on its terminal, leaves the harness running. Tried with a fake
    `claude` that sleeps, not with a real harness: after `kill -TERM` of the `agentrite` process the command ended
    with 143 and the fake was still there. An orchestrator that stops a run by its process id would leave the
    harness behind. The spec asks for nothing here
  * In a directory Claude Code was never trusted in, a session opens on its question about trust, as above. A
    unit run of the sandbox works in a new clone. Whether Claude Code asks there was not tried
  * What Claude Code does with `--agent` and a name it has no agent for, which the spec lists as not established,
    was not run: the plan has no run for it, and `run` refuses before it gets there
  * Not tried: any run inside the sandbox, `--skip-permissions` on a real harness, the planner, macOS, and a
    session on a terminal a human sat at
