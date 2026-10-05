# 0031 A release moves the kit's own dependency

## Context

This repository installs its own release as a devDependency, by the URL of the tarball, so that work on the kit
follows the released process and roles and `./agent.sh` runs the released sandbox. Moving that dependency to a new
release has been a unit of its own four times: 0003, 0012, 0016 and 0024. Each was the same work: install the
released tarball, run `refresh` once the repository had files that `refresh` writes, and run the suite and the
change check.

Since 0028 a release is made by following `RELEASING.md`, to which the `/release` skill sends an agent. The agent
checks the branch, the tree and the suite, drafts the release notes, commits them on the human's word, and ends by
telling the human three commands, of which it runs none: `npm version <part>`, `./deploy.sh` and
`git push --follow-tags origin master`.

### What the human decided

On 2026-10-05, right after release 3.0.0 was made with the `/release` skill, the human said: "I just realised:
maybe we need one more thing in this release skill.... Shouldn't it bump the agentrite dependency itself to the
newest version in the end? It's kind of absurd to have to have a new change unit for this afterwards..."

The main session answered with a proposal and asked whether to dispatch the planner for it. The human: "Yes".

So two things are the human's: the release itself moves this repository's devDependency on `@ritenoar/agentrite` to
the version just released, with no unit afterwards; and that this is planned. Everything else in this spec is the
main session's proposal or the planner's, and each decision below says whose it is. None of it has been read by
the human yet.

Shown what the planner's draft held and left out, the human asked for one thing it had left out: "A docker check as
soon as the bump in the agentrite project to the new version has been done, might make sense? Eat your own dog
food. If that works, it's really ready to be pushed and used by the outside world." The main session answered
that the release is public by then, and proposed a second start before `./deploy.sh` and a prompt to each harness.
The human: "Leave it out. Keep it simple. Just the container running is fine." So a third thing is the human's:
once the dependency is moved, the step starts the released sandbox, and asks no more of it than that it runs.

### What the main session proposed

* The move is a step after `./deploy.sh` and before the push, since the tarball has to be served before it can be
  installed. The agent resumes on the human's word that the deploy is done, and the human's one push carries the
  move too
* The step runs `npm install --save-dev <the new URL>`, `npx agentrite refresh claude opencode`, `npm test` and
  `npm run check-changes`, and makes one commit on `master` with no unit prefix
* Anything the new version asks of this repository beyond those commands stays a unit. The step stops and names
  it, and does not repair it
* The move changes `package.json`, which ships, so the next release's shipped diff shows a change that belongs to
  no unit, and the step on the release notes has to say that this one is the release's own
* Two costs, named to the human: a release step leaves no record of its checks, where 0024's record says what was
  checked on a real sandbox and what was not; and `master` ends one commit past the tag, which is already so today
  once the task that moves the dependency is merged
* The move to 3.0.0, which is open, could be the first trial of the new step

### What was found while planning

On `master` at `2c23bec`, the commit `npm version major` made, tagged `v3.0.0`.

* `package.json` holds version 3.0.0 and names `https://agentrite.ritenoar.com/ritenoar-agentrite-2.3.0.tgz` as
  the devDependency. The main session reports that the tarball of 3.0.0 is served. The planner did not fetch it
* 0024's commit, `69921d4`, changed `package.json` by the one URL and `package-lock.json` by eight lines, and
  nothing else. `refresh` reported every file up to date. 0024 also started the sandbox on a host with Docker and
  recorded what it saw there and what it did not check
* `package-lock.json` is not in the package. `package.json` is, whatever `files` says. The step on the release
  notes reads `git diff <tag> HEAD` over `README.md`, `package.json` and the paths in `files`, so a commit made
  after the tag shows in the next release's diff, and the commit `npm version` makes does not
* The section of 3.0.0 names 0024 on its "Not in the package:" line, as "the kit repository's own dependency on
  release 2.3.0"
* `npm run check-changes` on `master` exits 0 and prints nothing: the check compares the branch with `master`, so
  on `master` it has nothing to compare. Run there it shows that the installed check starts, and no more
* `./deploy.sh` runs the suite after `npm version` has moved the version, so between those two commands and the
  move the suite runs on a tree whose devDependency names the release before
* 0028 decided, on the human's words, that the agent runs none of `npm version`, `./deploy.sh` and the push, and
  that its last words are those three commands. This unit keeps that the agent runs none of them and changes
  when it says which
* The suite holds the skill's whole text, description included, in a test. No test reads the steps of
  `RELEASING.md`: 0028 decided that the tests hold the wiring and not the release
* No tracked file of this repository outside `changes/`, `tests/`, the README and the kit's own sources runs
  `./agent.sh` without `--in-place`, a unit or `--workdir`. The main session named such a line as what release
  3.0.0 would ask of this repository beyond the commands. The planner found none, and did not look in files that
  are not tracked, such as a shell alias or a harness's settings on the host

**Not established.**

* That `npm install --save-dev` of the URL of 3.0.0 changes only what it changed for 2.3.0. 3.0.0 holds two files
  more and no new dependency
* What `refresh` writes when moving from 2.3.0 to 3.0.0. The section of 3.0.0 says it writes what it wrote in
  2.3.0
* That a session's guard lets an agent run `npm install` from a URL. 0024's record says it did not block it "this
  time"
* That `./agent.sh --in-place true` exits 0 on the sandbox of 3.0.0 in this repository, and how long its first
  start, which builds the image, takes. Not run

## Requirements

The order, and who runs what:

1. `RELEASING.md` holds the release in seven steps, in this order: what is checked before anything else; the
   release notes; the human's reading; the commit of the notes; `npm version` and `./deploy.sh`, which the human
   runs; the move of the repository's own dependency, which an agent runs; and the push, which the human runs
2. The agent still runs none of `npm version`, `./deploy.sh` and the push. After its commit of the notes it tells
   the human the two commands of the fifth step, with the part filled in, in that order; says that the push comes
   after the move; and stops until the human says that `./deploy.sh` succeeded
3. The push is a step of its own, the last. Its command is `git push --follow-tags origin master`, as today. The
   file says that the one push carries `master`, the tag and, when the move was committed, the move; and that the
   push does not wait for the move: when the move stopped, or is left for later, the human pushes all the same
4. Everything `RELEASING.md` says today about `npm version`, `./deploy.sh`, what `./deploy.sh` refuses, the
   recovery that moves the tag, and why the push comes last is still in the file, with its meaning, its exact
   commands and its strength, in the step it now belongs to

The move:

5. The step states its version as the one `package.json` holds as `version`, and has the agent stop, say why and
   change nothing when the branch is not `master`, or when a tracked file has an uncommitted change. When the
   devDependency already names that version, the agent says that there is nothing to move and changes nothing
6. The step runs these five commands, in this order, from the repository root, and no other command that changes
   a file: `npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-<version>.tgz`,
   `npx agentrite refresh claude opencode`, `npm test`, `npm run check-changes` and `./agent.sh --in-place true`
7. When all five succeed and nothing of requirement 8 holds, the agent makes one commit on `master`, with no unit
   prefix, titled `Depend on AgentRite <version>`. It holds `package.json`, `package-lock.json` and the files
   `refresh` printed as written or refreshed, and nothing else. Its body says what was seen: how many tests passed,
   that the change check exited 0, what `refresh` reported, and that the sandbox of the release started.
   The agent pushes nothing, and ends by telling the human the push
8. The agent commits nothing, repairs nothing and says what it found when:
    * one of the five commands fails. It says which and what it printed
    * the working tree afterwards holds a change other than `package.json`, `package-lock.json` and the files
      `refresh` printed as written or refreshed, or `package.json` differs by more than the one URL
    * "Worth knowing when you update" in the release's section of `CHANGELOG.md` asks a project for something
      beyond the install and the `refresh` that applies to this repository, such as an edit to a file of its own.
      It names the file and the line

   It then puts the working tree and the installed kit back as they were, tells the human that the move is now a
   unit in `changes/`, naming what that unit has to do, and still ends by telling the human the push
9. The step can be followed by an agent that is asked only to move the repository to a release that is already
   made, in a session that did not make the release: everything the step needs is read from the repository. Such
   an agent runs that step and nothing else of the file, and its commit needs a push of its own, which it names
10. The step says what the start of the sandbox shows and what it does not. It shows that the installed release,
    run through this repository's own shim, builds its image when one is due and starts a container that passes
    its own start-up checks. It shows nothing of a harness, a login, a prompt or a unit run. And it says that a
    start that fails does not stop the release, which is public once `./deploy.sh` ends

The release notes:

11. The step on the release notes says that one change in the shipped diff is the last release's own and belongs
    to no unit: the line of `package.json` that names the kit as a devDependency, when it moved to the URL of the
    release the last tag names. The agent does not name it to the human as a change without a unit, and does not
    write it in the section, on either line. Any other change to that line is treated like every other change

The pointers:

12. The skill's description says that the release moves the repository's own dependency once the release is
    deployed. Its name, its `disable-model-invocation` and its one instruction are unchanged
13. The README's "Releasing" names the move in its summary of who does what, in the order of requirement 1. Where
    the README says that the installed copy moves to a newer release only by a deliberate update, it also says
    that a release makes that update as one of its steps. Nothing else of the README changes
14. The suite's test of the skill's text holds the description of requirement 12

What does not change:

15. `AGENTS.md`, `deploy.sh`, `process.md`, `roles/`, `templates/`, `scripts/`, `container/` and `.opencode/` are
    unchanged, and `npm pack --dry-run` lists the same files as on `master`
16. This unit moves the dependency to 3.0.0, by following the new step of `RELEASING.md` as it is written, with
    two differences that a unit asks for: the branch is the unit's and not `master`, and the commit carries the
    unit's prefix. Its five commands are run, the start of the sandbox among them, and the record says what each
    printed. When the step stops, the implementer puts the tree back as the step says, records what was found
    and stops for the human, and the unit is not closed

## Decisions

* **The move is a step of the release, made by the agent. The human's.** The human asked for the release skill to
  do it, so that no unit follows a release
* **The step sits after `./deploy.sh` and before the push. The main session's.** The tarball is installed from its
  URL, and `./deploy.sh` is what serves it, so the move cannot come earlier. Before the push, the one push carries
  the move. Weighed and not taken:
    * After the push, with the three commands told as today. It keeps 0028's ending word for word, and costs a
      second push for one commit, and a `master` on the remote that names the release before until someone
      remembers
    * Inside `./deploy.sh`, as its last act. No agent has to resume, and the script already knows the URL and has
      just seen it served. But a script that publishes would then also install, rewrite tracked files and commit
      on `master`, and a failure of the move would look like a failure of the release, which by then cannot be
      undone. A script also cannot read the release notes for what the release asks of this repository
* **The agent stops between its two parts, and is told when to go on. The planner's.** 0028's decision that the
  human runs `npm version` and `./deploy.sh` stands, so the agent cannot see the deploy end. It asks for the
  human's word. The word is the trigger and not the proof: when the tarball is not served, `npm install` fails
  and the step stops by requirement 8
* **0028's ending changes: the agent names two commands after the notes, and the push after the move. The
  planner's, and the human's since: "0028 has been superseded by 0031. So be it."** For 0028 the human said:
  "pushing master and the tag should be what the skill says at the end. Basically: run npm version [with the
  correct type], run ./deploy.sh and push master with tags." The push is still what the agent says at the end, and it still runs none of the three. What
  changes is that the three are no longer told in one breath. 0028 is frozen and keeps its text; this unit is
  where the change is found
* **The step reads its version from `package.json`, and needs no session before it. The planner's.** The agent
  resumes after the human ran two commands, perhaps in another session. `npm version` has written the version by
  then, so the repository says which release to move to. The same makes the step usable alone, which the move to
  3.0.0 needs, as does any release whose move was left or stopped
* **No condition on the tag or on `HEAD`. The planner's.** A step run alone, later, finds `master` past the tag.
  A version that was never released has no tarball, and the install says so
* **Four commands for the move, and nothing wider. The main session's.** They are what 0016 and 0024 ran. The
  fifth, the start of the sandbox, is the human's and is below. The step is kept as narrow as its commit: what it
  checked is what its commands print
* **`npm run check-changes` is kept, for what it shows. The planner's.** On `master` the check has nothing to
  compare. It still runs the script of the release just installed, so a release whose check does not start is
  seen here and not by the next unit. The file says that this is all it shows
* **The commit's body is the record. The planner's, for the first cost the main session named.** A step of a
  release has no `record.md`. The body of its commit holds what a record's entry would: the tests' count, the
  check, what `refresh` reported, and that the sandbox started. It costs four lines, and `git log` is where someone
  looks for when the repository moved. Not taken: a file that lists every move, which would be a record kept by
  hand for something git already keeps
* **The step starts the released sandbox, and asks only that it runs. The human's.** The planner's draft did not
  start it: 0024 did and compared the proxy's log, and what to look for there differs with every release. The
  human asked for the start, as the kit eating its own dog food, and for no more than the container running. The
  command is `./agent.sh --in-place true`: the installed release, through this repository's shim, with a command
  that does nothing. It builds the image when one is due, and the container runs its start-up checks, the
  firewall's among them, before the command. It needs Docker on the host, which a release did not need before,
  and minutes when it builds. A start that fails is a command that fails: nothing is committed and the tree is
  put back, by requirement 8. An image that the start built is left as it is. A release whose sandbox needs more
  looking at than this is a release that asks for more than the commands, and is a unit
* **The start gates the push, and not the release. The main session's, and the human's since: "yes, fair
  enough. This should be documented."** The human's reason was that a release
  whose sandbox starts is ready for the outside world. By this step `./deploy.sh` has served the tarball, which is
  never replaced. So a start that fails is found before the push and before another project updates, and its
  repair is a unit and a release after this one. The file says so. Proposed by the main session and left out by
  the human, for simplicity:
    * A start of the working copy's sandbox before `./deploy.sh`, with `./agent-dev.sh`, which is the only place
      where a sandbox that does not start could still stop the release
    * A one-line prompt to each harness in the sandbox, which needs a saved login and can fail for a provider's
      reasons
* **What the release asks beyond the commands is a unit, and stops the move whole. The main session's.** The
  agent wrote "Worth knowing when you update" for this very release, so it knows what the release asks of a project,
  and this repository is one. When that needs an edit here, the step does not commit the move and leave the edit
  for later: the unit that makes the edit makes the move with it, as 0024 would have, and `master` is never on a
  release that one of its own files does not fit. Weighed and not taken: commit the move and name the edit as a
  unit, which leaves `master` between the two
* **A step that stops puts the tree back. The planner's.** A `master` with an uncommitted install is a trap for
  the next session, and `node_modules` on a release the lockfile does not name is one for every agent that reads
  the process there. The unit that follows starts from a clean tree, on a branch
* **The push does not wait for the move.** The release is made and served when `./deploy.sh` ends. A move that
  stopped is this repository's matter, and must not leave the tag unpushed
* **The commit is `Depend on AgentRite <version>`. The planner's.** It is the title the four units had, without
  their prefix, as the notes' commit is `Release notes for <version>`
* **The release notes are silent on the move. The planner's.** A project that installs the kit does not install
  the kit's devDependencies, so the line changes nothing for it, and "What changed" is for what a project gets.
  The "Not in the package:" line names units, and the move is none. 3.0.0's section names 0024 there because
  0024 was a unit. The agent also does not name it to the human among the changes without a unit: it is expected
  at every release, and a warning that always fires is not read. Only the exact expected change is passed over
* **The skill's description changes. The planner's.** It is what the human sees beside `/release`, and it lists
  what the release does. The suite compares it whole, so the test changes first
* **The tests still hold the wiring, not the release.** 0028's decision, kept. No test reads the steps of
  `RELEASING.md`
* **`AGENTS.md` is unchanged.** It sends an agent that is asked to make a release to `RELEASING.md`, and says that
  an agent starts neither a release nor the notes unasked. An agent asked to move the dependency is asked
* **The move to 3.0.0 is in this unit, as the step's first trial. The human's.** The planner's draft left it for
  after the merge, because a move made by a plan's task would try nothing of the step. The human: "Do it inside
  this unit. It's a good check to see if it works, right?!" So the task is to follow the step, from the file as
  this unit writes it, and not to make the move some other way. Two things of the step cannot hold in a unit: it
  is on the unit's branch, and its commit has the unit's prefix. The trial therefore shows the five commands, the
  two readings and the commit's body, and does not show the step on `master`, or an agent that resumes after a
  deploy. The next release's shipped diff shows the move as a change of this unit, which is also the one change
  that step 2 passes over, and this unit is on that section's "Not in the package:" line
* **The texts are in the plan.** The requirements say what the files must hold. Their wording is in the plan's
  approach, for the human to read with it

## Non-goals

* The agent running `npm version`, `./deploy.sh` or the push. 0028's decision, kept
* Checking anything in the released sandbox beyond that it starts: a harness, a login, a prompt or a unit run
* A start of the sandbox before `./deploy.sh`
* Repairing what a release asks of this repository beyond the five commands. That is a unit
* Moving any other project to a release
* A change to `deploy.sh`, or to anything that ships
* A test of the steps of `RELEASING.md`

## Beyond the request

Both were declined by the human on approval, and are not built.

* **A test that the devDependency names the version of `package.json`.** It would catch a release whose move was
  forgotten. It would also fail in the suite `./deploy.sh` runs, between `npm version` and the move, at every
  release. Without it, a forgotten move is seen at the next release, in the shipped diff, or by whoever reads
  `package.json`
* **A line for the move in the next release's section.** Without it the changelog says nothing of a change no
  project gets
