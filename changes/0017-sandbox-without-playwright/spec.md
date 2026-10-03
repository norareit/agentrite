# 0017 A sandbox for a project that does not use Playwright

## Context

The sandbox image copies Playwright's Chromium from Playwright's own image, at the version the project's lockfile
resolves, and installs the browser's system libraries from the project's dependencies. It does so for every project.
The first project the sandbox was built for, Norareit, has browser tests, and unit 0010 wrote the assumption down:
"the sandbox requires the project to depend on Playwright". It also recorded making Playwright optional as out of
its scope.

A project without Playwright therefore cannot have a sandbox. `agentrite init` writes its other files, refuses to
write `agent/compose.project.yml`, and exits non-zero. If the file is written by hand without the version, the
wrapper refuses to start. If a version is invented, the build fails where it runs `playwright` in a project that
has none.

The kit's own repository is such a project. Agents working on the kit, on its firewall and its entrypoint among
other things, run on the developer's host, which is what the sandbox exists to prevent.

## Requirements

1. A project whose `package-lock.json` resolves no `playwright` gets a sandbox. `./agent.sh` builds the image and
   starts the container, with the same confinement, the same start-up checks and both harnesses, as for any project
2. The image built for such a project holds no browser: nothing under Playwright's browser path, and the build pulls
   nothing from Playwright's image. Neither `package.json` nor `package-lock.json` of the project is read by the
   build
3. For a project whose lockfile does resolve `playwright`, the image is what it was: Chromium at that version under
   the same path, with its system libraries, and the committed screenshots of such a project still compare
4. What tells the two apart is the `PLAYWRIGHT_VERSION` build argument alone: present, the image holds the browser at
   that version; absent or empty, it holds none. No other setting is added
5. `agentrite init`, in a project whose lockfile resolves no `playwright`, writes `agent/compose.project.yml` without
   that build argument, reports it as written, and exits 0. With `playwright` in the lockfile it writes the file as
   before
6. `init` no longer exits non-zero for want of Playwright, whether or not `agent/compose.project.yml` exists
7. The wrapper no longer refuses to start when the merged Compose configuration has no `PLAYWRIGHT_VERSION` build
   argument. It builds and runs what the configuration says
8. The README no longer says that the sandbox requires Playwright. It says that the browser is there when the
   project's compose file gives `PLAYWRIGHT_VERSION` and not otherwise, and what a project does when it starts or
   stops using Playwright
9. The new logic is unit tested. Both kinds of image are built for real, on a host with Docker, and what was
   checked in each is in the record

## Decisions

* **The build argument decides, and nothing else.** A project with Playwright already has `PLAYWRIGHT_VERSION` in its
  compose file, so every existing project keeps working unchanged, and a project without has nothing to set. A
  separate switch, such as `WITH_PLAYWRIGHT`, was rejected: it could contradict the version, and it would be a second
  thing to keep in step with the lockfile
* **The image is chosen by build stage, not by a script in the build.** The Dockerfile has one stage with the
  browser and one without, and the last stage is built from the one the argument selects. A stage nothing is built
  from is never run, and its base image is never pulled, which was checked with Docker 28.4.0 and BuildKit before
  this unit was written: a build with no version built without resolving Playwright's image, and one with a
  version that does not exist failed on that image. A `RUN` that tests the argument and skips the installation was
  rejected: the `COPY` from Playwright's image cannot be skipped that way, and the image would have to be pulled
  for nothing
* **The wrapper checks nothing about Playwright.** Unit 0010 had it refuse a missing argument, because the build
  then failed with an error that named nothing. A missing argument now builds an image without a browser, so that
  check goes. The planner first replaced it with a check that the argument and the project's lockfile agree, and
  the human struck it on 2026-10-03 as premature: a version passed means a browser, none passed means none, and
  that is the whole rule. A project with Playwright whose compose file has lost the argument gets a sandbox whose
  browser tests fail saying the browser is not installed, which points at the cause, and is dealt with if it ever
  happens. A version given to a project without Playwright fails in the build, where the browser's libraries are
  installed from the project's dependencies
* **A project that starts using Playwright adds the argument by hand.** `init` never rewrites a file that exists,
  and `refresh` does not touch `agent/compose.project.yml`, which is the project's own. The README says so
* **`init` writes a compose file without the argument and says nothing more.** The file is complete and the sandbox
  works. A notice that there is no browser would tell a project without browser tests what it already knows

## Non-goals

* Giving the kit's own repository a sandbox. That needs a release holding this unit, since the repository runs the
  kit it installs, and is unit 0018
* Other browsers, or a browser at a version other than the lockfile's
* A check that a project's compose file and its lockfile agree about Playwright
* A sandbox for a project that does not use npm
* The image's other contents, the harness versions and the confinement. Unit 0015, on its own branch, is about the
  harnesses failing to start in a new sandbox and changes `container/compose.yml`; this unit leaves what it fixes
  alone
* Rebuilding an existing project's image. An image built before this unit is the image this unit builds for the
  same project
