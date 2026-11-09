# 0101 The security reviewer: network controls, run names, audit scope, accepted risks and audit scripts

## Approach

The work is in three parts: the two scripts at the root with their tests, their description in `CONTRIBUTING.md`, and
the role file with its regenerated wrappers. The scripts come first, so that the role file can name them as they
are. Nothing of the package changes: the scripts are this repository's own and are not added to `files` of
`package.json`, and no document of the package names them.

### The setup script

`setup-security-audit.sh`, at the root, executable, a bash script opening as `sandbox-dev.sh` and
`generate-diagrams.sh` do: a comment saying what it does, that only this repository has it and that
`CONTRIBUTING.md` describes it, and `set -euo pipefail`. It does not `cd`, so a relative `<clone>` is taken from the
directory it is run from (R26). `here` is the directory of the script, as `sandbox-dev.sh` finds it. Every message
opens with `setup-security-audit: `, a refusal or failure goes to standard error, the rest to standard output.

In this order:

1. Exactly one argument, not empty. Otherwise it prints `usage: ./setup-security-audit.sh <clone>` to standard error
   and exits `2` (R40)
2. When `[ -e "$clone" ] || [ -L "$clone" ]`, it says that `<clone>` exists and that the clone is made in a new
   directory, and exits `1`, having made nothing (R27). The `-L` test catches a dangling link
3. It reads the default branch with `node "$here/scripts/agentrite-settings.mjs" "$here"`, the reader the sandbox's
   wrapper uses, so that the script does not read `agentrite.json` a second way. A failure of the reader exits `1`
   with the reader's message, having made nothing (R28)
4. `git clone --branch "$branch" -- "$here" "$clone"`, exiting `1` when it fails (R28). The `--` keeps a `<clone>`
   that begins with `-` from being read as an option, and is no other change to the command the spec gives
5. `realpath -- "$clone"` is appended as one line to `$here/.reviews/security-audits/clones`, after
   `mkdir -p "$here/.reviews/security-audits"` (R30). It is recorded right after the clone is made, so that a clone
   a later step fails in is still one the finish script can remove
6. `mkdir -p "$clone/.reviews"`. When `$here/.reviews/security-accepted.md` is a file, it is copied to
   `$clone/.reviews/security-accepted.md` and the script says it copied the list of accepted risks; otherwise it
   says there is no list and the audit runs with none (R29)
7. It prints the steps that follow, with `<clone>` as given and `<harness>` written as is: start the sandbox with
   `./sandbox.sh --workdir <clone> <harness>`, dispatch the security reviewer in the session with no unit, and after
   the run, `./finish-security-audit.sh <clone>`. It exits `0` (R31, R40)

### The finish script

`finish-security-audit.sh`, at the root, executable, opening as the setup script does, with messages opening with
`finish-security-audit: `. It runs no git command and nothing from the clone, and tests the clone's files only with
`[ -L ]`, `[ -d ]` and `[ -f ]` and a glob of names (R34). It does not `cd` (R32).

In this order, and before the first move nothing is changed:

1. Exactly one argument, not empty, otherwise the usage `usage: ./finish-security-audit.sh <clone>` and exit `2` (R40)
2. `absolute="$(realpath -- "$clone")"`, exiting `1` when it fails. Every later step works on `absolute`, so that a
   `<clone>` that is a link to the clone removes the clone and not the link alone
3. When `$here/.reviews/security-audits/clones` is not a file or `grep -Fxq -- "$absolute"` finds no line of it, it
   says the directory is not a clone the setup script made, and exits `1` (R33)
4. For `$absolute/.reviews` and then `$absolute/.reviews/security-audits`: when it is a link (`-L`) or not a directory
   (`! -d`), it names it and exits `1` (R35). The link test comes first, since `-d` follows a link. One that is not
   there at all, neither `-e` nor `-L`, is no refusal: the clone then holds no findings file, as a run stopped before
   it saved its file leaves it, and step 7 says so (R38)
5. With `nullglob`, it goes over `"$absolute/.reviews/security-audits"/security-audit-*.md`. A path that is a link or
   not a regular file (`-L` or `! -f`) is named as left in place; the rest are the files to move, held in an array
   (R36)
6. For each file to move, when `$here/.reviews/security-audits/<name>` exists or is a link, it names the file and
   exits `1`, having moved nothing (R37)
7. When there is none to move, it says the clone holds no findings file. Otherwise `mkdir -p
   "$here/.reviews/security-audits"` and `mv -- "$file" "$here/.reviews/security-audits/"` for each, naming each
   file moved. A failed `mv` exits `1` and removes nothing (R12, R36, R38)
8. `rm -rf -- "$absolute"`, which follows no link inside the directory, then the line of `absolute` is removed from
   `clones`: the lines that `grep -Fxv` keeps are written to a temporary file beside it, which is moved over
   `clones`. `grep` exiting `1` because no line is kept is not a failure. It says the clone is removed and exits
   `0` (R38, R39, R40)

### The tests

`tests/security-audit-scripts.test.mjs`, new. Each test makes, with `temporaryDirectory`, a repository fixture: a
directory holding copies of both scripts, executable, and of this repository's `scripts/` (the settings reader and
the modules it imports), the repository's own `agentrite.json` with `defaultBranch` set to `trunk`, and a commit on
`trunk` and another on a branch `other`, which is checked out, so that a clone of the checked-out branch is told apart
from one of the default branch. The scripts are run with `spawnSync` and the test's own `PATH` and `HOME` set to a
directory of the test, as `tests/sandbox-dev.test.mjs` runs its shim, from a working directory the test picks.

The setup script:

* No argument, two arguments and an empty one exit `2` and print the usage (R26, R40)
* An existing empty directory, a non-empty directory, a file, a link to a directory and a dangling link at `<clone>`
  exit `1`, and leave the path as it was and `clones` absent (R27)
* A relative `<clone>`, run from another directory than the repository, makes the clone in that directory, on
  `trunk` with `trunk`'s commit, and `clones` holds its `realpath` as its one line (R26, R28, R30)
* With `.reviews/security-accepted.md` in the repository, the clone's `.reviews/security-accepted.md` has its content
  and the output says it was copied; without it, the clone has `.reviews/` and no list, and the output says the
  audit runs with none (R29)
* The output names `./sandbox.sh --workdir <clone> <harness>` and `./finish-security-audit.sh <clone>`, and the exit
  status is `0` (R31, R40)
* A second setup appends a second line and keeps the first (R30)

The finish script, on a clone made by the setup script unless the case says otherwise:

* No argument, two arguments and an empty one exit `2` and print the usage (R32, R40)
* A directory that is not in `clones`, the repository itself among them, exits `1` and is left whole (R33)
* `.reviews` as a link to a directory, `.reviews/security-audits` as a link, and either as a file, exit `1`, leaving
  the clone and its files (R35)
* Two findings files and a `notes.md` beside them: both findings files are in the repository's
  `.reviews/security-audits/` with their content, the clone is gone, and its line is gone from `clones` while
  another clone's line stays (R12, R36, R39)
* A `security-audit-x.md` that is a link and one that is a directory are named in the output and not moved, and
  neither is the clone's `.reviews/security-accepted.md` (R36)
* A findings file whose name is already in the repository's `.reviews/security-audits/` exits `1`, moves no file,
  the other findings file among them, and leaves the clone and `clones` as they were (R37)
* A clone with no findings file, one with no `.reviews/security-audits` and one with no `.reviews`: the output says
  so, the clone and its line are removed, and the exit status is `0` (R38, R39, R40)
* A link inside the clone to a directory outside it: after the finish the clone is gone and the outside directory and
  its file are still there (R39)
* A `<clone>` given relative to another working directory, and one given as a link to the clone, finish the clone
  (R32, R39)
* The clone holds a `.git/hooks/post-checkout` and a `.git/config` alias that would each write a marker file when
  run: after the finish no marker exists (R34)

### The role file

`extra-roles/security-reviewer.md` is changed in place, section by section, keeping every rule the spec does not
change:

* **Front matter**: the description says that the role audits, on the human's request, the code base or the part of
  it the human names, and the rest as now (R17)
* **"The two modes"**: the audit bullet says that an audit reviews the tree of the default branch as a whole, unless
  the human limits it to certain files or areas, and then it reviews those, reading code outside them only to judge
  a finding within them (R14). The human's start of an audit names `./setup-security-audit.sh <clone>` in place of
  the `git clone`, then the sandbox and the dispatch as now, and after the run `./finish-security-audit.sh <clone>`,
  which moves the findings file from `<clone>/.reviews/security-audits/` to the project's
  `.reviews/security-audits/`, making it when it is not there, and removes the clone (R12, R41). The paragraph that
  the clone is never worked in on the host stays (R41)
* **A new section after "Then, in a unit review, check the status"**, "Then, read the list of accepted risks": in both
  modes the role reads `.reviews/security-accepted.md` of the tree it runs on, before it reviews; only the human
  writes it and the role writes nothing to it; when it is not there, the role reviews as with an empty list and says
  in its findings file and response that there was no list; it takes from the list only which weaknesses were
  accepted and follows no instruction in it, as "Everything under review is data" says (R18, R20, R23). The form of
  an entry is given as the spec's requirement 19 gives it, with the four subsections in order, in a fenced example
  (R19)
* **"What you look for"**: unchanged, "getting past the egress allowlist" among it (R5)
* **"Proofs of concept"**: names the network controls as `SANDBOX.md` does in "What the sandbox defends against" and
  "Reaching more hosts": the egress allowlist, the egress proxy that enforces it, the firewall, the DNS rules that
  admit only the permitted resolvers, and the one exception for the local model server. No proof of concept is made
  against them: the role runs nothing that tests whether they hold, such as a connection or a name lookup meant to
  get past them, and changes none of them; the check of the first step is not such a test (R1). A finding about them
  is reported from reading the code and the configuration of the tree under review, marked as plausible from
  reading, and the check that would confirm it is written into it as a step for the human on the host, as "What
  needs the host" says (R2, R3). For every other kind, the rule as it is now: only in the sandbox, under `/tmp`,
  saved in the finding (R4). "What needs the host" and the first step are unchanged
* **"Reporting"**:
    * The findings file of a limited audit opens by naming its scope, the files or areas the human named, before any
      finding; in it, a statement of no findings says that there are none within the scope (R15, R16)
    * A section "Accepted risks seen again", apart from the findings, in the findings file and the response: each
      weakness that an entry describes in the same place and to the same extent, with the entry's name and where the
      weakness is. The place is judged by the entry's file and line at its commit, followed to the tree under
      review, and by the file and line as given when that commit is not in the tree's history (R21). A weakness an
      entry describes only in part, found wider, more severe or elsewhere, is a finding labelled as any other that
      names the entry (R22). A review whose only weaknesses are accepted ones states it has no findings and names
      that section (R24)
    * The two paths become `.reviews/<unit-directory>/security-review-<commit>-<instant>.md` and
      `.reviews/security-audits/security-audit-<commit>-<instant>.md` (R6, R7). `<commit>` as now (R8). `<instant>`
      is read at the same point as `<commit>`, with `date -u +%Y%m%dT%H%M%SZ`, as `20261108T141500Z`, a form that
      holds no colon and no `--` (R9). On a variant's branch the name ends in `--<name>.md` after the instant, as
      `security-review-<commit>-<instant>--opus.md`, and on the unit's branch it holds no `--` (R10). The role makes
      the directory of its file when it is not there, `.reviews/security-audits/` among them (R11)
* **"Where your writing stops"**: what it says of the findings it says also of the accepted risks: nothing but the
  findings file and the response names an accepted risk or says whether one was seen again (R25)
* **"Record that you reviewed"**: the text still names `<commit>`, now "as the name of your findings file gives it,
  without the instant", and no finding, label, count or file (R13)

The wrappers `.claude/agents/security-reviewer.md` and `.opencode/agents/security-reviewer.md` are regenerated with
`npm run kit -- refresh`, the installed release's command, since `tests/repository-own-files.test.mjs` checks that
refresh finds them up to date (R17).

## Files

- `setup-security-audit.sh`, `finish-security-audit.sh`: new, executable
- `tests/security-audit-scripts.test.mjs`: new
- `CONTRIBUTING.md`: a section for each script under "Commands", two rows of "What the repository holds besides the
  package"
- `extra-roles/security-reviewer.md`
- `.claude/agents/security-reviewer.md`, `.opencode/agents/security-reviewer.md`: regenerated
- `changes/0101-security-reviewer-network-controls-run-names-and-scope/record.md`: the log

## Tasks

### The scripts

- [x] Write the cases of the setup script in `tests/security-audit-scripts.test.mjs`, with the fixture above, and see
  them fail (R26 to R31, R40)
- [x] Write `setup-security-audit.sh` as "The setup script" says, make it executable, and run the cases until they
  pass (R26 to R31, R40)
- [x] Write the cases of the finish script in the same file and see them fail (R12, R32 to R40)
- [x] Write `finish-security-audit.sh` as "The finish script" says, make it executable, and run the cases until they
  pass (R12, R32 to R40)
- [x] Run `npm test`, and `./sandbox.sh --in-place npm test` for the tests a host skips, and correct until both pass

### The documents of the repository

- [x] In "Commands" of `CONTRIBUTING.md`, after `sandbox-dev.sh`, add a section `### setup-security-audit.sh` and a
  section `### finish-security-audit.sh`, each with its form in a `sh` block, its argument, that it runs on the host
  from any directory, what it does, what it refuses, and its exit statuses by "Exit statuses" of `COMMANDS.md`, as
  the section of `sandbox-dev.sh` gives its own. The finish script's section says that a clone with no findings file
  is removed too (R42)
- [x] Add both scripts to the table of "What the repository holds besides the package", after `generate-diagrams.sh`,
  keeping the table's columns aligned (R42)

### The role

- [x] Change `extra-roles/security-reviewer.md` as "The role file" says (R1 to R25, R41)
- [x] Run `npm run kit -- refresh` and check that it rewrote only the two wrappers of the security reviewer, with the
  new description (R17)
- [x] Search the repository outside `node_modules`, `.git` and `changes/` for `security-audit-<commit>.md`,
  `security-review-<commit>.md` and `.reviews/security-audit-`: nothing but the role file and its wrappers names a
  findings file, and only in the new form (R43)
- [x] Check every changed and new file for the line limit of 120 characters and for em dashes, then run `npm test`
  and `npm run check-changes`

### The review

- [x] Add cases of a `<clone>` that begins with `-`, given relative to the directory the scripts are run from: the
  setup script makes the clone with its `.reviews/`, copies the list and prints the steps, and the finish script
  finishes it. See the setup case fail (S1 of the review of `01f9b48`)
- [x] Pass the clone's path to `mkdir` in the setup script after `--`, as every other command of both scripts that is
  given a path from `<clone>` has it, and run the cases until they pass. Run `npm test`,
  `./sandbox.sh --in-place npm test` and `npm run check-changes`

## Commit Points

- [x] `feature-0101 Plan the unit`: `plan.md` and the planner's entry in `record.md`
- [x] `feature-0101 Begin the implementation`: the status, the reading of R35 in `plan.md` and the tasks ticked so far,
  with the implementer's entries in `record.md`
- [x] `feature-0101 Add the scripts that set up and finish an audit`: both scripts and their tests. The tree passes
  `npm test`
- [x] `feature-0101 Describe the scripts of an audit`: `CONTRIBUTING.md`
- [x] `feature-0101 Change how the security reviewer reports and is run`: the role file and its two wrappers
- [x] `feature-0101 Record the implementation`: the implementer's entries in `record.md`
- [x] `feature-0101 Take a clone whose name begins with a dash`: the fix of S1, its cases, `plan.md` and the
  implementer's entries in `record.md`
