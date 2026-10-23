# 0080 The followed output of a run is kept

## Approach

The pure pieces go into `scripts/agentrite-orchestrate.mjs`, beside `followedText` and `followPrinter`, which already
decide what is followed of a step and how it is printed. The effects go into `scripts/agentrite.mjs`, which owns the
run's directory and every write in it. No new module is made, so `package.json` and the table "What is here" of
`README.md` do not change.

The file and the terminal take one instant for each item. Today `followPrinter` gives an item without a time the
instant it prints it, by `item.time ?? now()`. The file needs that same instant by requirement 5, so the stamping
moves out of the printer, in a commit of its own that changes no behavior: a new pure function
`timedItems(items, now)` gives each item with `time` set to `item.time ?? now()`, as a typedef `Timed`, `Followed &
{ time: number }`, and `followPrinter(write)` takes `Timed[]` and no longer takes `now`. The command stamps the items
of a line once, and gives the same timed items to the printer and to the file.

Three pieces are added:

* `followedLine(item, instant)` in `scripts/agentrite-orchestrate.mjs`, a pure function that gives the line of one
  timed item, with its line break: `` `${JSON.stringify(object)}\n` ``, where `object` is `{ time: instant, kind:
  'text', text: item.text }` for a text, with the text in full and not cut of its line breaks as the terminal prints
  it, and `{ time: instant, kind: 'call', tool: item.tool, label: callLabel(item) ?? null }` for a call. The keys
  stand in the order requirement 4 gives. `callLabel` is the one rule of the label, so the file and the terminal
  cannot drift apart. `JSON.stringify` writes a line break of a text as `\n`, so the line holds no line break but its
  last. The instant is a parameter, as `followedText` takes its time, since `instantOf` lives in
  `scripts/agentrite.mjs`, which imports this module
* `followedFile(path, files)` in `scripts/agentrite.mjs`, exported for the tests. It makes the file empty at once with
  `files.writeFileSync(path, '')`, and returns a function `add(line)` that adds the line to the end of the file with
  `files.appendFileSync(path, line)`, one call a line. It keeps the length in bytes of the lines added so far, by
  `Buffer.byteLength(line)`. When an append throws, a part of the line may stand at the end of the file, so `add`
  calls `files.truncateSync(path, length)` to cut the file back to the lines before it, and the line is not counted.
  The making, the append and the truncation each stand in a `try`/`catch` that drops what it throws, with a comment
  that the file is for readers and not a part of the run, as the heartbeat is (R8). `files` is `{ writeFileSync,
  appendFileSync, truncateSync }` of `node:fs`, which `orchestrateCommand` passes from its imports, so that a unit test
  can make one of them fail, as `writeWhole` takes its functions. The file is appended to directly, and not through
  the run's `write`, which always writes a file whole by a rename (R6)
* the wiring in `orchestrateCommand`. The `run` callback of `orchestrate`, which is called after `started` and before
  the harness is spawned, calls `followedFile(resolve(root, runDirectory, fileOf(planned, 'followed.jsonl')), {
  writeFileSync, appendFileSync, truncateSync })`, so the file is made empty before the harness starts (R1, R2). It
  then calls `runStep` with a function that takes the items of a line, stamps them with `timedItems(items,
  Date.now)`, gives them to the printer with `--follow`, and adds `followedLine(item, instantOf(item.time))` of each
  to the file, in their order (R3, R5). Without `--follow` there is no printer, and the file is written all the same

`runStep` takes that function always, and no longer `undefined` without `--follow`, so its `line` is always
`(text) => followed(headless.follow(text))`, and `runGrouped` takes `line` always: its two checks `line ===
undefined` go. `runGrouped` calls `line` in the `data` handler of the harness's output for each complete line as it
arrives, and in the `end` handler for a last line without a line break, so a line of the file is added once the
harness has made the item known (R2), also for a step the command ended for its time limit or by a signal, and
nothing removes the file afterwards (R7). What the command prints, `state.json` and the other files are written as
before (R9).

`README.md` changes in "What .orchestrator holds" and "How a run ends" (R10, R11). The sentence "Every file of a
run's directory is written whole." becomes one that leaves out the followed files, since they are added to. The row of
`--follow` in "agentrite orchestrate" of "Commands" stays true and does not change, and no command, option or exit
status is added. `SANDBOX.md` does not change: a unit run mounts the host's `.orchestrator`, so the file is on the
host as it is written, as "Running a unit" says of the run's directory already, and nothing new is done or met in the
sandbox.

## Files

- `scripts/agentrite-orchestrate.mjs`: the typedef `Timed`, `timedItems`, `followPrinter` without `now`, and
  `followedLine`
- `scripts/agentrite.mjs`: `followedFile`, the imports of `appendFileSync` and `truncateSync`, `runGrouped` and
  `runStep` with `line` and the followed function always, and the wiring in `orchestrateCommand`, whose comment says
  that every file of the run's directory but the followed files is written whole
- `tests/agentrite-orchestrate.test.mjs`: the unit tests of `timedItems`, `followPrinter`, `followedLine` and
  `followedFile`, the fake harness's `seen-<n>`, the command's tests of the file, and the exact listings of a run's
  directory with the followed files in them
- `README.md`: "What .orchestrator holds" and "How a run ends"

## Tasks

- [x] Add to `tests/agentrite-orchestrate.test.mjs` a test of `timedItems`: an item with a time keeps it, one without
  takes what `now` gives, `now` is called once for each item without a time and not for one with it, and the items
  given are not changed. Change the test `followPrinter sets each text apart by one blank line, and the calls on lines
  of their own` to give the printer timed items, and the tests that print `HEADLESS[harness].follow(line)` to stamp
  them with `timedItems` first. Add `timedItems` and the typedef `Timed` to `scripts/agentrite-orchestrate.mjs`, make
  `followPrinter(write)` take `Timed[]` and print `clockTime(item.time)`, and in `orchestrateCommand` give the printer
  `timedItems(items, Date.now)`. Every test passes as before (R5)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the unit tests of `followedLine`: a text whose text holds line
  breaks, a trailing one among them, and double quotes gives one line that ends in its one line break, whose
  `JSON.parse` is `{ time, kind: 'text', text }` with the text in full, and whose keys stand in that order; a call of
  `Bash` with a description gives `{ time, kind: 'call', tool: 'Bash', label: 'Run the tests' }`; a call whose pattern
  holds a line break gives the label with `\n` as `callLabel` writes it; a call with none of the fields gives `label:
  null`; and `followedLine(item, instantOf(Date.UTC(2026, 9, 22, 14, 3, 27, 900)))` gives `time` as
  `2026-10-22T14:03:27Z`, the same second as `clockTime` of that instant, with its date (R4, R5, R12)
- [ ] Add `followedLine` to `scripts/agentrite-orchestrate.mjs` as the approach gives it, and export it (R4)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the unit tests of `followedFile`, in a temporary directory: it
  makes the file empty before any line is added, and the lines added stand in it in their order, each whole; a making
  that throws does not throw, and a line added after it is written; an append that writes part of a line by the real
  `appendFileSync` and then throws does not throw, leaves the file holding only the lines before it, and the next line
  is added whole after them; an append and a truncation that both throw do not throw, and the next line is still
  attempted; and no other file is left in the directory (R6, R8, R12)
- [ ] Add `followedFile` to `scripts/agentrite.mjs` as the approach gives it, with `appendFileSync` and
  `truncateSync` imported from `node:fs`, and export it (R2, R6, R8)
- [ ] Add to the fake harness of `tests/agentrite-orchestrate.test.mjs`, with its comment, that with `seen-<n>` it
  writes to `seen-<n>.out`, before it prints, a line for each file that `.orchestrator/*/*/*.followed.jsonl` matches
  from the directory it runs in: the file's name, a space, and `empty` or `holding` by `[ -s ]`. It uses nothing but
  the builtins of `sh`, as the rest of the fake does. A helper `sees(number)` of `project` writes `seen-<n>`
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the test that each step's file holds its messages and calls, in
  the order `--follow` prints them, with `--follow` and without it: of `followedRun` with `--follow` and of one
  without it, `00-implementer.followed.jsonl` and `01-reviewer.followed.jsonl` each end in a line break, and their
  lines parse to `2026-10-22T14:03:27Z` text `I will run the tests.`, `28Z` call `Bash` label `Run the tests`, `29Z`
  call `TodoWrite` label `null`, `30Z` text `IMPLEMENTED` in full; and to `2026-10-22T15:00:03Z` text `I will read the
  diff.`, `04Z` call `bash` label `Show the diff`, `05Z` call `todowrite` label `null`, `08Z` text `REVIEWED` in full.
  These are the times, tools and labels the test of `--follow` sees printed. Neither file holds a string of `HIDDEN`,
  and the files of the two runs are the same, read after each run ended (R1, R3, R4, R5, R7, R13)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the test that, without `--follow`, a step's file is made empty
  before its harness starts and holds a message while the step still runs: a run of `ONE_STEP` whose harness, with
  `sees(1)`, prints the first two lines of `claudeFollowed(IMPLEMENTED)` and waits 60 seconds. Once its process id is
  written, `seen-1.out` is `00-implementer.followed.jsonl empty`; the file comes to hold the line of `I will run the
  tests.` while the harness is still alive, and the command printed no `I will run the tests.`; after a `SIGTERM` to
  the command, which then ends by it, the file is left holding that one line (R1, R2, R7, R13)
- [ ] Change the test `a step past its limit is ended by SIGTERM, and the run stops by the case, its response kept` so
  that the run's directory lists `00-implementer.followed.jsonl`, whose one line is the text of the response, with an
  instant of the form of `instantOf`, since `claudePrinted` gives no timestamp (R7, R13)
- [ ] Add `00-planner.followed.jsonl` and the others of each step to every test that lists a run's directory
  exactly, among them `a run whose every item ends runs the default definition and exits 0`, `a run whose steps leave
  items for after the run exits 0, and gives them grouped by step` and `a run with --follow ends, writes its directory
  and exits as the same run without it`, whose comparison of the contents of the two runs then covers the followed
  files too. No assertion of what the command prints, of its exit status, of `state.json` or of another file changes
  (R9, R13)
- [ ] Wire the file into `orchestrateCommand` as the approach gives it, make `runStep` take the followed function and
  `runGrouped` take `line` always, and say in the comment of `orchestrateCommand` that every file of the run's
  directory but the followed files is written whole, and that a step's followed file is written with `--follow` and
  without it. Run `npm test` (R1, R2, R3, R5, R7, R9)
- [ ] In "What .orchestrator holds" of `README.md`, add after the item of the outcome and response files an item of
  `<number>-<role>.followed.jsonl`: numbered as those files are; made empty when the step starts, before its harness
  starts; one line added for each text message and tool call that `--follow` prints of the step, once the harness has
  made it known, in the order it prints them, and nothing else; written with `--follow` and without it; each line one
  JSON object and a line break, `{"time": ..., "kind": "text", "text": ...}` with the text in full, or `{"time": ...,
  "kind": "call", "tool": ..., "label": ...}` with the label `--follow` prints, or `null`; `time` the instant
  `--follow` prints, in UTC with its date, as `2026-10-23T10:00:05Z`; with an example of a text line and a call line;
  and left in the directory when the step and the run end, however they end (R10)
- [ ] In the same section, change "Every file of a run's directory is written whole." to say that every file but the
  followed files is, and add after that paragraph that a followed file is added to and never rewritten, a line is
  added whole or not at all, a program that reads it while the step runs takes the lines that end in a line break and
  leaves a last line without one, which is being added, and that a line the command could not write is missing while
  the lines after it are there (R6, R8, R10)
- [ ] In "How a run ends" of `README.md`, change the sentence that a run started without `--follow` cannot be
  followed to say that it prints none of the messages and tool calls, and that the followed file of each step in the
  run's directory holds them, as "What .orchestrator holds" gives it (R11)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes, after the commits
- [ ] Every line of the changed files fits 120 characters, checked before each commit
- [ ] Every requirement 1 to 13 is traced by a task above, and every task traces to one

## Commit Points

- [ ] `feature-0080 Stamp the followed items before they are printed`: the first task, which changes no behavior
- [ ] `feature-0080 Give the line of a followed item`: the second and third tasks
- [ ] `feature-0080 Add the lines of a followed file`: the fourth and fifth tasks
- [ ] `feature-0080 Keep the followed output of each step`: the sixth to eleventh tasks
- [ ] `feature-0080 Document the followed files`: the three tasks of `README.md`
