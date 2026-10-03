# 0017 A sandbox for a project that does not use Playwright

## Approach

Three places hold the assumption that every project has Playwright, and each is changed in turn: `init`, which
refuses to write the compose file; the wrapper, which refuses to start without the version; and the Dockerfile,
which cannot build without it. `init` and the wrapper are covered by the suite. The Dockerfile is not, since the
suite runs no Docker, so it is checked by building both kinds of image for real and recording what was seen.

**`init`.** The template `templates/project/agent/compose.project.yml` holds the `build:` block with the argument
inline. The block becomes a placeholder alone on its line, `{{playwright_build}}`, which `fillTemplate` already
drops when its value is empty and indents when it is not. `projectFiles` fills it with the four lines of the block
when the lockfile resolves `playwright`, and with nothing otherwise, and always returns the compose file. `init`
loses the branch that reports the missing Playwright and returns 1.

**The wrapper.** `container/agent.sh` asks Compose for the merged configuration, reads `PLAYWRIGHT_VERSION` from it
with `node`, and exits 2 when it is empty. That whole block goes, with its comment. Nothing replaces it: the wrapper
goes straight from the refusal to run as root to asking Compose for the image name.

**The Dockerfile.** The stages become:

```
playwright            FROM Playwright's image at PLAYWRIGHT_VERSION, as now
base                  FROM node:26-bookworm, with the packages the entrypoint and the agent need
base-with-browsers    FROM base, with the browser copied in and its system libraries installed
(the last stage)      FROM base${PLAYWRIGHT_VERSION:+-with-browsers}, with the harnesses, the accounts and the
                      entrypoint, as now
```

`${PLAYWRIGHT_VERSION:+-with-browsers}` is empty when the argument is absent or empty, so the last stage is built
from `base` and the two stages above it are never run. The order of steps for a project with Playwright stays what
it was: packages, browser, harnesses, accounts, entrypoint. `PLAYWRIGHT_BROWSERS_PATH` is set in the stage that has
the browser.

Unit 0015, on its own branch, changes `container/compose.yml`. This unit touches one comment in that file. Whichever
of the two is merged second is rebased onto the other.

## Files

- `templates/project/agent/compose.project.yml`: the `build:` block as a placeholder; the opening comment
- `scripts/agentrite.mjs`: `projectFiles` always plans the compose file; `init` without the refusal
- `tests/agentrite-init.test.mjs`: the compose file with and without Playwright; `init` exiting 0 without it
- `container/agent.sh`: the check for the argument, removed
- `tests/agent-wrapper.test.mjs`: the tests of that check, replaced by one that the wrapper goes on without it
- `container/Dockerfile`: the stages, and the comments on them
- `container/compose.yml`: the comment on why the build context is the project root
- `README.md`: the paragraphs on Playwright under "Installing it into a project" and "Running the sandbox"
- `changes/0017-sandbox-without-playwright/record.md`: the log

## Tasks

- [ ] In `tests/agentrite-init.test.mjs`, change what a project without Playwright expects: `projectFiles` with no
  version plans `agent/compose.project.yml`, with the names, the limits and the allowlist, and with no `build:` key
  and no `PLAYWRIGHT_VERSION` anywhere; with a version the file is byte for byte what it is today; end to end, a
  project whose lockfile resolves no `playwright` gets every file, the compose file reported as written, nothing
  on standard error and exit status 0; one whose compose file already exists keeps it and exits 0. See them fail
  (R5, R6)
- [ ] Turn the `build:` block of the template into the placeholder, fill it in `projectFiles`, and take the
  refusal out of `init`, until the tests pass. Reword the template's opening comment so that it does not promise a
  Playwright version (R5, R6)
- [ ] In `tests/agent-wrapper.test.mjs`, replace the tests that a configuration without `PLAYWRIGHT_VERSION`, or
  with an empty one, exits 2: such a configuration now goes on to Compose exactly as one with the argument does,
  building when the image is missing and running the command. Keep the test that a configuration Compose refuses
  stops with Compose's own error, if the wrapper still asks Compose for anything that can fail that way, and
  otherwise remove it and say so in the record. See the new test fail (R7)
- [ ] Remove the check from `container/agent.sh`, until it passes (R7)
- [ ] Restructure `container/Dockerfile` into the stages of the Approach, moving nothing else, and rewrite the
  comments that say the version has no default and that a build without one fails. Update the comment in
  `container/compose.yml` on the build context: it is the project root because the build copies the kit's files
  from under it and, for a project with Playwright, reads its lockfile (R1, R2, R3, R4)
- [ ] Build and start a sandbox without Playwright, on a host with Docker: in a scratch project with the packed kit
  installed and no `playwright`, run `npx agentrite init claude opencode` and then `./agent.sh --rebuild` with a
  command. Record: that the build output names no image of Playwright; that the entrypoint's checks pass; that
  `/opt/playwright` does not exist in the container; that `claude --version` and `opencode --version` print the
  pinned versions; and that `git status` works in `/work`. Starting either harness interactively is not part of
  this: unit 0015 is about that failing in any new sandbox (R1, R2, R4, R9)
- [ ] Build and start a sandbox with Playwright: in a scratch project with the packed kit and `playwright` at the
  version Norareit uses, do the same. Record: that `/opt/playwright` holds Chromium and no other browser; that a
  script launching Chromium through Playwright and closing it exits 0; and that the list of installed Debian
  packages and the listing of `/opt/playwright` are the same as in an image built for the same project from the
  Dockerfile on `master` (R3, R4, R9)
- [ ] Remove the two scratch projects' images and home volumes (R9)
- [ ] Update `README.md`: under "Installing it into a project", replace the paragraph that says the sandbox
  requires Playwright with what `init` does now; under "Running the sandbox", say that the browser is in the image
  when the project's compose file gives `PLAYWRIGHT_VERSION` and not otherwise, and that a project which starts
  using Playwright adds the argument under `services.agent.build.args`, and one that stops removes it, and
  rebuilds. Take out the sentence that the wrapper refuses to go on without the argument. Correct the sentence on
  why the build context is the project root. Remove nothing else (R8)

## Verification

- [ ] `npm test` passes
- [ ] `npm pack --dry-run` lists the same 22 files
- [ ] The two tasks that build and run real images are done on a host with Docker, and the record names the
  Docker version and what each check showed
- [ ] `npm run check-changes` passes

## Commit Points

- [ ] `init` writes a compose file for a project without Playwright
- [ ] The wrapper no longer asks for the build argument
- [ ] The Dockerfile builds with and without the browser
- [ ] The README
- [ ] The record of the real builds
