# 0098 Fast tests by default

## Context

`npm test` runs every test of this repository, 1552 tests in 72 files, and has grown slow enough that the human
notices it at every run. Measured on the human's host, 32 cores, on `master` at `dc0bdfa`:

* The whole suite takes 42 s. Each file run alone, one after another, takes 136 s in all
* Node's test runner runs the files in parallel and the tests of one file one after another, so the suite takes as
  long as its heaviest file: `tests/agentrite-orchestrate.test.mjs`, 41 s
* 23 tests take 1 s or more each, 59 s together, in 6 files. Two of them wait in real time: the heartbeat of a run,
  12 s, and the SIGKILL that ends a step 10 s after its SIGTERM, 11 s. Thirteen build images of the sandbox
* With those 23 tests out of the run, the heaviest file left is `tests/sandbox-wrapper.test.mjs`, 16.5 s of 163
  tests that take about 0.1 s each, and the suite would take about 17 s

The 23 tests, by file:

* `tests/agentrite-orchestrate.test.mjs`
    * a run keeps a heartbeat that moves on while a step runs and is left at its last instant
    * a step that ignores SIGTERM past its limit is ended by SIGKILL 10 seconds later
    * a step that ends in time and leaves a process holding its output past the limit keeps its outcome
    * a run keeps the branch it started on when another is checked out while it runs
    * a step past its limit is ended by SIGTERM, and the run stops by the case, its response kept
* `tests/sandbox-git-environment.test.mjs`
    * the tests that start init and refresh pass with the sandbox's git environment configuration
* `tests/sandbox-install.test.mjs`
    * a unit run that resumes a clone installs nothing
* `tests/sandbox-project-dockerfile.test.mjs`
    * a kit's image built anew for another harness version has the project's file built on it
    * a label of the harnesses in a project's file that names the host's new claude does not stop a build
    * a label of the harnesses in a project's file that names the host's new opencode does not stop a build
    * a project's file is built on the kit's image, kept under -base, and is not built again unchanged
    * an image whose project's file sets CMD is refused at every start until the file drops it
    * an image whose project's file sets ENTRYPOINT is refused at every start until the file drops it
    * --rebuild builds the kit's image and the project's file on it
    * a project's file added after a build without one is built, and then not again
    * a project's file changed after a build is built again, and the kit's image is not
    * a project's file removed after a build leaves the kit's image, built anew, and then not again
    * an image whose project's file sets USER is refused at every start until the file drops it
    * the dev shim builds both images at every start, and --connect builds nothing
    * an image whose project's file sets WORKDIR is refused at every start until the file drops it
* `tests/sandbox-signal.test.mjs`
    * a signal to the sandbox is forwarded to the command and does not stop the container
* `tests/sandbox-variant.test.mjs`
    * a variant started beside the unit run, and one started alone, both run and land
    * a unit run and its variants run at once, each on its own clone, and land on their own branches

The human wants `npm test` to run the fast tests only, so that it can be run at any time, and the slow ones to run
after each unit and when the work touches what they cover.

The kit's standards say, under "Testing", that the end-to-end tests are run after every change. A project that runs
only its fast tests after a change breaks that rule whenever its slow tests are end-to-end tests, as this
repository's are. Any project with slow end-to-end tests meets the same problem, so the human decided that the rule
is made general in the kit's standards rather than excepted for this repository alone.

## Requirements

1. The kit's `standards.md`, under "Testing", no longer says that the end-to-end tests are run after every change.
   It says instead:
    * that a project's own documentation may name some of its tests as its slow tests, and that the rest are its fast
      tests, which are all its tests when it names no slow tests
    * that after every change, the fast tests are run, and so is every slow test that covers what the change touched
    * that all of the project's tests are run on the final tree of a unit before it is handed over, and when it is
      reviewed

   The other rules of "Testing", its opening sentence and its two other items, stay as they are
2. In this repository, `npm test` runs every fast test and no slow test
3. `npm run test:all` runs every test of this repository, fast and slow
4. `npm publish` runs every test before it publishes, and publishes nothing when one fails, as it does today
5. The 23 tests listed in the context are this repository's slow tests, and no other test is
6. Every slow test asserts what it asserted before the unit. Making a test slow changes where it is, and changes none
   of its assertions or its name
7. A test that checks the files of the suite, such as that no file of the suite but the helper makes a temporary
   directory itself, checks the files of the slow tests as well
8. Every message of a skipped test that names a command to run it names one that runs that test. A test skipped in
   the sandbox, whose message names the command that runs the whole suite there, names one that runs the slow tests
   too
9. `CONTRIBUTING.md` describes `npm test` and `npm run test:all`, each in a section of "Commands" as the other
   commands of this repository are, and says in "The kit's own tests" which tests are slow, where they are kept, the
   rule by which a new test is made slow, and when each command is run, by the rule of requirement 1
10. A new test that takes 1 s or more on its own, measured with its file run alone on the host, is a slow test. The
    rule is stated in `CONTRIBUTING.md`
11. `SANDBOX.md`, `CONTRIBUTING.md` and the other documents of the repository say nothing that requirement 2 makes
    false, such as that `npm test` runs the whole suite

## Decisions

- The rule is made general in the kit, not excepted for this repository. The human decided this. An exception
  written in this repository's `AGENTS.md` would serve one project and leave every other project with slow
  end-to-end tests to break the rule or except it too; replacing the standards with the project's own file would
  stop this repository from receiving every later change of the kit's rules. A project that names no slow tests runs
  all of them after every change, as the rule asks of it today
- Which tests are slow is each project's own business, said in its own documentation. The kit's rule sets no
  threshold and no mechanism, because what is slow depends on the project and its machines, and the existing opening
  sentence of "Testing" already sends the reader to the project's documentation for its suites
- A slow test that covers what a change touched is run after that change too. Without it, a change to the sandbox's
  image build would go unchecked by the thirteen tests that build the image until the end of the unit, where the
  failure is found far from the edit that caused it
- The implementer's and the reviewer's role files are left as they are. They say the suites are run on the final tree,
  which with the new rule means all of them, and they defer to the standards on how tests are run
- The threshold is 1 s, measured with the test's file run alone. It takes out the two real-time waits and every build
  of an image, which are most of the time, and leaves 1529 tests whose slowest is under 1 s. A threshold of 0.5 s
  would take out 17 more tests and save no wall time, since the heaviest file left is the same; one of 3 s would leave
  the image builds in and the suite at 22 s
- The slow tests are named by where they are kept, in a directory of their own under the tests, and not by a flag in
  each test. A test skipped by an environment variable stays in its file, so the file still runs its tests one after
  another and still shows the skips at every run; a directory of its own lets the runner's glob choose the suite
  and lets the slow files run in parallel with each other
- `npm test` keeps its name for the fast tests, since it is the command a developer and an agent type without
  thinking, and the full run gets a name of its own
- Until the next release, the agents of this repository read the installed release's standards, which still ask for
  the end-to-end tests after every change. No interim note is written in `AGENTS.md`: the gap ends with the release
  that ships this unit, and `CONTRIBUTING.md` already says when each command is run

## Non-goals

- Making a slow test faster, such as by shortening the heartbeat or the grace period before SIGKILL through a value
  the test can set. That changes the orchestrator's code for its tests, and is a unit of its own if wanted
- Running the tests of one file in parallel with each other. The tests of a file share fixtures written for one test
  at a time
- Changing which tests are skipped on a host without Docker, or on a host other than Linux
- A time limit on `npm test` that fails the run when it grows slow again

## Beyond the request

1. Split the heaviest files of fast tests, `tests/sandbox-wrapper.test.mjs` (16.5 s), `tests/sandbox-unit-run.test.mjs`
   (14.2 s), `tests/agentrite-init.test.mjs` (4.7 s) and `tests/agentrite-refresh.test.mjs` (4.1 s), into files of
   about 4 s each, so that the runner runs them in parallel. `npm test` would then take about 5 s instead of about
   17 s, and `npm run test:all` about 13 s, the time of the heartbeat test alone, instead of 42 s, if the slow files
   are split the same way. It costs moving tests between files and the helpers they share, with no change to an
   assertion. Without it, `npm test` takes about 17 s
2. A command `npm run test:slow` that runs the slow tests alone. It costs one line of `package.json` and a section of
   `CONTRIBUTING.md`. Without it, a developer runs one slow file with `node --test` and the path of the file, or all
   of them with `npm run test:all`
