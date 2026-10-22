# 0077 The units of a project can be listed

## Context

The human often asks an agent which units of a project are still open. To answer, the agent reads the `record.md` of
every unit in `changes/`, which costs tokens each time, and the more units a project has, the more it costs. The kit
has no command that gives this answer. The human may later build a graphical interface on top of such a command, so
what it prints should be readable by a script as well as by a person.

Each unit is a directory of `changes/` named `<number>-<kebab-name>/`, with four digits for the number. Its
`record.md` opens with front matter whose `kind` and `status` fields are required, followed by a `#` heading with
the unit's title. The statuses are `draft`, `approved`, `in-progress`, `implemented` and `cancelled`, and the last two
are the end statuses. A project that adopted the scheme later may also hold directories of an older naming, which do
not start with four digits and a hyphen.

`npx agentrite roles [--json]` already prints a listing as text, or as one JSON document for a script.

## Requirements

The command:

1. `npx agentrite units [<number>] [--open] [--limit <count>] [--json]` lists units of the project, from the
   directory it runs in. The options may stand at any place among the arguments
2. A unit is a directory of `changes/` whose name is four digits, a hyphen, and at least one character more. No other
   directory of `changes/` is listed or found by its number, whatever it holds
3. The command reads nothing but `changes/` in the working tree: no other branch and no other revision, and no
   `agentrite.json`. The status it shows is the one in the unit's `record.md` as it stands in the working tree
4. Units are listed in the order of their number, the highest first. Units with the same number are listed in the
   order of their directory names

What is shown of a unit:

5. Each unit is shown on one line, with its number, its status, its kind, and its title, in columns that line up
   across the lines. The status and the kind are the values of the `status` and `kind` fields of its `record.md`, as
   written there. The title is the text of the first `#` heading of its `record.md`, without the unit's number and the
   space after it when the heading begins with them
6. A unit whose `record.md` is missing, or has no `status` field, no `kind` field or no `#` heading, is refused: the
   command names the file and what is missing in it, prints nothing on standard output, and exits 1

Filtering and the limit:

7. Without `--open`, every unit is listed, whatever its status. With `--open`, a unit whose status is `implemented` or
   `cancelled` is left out, and every other unit is listed
8. Without `<number>`, at most 50 units are listed. `--limit <count>` sets another maximum, and `--limit 0` lists them
   all. The limit counts the units that remain after `--open`, so that `--open` lists up to that many open units
9. When the limit leaves units out, the text listing ends with one line that says how many units it shows of how many
   there are after `--open`, and that `--limit 0` shows them all
10. `<number>` is exactly four digits. With it, the command shows the unit or units whose directory opens with those
    digits and a hyphen, and `--open` applies to them as to a listing
11. When there is nothing to show, because `changes/` holds no unit, `--open` left out every unit, or `--open` left out
    the unit that `<number>` names, the text listing is one line that says there are no units, or no open units with
    `--open`, and the command exits 0

The JSON document:

12. With `--json`, the command prints one JSON document instead of the text: an object with a key `units`, an array of
    the units listed, in the order of requirement 4, and a key `total`, the number of units there are after `--open`
    and before the limit. Each unit is an object with its `number`, a string of the four digits, its `directory`, the
    name of its directory in `changes/`, its `status`, its `kind` and its `title`, as requirement 5 gives them. When
    there is nothing to show, `units` is an empty array, and no line of text is printed

Refusals:

13. A `<number>` that is not four digits, a second `<number>`, `--limit` without a value or with a value that is not
    a whole number of zero or more, `--limit` together with `<number>`, and an option the command does not take, are
    wrong arguments: the command says what is wrong, prints its usage, and exits 2
14. A `<number>` that opens no directory of `changes/` is refused with a message that names it, and the command exits
    1. A directory with no `changes/` directory is refused with a message that names the directory the command ran
    in, and the command exits 1

The documents:

15. `README.md` gives `agentrite units` in "Commands", with its form, what it lists and in what order, the line of a
    unit, the closing line of requirement 9, the line of requirement 11, the JSON document, its refusals, a table of
    its arguments and options, and its exit statuses by "Exit statuses"
16. The usage the command `agentrite` prints names `agentrite units` with its form, beside the other commands

Tests:

17. Unit tests cover the reading of the arguments and each wrong argument of requirement 13, which directories are
    units, the order of the units, the title with and without the number in the heading, `--open`, the default limit,
    `--limit` with a count and with 0, the closing line, the line when there is nothing to show, the JSON document with
    and without units, and each refusal of requirements 6 and 14
18. Tests of the command show, on a project with units of each status and more units than the limit, a listing, a
    listing with `--open`, a unit given by its number, a unit given by its number with `--open` that has ended, and
    `--json`, each with its exit status

## Decisions

* **The name `units`.** The kit calls the work in `changes/` units, and a bug is only one kind of unit. `issues` was
  considered and dropped as the word of an issue tracker, and `status` as too wide for a command that lists
* **Only the working tree of the current branch.** Once a unit is approved, its later entries are written on its own
  branch, so on the default branch a unit whose work began still shows `approved`. Reading each unit's branch with git
  would show the status it has there, and was considered and left out by the human to keep the command simple. The
  limitation is accepted: the command shows what the checked-out `changes/` says, and nothing more
* **A unit is given by its four digits only.** The directory's name and the path `changes/<directory>/`, which
  `agentrite run` takes, were considered and dropped by the human: the number is what a person types. When the digits
  open more than one directory, every one of them is shown, since a listing has no reason to refuse a choice between
  them, as `agentrite run` must
* **Only directories named by the current scheme.** Directories of an older naming are left out by the shape of the
  name alone, four digits and a hyphen, and not by naming the older scheme. In this repository the older directories
  share their numbers with units of the current scheme, so given by their digits they would be ambiguous. Every one of
  them is implemented and frozen, so a listing of open units loses nothing without them
* **The highest number first, and at most 50 by default.** The newest work is what the human asks about, and a
  project can hold hundreds of units, which a listing of all of them would scroll past. The human chose the number 50.
  `--limit` gives another, and `--limit 0` all, rather than a flag `--all`, so that one option covers both. The
  closing line says when units were left out, so that a short listing is never taken for the whole one
* **The limit counts after `--open`.** A human who asks for open units wants the open ones, not the open ones among the
  latest 50, which could leave out an old unit that was never finished
* **Nothing to show is not an error.** A project with no open units is in a good state, so the command says so in one
  line and exits 0. The human chose the same for a unit given by its number that `--open` leaves out, rather than
  refusing the combination as arguments that do not go together
* **`--limit` with `<number>` is refused.** A unit given by its number is one listing that the limit can never cut,
  so the option would do nothing there, and a human who writes it has mistaken what one of them does
* **A malformed record is refused, not skipped.** `process.md` makes `kind` and `status` required, and the record
  template gives the heading. A listing that skipped a unit it cannot read would leave it out without a word, which is
  the one thing the command must not do to an open unit
* **The status and the kind as written.** The command shows the values and filters on the two end statuses, and does
  not check them against the five statuses or the three kinds. A wrong value is shown as it is, where the human sees it
* **A JSON document of its own form.** `--json` follows `agentrite roles --json`, an object with one array, and adds
  `total`, so that a script or a graphical interface can tell that the limit cut the listing without a line of text
* **No `agentrite.json`.** The command needs nothing from the settings, so it runs in a project that has none, as the
  change check does

## Non-goals

* Reading a unit's status from its branch, from the default branch, or from any revision other than the working tree
* Giving a unit by its directory name, by its path, or by the name of its branch
* Listing directories of `changes/` that are not named by the current scheme
* Filtering by kind, by status other than `--open`, or by text in the title
* Changing a unit's status, or any other write to `changes/`
* A graphical interface
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **The process points agents to the command.** `process.md` would say that the units still open are listed by
   `npx agentrite units --open`, so that an agent asked which units are open runs it rather than reading every record.
   It costs one sentence in `process.md`. Without it, an agent that does not know the command reads every record as it
   does today, and the tokens the command is meant to save are spent until the human tells the agent to run it
2. **The status read from the unit's branch.** When a unit has a branch, locally or on the remote, its status would be
   read from that branch's `record.md` with git, without checking it out, and the line would name the branch. It costs
   the reading of branches and of variants, and tests with a repository. Without it, on the default branch a unit whose
   work began shows `approved`, which the human sees and can check on its branch
3. **Filtering by status and by kind.** Options such as `--status <status>` and `--kind <kind>` would narrow the
   listing further. It costs two options, their refusals and tests. Without them, a listing is narrowed by `--open`
   alone, or by a script reading `--json`
