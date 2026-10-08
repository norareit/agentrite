# 0039 Slim down the sandbox reference

## Approach

Written against `feature-0039-slim-down-the-sandbox-reference` at `947bb57`, on which `npm test` passes with 403
tests and `npm run check-changes` exits 0. The installed release is 4.2.0.

The document everything is measured against is the `SANDBOX.md` of the merge base, 581 lines, read with
`git show "$(git merge-base master HEAD)":SANDBOX.md`. It is called the base document below, and its sections the
base sections. Line numbers below are those of the base document.

What follows, up to the task lists added "on the human's word", is the plan as it was written for the first spec
and is how the document was built. The human decided three things after it, which the spec now holds and which
stand above it wherever the two differ:

* The places and the failures are written with no HTML, by requirements 3, 5 and 18. Where this plan says a row
  or a cell of "When something goes wrong", the document has an entry or a part of one. "The form of the two
  sections" below says how
* The document has no section on moving from a release up to 4.0.0, by requirement 10, so it has twelve sections
  and not thirteen. What this plan says of that section holds for the passes and not for the document as it is
* Which login a removed home volume discards is corrected, in the document and in the entrypoint's message, by
  requirement 19

The work on `SANDBOX.md` is three passes, each its own commit, so that a reviewer can check each for one thing:

1. **The move.** The thirteen sections of requirement 1 with every paragraph, list item, table and code block of
   the base document under the section it now belongs in, unchanged and not wrapped again. Nothing is lost in
   this pass, and the pointers inside and outside the document name the new titles
2. **The form.** "Where things are kept on the host" and "When something goes wrong" become one table each, and
   the sections 1 to 9 get the form of requirement 2. Nothing is lost in this pass either, and the two new cells
   of requirement 3 are written in it
3. **The cuts.** What requirements 2, 6, 7, 8, 10, 11 and 12 take out leaves, and the record lists it in the same
   commit

Then `AGENTS.md` gets its rules, in a commit of its own.

No test is added. The unit adds no logic, no test reads the text of `SANDBOX.md`, and the spec asks for none: what
proves the work is the checks under "Verification" and the reviewer's comparison with the base document.

### How the rules of the spec are applied

Every statement of the base document is given a place or a requirement to leave by, in this order. The first that
fits decides:

1. It reports on which system something was shown or not tried: it goes, by requirement 12
2. It describes a refusal. The implementer reads the message in the code. When the message names both why and
   what to do, the refusal goes, by requirement 6, and what the base document says only to explain that refusal
   goes with it. Otherwise it is a row of "When something goes wrong"
3. It describes a failure that a reader recovers from by doing something: it is a row of "When something goes
   wrong", by requirement 5, and its section names the table by its title and says no more of it
4. It says where the clone, the log directory, the home volume or the image is, what one of them is or holds, or
   how it is removed: it is in the table of "Where things are kept on the host", by requirement 3
5. It says what the sandbox defends against or does not: it is in "What the sandbox defends against", by
   requirement 4
6. It belongs to "Holding a harness version", "Reaching more hosts" or "Moving from a release up to 4.0.0": it
   stays when it is one of the things requirement 7, 8 or 10 lists, and goes by that requirement when it is not
7. It belongs to one of the sections 1 to 6, 8 and 9: it goes, by requirement 2, when it lists what a command does
   not do or says what the wrapper, the entrypoint or the proxy does inside that a reader cannot observe. It
   stays otherwise
8. It says what another statement that stays also says: one of the two stays and the other becomes a pointer by
   title or goes, by requirement 11. This is not a loss and is not listed

A statement leaves only by a requirement. Requirement 14 asks for the requirement of every statement that left,
and `process.md` has existing documentation treated as intentional, so a statement that no rule above takes out
stays, also when it is none of the things requirement 2 names as staying. Should the implementer meet a statement
that fits no section and that no requirement takes out, the work stops there and the statement is logged in
`record.md` for the specifier and the human.

Nothing is written that the base document does not say, apart from the two cells of requirement 3, the opening,
the table of contents, the sentences that name a section by its title, and the headers of the two tables. A cell
of a table is filled from statements of the base document. Where the base document has no statement for a cell,
which is the case for "What to do" of a refusal whose recovery neither its message nor the base document gives,
the cell is left empty, and the row is named in the record for the human. The non-goals leave no other way: such
a refusal stays in the document, and correcting the content is no part of the unit.

### The form of the two sections

As the document is, by requirements 3, 5 and 18:

* "Where things are kept on the host" opens with a Markdown table of the four places, with the columns "What",
  "Where it is" and "How it is removed", whose lines fit in 120 characters. Under it each place has its name in
  bold, then what it is, what its placeholders are, what it holds and what there is to know of removing it
* "When something goes wrong" opens with one line that says how an entry is read. Each failure is what is seen,
  in bold, then a paragraph that opens with "Why:", then one that opens with "What to do:". A failure with
  several causes has one list, with each cause and its recovery in one item
* Neither holds an HTML tag

As it was first built, and as the tasks of the form below describe it: a row of either table holds more than a line of
120 characters can, a code block among it, and a pipe table cannot be wrapped. `AGENTS.md` has all text wrapped at 120
characters, and no line of the three documents is longer today. So each of the two tables is written as an HTML table,
which is one table and wraps:

* `<table>`, `<tr>`, `<th>`, `<td>` and their closing tags each stand alone on a line, at the start of the line
* What a cell holds is Markdown, with an empty line after `<td>` and before `</td>`, so that code spans, lists and
  fenced code blocks in it are rendered
* A header row of `<th>` cells names the columns

The table of the kit's own hosts in "Reaching more hosts" stays a pipe table, as it is.

### Where each base section goes

* The opening: its first sentence is written anew, as what the document is and that the commands are in
  "Commands" of `README.md`. That what the sandbox confines is in "The sandbox" there stays
* "Working on a clone", lines 23 to 66: "Running a unit". Where the clone is, line 60, is in the table
* "Working on a clone", lines 68 to 90: "Getting the work back". The crash, the commits that wait and the
  removal that fails are rows. How a clone is discarded is in the table
* "Working on a clone", lines 92 to 98, "Several runs": "Running a unit"
* "Connecting to a unit run": "Two agents on one unit". What `docker exec` gives, lines 162 to 164, is in "What
  the sandbox defends against"
* "What a unit run defends against": "What the sandbox defends against"
* "Another working directory" and "Extra directories": "Running on the tree as it is", in that order
* "The shared `node_modules`": lines 218 to 223, up to "writes into the same directory", in "Running on the tree
  as it is". The rest is one row
* "The home volume": the table. That authentication happens once is in "Logging in". Its two refusals go
* "The harness logs", lines 279 to 303: the table. Lines 305 to 309, what an agent can put in the log directory
  and what a container reaches: "What the sandbox defends against". Lines 311 to 313, two projects with one name:
  a row
* "Moving from a release up to 4.0.0": the section of that title, now with `##`
* "The harness versions": "Holding a harness version". What a rebuild leaves behind and `docker image prune` are
  in the table. A build that fails, and what is seen when a version breaks something, are rows
* "The status line": the section of that title
* "Logging in to a model provider": "Logging in". The login with a callback, lines 494 to 507, is one row, and
  the refusal in the proxy's log, lines 509 to 510, is the row of a connection that is refused
* "Egress": "Reaching more hosts". That it does not stop data leaving, line 565, is in "What the sandbox defends
  against". The checks at start-up, lines 567 to 573, are a refusal
* "The local model server": lines 577 to 578 in the section of that title. Lines 580 to 581 are one row

### The rows of "Where things are kept on the host"

One row each for the clone of a unit run, the project's log directory, the home volume and the image, in that
order. The first cell names it, and the columns are "What it is", "Where it is", "What it holds" and "How it is
removed".

* **The clone**: from lines 60 and 89. "What it holds" names "Running a unit", which says what the clone holds
  and what it does not, by requirement 1. That the wrapper removes a clone in which nothing would be lost is what
  the wrapper does when the container exits, and is in "Getting the work back"
* **The log directory**: from lines 279 to 303, the table of the two mounted directories folded into "What it
  holds", with `.claude/projects/-work` and OpenCode's `auth.json`. "How it is removed" is new
* **The home volume**: from lines 250 to 258 and 265 to 272. `docker volume ls`, what `<project>` is, that
  removing it discards the saved logins and that the next start creates a new one are its "Where it is" and "How
  it is removed"
* **The image**: its name is the `image:` of the project's `agent/compose.project.yml`, from lines 428 to 429, and
  it holds Claude Code and OpenCode, from line 373, with the title of "Holding a harness version" for which
  versions. That each rebuild leaves the replaced image behind and that `docker image prune` removes those, line
  445, is in "How it is removed", beside the new statement of how the image itself is removed

Where each harness keeps its login is stated in "What it holds" of the home volume and of the log directory, and
nowhere else, by requirement 11. "Logging in" says how often a harness is logged in and names the table, and
"What the sandbox defends against" says "the saved logins" and names the table.

Outside the table, a section that needs one of the four places, or what `<project>`, `<image>` or `<logs>` is,
names the table by its title. The one exception is "Moving from a release up to 4.0.0", which says what the two
placeholders of its command are, as requirement 10 asks.

### The rows of "When something goes wrong"

The columns are "What you see", "Why" and "What to do". The six rows that requirement 5 names:

* A container, a wrapper or a host that crashed during a unit run, from lines 87 to 88, with `./agent.sh <unit>
  true`
* Commits that wait at `sandbox/<branch>`, from lines 73 to 76: the two causes are "Why" and `git merge
  sandbox/<branch>` is "What to do". "Getting the work back" says only that the commits wait at `sandbox/<branch>`
  when the host's branch cannot be fast-forwarded, and names the table
* A `node_modules` that an install on the other side changed, from lines 223 to 246: that nothing reports it, the
  three losses, the two commands, and `npm ci` rather than `npm install` with its reason
* A login that sends the browser back to a port on `localhost`, from lines 494 to 507, with the command and its
  four items
* A connection that is refused, from lines 509 to 510, with the TLS `unrecognized_name` alert of line 549 as what
  is seen and `/run/egress-proxy.log` as where it is logged
* A local model server that is not reached, from lines 580 to 581

The other failures of the base document, each a row:

* The removal of a clone that fails, lines 81 to 82, with `.discarded-<branch>`
* Two projects whose root directories have one name, lines 311 to 313
* A build that fails although an image exists, line 426, with the recovery of lines 464 to 465
* What is seen when a harness version breaks something, lines 459 to 465. Each thing that is seen keeps the cause
  that lines 455 to 458 give it, as far as "Why" needs it

The refusals of the base document, with where the message is. For each, the implementer reads the message and
decides by requirement 6, and does not take the reading from here. The planner's reading is given so that a
difference is noticed:

| Refusal, and its line                                    | The message                                 | Reading |
|----------------------------------------------------------|---------------------------------------------|---------|
| A name that no branch has, 34                            | `unit-clone.sh`, "names no local branch"    | Row     |
| A number that names several branches, 36 and 151         | `unit-clone.sh`, "names more than one"      | Goes    |
| `master` holds no unit of the number, 49                 | `unit-clone.sh`, "holds no unit"            | Row     |
| The record on `master` cannot be read, 50                | `unit-clone.sh`, "cannot be read on master" | Row     |
| The record names no kind the kit has, 50                 | `unit-clone.sh`, "names no kind"            | Row     |
| No local branch `master`, 50                             | `unit-clone.sh`, "no local branch master"   | Row     |
| Nothing fetched while the container may run, 77          | `agent.sh`, "so nothing was fetched", twice | Goes    |
| A new run while `sandbox/<branch>` holds commits, 90     | `refuse_unlanded` of `unit-clone.sh`        | Goes    |
| A second run of a branch whose container runs, 97        | `agent.sh`, "Two runs never work"           | Goes    |
| `--connect` with no unit, 148                            | `agent.sh`, "--connect needs a unit"        | Goes    |
| `--connect` with a unit that names no branch, 149 to 150 | `agent.sh`, "no run to connect to"          | Row     |
| `--connect` with no run under way, 152 to 153            | `agent.sh`, "no run is under way"           | Goes    |
| `--connect` when Docker could not be asked, 154          | `agent.sh`, "could not ask Docker"          | Row     |
| `--connect` with an option of a run, 155 to 156          | `agent.sh`, "cannot be given together"      | Row     |
| Uid or gid 0, 157                                        | `agent.sh`, "refusing to run as root"       | Goes    |
| A home volume owned by another uid, 260 to 272           | `check_home_owner` of `entrypoint.sh`       | Goes    |
| A home volume with a directory not the agent's, 274, 356 | `check_log_directory_owners`                | Goes    |
| The latest version cannot be found, 412 to 415           | `latest_published` of `agent.sh`            | Goes    |
| An address or a CIDR range in an allowlist, 556 to 557   | `read_allowlist` of `entrypoint.sh`         | Goes    |
| The checks of the boundary at start-up, 567 to 573       | The last `die` lines of `entrypoint.sh`     | Row     |

All the scripts named are under `container/`. The two refusals of a home volume go whatever the reading, since
requirement 6 names them. Rows whose "What to do" the base document has nothing for are expected among those read
as "Row" above. Rows that share what is seen, why and what to do may be one row.

### What the cuts take out, as the planner reads the rules

The implementer applies the rules statement by statement and does not take this list for the result. It is given
so that the size of the pass is known and a difference is noticed.

* By requirement 12: lines 166 to 167 and lines 315 to 316
* By requirement 6: the refusals read as "Goes" above, each with what the base document says only to explain it.
  For the home volume that is lines 260 to 262, 274 to 275, 356 to 364 and 367 to 369. Line 365 to 366 stays, in
  "Moving from a release up to 4.0.0"
* By requirement 2: lines 47 to 48, what cutting does not do, and lines 134 to 135, which the spec names
* By requirement 7: that the kit names no version and that the wrapper says which it built with, lines 378 to
  379 apart from "the latest published version at the time it is built"; why a tag is installed once, lines 393
  to 394 apart from "Give an exact version"; lines 408 to 411; lines 422 to 425; line 444; lines 446 to 447; and
  lines 449 to 458
* By requirement 8: lines 541 to 548 and 550, apart from the name of the log, which the row of a refused
  connection holds; that another host at an allowlisted address is refused, line 554; and lines 558 to 563
* By requirement 10: lines 320 to 326, lines 346 to 350, and of lines 352 to 354 all but when the command must be
  run

What stays in the sections 1 to 6, 8 and 9 beyond the spec's own two examples, as close calls of rule 7: that a
connected command has "no capability and no way to gain one", line 128, which is what it shares with the first
command; that the status line script "is mounted at each start", line 480, whose effect a reader observes; and
that the wrapper says what it cut before it builds, lines 45 to 46, which a reader sees.

### The opening command of each section

By requirement 2, where the base document has a command a reader types for the section:

* "Running a unit": the two commands of lines 27 to 30
* "Two agents on one unit": the command of line 105, then the two of lines 113 and 119 as its example
* "Running on the tree as it is": the commands of lines 200 and 213
* "Holding a harness version": the YAML of lines 384 to 391, which is what a project types to hold a version
* "Getting the work back", "Logging in", "Reaching more hosts", "The status line" and "The local model server"
  have none: the one command of "Logging in" is in its row, and no command is made up

What is done in an order and becomes a numbered list: how the wrapper finds or cuts the branch and then clones,
in "Running a unit", and what the wrapper does when the container exits, in "Getting the work back".

### The titles outside `SANDBOX.md`

Every place outside `SANDBOX.md`, `changes/`, `CHANGELOG.md` and `node_modules/` that names a section of it by
title, found with `git grep`, and the title the text is under afterwards:

* `README.md`, "Commands", after the tables of `./agent.sh`: "Working on a clone", "Connecting to a unit run",
  "Another working directory", "Extra directories" and "The harness logs" become "Running a unit", "Getting the
  work back", "Two agents on one unit", "Running on the tree as it is" and "Where things are kept on the host"
* `README.md`, "Installing it into a project" and "On a fresh clone": "Egress" becomes "Reaching more hosts"
* `README.md`, "The sandbox", in its text: "Working on a clone" becomes "Running a unit", "Connecting to a unit
  run" becomes "Two agents on one unit", and "Egress" becomes "Reaching more hosts"
* `README.md`, "The sandbox", in the last column of its table: "The harness logs" becomes "Where things are kept
  on the host", and "Working on a clone", for `.reviews`, becomes "Running a unit". The table is laid out again
  for the wider column
* `templates/project/agent/compose.project.yml` and `agent/compose.project.yml`, in the comment above
  `ALLOWLIST`: "Egress" becomes "Reaching more hosts", wrapped as the comment is

`CONTRIBUTING.md` names no section of `SANDBOX.md`, no message of a command does, and `CHANGELOG.md` is not
changed.

### The record

`record.md` gets a section `## What SANDBOX.md leaves out`, between the log and `## Amendments`, as unit 0037 has
one. It holds:

* one `###` per base section, under that section's title, with every statement of it that is not in the document
  afterwards, grouped by the requirement it went by. A refusal that went by requirement 6 has the message quoted
  from the code, with the script and the function or the line it is in
* `### New statements`: the two cells of requirement 3, with what was run to try each and what it showed
* `### Rows with no "What to do"`: every row whose cell is empty, for the human
* `### Out of date, left as it is`: every statement that stays and that the implementer found out of date, for
  the human. It says "none found" when there is none

## Files

- `SANDBOX.md`: rewritten in the three passes
- `README.md`: the titles of `SANDBOX.md` it names, and nothing else
- `templates/project/agent/compose.project.yml`: the title in the comment above `ALLOWLIST`
- `agent/compose.project.yml`: the same comment
- `AGENTS.md`: the rules of requirement 16, in "The documents"
- `changes/0039-slim-down-the-sandbox-reference/record.md`: the log, and the section of what the document leaves
  out
- `changes/0039-slim-down-the-sandbox-reference/plan.md`: ticked as the work is done

- `container/entrypoint.sh`: the message of `home_volume_recovery`, for the correction
- `tests/entrypoint-home-owner.test.mjs`: its two assertions on that message

Read and not changed: `container/agent.sh` and `container/unit-clone.sh`, for the messages, and `CONTRIBUTING.md`.

## Tasks

The move:

- [x] Write `SANDBOX.md` with the title `# The sandbox`, the opening, a table of contents, and the thirteen
      sections of requirement 1 as `##` headings, with their titles and in their order, and with no `###`. The
      table of contents links to each of the thirteen, in that order (R1)
- [x] Put every paragraph, list item, table and code block of the base document under the section that "Where each
      base section goes" gives it, unchanged and with its line breaks as they are. What becomes a row or a cell
      later stands in "When something goes wrong" or "Where things are kept on the host" as the text it is, under
      a line in bold that names the row. So does every refusal of the table of refusals above, in "When something
      goes wrong", whatever its message says (R1, R3, R4, R5, R9, R10, R13)
- [x] Make every sentence inside `SANDBOX.md` that names a section by title name the title its text is now under
      (R11)
- [x] Change the titles in `README.md`, `templates/project/agent/compose.project.yml` and
      `agent/compose.project.yml` as "The titles outside `SANDBOX.md`" lists them, and nothing else in those
      files. Run "The titles" of "Verification" to find any place this plan does not list (R15)
- [x] Check the move: every line of the base document is in `SANDBOX.md`, apart from its headings, its table of
      contents, the first sentence of the opening, and the lines in which a title changed. The command is "The
      move" under "Verification" (R13)

The form:

- [x] Write "Where things are kept on the host" as one HTML table, in the form above, with the four rows and the
      four columns of "The rows of 'Where things are kept on the host'", from the text the move put there. No
      text stays in the section outside the table but one line that introduces it (R3)
- [x] Write the two new cells from the code: how the project's log directory is removed, and how the image is.
      Try each on the host with `./agent-dev.sh`, which has an image and a Compose project of its own, and with
      `XDG_DATA_HOME` set to a directory in a temporary place, so that the developer's own image, home volume and
      logs are not touched: remove it, start a run, and see what the run does without it. Where Docker cannot be
      run, leave this task open and say so to the human. Name both cells in the record under `### New statements`,
      with what was run and what it showed (R3)
- [x] State where each harness keeps its login in "What it holds" of the home volume and of the log directory,
      and take it out of every other place, leaving the title of the table there (R11)
- [x] Write "When something goes wrong" as one HTML table, in the form above, with the six rows requirement 5
      names and the other failures of "The rows of 'When something goes wrong'", from the text the move put
      there. Each section a row came from names "When something goes wrong" by its title, in one sentence, and
      says no more of the failure (R5, R9)
- [x] Read the message of every refusal in the table of refusals above, in the code. Make a row of each whose
      message leaves out why or what to do, with "What to do" from the base document or empty. Leave each refusal
      whose message names both below the table, as the text the move put there, for the cuts. Log in `record.md`
      where the reading differs from the planner's (R5, R6)
- [x] Give each of the sections 1 to 9 the form of requirement 2: the command of "The opening command of each
      section" first, in a code block, then what happens, then what a reader needs to know, with what is done in
      an order as a numbered list (R2)
- [x] Take out of every section outside the table where the clone, the log directory, the home volume and the
      image are and how each is removed, leaving the title of the table where a reader needs it. "Moving from a
      release up to 4.0.0" keeps its command and what its two placeholders are (R3, R10)
- [x] Bring what the sandbox defends against and does not into "What the sandbox defends against" as one text:
      for a unit run, for the project's log directory, for a process started with `docker exec`, and for egress,
      with the supported usage (R4)

The cuts:

- [x] Take out every statement of on which system something was shown to work or was not tried (R12)
- [x] Take out every refusal whose message names why and what to do, with what the base document says only to
      explain it, the two of the home volume among them (R6)
- [x] In the sections 1 to 6, 8 and 9, take out what lists what a command does not do and what says what the
      wrapper, the entrypoint or the proxy does inside that a reader cannot observe, by rule 7 of "How the rules
      of the spec are applied" (R2)
- [x] Cut "Holding a harness version" to the six things of requirement 7 (R7)
- [x] Cut "Reaching more hosts" to the four things of requirement 8 (R8)
- [x] Cut "Moving from a release up to 4.0.0" to what requirement 10 lists (R10)
- [x] Read the whole document once for a fact that is stated twice, keep it in the section of its subject, and
      put the title of that section in the other place (R11)
- [x] Write `## What SANDBOX.md leaves out` in `record.md`, as "The record" above describes it. Make it from
      the base document and not from memory of the passes: read the base document from its first line to its
      last, and look for each statement in the whole of the new one (R14)
- [x] Compare every command, path, option, host name and file name of the new document with the base document,
      with "The spellings" under "Verification", and read every statement that stayed for its strength: a "must", a
      "never", a "refused" or an "only" of the base document is still one (R13)

The rule:

- [x] In "The documents" of `AGENTS.md`, add the four rules of requirement 16: that `SANDBOX.md` is kept complete
      for its reader, with the unit that changes what a developer does with the sandbox or meets in it; that it is
      ordered by what a reader does, and that an addition goes in the section of what the reader is doing; that a
      refusal whose message names why and what to do is not described in it; and that a failure a reader recovers
      from is a row of "When something goes wrong" and the table of where things are kept is kept up to date, in
      the unit that changes either. Where the bullet on what the three documents say names "what is refused and
      how to recover", say that the rule on refusals is the exception for `SANDBOX.md` (R16)

The correction, added on the human's word after the tasks above were done:

- [x] Say which login a removed home volume discards: Claude Code's, since OpenCode's is in the project's log
      directory. In "How it is removed" of the home volume in `SANDBOX.md`, and in the message of
      `home_volume_recovery` in `container/entrypoint.sh`, which says the same. Change the two assertions of
      `tests/entrypoint-home-owner.test.mjs` on that message first and see them fail. Bring the message the record
      quotes, and its `### Out of date, left as it is`, along (R19)

The cells with no recovery, added on the human's word after the tasks above were done:

- [x] Fill "What to do" of the three rows of "When something goes wrong" that have none: a unit run that starts
      nothing, a `--connect` that runs nothing, and an entrypoint that refuses on a boundary check. Write one
      recovery for each cause in the row's "Why", in the order of that list. Read the message of each cause first,
      in `container/agent.sh`, `container/unit-clone.sh` and `container/entrypoint.sh`. A cause whose message
      names why and what to do after all leaves the row by requirement 6, with its message quoted in the record.
      Where nothing a reader does repairs the cause, as when the canary is reached, say so and what to do
      instead. What the specifier proposed, which the implementer checks against the code and does not take from
      here: for a name no branch has, give the unit's number or a branch that exists; for a number that is no unit
      on `master`, specify the unit and commit it on `master` first; for a record that cannot be read or names no
      kind, correct its frontmatter on `master`; for no local branch `master`, make one; for `--connect` with no
      local branch, start a unit run of the unit first; for Docker that could not be asked, see that Docker runs;
      for `--connect` with an option of a run, leave the option out; for an allowlisted host that is not reached,
      see the network and the proxy's log, and correct or remove the host in `ALLOWLIST`; for a canary that is
      reached or a hostname that is not refused, the confinement does not hold, so do not work around it and
      report it (R5)
- [x] Try each recovery that can be tried without breaking the confinement, and say in the record of each
      whether it was tried. Replace `### Rows with no "What to do"` in the record by the list of the cells
      written new (R5)
- [x] Run the checks under "Verification" again on the final tree and log in `record.md` what was run and what
      it reported (R17)

The review, added after the review of `790d0a0`:

- [x] Correct the recovery of a `--connect` whose unit names no local branch, by finding S1: the unit run that
      cuts the branch is started with the unit's number, since no branch is cut for a name. Try it, and bring
      the record's list of the cells written new along (R5)

The section on moving from a release up to 4.0.0, which the human took out after the reviews:

- [x] Take the section's line out of the table of contents, see that nothing else names the section, and list the
      section in the record under what the document leaves out (R10)

The form of the two sections, added on the human's word after the reviews. It stands above the tasks of the form
above, which describe the HTML tables as they were first built:

- [x] Write "Where things are kept on the host" and "When something goes wrong" with no HTML. The places are a
      Markdown table of where each is and how it is removed, with what each is and holds as text under its name.
      Each failure is what is seen, in bold, then why, then what to do, and a failure with several causes has
      each cause with its recovery. Every statement of the two tables stays. Say in `AGENTS.md` that the document
      holds no HTML, and name an entry where it names a row. Run "Verification" again (R3, R5, R16, R17, R18)

Finishing:

- [x] Run the checks under "Verification" on the final tree and log in `record.md` what was run and what it
      reported (R17)

## Verification

The commands the checks below name, each run from the root of the repository:

```sh
base="$(git merge-base master HEAD)"

# The move
comm -23 <(git show "$base":SANDBOX.md | sort -u) <(sort -u SANDBOX.md)

# What was tried
grep -n -E 'w(as|ere) (not )?shown|macOS 15|Docker 28|Docker Desktop 4' SANDBOX.md

# The places
grep -n -E 'local/state|XDG_|agent-home|share/agentrite|docker volume|image prune|rm -rf' SANDBOX.md

# The titles
git grep -n -E '"(Working on a clone|Connecting to a unit run|What a unit run defends against)"' \
  -- . ':!changes' ':!CHANGELOG.md'
git grep -n -E '"(Another working directory|Extra directories|The home volume|The harness logs)"' \
  -- . ':!changes' ':!CHANGELOG.md'
git grep -n -E '"(The harness versions|Logging in to a model provider|Egress)"|"The shared' \
  -- . ':!changes' ':!CHANGELOG.md'

# The spellings
comm -13 <(git show "$base":SANDBOX.md | grep -o '`[^`]*`' | sort -u) \
  <(grep -o '`[^`]*`' SANDBOX.md | sort -u)

# The line length and the dashes
git diff --name-only "$base" | xargs awk 'length > 120 { print FILENAME ": " FNR }'
git diff --name-only "$base" | xargs grep -n -P '\x{2014}'
```

- [x] `npm test` passes on the final tree (R17)
- [x] `npm run check-changes` exits 0, run after the last commit (R17)
- [x] `grep '^## ' SANDBOX.md` prints the twelve titles of requirement 1 in their order, `grep -c '^### '
      SANDBOX.md` prints 0, and every link of the table of contents is the anchor of one of them. The anchor of the
      last is `#when-something-goes-wrong` (R1, R10)
- [x] `grep -n -E '</?(table|tr|th|td|br)>' SANDBOX.md` prints nothing (R18)
- [x] `git grep -n "harnesses' saved logins" -- . ':!changes' ':!CHANGELOG.md'` prints nothing (R19)
- [x] "The move", run after the move and before the form, prints only headings, lines of the table of contents,
      the first sentence of the opening and lines in which a title changed (R13)
- [x] "What was tried" prints nothing (R12)
- [x] "The places" prints lines of "Where things are kept on the host" only (R3)
- [x] "The titles" prints nothing, for each of its three commands (R11, R15)
- [x] "The spellings" prints only what the record names under `### New statements` and under the recoveries
      written new
      (R13)
- [x] `git diff "$base" --stat` names `SANDBOX.md`, `README.md`, `AGENTS.md`, the two `compose.project.yml` files
      and the unit's own documents, and, for the correction, `container/entrypoint.sh` and
      `tests/entrypoint-home-owner.test.mjs`, and no other file. The diff of `README.md` and of the two
      `compose.project.yml` files changes titles and the layout of one table, and nothing else (R15)
- [x] Every refusal the record lists under requirement 6 has its message quoted, and the quoted message names why
      and what to do (R6, R14)
- [x] "The line length and the dashes" prints nothing: no line of a changed file is over 120 characters, and none
      holds an em dash
- [x] Every requirement of the spec has a ticked task that names it

## Commit Points

- [x] `feature-0039 Plan the slimming of the sandbox reference`: the plan and the record
- [x] `feature-0039 Move the sandbox reference into the sections of its reader`: the move, in `SANDBOX.md`,
      `README.md` and the two `compose.project.yml` files
- [x] `feature-0039 Put the places and the failures of the sandbox in two tables`: the form, in `SANDBOX.md`, and
      the record's new statements
- [x] `feature-0039 Take out of the sandbox reference what a reader does not need`: the cuts, in `SANDBOX.md`, and
      the record's list
- [x] `feature-0039 Say in AGENTS.md how the sandbox reference is kept`: `AGENTS.md`
- [x] `feature-0039 Record the implementation and what was run`: the record, with the suites on the final tree
- [x] `feature-0039 Plan the correction of which login a home volume holds`: the plan and the record
- [x] `feature-0039 Say which login a removed home volume discards`: `SANDBOX.md`, `container/entrypoint.sh`, its
      test, and the record, with the suites on the final tree
- [x] `feature-0039 Say what to do for the failures that had no recovery`: `SANDBOX.md` and the record, with the
      suites on the final tree
- [x] `feature-0039 Take the move from a release up to 4.0.0 out of the sandbox reference`: `SANDBOX.md` and the
      record
- [x] `feature-0039 Write the places and the failures of the sandbox without HTML`: `SANDBOX.md`, `AGENTS.md`, the
      plan and the record, with the suites on the final tree
- [x] `feature-0039 Start the unit run that a --connect waits for by its number`: `SANDBOX.md`, the plan and the
      record, with the review's own entry and the suites on the final tree
