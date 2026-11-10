# 0103 The kit's code on the host and what a unit run brings back

## Approach

The work falls in four parts, each built test first: how `agentrite orchestrate` writes under `.orchestrator`, the
record of runs and what a resume takes, how sessions and the model reach a harness, and how the wrapper compares a
clone with the branch. The documents follow, and the rule in `AGENTS.md` closes it.

**Writing under `.orchestrator`.** One function makes the place a run writes in, before anything is written in a run
and before anything is read in a resume: it refuses a link at `.orchestrator`, `.orchestrator/.gitignore` and
`.orchestrator/<unit-directory>`, and an entry of the wrong kind at each, then makes the two directories that are
missing, each without `recursive`, and writes `.gitignore` whole when it does not hold exactly `*\n`. Every file of a
run is then created by one helper that opens it with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW`. When the open finds
an entry at the name, the helper removes that entry with `rmSync(path, { recursive: true, force: true })`, which
removes a link and never what it names, and opens once more; a second failure is thrown. `writeWhole` creates its
temporary file by that helper, writes it through the descriptor, closes it and renames it onto the name. A rename
that fails because a directory stands at the name removes that entry and renames once more. The followed file of a
step is created by the same helper when the step starts, and its lines are written through the descriptor at the
offset the file has reached, with `ftruncateSync` for the cut back, so the file is never opened again by its path.
The descriptor is closed when the step ends.

Before every write, a heartbeat and a followed line among them, a check compares `realpathSync` of the run's
directory with `join(realpathSync(root), '.orchestrator', <unit-directory>, <run>)`. The project root alone is
resolved on the expected side, so a link anywhere below it fails the check. When the check fails, the command makes
no write, sends `SIGTERM` to the process group of the step that runs, and ends with `1` and a line that names the
run's directory as the command means it and the directory it resolved to. A check that fails inside the heartbeat or
inside a followed line, whose failures are otherwise dropped, is kept as the run's error: the step is ended, the next
write throws it, and the command exits `1` with it.

**The record of runs and the resume.** A new module, `scripts/agentrite-run-records.mjs`, holds what the record is,
as pure functions: the directory, `<state>/agentrite/.orchestrator-runs/`, from the environment and the home
directory it is given; the file's name, the SHA-256 in hexadecimal of the run's resolved directory, and `.json`; the
record's text, `{"definition": <digest>, "state": <digest>}` as JSON with a line break; the digest of a `Buffer`; and
the judgement of a record against the two buffers a resume read, which gives the refusal or nothing. The command
writes the record with `writeWhole` each time it writes `state.json`, after `mkdirSync(directory, { recursive: true
})`. The digest of `definition.json` is taken of `Buffer.from(text)`, and that of `state.json` of the buffer of the
string `writeState` writes, in the same call that writes it.

A resume reads `state.json` and `definition.json` once each, as buffers, by a read that opens with `O_RDONLY |
O_NOFOLLOW`, judges both buffers against the record before anything of them is parsed, and then decodes and parses
the same buffers. The `heartbeat` is read by the same read, and a link there reads as no heartbeat. The resume parses
the definition with the project's roles and harnesses, through a parameter `parseRun` gains for them, which `runs`
does not pass. It then refuses a session of the run's `state.json` that does not match the pattern.

**Sessions and the model.** The pattern, `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`, is one constant with one function that
tests it, in `scripts/agentrite-orchestrate.mjs`, beside the sessions it judges. The ids the three harnesses give were
checked against it on the planner's host: Claude Code's are UUIDs the kit itself makes, as
`5faf91c6-bb1c-420a-9a99-a3ddf7e6741b`, OpenCode's are as `ses_fe651eea9ffetznsUtnsTg1uyn`, and Codex's thread ids are
UUIDs, as `01a1bb93-215e-74f0-b069-911b68314f9a`. All three match. A session a step gives that does not match is
not kept in `sessions`, and the command says so on standard error. `harnessCommand` passes the model as one word,
`--model=<model>`. Claude Code 2.1.321, OpenCode 1.19.3 and Codex 0.167.0 each take `--model=<value>` as the value of
`--model`; Codex, whose parser refuses an option it does not know, takes it in `exec`.

**Comparing a clone.** `clone_changed_files` of `container/unit-clone.sh` no longer asks `ls-files --modified
--deleted`, which hashes the clone's files through the conversions their attributes select. It lists the commit with
`git ls-tree -r -z --full-tree`, and for each entry:

* a path with a component above it that is a link in the clone, by bash's own `[ -L ]`, is missing from the clone
* a blob of mode `100644` or `100755` is listed when the clone has no regular file at its path, by `[ -L ]` and
  `[ -f ]`, and otherwise when `git hash-object --no-filters` of the file gives another id. The paths go to one
  `git hash-object --no-filters --stdin-paths`, except a path that holds a line break or opens with `"`, which that
  form would split or unquote, and which is hashed by a call of its own. Unless `git config --type=bool
  core.fileMode` of the host's git directory gives `false`, such a file is listed too when bash's `[ -x ]` of it says
  it is executable and the entry's mode is `100644`, or says it is not and the mode is `100755`
* a blob of mode `120000` is listed when the clone has no link at its path, and otherwise when the id of the link
  differs. That id is read from a scratch index by `git update-index --add --info-only`, which takes a link's target
  as its content, runs no filter for a link, and writes no object. `hash-object` is not used for a link, since it
  reads the file the link names
* a gitlink, mode `160000`, is listed when the clone has no directory at its path

The files of the clone that are not in the commit come, as today, from `git ls-files --others --exclude-standard -z`
against a scratch index read from the commit, which reads no file's content. Every git call of the comparison keeps
the host's git directory, so that ignored files are read as `--exclude-standard` reads them today, and keeps
`core.fsmonitor=false`. The scratch directory is made with `mktemp -d` and removed with `rm -rf` as today; neither
reads a file of the clone, and no program but git reads one. `core.fileMode` is read once, before the entries.

## Files

- `scripts/agentrite.mjs`: the check of the three paths and the making of `.orchestrator` and the unit's directory,
  the creating helper, `writeWhole` and `followedFile` on it, the check of the run's directory before each write, the
  run's error kept from the heartbeat and the followed lines, the record written with `state.json`, the no-follow
  reads and the record's judgement in `prepareResume`, the resume's definition read with the project's names, the
  refusal of a session in `state.json`, and a session not kept in `ended`
- `scripts/agentrite-run-records.mjs`: new. Where the record is, its name, its text, the digest and the judgement
- `scripts/agentrite-orchestrate.mjs`: the session pattern and its test
- `scripts/agentrite-runs.mjs`: `parseRun` takes the project's roles and harnesses when it is given them
- `scripts/agentrite-run.mjs`: `harnessCommand` passes `--model=<model>`
- `container/unit-clone.sh`: `clone_changed_files` as the approach says
- `package.json`: `scripts/agentrite-run-records.mjs` in `files`
- `tests/agentrite-run-records.test.mjs`: new. The pure functions of the record
- `tests/agentrite-orchestrate.test.mjs`: the tests of writing, of the run's directory, of the record and the resume,
  and of sessions. `project` gives the command an `XDG_STATE_HOME` of its own, and `writeRun` writes the run's
  record with its files
- `tests/agentrite-run.test.mjs`: the rows of each harness with `--model=<model>`
- `tests/sandbox-unit-run.test.mjs`: the clone with a filter, and the cases of requirement 14
- `AGENTS.md`: the rule
- `SANDBOX.md`: "What the sandbox defends against", "The home volume" and an entry of "When something goes wrong"
- `ORCHESTRATOR.md`: the record of runs, in "What .orchestrator holds" and "On the host and in the sandbox"
- `COMMANDS.md`: the refusals and `XDG_STATE_HOME` in "agentrite orchestrate", `--model=<id>` in "agentrite run"
- `README.md`: no change. `scripts/` in "What is here" names no module by itself

## Tasks

Writing under `.orchestrator`:

- [x] In `tests/agentrite-orchestrate.test.mjs`, add a test that a run and a resume each exit `1`, print on standard
  error the path, that it is not what the command makes there and to remove it, start no harness and leave
  `.orchestrator` as it was, for a link at `.orchestrator`, at `.orchestrator/.gitignore` and at
  `.orchestrator/<unit-directory>`, for a file at `.orchestrator` and at `.orchestrator/<unit-directory>`, and for a
  directory at `.orchestrator/.gitignore`. A link's target is a directory or file outside the project, and the test
  asserts that it is unchanged (R3, R16)
- [x] In `scripts/agentrite.mjs`, add `checkOrchestratorPaths(root, directory)`, which `lstatSync`s the three paths and
  throws the refusal of R3, and call it first in `prepareRun` after the unit is resolved and in `prepareResume`
  before `latestRunName`. Make `makeRunDirectory` make `.orchestrator` and the unit's directory each with `mkdirSync`
  without `recursive` when it is missing (R3)
- [x] Add a test that a `.orchestrator/.gitignore` holding `*\n` is not written, by its inode and its modification
  time, and that one holding anything else, as `*` without a line break and `*\n!x\n`, holds `*\n` after a run (R4)
- [x] Make `makeRunDirectory` write `.gitignore` with `writeWhole` when it does not hold exactly `*\n`, and leave it
  otherwise (R4)
- [x] Add unit tests of a new `createFile(path, files)`: it creates a file that is not there; with a link at the name
  to a file elsewhere, it removes the link, creates the file and leaves the file the link named as it was; with a
  file or a directory at the name, it removes it and creates the file; and when the second open fails too, it throws.
  Add unit tests that `writeWhole` with a link at its temporary name and at its name writes the file in place of the
  link and leaves what each link named unchanged, and, with a directory at its name, replaces it. Change the existing
  tests of `writeWhole` that record the order of its calls to the new calls (R5, R16)
- [x] Add `createFile`, which opens with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW`, on `EEXIST` or `ELOOP` removes the
  entry with `rmSync(path, { recursive: true, force: true })` and opens once more, and returns the descriptor. Make
  `writeWhole` take `openSync`, `writeFileSync`, `closeSync`, `renameSync` and `rmSync` in `files`, create its
  temporary file by `createFile`, write it through the descriptor, close it, and rename it, removing an entry that
  makes the rename fail with `EISDIR` or `ENOTEMPTY` and renaming once more. A failure still removes the temporary
  file and throws (R5)
- [x] Add unit tests that `followedFile` creates its file by `createFile` when it is made, so a link at the name is
  replaced and what it named is unchanged; that each line goes through the descriptor at the offset reached and the
  cut back through `ftruncateSync` of the descriptor, with no call that takes the path after the file is made; that
  its failures are still dropped as today; and that closing it closes the descriptor. Change its existing tests to
  the new calls (R5, R6, R16)
- [x] Make `followedFile(path, files)` take `openSync`, `writeSync`, `ftruncateSync`, `closeSync` and `rmSync`, create
  the file by `createFile`, write each line with `writeSync(descriptor, line, offset)`, cut back with
  `ftruncateSync(descriptor, length)`, and return `{ add, close }`. A creation that fails leaves `add` doing nothing,
  as a failed write is dropped today. In `runPrepared`, close the followed file when `runStep` settles, in a
  `finally` (R5, R6)
- [x] Add a test that a run whose run directory is replaced, while its first step runs, by a link to a directory
  outside `.orchestrator/<unit-directory>` exits `1`, names both directories on standard error, ends the step's
  harness, starts no next step and writes nothing in the directory the link names. The fake harness swaps the
  directory at its call 1 and then waits, as `waits` makes it (R7, R16)
- [x] Add `checkRunDirectory(root, runDirectory)`, which throws the error of R7 unless the resolved run directory is the
  one the approach gives, and call it in `write` of `runPrepared`, in the heartbeat's write and before each line of a
  followed file. Keep the first such error in a variable of `runPrepared`: the heartbeat and the followed line set it
  and send `SIGTERM` to the group that runs, `write` throws it when it is set, and `runPrepared` throws it when
  `orchestrate` returns with it set, so the command exits `1` with it (R7)

The record and the resume:

- [x] Add `tests/agentrite-run-records.test.mjs`: the directory is `$XDG_STATE_HOME/agentrite/.orchestrator-runs` when
  it is set and not empty, and `<home>/.local/state/agentrite/.orchestrator-runs` otherwise; the name is the SHA-256 in
  hexadecimal of the path given, followed by `.json`; the text holds the two digests of the buffers given; and the
  judgement accepts the two buffers whose digests the record holds, and gives a refusal for no record, for a record
  that is not of the form, and for each buffer that differs (R8, R9)
- [x] Add `scripts/agentrite-run-records.mjs` with `recordDirectory(environment, home)`, `recordName(runPath)`,
  `recordText(definition, state)`, `digestOf(buffer)` and `judgeRecord(recordText, definition, state)`, and add it to
  `files` of `package.json` (R8, R9)
- [x] Add a test that a run writes, in the `XDG_STATE_HOME` the test gives, the record named by the SHA-256 of its
  resolved directory, holding the digests of its `definition.json` and `state.json` as they stand after the run; that
  it makes the directory when it is missing; and that a resume writes a record of its own run (R8, R16)
- [x] In `runPrepared`, write the record with `writeWhole` each time `state.json` is written, its directory made first
  with `mkdirSync(directory, { recursive: true })`, with the digests of the content written. `XDG_STATE_HOME` is read
  from `process.env` and the home from `os.homedir()` in `scripts/agentrite.mjs` and passed to `recordDirectory`
  (R8)
- [x] Give `project` in `tests/agentrite-orchestrate.test.mjs` an `XDG_STATE_HOME` in a temporary directory of the test
  outside the project, and make `writeRun` write the record of the run it writes, of the texts it writes. Every
  resume test passes as before (R8, R9)
- [x] Add tests that a resume refuses, starts nothing, writes nothing and exits `1` naming the run, that a resume takes
  a run made where it is resumed whose files are as that run left them, and that `npx agentrite orchestrate <unit>`
  starts a new run: for a run with no record, a run whose `definition.json` differs from its record and one whose
  `state.json` does. Add a test that a resume of a run whose `state.json` is a link to a copy of the file outside
  `.orchestrator` is refused (R9, R16)
- [x] Add `readRunBuffer(root, path)`, which opens with `O_RDONLY | O_NOFOLLOW` and reads the file once, and make
  `runTexts` read `state.json` and `definition.json` through it as buffers. In `prepareResume`, read the record,
  judge it with `judgeRecord` against those buffers, and throw its refusal before `parseRun`; then parse the decoded
  same buffers. Read the `heartbeat` through the same read, taking `ELOOP` as no heartbeat. `agentrite runs` keeps
  its reads (R1, R9)
- [x] Add a test that a resume refuses a run whose `definition.json`, with a record that matches it, names a role the
  project does not have, with the refusal a run gives for that definition (R10, R16)
- [x] Give `parseRun` an optional parameter of the project's roles and harnesses, passed to `parseDefinition`, and pass
  `{ roles: Object.keys(settings.roles), harnesses: settings.harnesses }` from `prepareResume` (R10)

Sessions and the model:

- [x] In `tests/agentrite-run.test.mjs`, change the rows of each harness so that a model is `--model=<model>`, one
  argument, and add a test that each of the three harnesses gets it so, headless and not (R10, R16)
- [x] Make `harnessCommand` in `scripts/agentrite-run.mjs` pass `` `--model=${model}` `` (R10)
- [x] Add unit tests of `isSession`: the ids of the three harnesses above match, and an empty id, one that opens with
  `-` or `_`, one of 129 characters and one holding a space, a `/` or a line break do not (R11)
- [x] Add `SESSION_FORM` and `isSession` to `scripts/agentrite-orchestrate.mjs` (R11)
- [x] Add a test that a resume refuses, starts nothing, writes nothing and exits `1` when the run's `state.json`, with a
  record that matches it, holds a session that opens with `-`, naming its role and harness and the form a session
  takes. Add a test that a step whose harness gives a session that does not match leaves it out of `sessions` in
  `state.json`, says so on standard error, and that the next step of its role and harness is started with no session
  (R11, R16)
- [x] In `prepareResume`, after `parseRun`, throw the refusal of R11 for the first session of `state.sessions` that
  `isSession` refuses. In the `run` effect of `runPrepared`, leave `result.session` out unless `isSession` takes it,
  before `orchestrate` keeps it for later steps and the `ended` effect writes it, and otherwise write on standard
  error that the session the harness gave is not of the form, so it is not kept and the next step of the role on that
  harness starts a session of its own (R11)

Comparing a clone:

- [x] In `tests/sandbox-unit-run.test.mjs`, add a test where the host's repository configures `filter.mark.clean` and
  `filter.mark.smudge` as commands that append to a mark file outside the clone and then pass their input on with
  `cat`, the agent writes `.gitattributes` with `* filter=mark` and `* text eol=crlf` and changes a committed file,
  and the run lands: the mark file is not there, and the changed file is listed while `.gitattributes` is listed as
  not committed (R13, R16)
- [x] Add tests that the clone is kept and lists a file whose bytes differ from the commit, a committed file the agent
  removed, a committed file under a directory the agent replaced by a link, a committed link whose target the agent
  changed, and a file that is not committed and not ignored; and that a clone with only an ignored file and no change
  is removed. Add tests that a clone whose one change is a committed file made executable, and one whose one change is
  a file committed as executable made not executable, is kept and lists that file, and that with `core.fileMode` set
  to `false` in the host's repository each is removed (R14, R16)
- [x] Rewrite `clone_changed_files` in `container/unit-clone.sh` as the approach says, with its comment saying what it
  compares and that it runs no conversion of git (R13, R14)

Documents:

- [x] Add to `AGENTS.md` a section "Code on the host and what a unit run brings back", after "Exit statuses", holding
  the rule of requirement 1 as the spec states it: what counts as brought back, no link followed, writes only inside
  the directory meant, no program the content selects, a value in arguments only after `--`, joined by `=` or of an
  exact pattern that rules out a leading `-`, free text that a harness takes as an instruction only out of a file the
  kit's record shows it wrote, unchanged since, and the commits of the unit's branch outside the rule (R1)
- [x] In "What the sandbox defends against" of `SANDBOX.md`, add to the list of what a unit run defends the host
  against that the kit's commands on the host follow no link the agent made under `.orchestrator`, write under it
  only in the directory of their own run, resume only a run made where it is resumed whose files are as that run
  left them, and that the wrapper compares the clone's files with the branch without running any filter of git; and
  make its line on what a file under `.orchestrator` says read "to a human, or a program other than the kit's
  commands, that reads it on the host" (R2)
- [x] Add to "When something goes wrong" of `SANDBOX.md` the entry of a kept clone that lists files the agent did not
  change: what is seen, that git converts such files when it checks them out, as Git LFS and an end-of-line
  attribute make it do, that the comparison takes the bytes as they are, and that the clone is removed with `rm -rf
  <clone>` once the developer has made sure that nothing else is listed (R15)
- [x] In `ORCHESTRATOR.md`, add to "What .orchestrator holds" the record of runs: where it is, `<state>` as
  `$XDG_STATE_HOME` or `~/.local/state`, its name and what it holds, that the command writes it with each
  `state.json`, that a resume takes only a run with its record whose two files are as the record holds, and that the
  developer removes the directory with `rm -rf` when no run of any project is to be resumed. Add to "On the host and
  in the sandbox" that the record of a run made in a unit run is in the project's home volume, so that removing the
  volume, as `docker volume rm <project>_agent-home` does, leaves no run that stopped in the sandbox before it to
  resume. Change its sentence on `.gitignore` to say it is written whole when it holds anything but `*` and a line
  break (R4, R8, R12)
- [x] In "The home volume" of "Where things are kept on the host" in `SANDBOX.md`, say that it holds the record of the
  runs of the orchestrator made in a unit run, and that removing it leaves no run that stopped in the sandbox before
  it to resume (R12)
- [x] In "agentrite orchestrate" of `COMMANDS.md`, add the refusals of requirement 3 to those of a run and of a resume,
  those of requirements 9, 10 and 11 to those of a resume, the note that a session a step gives that is not of the
  form is not kept, and `XDG_STATE_HOME` as an environment variable the command reads for where it keeps the record.
  In "agentrite run", say that the model reaches the harness as `--model=<id>`, and change the order of what the
  harness gets accordingly (R3, R9, R10, R11, R12)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed branch
- [ ] Every line the unit adds or changes, in code and in documents, is at most 120 characters, a Markdown table row
  apart
- [ ] Every requirement from 1 to 16 is delivered by a ticked task, and every task traces to one
- [ ] Nothing of the unit is pushed, by "Security findings" of `AGENTS.md`

## Commit Points

- [x] `feature-0103` the plan and its record entry
- [x] `feature-0103` the check of the three paths, `.gitignore`, `createFile`, `writeWhole` and the followed file
- [x] `feature-0103` the check of the run's directory before each write
- [x] `feature-0103` the record of runs and the resume's judgement of it, the resume's definition read with the
  project's names
- [x] `feature-0103` the session pattern and `--model=<model>`
- [x] `feature-0103` the comparison of a clone without conversions
- [x] `feature-0103` the documents and the rule in `AGENTS.md`
