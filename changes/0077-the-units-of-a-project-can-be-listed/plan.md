# 0077 The units of a project can be listed

## Approach

A new command `units` joins the table `COMMANDS` of `scripts/agentrite.mjs`, as `roles` did. What it computes lives
in a new module of its own, `scripts/agentrite-units.mjs`, which holds no file access: it reads the arguments, tells
which directory names are units, reads a unit from the text of its `record.md`, filters, orders and limits the units,
and renders the text listing and the JSON document. The entry point `scripts/agentrite.mjs` does the reading of
`changes/` and of each `record.md`, and the printing, so that everything else is tested with plain values.

The reading of a front matter field is already written once, as `statusFrom` in `scripts/check-changes.mjs`. The
command needs the same reading for `kind`, so it is first extracted into `fieldFrom(record, field, recordFile)`, which
`statusFrom` calls, in a commit of its own that changes no behavior. The new module imports both.

The arguments are read with `parseArgs` of `node:util`, not strict and with tokens, as `parseRunArgs` reads those of
`run`, and an option is checked by `optionError` of `scripts/agentrite-run.mjs`, so that an unknown option and an
option without its value are named in the same words as for `run`. A wrong argument throws its line followed by the
usage, which the entry point already turns into exit status 2. A refusal throws a message without the usage from the
command's `run`, which the entry point already turns into `agentrite: <message>` and exit status 1. Nothing is
written to standard output until every record the command needs has been read, so that a refusal prints nothing
there.

The texts the plan fixes, so that the tests and `README.md` say the same:

* The form: `usage: agentrite units [<number>] [--open | --status <status>] [--kind <kind>] [--limit <count>]
  [--json]`, on one line
* The line of a unit: the number, the status, the kind and the title, each of the first three padded with spaces to
  the widest value of its column among the lines listed, the columns separated by two spaces, and no space at the end
  of the line. A title is never wrapped
* The closing line of requirement 14: `showing <shown> of <total> units, --limit 0 shows them all`
* The line of requirement 15: `no units` when neither `<number>` nor a filter is given, and otherwise `no units
  with`, a space, and what was given, joined by a comma and a space, in this order: the number as `0077`, `--open`,
  `--status <status>`, `--kind <kind>`. For example `no units with 0077, --open` and `no units with --status draft,
  --kind bug`
* A missing record: `changes/<directory>/record.md does not exist`. A record without a field: `changes/<directory>/
  record.md is missing a status field`, or `a kind field`, as `statusFrom` already words it. A record without a
  heading: `changes/<directory>/record.md is missing a # heading`
* No `changes/`: `<directory the command ran in> holds no changes/ directory`. A `<number>` that opens no directory:
  `changes/ holds no unit 0077`
* A `<status>` or `<kind>` that is not one of the values: `unknown status: <value>. --status takes draft, approved,
  in-progress, implemented or cancelled`, and `unknown kind: <value>. --kind takes feature, bug or task`

The title is the first line after the front matter that opens with `# `. When it opens with the unit's four digits
and a space, they are taken off.

## Files

- `scripts/check-changes.mjs`: `fieldFrom` extracted, `statusFrom` calls it
- `scripts/agentrite-units.mjs`: new. `UNITS_FORM`, `STATUSES`, `KINDS`, `END_STATUSES`, `DEFAULT_LIMIT`,
  `parseUnitsArgs`, `isUnitDirectory`, `unitFrom`, `selectUnits`, `unitsListing`, `unitsJson`
- `scripts/agentrite.mjs`: imports the module, adds the function `units(root, parsed)` and the entry `units` of
  `COMMANDS`, after `roles`
- `package.json`: `scripts/agentrite-units.mjs` in `files`, after `scripts/agentrite-roles.mjs`
- `tests/check-changes.test.mjs`: `fieldFrom`
- `tests/agentrite-units.test.mjs`: new. The unit tests of the module and the tests of the command
- `tests/agentrite-init.test.mjs`: the usage of every command holds the form of `units`
- `tests/package-documents.test.mjs`: the list of `files` holds the new module
- `README.md`: the section `### agentrite units` in "Commands", after `### agentrite roles`
- `process.md`: the pointer to the command in "Changes"

## Tasks

### The reading of a field

- [x] In `tests/check-changes.test.mjs`, test that `fieldFrom` returns the value of a field of the front matter, as
  `kind` and `status`, and throws `<recordFile> is missing a <field> field` when the record has none. (R6)
- [x] In `scripts/check-changes.mjs`, extract `fieldFrom(record, field, recordFile)` from `statusFrom`, with the same
  regular expression for the given field name, and make `statusFrom` return `fieldFrom(record, 'status',
  recordFile)`. Run `npm test`: the tests of the change check and of `orchestrate` pass unchanged. (R6)

### The module, tests first

Each test below is written in `tests/agentrite-units.test.mjs`, seen failing, and then made to pass by the code in
`scripts/agentrite-units.mjs` that the next item names.

- [x] Test `parseUnitsArgs`: no argument gives no number, no filter, the limit 50 and no JSON; `0077`, `--open`,
  `--status draft`, `--status=draft`, `--kind bug`, `--limit 5`, `--limit 0` and `--json` are each read; the options
  read the same in any place among the arguments, before and after `<number>`; `--kind` is taken with `--open` and
  with `--status`. (R1, R9, R10, R11, R13, R22)
- [x] Test that each wrong argument of requirement 17 throws a message that names what is wrong and ends with
  `UNITS_FORM`: `77`, `00777`, `abcd` and `0077-x` as `<number>`; a second `<number>`; `--status`, `--kind` and
  `--limit` each without a value and each given twice; `--status done` and `--kind chore`, with the messages that name
  the values; `--limit -1`, `--limit 1.5` and `--limit many`; `--open --status draft`; `--limit 5 0077`; `--all` and
  `--open=yes`. (R17, R22)
- [x] Write `UNITS_FORM`, `STATUSES` (`draft`, `approved`, `in-progress`, `implemented`, `cancelled`), `END_STATUSES`
  (`implemented`, `cancelled`), `KINDS` (`feature`, `bug`, `task`), `DEFAULT_LIMIT` (50) and `parseUnitsArgs(args)`,
  which returns `{ number, open, status, kind, limit, json }`, with `number`, `status` and `kind` `undefined` when not
  given and `limit` the number given or 50. Reuse `optionError` of `scripts/agentrite-run.mjs` for unknown options and
  missing values, and count the tokens of each option to refuse one given twice. (R1, R9, R10, R13, R17)
- [x] Test `isUnitDirectory`: `0077-the-units` and `0001-a` are units; `0077-`, `0077`, `077-a`, `00777-a`,
  `history-0036-install-the-agent-kit` and `_template` are not. Write it as four digits, a hyphen and at least one
  character more. (R2, R22)
- [x] Test `unitFrom(directory, record)`: it gives `number`, `directory`, `status`, `kind` and `title`, with the
  status and the kind as written, and the title of `# 0077 The units of a project can be listed` as `The units of a
  project can be listed` and of `# A title without a number` as written; a `#` comment in the front matter is not
  taken for the heading; a record without a `status` field, a `kind` field or a `#` heading throws the message the
  approach gives, naming `changes/<directory>/record.md`. Write `unitFrom` with `statusFrom` and `fieldFrom`. (R5, R6,
  R22)
- [x] Test `selectUnits(units, parsed)`, which returns `{ units, total }`: the units come highest number first, and
  two of the same number in the order of their directory names, whatever order they were given in, and the array
  given is not reordered; without a filter all are kept; `--open` leaves out `implemented` and `cancelled` and keeps
  the three other statuses; `--status` keeps that status only; `--kind` keeps that kind only; `--kind` with `--open`
  and with `--status` keeps the units that pass both; without `<number>` the default limit keeps 50 of 53, `--limit 5`
  keeps 5 and `--limit 0` keeps all; the limit counts after the filters, so `--open --limit 2` on units whose two
  highest have ended still gives two open units; `total` is the count after the filters and before the limit; with
  `<number>`, only the units whose directory opens with those digits and a hyphen are kept, the filters apply to them,
  and no limit cuts them. Write `selectUnits` on a sorted copy. (R4, R7, R8, R9, R10, R11, R12, R13, R22)
- [x] Test `unitsListing(selection, parsed)`: one line a unit, with columns that line up across units of different
  widths of status and kind; the closing line when `units` is shorter than `total`, and none when it is not; `no
  units` when nothing is shown and nothing was given; the line naming the number and each filter with its value, in
  the order the approach gives; no line over the width only because of the padding. Write `unitsListing`. (R5, R14,
  R15, R22)
- [x] Test `unitsJson(selection)`: an object with the keys `units` and `total`, in that order; each unit with the keys
  `number`, `directory`, `status`, `kind` and `title`, in that order, and `number` a string; `units` an empty array
  and `total` 0 when nothing is shown; the text ends with one line break. Write `unitsJson`, formatted as `rolesJson`
  formats its document. (R16, R22)

### The command

- [x] In `tests/agentrite-units.test.mjs`, write a helper that makes a project in a `temporaryDirectory` with a
  `changes/` of 53 units, among them each of the five statuses and each of the three kinds, two units that share a
  number, an implemented unit that is the highest of its number, and a directory of an older naming, and runs
  `scripts/agentrite.mjs` there with `spawnSync`. The project has no `agentrite.json` and is no git repository. (R3,
  R23)
- [x] Test the command on that project, each with its exit status 0, its standard output and an empty standard error:
  `units`, which lists 50 units and ends with the closing line; `units --open`; `units --status in-progress`; `units
  --kind bug`; `units <number>` of a unit; `units <number>` of the two units that share it; `units <number> --open` of
  the implemented unit, which prints the line of requirement 15; `units --limit 0 --json`, which parses and lists every
  unit with `total` 53, and `units --json --status cancelled --kind task` where none match, which gives an empty array.
  Check that the directory of an older naming is listed by none of them. (R2, R3, R7, R8, R9, R10, R12, R13, R14, R15,
  R16, R23)
- [x] Test the refusals of the command, each with exit status 1, nothing on standard output and the message on
  standard error: a directory with no `changes/`, naming the directory; a `<number>` that opens no directory; a unit
  with no `record.md`; a unit whose `record.md` lacks `status`, `kind` or the heading. And that a wrong argument exits
  2, with the usage on standard error and nothing on standard output. (R6, R17, R18, R23)
- [x] In `scripts/agentrite.mjs`, write `units(root, parsed)`: refuse when `root` holds no `changes/` directory; take
  the unit directories of `changeDirectories(root)` by `isUnitDirectory`; with `<number>`, refuse when none opens with
  it, and keep those that do; read the `record.md` of each unit kept, refusing one that does not exist, and make each
  a unit with `unitFrom`; select with `selectUnits`; then print `unitsJson` or `unitsListing` and return 0. Add `units:
  { form: UNITS_FORM, parse: parseUnitsArgs, run: units }` to `COMMANDS`, after `roles`. Read nothing else: no git
  and no `agentrite.json`. (R1, R2, R3, R6, R12, R18)
- [x] In `tests/agentrite-init.test.mjs`, add the line `       agentrite units [<number>] [--open | --status <status>]
  [--kind <kind>] [--limit <count>] [--json]` to the usage of every command, after the line of `roles`, and see it
  pass. (R20)
- [x] Add `scripts/agentrite-units.mjs` to `files` of `package.json` and to the list in
  `tests/package-documents.test.mjs`, after `scripts/agentrite-roles.mjs`. (R1)

### The documents

- [ ] In `README.md`, write `### agentrite units` after `### agentrite roles`: the form in a `sh` block; that it
  lists the units of `changes/` in the directory it runs in, from the working tree only, and reads no
  `agentrite.json`; which directories are units; the order; the line of a unit and where its status, kind and title
  come from; each filter, that `--kind` goes with `--open` and with `--status`, and that the limit counts after the
  filters; the default limit, `--limit 0` and the closing line; the line when there is nothing to show; the JSON
  document with its keys; the refusals that exit 1 and the wrong arguments that exit 2; a table of `<number>`,
  `--open`, `--status <status>`, `--kind <kind>`, `--limit <count>` and `--json`; and its exit statuses `0`, `1` and
  `2` with a link to "Exit statuses". Every line within 120 characters. (R19)
- [ ] In `process.md`, in "Changes", add a paragraph after the one that names how a unit's directory is named and
  numbered: `npx agentrite units` lists the units of a project and `npx agentrite units --open` those still open, and
  an agent asked which units are open, or in what status a unit is, runs it rather than reading the records. (R21)

## Verification

- [ ] `npm test` passes
- [ ] `npx agentrite units`, `npx agentrite units --open` and `npx agentrite units 0077` in this repository list the
  units of `changes/` and leave out its `history-` directories
- [ ] Every line the unit adds or changes is within 120 characters
- [ ] `npm run check-changes` passes on the committed branch
- [ ] Each requirement from R1 to R23 is delivered by a ticked task above

## Commit Points

- [x] `feature-0077 Plan the units command`: `plan.md` and the planner's entry in `record.md`
- [x] `feature-0077 Extract the reading of a field of a record`: `fieldFrom` and its test, with no change in behavior
- [x] `feature-0077 Read, select and render the units of a project`: `scripts/agentrite-units.mjs` and its unit tests
- [x] `feature-0077 Add the units command`: the entry point, the command tests, the usage, `package.json` and the
  package test
- [ ] `feature-0077 Document the units command`: `README.md` and `process.md`
