---
kind: feature
status: implemented
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
- 2026-10-05T14:19:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on the committed
  branch at `9401b9f`: `npm test` reported 324 tests, 324 passed, and `npm run check-changes` exited 0 and printed
  nothing of its own. `npm pack --dry-run` lists `scripts/agentrite-run.mjs` among 26 files and no file of
  `tests/`. No line of a file that differs from `master` is over 120 characters, and none holds an em dash, by a
  search of each. One correction to the entry above on an interrupt of a headless run: what was seen to end by
  the signal is `npx agentrite`, the process the pseudo-terminal started, and why it ends so was reasoned and not
  shown. Every task and every check of the plan is ticked, the sessions and the interrupts among them on a
  pseudo-terminal and not a human's, as said above. Status left at `in-progress`: the review is done elsewhere,
  and closing the unit is the human's
- 2026-10-05T15:17:09Z [human] with the first implementation committed up to `1ff7e9f`, said: "During implementation I
  realised I might want the "passing further arguments" in the beyond the request of 0032 after all. This is really
  useful for the --resume use-case and I don't see a reason to NOT support this. Besides that, the --json for the
  roles seems like a useful thing to have as well. Could you act as the @planner and add these in the spec after all.
  Take into account that a first version of the implementation has already been made. So check the record.md!"
- 2026-10-05T15:17:09Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session, read this record
  whole and the first implementation's `scripts/agentrite-run.mjs`, its tests and its section of the README, and
  changed `spec.md` and `plan.md`. The spec: requirements 20 to 24 are new, and requirements 1, 2, 9, 12, 14 and 17
  changed with them; none was renumbered. A `--` in `run` now ends the command's own arguments, and what follows it
  goes to the harness as written, after the prompt. `roles --json` prints an object with a key `roles`. Both left
  "Beyond the request", where a command for a unit's status stays. The decision that the command takes nothing to pass
  on is replaced, and names the human. What the implementation at `1ff7e9f` does that this changes: its `--` ends the
  options and what follows is text, `roles` refuses every argument, and the usages and the README say so. The plan has
  ten new tasks, unticked, the changed tests first, three of them runs on the real harnesses, and five commit points.
  Two things are new under "Not established": that the harnesses read their options after the prompt, and that a
  session is resumed with the options the README is to show. The planner ran neither. The status stays `in-progress`.
  The implementer's concern of 14:18:03Z about the approval is not answered by this entry
- 2026-10-05T15:21:47Z [human] said, in the implementer's session: "Ive had the planner amend this change with two of
  the "beyuond the request" items anyway. Can you check in the record what has been added exactly and implement it
  on top of what you already implemented as the @implementer ?"
- 2026-10-05T15:21:47Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the same session as before, in
  the main checkout on the host. Read the planner's entry of 15:17:09Z and the whole difference of `spec.md` and
  `plan.md` against `1ff7e9f`: requirements 20 to 24, the changed 1, 2, 9, 12, 14 and 17, and the ten tasks. The
  human's instruction is taken as the approval of the two documents as changed, which is again the implementer's
  reading. Did the tasks:
  * `43fdd1a` holds the three documents as the planner left them, uncommitted until then
  * The `--`, `e34e485`. The tests first: 16 of the 43 tests of `tests/agentrite-run.test.mjs` failed, then
    `parseRunArgs`, `harnessCommand`, the form and the usage. The tests of the command for it were added after,
    as the plan has it, and passed as written. `npm test`: 332 tests, 332 passed. The first `--` among the
    arguments is where they are divided, found before `parseArgs` reads the rest, so `--model --` is a `--model`
    with no id. A `--` after the first one is the harness's, like any word there. `run --` and
    `run -- <anything>` name the missing role and do not print the usage alone
  * The two tests of the usage of every command got the second line of `run` in this commit, not in the next as
    the plan has it, since they fail without it
  * `roles --json`, `407c4ad`. The tests first, which failed on the missing export. `npm test`: 336 tests, 336
    passed. `--json` given twice is refused with the usage, like any other second argument
  * The runs on the real harnesses were made before the README was written, not after as the plan orders them:
    the task of the README asks for "the commands the runs below showed to work"
  * The README, `dfd2c3f`. The two sentences the plan names are replaced, and the rest of "Running a role" is as
    it was. The session ids in its examples are examples
  * The plan held the heading "## Verification" twice in a row, which the planner's change left. One is removed
- 2026-10-05T15:21:47Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the plan's three runs on the
  real harnesses, Claude Code 2.1.289 and OpenCode 1.18.34, on the host, in the project of the first runs with the
  working copy at `407c4ad` packed and installed again. Its wrappers still held the pins of the first runs, which
  `refresh` reported as up to date. All were headless, and every text told the agent to change no file.
  * Claude Code. `run implementer claude 0001 --headless <remember the word marzipan> -- --session-id <a new
    uuid>` answered `noted`, exit 0. `run implementer claude 0001 --headless <the word, and the first heading of
    your instructions' file> -- --resume <that uuid>` answered `marzipan` and `Implementer`, exit 0. Claude
    Code's transcript of that id is one file, names the agent `implementer` four times and the pinned model in
    every message. So the session was resumed, as the role, with the options after the prompt
  * OpenCode. `run reviewer opencode 0001 --headless <remember the word pistachio>` answered `noted`, exit 0.
    `opencode session list` then had a new session first, and `run reviewer opencode 0001 --headless <the word
    and the heading> -- --session <its id>` printed `> reviewer · gpt-6-luna` and answered `pistachio` and
    `# Reviewer`, exit 0. The list had no further session afterwards. So the session was resumed, as the role
  * `run implementer claude 0001 --headless <the heading> -- --allowedTools Read` answered `# Implementer`, exit
    0. So the prompt was not taken for a value of the option
  * Not tried: any of this in a session with a terminal, `--continue` of either harness, an option of OpenCode
    that takes several values, an argument after the `--` that contradicts one of the command's, and resuming
    the sessions that the interrupts of the first runs left
- 2026-10-05T15:22:21Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on the committed
  branch at `c0717aa`: `npm test` reported 336 tests, 336 passed, and `npm run check-changes` exited 0. No line of
  a file that differs from `master` is over 120 characters, and none holds an em dash, by a search of each.
  `npm pack --dry-run` lists no file of `tests/`. `git diff master --stat` names the same twelve files as before
  the human's additions, so requirement 19 holds as it did. Every task and every check of the plan is ticked.
  The concerns of 14:18:03Z stand as they were, the one about a signal sent to the command alone among them.
  Status left at `in-progress`: the review is done elsewhere, and closing the unit is the human's
- 2026-10-05T15:37:33Z [human] in the implementer's session, with the additions implemented up to `f136f75`, asked:
  "Doesn't it make more sense to NOT have the -- arguments AFTER the prompt? The prompt should be the last part
  IMO. I think we can assume anything AFTER the arguments that does NOT start with a dash, is the start of the
  prompt?"; then, told that the value of an option such as `--resume` opens with no dash either: "What about
  making the prompt an argument itself? --p "some prompt" ?"; then, on the proposal below: "go ahead and act as the
  planner to make that change. Then implement it."
- 2026-10-05T15:37:33Z [Claude Code, anthropic/claude-opus-5-5] in the same session, as the implementer answering, ran
  five things by hand in the project of the earlier runs, each once, with Claude Code 2.1.289 and OpenCode 1.18.34:
  * `claude --print --agent implementer --allowedTools Read <prompt>` ended with status 1 and "Input must be
    provided either through stdin or as a prompt argument when using --print": the option took the prompt
  * `claude --print --agent implementer --resume <id> <prompt>` answered the prompt
  * `claude --print --agent implementer --allowedTools Read -- <prompt>` answered the prompt
  * `opencode run --agent reviewer -- <prompt>` answered the prompt, as `reviewer`
  * `claude --agent reviewer --allowedTools Read -- <prompt>`, a session on a pseudo-terminal, showed the prompt
    and answered it
  and proposed: the text as `--prompt`, and the harness's prompt last behind a `--`
- 2026-10-05T15:37:33Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the same session, having read
  `roles/planner.md`, changed `spec.md` and `plan.md`. The spec: requirements 2, 5, 12, 13, 17, 21, 23 and 24
  changed, and none was renumbered or added. The text is the value of `--prompt`, given as written, and a word
  beyond the unit is refused. The harness gets the caller's arguments before the prompt and the prompt last, behind
  a `--` that the command adds in every run of Claude Code and of `opencode run`. Two decisions are replaced and
  name the human, and one says what the implementation at `f136f75` does that this changes. Decided by the
  planner and not asked: the name `--prompt` where the human wrote `--p`, that the last of two counts, that a
  text opening with a dash is given as `--prompt=<text>`, and that the `--` is added also when the caller gave
  no arguments. The plan has nine new tasks, unticked, four of them runs on the real harnesses, and four commit
  points. The status stays `in-progress`: the human asked for the change and its implementation in one sentence,
  and has not read these documents
- 2026-10-05T15:50:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the same session, in the main
  checkout on the host, having read the documents as the planner's entry above left them at `83498a6`. The
  human's "Then implement it" is taken as the approval of them, unread, as that entry says. Did the tasks:
  * The tests first: 21 of the 50 tests of `tests/agentrite-run.test.mjs` failed. Then the script, and the tests
    of the command, of which 7 failed until they were changed. `9185839`: `npm test` reported 337 tests, 337
    passed
  * The implementer's, where the spec names no words: `unexpected argument: <word>` for a word beyond the unit,
    naming the first one only, and `--prompt takes a text, and none was given`. `--prompt ""` and `--prompt=`
    count as no text, as `--model` does with an id. A text that opens with a space and then a dash is taken
  * The README, `cf162b6`. The paragraph on text that holds a word with a dash is gone, as the plan says, and
    its example with it. One sentence is there that the plan does not ask for, on a resumed session of OpenCode,
    for what the runs below showed
  * The runs were again made before the README was written
- 2026-10-05T15:50:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the plan's four runs on the
  real harnesses, Claude Code 2.1.289 and OpenCode 1.18.34, on the host, in the project of the earlier runs with
  the working copy at `9185839` packed and installed again, the wrappers still pinned as before.
  * Claude Code, headless. `run implementer claude 0001 --headless --prompt <remember the word nougat> --
    --session-id <a new uuid>` answered `noted`, exit 0. The same with `--prompt <the word, and the heading of
    your instructions' file> -- --resume <that uuid>` answered `nougat`, exit 0, and declined the heading
    because the first text had told it to read no file, which was the text's doing. That it ran as the role is
    read from its transcript of that id, which names the agent `implementer`
  * OpenCode, headless. The first run, told to change and read no file and to remember the word praline, did the
    reviewer's work all the same: it read the role files and the unit, ran git, wrote under `.reviews/` and
    added a line to the unit's record in the trial project, and then answered `noted`, exit 0. The second,
    with `-- --session <the id from opencode session list>`, printed `> reviewer · gpt-6-luna` and answered
    `praline`, exit 0, in the same session
  * `run implementer claude 0001 --headless --prompt <the heading> -- --allowedTools Read` answered
    `# Implementer`, exit 0
  * A session of Claude Code on a pseudo-terminal, `run reviewer claude 0001 --prompt <text> -- --allowedTools
    Read`: it showed the unit and the text and answered. Left with `/exit`, status 0, settings as before
  * A session of OpenCode on a pseudo-terminal, `run reviewer opencode 0001 --prompt <text> -- --model
    openai/gpt-6-sol`: it showed the unit and the text, as `Reviewer · GPT-6 Sol`, so the argument was taken,
    over the pin. In the minute it was given the agent read the role files and the unit and had not answered. It
    was left with `/exit`, status 0, settings as before. So for OpenCode "the agent answers" was not seen
  * Found beside the plan: a session of OpenCode with `-- --session <id>` opened on what was said before, and
    in two minutes neither showed nor sent the new prompt. `opencode --agent reviewer --prompt <text> --session
    <id>`, by hand, with the prompt before the option, did the same in eighty seconds. So that is OpenCode's
    with a session resumed in its interface, whatever the order, and not what requirement 21 changed. The
    README says so. A new session by hand with `--model <id>` before `--prompt` showed the prompt and answered
  * Not tried: `--skip-permissions` on a real harness, `--continue` of either, a session of Claude Code
    resumed with a prompt, and a bare word after the `--`, which the harness would now get before its prompt
- 2026-10-05T15:50:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on the committed
  branch at `870d901`: `npm test` reported 337 tests, 337 passed, and `npm run check-changes` exited 0. No line of
  a file that differs from `master` is over 120 characters, and none holds an em dash, by a search of each.
  `npm pack --dry-run` lists no file of `tests/`, and `git diff master --stat` names the same twelve files as
  before. Every task and every check of the plan is ticked, the session of OpenCode among them with what the
  entry above says was not seen. The concerns of 14:18:03Z stand. Status left at `in-progress`: the human has
  not read the documents of the last two changes, the review is done elsewhere, and closing the unit is the
  human's
- 2026-10-05T16:36:34Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, full review of
  `changes/0032-run-a-role/` at `22ae325d8d4ad51801e4570201a36f8c557c6f80`, against merge base
  `9f03a06848407346e1ac878cb49d9d632befe0d5`. Returned P1 and C1, both non-blocking, saved in
  `.reviews/0032-run-a-role/2026-10-05T163426Z-opencode-openai-gpt-6.1-sol-full.md`. Independently ran `npm test`
  (337 passed), `npm run check-changes` (exit 0), `npm pack --dry-run` and `git diff --check master...HEAD`;
  reproduced the launcher-only SIGTERM concern with an in-memory substitute harness. Historical real-harness
  and pseudo-terminal trials were not independently verified; the final OpenCode interactive answer was not
  observed in the recorded trial. No finding outcome or status transition recorded
- 2026-10-05T16:41:35Z [human] said, in the implementer's session: "The review came back with some remarks; can you
  check them and handle them?"
- 2026-10-05T16:41:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, read the review of 16:34:26Z in
  `.reviews/0032-run-a-role/` whole. It returns P1 and C1, neither blocking, and no finding on the spec.
  * P1, the session of OpenCode ticked without its answer: accepted and applied. The task was unticked, and the
    session run again through the command, on a pseudo-terminal, in the project of the earlier runs, whose
    installed `scripts/agentrite.mjs` and `scripts/agentrite-run.mjs` were compared with the branch's and are
    the same: `run reviewer opencode 0001 --prompt <answer at once with the product of thirty-seven and
    forty-one> -- --model openai/gpt-6-sol`. The session showed the unit and the text, and after twelve seconds
    `Reviewer · GPT-6 Sol` answered `1517`, which stands nowhere in the prompt. Left with `/exit`: status 0,
    the terminal's settings as before, no process left. The task is ticked again. The entry of 15:50:24Z said
    that every task was ticked while this one lacked its answer, which the reviewer is right to call too much
  * C1, a signal to the command alone leaves the harness running: the fact is the one the entry of 14:18:03Z
    recorded, and the reviewer reproduced it. Nothing is changed for it. Stopping the harness when the command is
    stopped is behavior the spec does not have, in requirement 10 or elsewhere, so it is not the implementer's
    to add: it waits for the human. The implementer's proposal, written into no file: take it into this unit,
    since a caller that stops a run by its process id is what the unit was asked for, by a requirement that the
    command passes a signal it receives on to the harness and still exits as requirement 10 says. The other
    choice is to leave it as a known limit, which a caller gets around by signalling the command's process group
- 2026-10-05T16:45:28Z [human] asked by the implementer how C1 is to be handled, with three choices, to fix it in this
  unit, to leave it as a known limit, or to plan a unit for it later, chose: "Leave as known limit"
- 2026-10-05T16:45:28Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied the decision. C1 is decided
  by the human as a known limit: the command passes no signal on, and no code changes. The README says so under
  "Running a role", with what a caller does instead, and the plan has a task for that sentence, ticked. What the
  README says was tried with a fake `claude` that sleeps, not with a real harness: started with `setsid`, the
  command and the fake were in one process group, and `kill -TERM` of that group ended the command with 143 and
  left no fake. That a real harness ends on a `TERM` is not checked, nor what it does with its session then
- 2026-10-05T16:45:36Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on the committed
  branch at `a69b344`: `npm test` reported 337 tests, 337 passed, and `npm run check-changes` exited 0. No line
  of the README or of this unit's documents is over 120 characters, and the README holds no em dash. No box of
  the plan is open. Both findings of the review have their outcome: P1 applied, C1 decided by the human. Status
  left at `in-progress`: setting `implemented` is the human's word
- 2026-10-05T16:51:27Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, delta review of
  `changes/0032-run-a-role/` at `bcd0809a4c1252e69e6862d2d767e8cc8acfdc1c`, compared with the previous reviewed
  commit `22ae325d8d4ad51801e4570201a36f8c557c6f80`. Returned no new findings on any of the three axes; saved in
  `.reviews/0032-run-a-role/2026-10-05T165017Z-opencode-openai-gpt-6.1-sol-delta.md`. Independently ran `npm test`
  (337 passed), `npm run check-changes` (exit 0) and `git diff --check 22ae325..HEAD`, and verified the new
  process-group signal guidance with an in-memory substitute harness. The historical OpenCode smoke-test
  rerun and its terminal observations were not independently verified, nor real-harness signal handling
- 2026-10-05T16:53:37Z [human] after the delta review, said: "Review is okay now. You can mark this as implemented and
  make sure everything is commited on the branch."
- 2026-10-05T16:53:37Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's word, closed the
  unit. The full review returned P1 and C1, neither blocking: P1 was applied, and the human decided C1 as a
  known limit. The delta review returned no finding. No box in `plan.md` is open, counted with `grep`. On
  `39e9339`, the commit that holds the reviewer's entry, `npm test` reported 337 tests, 337 passed, and
  `npm run check-changes` exited 0; this commit changes this record only, and the change check was run on it once
  more. Not tried by anyone, as the entries above say: any run inside the sandbox, `--skip-permissions` on a real
  harness, the planner, macOS, a session on a terminal a human sat at, and a signal to a real harness. Open from
  the entry of 14:18:03Z and answered nowhere: whether Claude Code asks its question about trust in a unit run's
  new clone. Not merged into `master` and not pushed: both are the human's. Status `implemented`
