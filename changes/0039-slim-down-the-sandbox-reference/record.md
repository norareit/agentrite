---
kind: feature
status: in-progress
timestamp: 2026-10-08T13:27:02Z
---

# 0039 Slim down the sandbox reference

## Log

- 2026-10-08T13:27:02Z [human] in the session of Claude Code on the host in which unit 0037 was implemented, found
  `SANDBOX.md` too long to read through and expected that nobody will read it, asked for ways to slim it down, and
  was given ten. Decided that 0037 is reviewed first and that slimming the document is a unit of its own. After
  0037 was marked implemented, asked for that unit to be made
- 2026-10-08T13:27:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `78b5975`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made
  the unit as a feature, since what stays in the document takes decisions. Numbered 0039: the plain directories
  run from 0001 to 0038 without a gap, and 0042 and the `history-` directories do not count. Wrote a first
  `spec.md`, which kept the present sections and their titles and cut within them
- 2026-10-08T14:50:07Z [human] decided on that draft: no length is required of the document, which is as long as it
  needs to be. Said who its reader is: someone who uses AgentRite and wants to find out how to use the container in more
  detail than the README explains. Asked whether the document would be usable for that reader, was told that it would be
  shorter and still ordered by the parts of the sandbox, and asked for the spec to order it by what a reader does
- 2026-10-08T14:50:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `78e0a1b`, rewrote
  `spec.md` for that. `SANDBOX.md` has a table of contents since that commit, which the rewritten document keeps. The
  human asked for a unit for the ten ideas and chose among none of them, so these are the specifier's and not the
  human's in those words: the thirteen sections, their titles and their order; that the places on the host and the
  failures are each one table; that a refusal which explains itself goes, which changes what 0037 had the documents
  hold; and what "Holding a harness version" and "Reaching more hosts" keep. Read for it: `SANDBOX.md`, and the notes of
  4.1.0 in `CHANGELOG.md`, which name the README's "The harness logs" for the copy command and do not hold it, so the
  command stays. Not checked: which refusals have a message that names why and what to do, which is the implementer's by
  requirement 6; which lines outside `SANDBOX.md` name a section of it, which is the planner's; and whether the release
  notes say what was tried for `--connect`, as they do for the harness logs. Status left at `draft`
- 2026-10-08T14:56:21Z [human] asked for a requirement that `AGENTS.md` says when `SANDBOX.md` is changed or added to,
  so that a later feature of the sandbox ends up in it
- 2026-10-08T14:56:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, added that to requirement 16 as its
  first rule, with a decision. No requirement was renumbered. Status left at `draft`
- 2026-10-08T14:56:47Z [human] approved the spec as it stands on `master` at `bdba779`
- 2026-10-08T14:56:47Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host, on `master` at
  `bdba779`, set the status to `approved`
- 2026-10-08T15:00:59Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host that
  the main session started. Cut `feature-0039-slim-down-the-sandbox-reference` from `master` at `e5f58a1`, on which
  `npm test` passes with 403 tests and `npm run check-changes` exits 0. Read `process.md` and `roles/planner.md` of
  the installed release 4.2.0, the spec, this record, `AGENTS.md`, `SANDBOX.md`, `CONTRIBUTING.md`, the README from
  "Commands" on, every message of `container/agent.sh`, `container/unit-clone.sh` and `container/entrypoint.sh`,
  and every line outside `changes/`, `CHANGELOG.md` and `node_modules/` that names `SANDBOX.md` or a title of it.
  Found five things the plan needs that the spec leaves open or says in two ways, wrote no `plan.md` and changed
  nothing else. The status stays `approved`, and the unit goes back to the specifier and the human:
    1. What leaves the sections that requirement 1 does not close. Requirements 7, 8 and 10 end in "and nothing
       else" or "and no more". Requirement 1 says what the sections 1 to 6 hold and says neither, and gives 8 and
       9 a title alone. The context says the unit "takes out what a reader does not act on", and no requirement
       does. So a statement of today that is no refusal, no failure, no repetition and no report of what was
       tried has no requirement to leave by, and requirement 14 asks for one for every statement that left.
       Examples: that `--connect` "starts no container and stops none, builds no image, asks npm nothing", that
       a connected command has "no capability and no way to gain one", that the host's other branches are in
       the clone as `origin/*`, that sessions are under `.claude/projects/-work`, that the status line script
       is mounted at each start. The plan needs to know whether such a statement stays, or leaves and by which
       requirement. It decides most of the document's length
    2. Requirement 5 against requirements 1 and 9. Requirement 5 asks for a row for every failure a reader
       recovers from by doing something, and has a failure that is a row described nowhere else. Requirements 1
       and 9 put five such failures in a section: what to do after a crash and how waiting commits are merged
       in "Getting the work back", what an install removes for the other side and the two commands that restore
       it in "Running on the tree as it is", the login that cannot complete in "Logging in", and where a
       refused connection is logged in "Reaching more hosts". Each can be in its section or a row, not both.
       The same question holds for the local model server behind a host firewall, which is all but two lines
       of its section today
    3. Requirement 6 against requirement 11. Requirement 11 has the refusal of a home volume in which a
       directory is not the agent's stated once. Its messages, in `check_log_directory_owners` of
       `container/entrypoint.sh` with `home_volume_recovery`, name the directory, its owner, the agent's uid,
       why, and the command that removes the volume, so by requirement 6 the refusal is not in the document at
       all. The refusal of a home owned by another uid, in `check_home_owner`, is the same. What today's text
       says beyond the messages would go with them: that a developer who wants the volume's logs copies them
       first, which a refused volume still allows
    4. Requirement 3 against requirements 1 and 10. Where the clone is, and how it is removed, is to be said
       nowhere but in the table, and requirement 1 has "Getting the work back" say how a kept clone is
       discarded. A pointer to the table, by requirement 11, would serve both if that counts as saying it.
       The command of requirement 10 spells the log directory's path and the home volume's name, which
       it cannot do without
    5. Two cells of the table of requirement 3 have no statement in today's document: how the project's log
       directory is removed, and how the image is. Today's text removes only the images a rebuild left behind,
       with `docker image prune`. The non-goals take out correcting the content, and these cells would be new
       statements, written from the code
- 2026-10-08T15:00:59Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the same session, for whoever
  plans next, what was found and does not depend on the five. Outside `SANDBOX.md` a section of it is named by
  title in the README, in "Commands" after the table of `./agent.sh`, in "Installing it into a project" and "On
  a fresh clone" for "Egress", and in "The sandbox" in its text and in the last column of its table, and in the
  comment above `ALLOWLIST` in `templates/project/agent/compose.project.yml` and in this repository's own
  `agent/compose.project.yml`. `CONTRIBUTING.md` names none, no message of a command names one, and no test reads
  the text of `SANDBOX.md`. The refusals whose messages name why and what to do, on a first reading that the
  implementer still checks: the two of the home volume, a second run of a branch whose container runs, a new
  run while `sandbox/<branch>` holds commits, a unit that names several branches, `--connect` with no run under
  way, uid or gid 0, an address in an allowlist, and a latest version that cannot be found. Those that say why and
  not what to do: `master` holds no unit of the number, a record on `master` that cannot be read, no local branch
  `master`, and Docker that could not be asked
- 2026-10-08T15:09:00Z [human] read the planner's five findings and decided, on four questions of the specifier. A
  statement in a section of what a reader does stays when a reader can observe it, and not only when a reader acts on
  it. Every failure a reader recovers from is a row of the table and is in no section. The two refusals of a home volume
  leave the document, and the advice to copy a volume's logs first stays, with the copy command. The two cells that
  today's document has no statement for are written new
- 2026-10-08T15:09:00Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on the unit's branch at `2e4652b`, changed `spec.md` for that. The first: requirement 2 has the rule for what stays in
  sections 1 to 6, 8 and 9 and what goes, with the planner's three examples decided by it. The second: requirement 5
  names the six failures as rows, and requirements 1, 8 and 9 no longer have them in a section. The third: requirement 6
  names the two refusals as going, requirement 11 no longer has one of them stated once, and requirement 10 holds the
  advice. The fourth, which was not put to the human since it has one answer: by requirement 3 a section that needs a
  place names the table by its title, which is not saying it, and requirement 1 no longer has "Getting the work back"
  say how a clone is discarded. The fifth: requirement 3 has the two cells written new, tried and named in the record,
  and the non-goal says so. Each has a decision. No requirement was renumbered. The status stays `approved`, since all
  are the human's own decisions
- 2026-10-08T15:19:37Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host that
  the main session started, on the unit's branch at `947bb57`, on which `npm test` passes with 403 tests and
  `npm run check-changes` exits 0. Read `process.md` and `roles/planner.md` of the installed release 4.2.0, the
  rewritten spec, this record, `AGENTS.md`, `README.md`, `SANDBOX.md`, `CONTRIBUTING.md`, and the messages of
  `container/agent.sh`, `container/unit-clone.sh` and `container/entrypoint.sh`. `process.md` has a correction of
  the spec made on the unit's branch after the approval and asks for no second approval, so the spec was planned
  as it stands. Checked each of the five points against it: all five are decided. Checked the earlier planner's
  findings against the tree: the places outside `SANDBOX.md` that name a section of it are as recorded, and its
  reading of the messages holds as a first reading, which the plan gives beside each refusal for the implementer
  to check. Wrote `plan.md` and set the status to `planned`
- 2026-10-08T15:19:37Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the same session, what in the
  plan is the planner's reading and not the spec's words, for the human:
    1. The two tables are HTML tables. A row holds more than a line of 120 characters can, a pipe table cannot be
       wrapped, and `AGENTS.md` has all text wrapped at 120 characters
    2. A refusal that stays as a row by requirement 6, and whose recovery neither its message nor today's document
       gives, has an empty "What to do". The non-goals have nothing new written but the two cells of requirement
       3. The implementer names every such row in the record
    3. A statement that no requirement takes out stays, also when it is none of the things requirement 2 names as
       staying, since requirement 14 asks for the requirement of every statement that left
    4. "Getting the work back" says that the commits wait at `sandbox/<branch>` when the host's branch cannot be
       fast-forwarded, which requirement 1 asks of it, and the two causes and the command are in the row, which
       requirement 5 asks
    5. Where each harness keeps its login is stated in the table of where things are kept, in what the home
       volume and the log directory hold
    6. Two projects whose root directories have one name, a build that fails although an image exists, the
       removal of a clone that fails, and what is seen when a harness version breaks something, are rows by
       requirement 5, beside the six it names
    7. The work is three commits on `SANDBOX.md`: a move that loses nothing, the form, and the cuts with the list
       of requirement 14
- 2026-10-08T15:24:27Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the main session on the Linux
  host, in the main checkout on the unit's branch at `08c374f`. Read `process.md` and `roles/implementer.md` of the
  installed release 4.2.0, the spec, the plan, this record, `AGENTS.md`, `SANDBOX.md`, the passages of `README.md`
  that name a section of `SANDBOX.md`, and `container/agent.sh`, `container/unit-clone.sh` and
  `container/entrypoint.sh` in full. Set the status to `in-progress`
- 2026-10-08T15:24:27Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the move. `SANDBOX.md` was
  put together by a script from line ranges of the base document, so that no line was typed again. "The move" of
  the plan's "Verification" prints the base document's headings, its table of contents, the first line of the
  opening, and the ten lines in which a title changed, and nothing else. One of those ten was wrapped again,
  because the longer title took it over 120 characters. "The titles" prints nothing for each of its three
  commands, and `npm test` passes with 403 tests on that tree. Where the move differs from the plan's words,
  because two of its tasks cannot both hold for a line: the move leaves every line as it is, and four refusals
  share a line or a list item with a statement that stays. A name that no branch has, a number that names several
  branches, a second run of a branch whose container runs, and an address in an allowlist therefore stand in the
  section of their subject after the move and not in "When something goes wrong", and are taken apart in the form.
  For the same reason the paragraph on the shared `node_modules` stands whole with its row, and what the base
  document says of a refused home volume under "Moving from a release up to 4.0.0" stands in that section
- 2026-10-08T15:31:36Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave the document its form:
  the two HTML tables, and the sections 1 to 9 as requirement 2 has them. Nothing of the base document leaves in
  this commit: what the cuts take out stands in its section, or below the table of "When something goes wrong"
  for a refusal. Read the message of every refusal of the plan's table in the code. The reading is the planner's
  for each of the twenty, so nine are in the table and eleven go with the cuts. The nine are three rows, since
  those that share what is seen are one row: a unit run that starts nothing, with a name that no branch has and
  the four causes for which no branch is cut, a `--connect` that runs nothing, with its three causes, and the
  checks of the boundary at start-up
- 2026-10-08T15:31:36Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, tried the two new cells of
  requirement 3 on the Linux host with Docker 28.4.0, with `XDG_DATA_HOME` set to a temporary directory and the
  image and the Compose project of `./agent-dev.sh`. What was run and what it showed is under `### New statements`
  below. The last of those runs was started with `container/agent.sh` and `AGENT_PROJECT_NAME` set as
  `agent-dev.sh` sets it, and not with `./agent-dev.sh`, which gives `--rebuild` and so would have built whether or
  not the image was there
- 2026-10-08T15:33:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the cuts, and listed under
  `## What SANDBOX.md leaves out` what left, by the section of the base document it stood in. The list was made by
  reading the base document from its first line to its last and looking for each statement in the new one. Every
  message quoted there was read in the script it names. Close calls, where a statement stayed: that a subdomain
  needs its own entry, as what "matched exactly" asks of a reader, by requirement 8; that the agent can read
  `/run/egress-proxy.log`, with where a refused connection is logged, by requirement 5; and the three the plan
  names. Requirements 1 and 7 both have it said that the versions are those of the checkout the command is run
  from: "Running a unit" says it, and "Holding a harness version" says it in one sentence and names that section
- 2026-10-08T15:33:49Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the rules of requirement 16 to
  "The documents" of `AGENTS.md`, and ran the checks of the plan's "Verification" on the tree at `c9edab5`, which holds
  everything but this entry and the last ticks of the plan. `npm test` passes with 403 tests, and `npm run
  check-changes` exits 0. `grep '^## ' SANDBOX.md` prints the thirteen titles in their order, there is no `###`, and the
  thirteen links of the table of contents are the anchors of the thirteen titles. "What was tried" prints nothing. "The
  places" prints lines of "Where things are kept on the host" and of "Moving from a release up to 4.0.0" only. "The
  titles" prints nothing for each of its three commands. "The spellings" prints `<project>_agent-home`, which is
  accounted for under `### New statements`. "The line length and the dashes" prints nothing. `git diff --stat` against
  the merge base names `SANDBOX.md`, `README.md`, `AGENTS.md`, the two `compose.project.yml` files and the unit's three
  documents. `SANDBOX.md` is 799 lines and 4965 words, where the base document is 581 lines and 5635 words: the two HTML
  tables take a line for each tag and each cell. Not checked: how the two HTML tables are rendered, on GitHub or on npm,
  since nothing here renders them. The status stays `in-progress`, for the review. For the human, besides the review:
  the three rows with no "What to do", the statement found out of date, and the two new cells, all under `## What
  SANDBOX.md leaves out`

## What SANDBOX.md leaves out

Every statement of the `SANDBOX.md` of the merge base that is not in the document afterwards, under the section it
stood in, with the requirement it went by. A statement that moved, into another section or into one of the two
tables, is not listed. A message is quoted as the script holds it, with the script's own variables.

### The opening

* Its first sentence, "The reference of the agent sandbox: what a run mounts, writes, refuses and leaves behind",
  is written anew, as the plan has it, since the document is no longer ordered that way (requirement 1)

### Working on a clone

By requirement 6:

* That the wrapper lists the branches and asks for one by its name when a number names several. The message, in
  `find_unit_branch` of `container/unit-clone.sh`, followed by the branches: "agent.sh: '$unit' names more than
  one branch. Give one by its name:"
* That the wrapper neither fetches nor fast-forwards while the container is still running, or when Docker cannot
  say whether it is. The messages, at the end of `container/agent.sh`: "agent.sh: the container $container_name is
  still running, so nothing was fetched." with "Its clone is at $clone. Once it has stopped, the same command
  resumes the clone.", and, after "agent.sh: could not ask Docker whether the container $container_name is
  running." of `unit_container_running`: "It may still be running, so nothing was fetched. Its clone is at $clone,"
  with "and the same command resumes it."
* That a new run is refused while `sandbox/<branch>` holds commits the branch does not have, and that it is merged
  or deleted first. The message, in `refuse_unlanded` of `container/unit-clone.sh`: "agent.sh: sandbox/$branch
  holds commits of an earlier run that $branch does not have," with "and a new run would overwrite them. Merge it
  first, with 'git merge sandbox/$branch'," and "or delete it, with 'git branch --remotes --delete
  sandbox/$branch'."
* That a second run for a branch whose container is running is refused, and that the refusal names `--connect`.
  The message, in `container/agent.sh` where the unit run's container is named: "agent.sh: the container
  $container_name is running, so a run for $branch is under way." with "Two runs never work on one branch. Wait
  for it, or stop it with 'docker stop $container_name'." and "To run a command beside it: 'agent.sh --connect
  $unit [COMMAND...]'."

By requirement 2, as what a command does not do:

* That cutting checks nothing out and moves no branch that exists, so that the host's checkout, its working tree
  and its index are as they were

### Connecting to a unit run

By requirement 6, of the cases in which `--connect` runs nothing:

* No unit is given. The message, in `container/agent.sh` after the options are read: "agent.sh: --connect needs a
  unit." with "  agent.sh --connect UNIT [COMMAND...]"
* The unit names several branches, which it lists. The message is that of `find_unit_branch`, quoted above
* No container of the unit's run is running, that it says no run is under way and names the command that starts
  one. The message, in `container/agent.sh` where `--connect` ends: "agent.sh: no run is under way for '$unit': the
  container $container_name is not running." with "Start one with 'agent.sh $unit'."
* It is run with uid or gid 0, as every form of the wrapper is. The message, in `container/agent.sh`: "agent.sh:
  refusing to run as root (uid/gid 0)." with "The sandbox's 'agent' user would then be root, defeating the
  sandbox.", "If Docker needs elevated permissions, add your user to the docker group" and "instead of running
  this with sudo."

By requirement 2, which names it:

* That `--connect` starts no container and stops none, builds no image, asks npm nothing, makes no clone, cuts no
  branch and fetches nothing, and changes nothing in the host's repository

By requirement 12:

* That `--connect` was shown on Linux with Docker 28.4.0, and not with a harness in each of two shells, and not on
  macOS

### What a unit run defends against, Another working directory, Extra directories, The shared `node_modules`

Nothing.

### The home volume

By requirement 6, which names both:

* That the agent is always the host user's uid, set when the image is built, that a home volume first filled by an
  image whose agent had another uid stays owned by that uid so that the agent cannot write it, and that the
  entrypoint then refuses to start, naming both uids and how to recover. The message, in `check_home_owner` of
  `container/entrypoint.sh`: "$home_path is owned by uid $home_owner, but the agent is uid $agent_uid, so the agent
  cannot write its home.", followed by that of `home_volume_recovery`: "Recover by removing the project's
  agent-home volume, which discards the harnesses' saved logins, and starting again.", "The volume is named
  <project>_agent-home, where <project> is the Compose project's name, set as 'name:' in",
  "agent/compose.project.yml. Find the exact name with docker volume ls, then:" and "  docker volume rm
  <project>_agent-home"
* That the entrypoint refuses one more home volume in the same way and with the same recovery, one in which a
  directory above the two mounted log directories is not the agent's. The message is quoted under "Moving from a
  release up to 4.0.0" below

### The harness logs

By requirement 12:

* That the mounts were shown to work on macOS 15.1.1 with Docker Desktop 4.26.0 and VirtioFS as its file sharing,
  and with no other file sharing of Docker Desktop for macOS, so neither with gRPC FUSE nor with osxfs

### Moving from a release up to 4.0.0

By requirement 10:

* That releases up to 4.0.0 kept the logs in the home volume
* That after the move the sessions in the volume are no longer listed or continued, because the harnesses now look
  in the log directory
* That OpenCode asks for its login once more
* That nothing is deleted: the volume holds what it held, under the mounted directories, where a container no
  longer sees it
* That the command copies Claude Code's sessions and OpenCode's data directory, each when the volume holds it, and
  prints every file it copied
* That the volume is mounted read-only, and that the container has no network and does not run the sandbox's
  entrypoint, so that it installs no firewall
* That it runs as the developer, so that what it writes is the developer's
* That of OpenCode it copies nothing at all once the log directory holds a database, and says so, and that this is
  why it is run before the first start with the later release: once OpenCode has held a session in a sandbox, the
  log directory holds a new database. That it is run before that first start stays

By requirement 6, which names it:

* That a home volume in which a harness was never started may be refused after the move: that such a volume lacks
  `.claude`, or `.local/share`, so that the mount point inside it and every missing directory above it is root's
  and the agent cannot write them, that the entrypoint then refuses to start before the command runs, naming the
  first such directory, its owner and the agent's uid, that removing the volume is the way on, and that the next
  start makes a new one from the image, which holds both mount points and every directory above them as the
  agent's. The message, in `check_log_directory_owners` of `container/entrypoint.sh`: "$directory is owned by uid
  $owner, but the agent is uid $agent_uid, so the agent cannot write it.", "The home volume was made by an earlier
  release, in which that directory was never made, so Docker made it as root" and "when it mounted the harnesses'
  logs inside it.", followed by that of `home_volume_recovery`, quoted above
* That a directory which admits its owner alone, as tools that follow the XDG convention make `.local`, passes
  when it is the agent's, and that one which even the agent cannot read is refused in the same way, with what the
  read said in place of an owner. The message, in the same function: "$directory could not be examined as the
  agent, so the agent cannot be shown to write it: $owner", followed by that of `home_volume_recovery`

### The harness versions

By requirement 7, as none of the six things it lists:

* That the kit names no version of either harness
* That the wrapper says in one line which latest published version the image gets
* That the value is passed to npm as it is, so that a tag such as `latest` is installed once, when the image is
  built, and not again. That an exact version is given stays
* That the wrapper finds the latest with `npm view <package> version` on the host, so that the build needs `npm`
  on the host for this
* That it asks only when it is about to build: a start that builds nothing asks the registry nothing, and neither
  does a build for which the project or the host gives both versions
* That for a harness with neither source there is nothing to compare: the sandbox keeps the version the image
  records, and the wrapper builds only when the image records none
* That an image built by a release that did not write the labels records no version, and is built again at the
  first start
* That on a host without a harness, the sandbox's version of it is the latest of the day the image was last built
* That self-update stays off inside the sandbox, for both harnesses: its root filesystem is read-only, and holds
  what the build installed
* What the kit promises for any version: the confinement, which depends on no harness's version, with the
  firewall, the proxy, the read-only root, the capabilities and the mounts the same whichever version is
  installed, and a harness that contacts a host the kit does not admit refused as before. And that the image holds
  exactly the version the rules name, or the start fails. What it promises for no version is in the row of a
  harness version that breaks something

By requirement 6:

* That the wrapper stops when the latest cannot be found, because the registry is not reached, `npm` is not on the
  `PATH`, or its answer is not a version, that it builds nothing and starts nothing although an image may exist,
  that it says which harness and which command gave no version, and that either a version in the project's file,
  under `services.agent.build.args`, or the harness on the host gets past it. The message, in `latest_published`
  of `container/agent.sh`: "agent.sh: could not find the latest published version of $harness: 'npm view $package
  version' gave none." with "Give a version in agent/compose.project.yml, under services.agent.build.args as
  $argument, or install $harness on the host."

### The status line, Logging in to a model provider, The local model server

Nothing.

### Egress

By requirement 8, as none of the four things it lists:

* That every outbound connection on port 443 goes to `container/egress-proxy.mjs`, which runs as its own
  unprivileged account
* That it reads the hostname from the TLS ClientHello and admits the connection only if that host is allowlisted
* That it resolves the host itself and connects there, never to the address the client asked for, so that an
  allowlisted name sent to some other address does not reach that address
* That it terminates no TLS and installs no certificate: it forwards the connection's bytes unchanged, and the
  client validates the origin's own certificate
* That it logs one line for each connection it allows or refuses. The name of the log and that the agent can read
  it stay, in the row of a connection that is refused
* That another host served from the same address as an allowlisted one is refused
* That a host whose addresses rotate stays reachable, because the proxy resolves it per connection
* That Encrypted ClientHello is judged by its outer hostname, the one sent in the clear, that Chromium sends the
  extension as GREASE and puts the real hostname there, so that it is checked like any other, and that a genuine
  ECH connection carries the provider's public name there and is refused unless that public name is itself
  allowlisted, in which case the real hostname inside is not seen
* That egress stops if the proxy stops: the redirect still points at its port and nothing else admits port 443

By requirement 6:

* That an address or CIDR range in an allowlist is refused at start-up. The message, in `read_allowlist` of
  `container/entrypoint.sh`: "$name entry $line is an address; egress is admitted by hostname only, so list the
  host"

### New statements

The two cells of "Where things are kept on the host" that the base document has no statement for.

* How the project's log directory is removed: "With no sandbox of the project running, remove the directory with
  `rm -rf`. The sessions of both harnesses and OpenCode's login go with it. The next run makes the directory
  again, empty." Tried: `./agent-dev.sh --in-place true` made `<data>/agentrite/agentrite` with
  `.claude/projects` and `.local/share/opencode` in it. With no sandbox running, a file was put in
  `.claude/projects` and the directory removed with `rm -rf`. The next run, `--in-place true`, started as before
  and made the directory again with the two directories in it, both empty. Not tried: removing it while a sandbox
  runs, which is why the cell names the condition. That the sessions and OpenCode's login go with it was not
  tried with a harness: it follows from what the base document says the directory holds
* How the image is removed: "`docker image rm <image>`" and "The next start builds the image again." Tried:
  `docker image rm ritenoar-agentrite-agent-dev`, with no container of it, untagged and deleted the image, and
  `docker image inspect` of it then failed. The next start, `--in-place true` without `--rebuild`, built the
  image by itself, verified the firewall and ran the command. Not tried: removing an image while a container of
  it runs

`docker image rm` is the one spelling in the document that the base document does not hold. "The spellings" of
the plan's "Verification" prints `<project>_agent-home` alone: the base document holds it inside
`docker volume rm <project>_agent-home` and in its code blocks, and the table names the volume by it.

### Rows with no "What to do"

Three rows of "When something goes wrong" have an empty "What to do", for the human. Their messages say why and
not what to do, so they stay by requirement 6, and the base document gives no recovery for them:

* a unit run for which the wrapper refuses the unit or cuts no branch
* a `--connect` that runs nothing, for its three causes that stay
* an entrypoint that refuses to start because a check of the boundary fails

### Out of date, left as it is

One statement that stays was found out of date, for the human:

* "Removing the volume discards the harnesses' saved logins", of the home volume, in "Where things are kept on
  the host". Since the logs are on the host, the volume holds Claude Code's login alone, and OpenCode's is in the
  project's log directory, as the same table says. The message of `home_volume_recovery` in
  `container/entrypoint.sh` says the same as the statement

Looked at and not out of date: "at about 0.6 GB", of an image a rebuild left behind. `docker system df -v` on the
Linux host gives 625.8MB as the unique size of an image whose harness layers differ from the others. No other
statement was held against the code for being out of date.

## Amendments
