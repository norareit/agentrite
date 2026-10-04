# 0030 The kit names no harness version

## Approach

The work is in `container/agent.sh`, two lines and a comment of `container/Dockerfile`, a comment of
`container/compose.yml`, the README, and the tests of the wrapper. Nothing that confines the sandbox is touched.

**Before any work.** When `master` holds 0028, merge `master` into this unit's branch first, as 0028's branch did
for 0027, and start from the tests as 0028 left them: `tests/harness-versions.test.mjs` without `README.md` in
its last test, and `tests/wrapper-fixture.mjs` with the fake host's versions `99.1.0` and `98.2.0`. When it does
not, start from `master` as it is, where the fake host has `2.1.289` and `1.18.34`. The tasks below hold for
both: they name the fixture's host versions as `hostVersions` and never by value. Record which of the two it was.

**The wrapper.** Today it settles both versions before it asks Compose anything, as the host's or else the pin.
It now settles them after it has read the image's labels, because a harness with no source takes what the image
holds, or the registry's answer when a build is due. In order:

1. The host's version of each harness, with `host_version` as it is. A command that is there and prints no
   version gets its line and counts as not installed
2. The merged configuration, in the one call there is, with the marker in place of both versions as today. It
   gives the image name and, for each harness, the project's value or the marker
3. For each harness, the wanted version and its source: the project's value, else the host's, else none yet
4. The image's two labels, in the one `docker image inspect` there is
5. Whether to build: on `--rebuild`; when there is no image; when a wanted version differs from its label, with
   the line `differs_from_image` prints today; and when a harness has no wanted version and its label is empty or
   not a version
6. For a harness with no wanted version: when a build is due, the latest published version, with its line;
   otherwise the label's version
7. Export the two variables for Compose, build when due, run

`version_from_host_or_kit`, its reading of the Dockerfile with `sed`, its refusal of a Dockerfile with no pin, and
the source "the kit" go. The shape of a version, which `host_version` holds as a local, is shared with the check
of the registry's answer and of a label. The additions run under bash 3.2, as the wrapper already allows for.

The latest published version is the output of `npm view <package> version --fetch-retries=0`, standard error not
shown, for `@anthropic-ai/claude-code` and `opencode-ai`. It counts when the command exits 0 and its first word is
a version.

The lines, on standard error, with Claude Code and OpenCode alike:

```
agent.sh: 'claude --version' printed no version, so Claude Code counts as not installed on the host.
agent.sh: neither the project nor the host gives a version of OpenCode, so the image is built with the latest
published, 1.18.34.
agent.sh: could not find the latest published version of OpenCode: 'npm view opencode-ai version' gave none.
Give a version in agent/compose.project.yml, under services.agent.build.args as OPENCODE_VERSION, or install
OpenCode on the host.
```

The second is one line as printed, and so is each of the two of the third: they are wrapped here for the plan's
width. After the third the wrapper exits 2, as it does for its other refusals. The lines of
`differs_from_image` are as they are, with "the host" or "the project's compose file" as the source.

The comment at the head of the wrapper says the two sources and what happens with neither.

**The Dockerfile.** The two `ARG` lines before the first `FROM` go, with the comment above them. A comment in
their place says that the kit names no version, that `container/agent.sh` hands the build both, and where each
comes from. The last stage's two `ARG` lines, the install and the labels are as they are. The comment on the
install says "each at exactly the version of its build argument", which still holds.

**The base Compose file.** The comment on the two build arguments says "the version the host has, or else the one
the kit pins in its Dockerfile". It becomes: the version the host has, or else the latest published when the
image is built.

**The README.** In "The harness versions":

* The list of sources has two items. A paragraph after it says what happens with neither: the image gets the
  latest published version when it is built, the wrapper says which, the sandbox keeps it until the image is
  built again, and `./agent.sh --rebuild` builds it again. The registry is asked with `npm` on the host, at a
  build only
* The paragraph on the host's version says that a harness that is not there, or is reached only through an
  alias, counts as not installed, and so does one that prints no version, with the wrapper's line as above in
  place of today's example
* A new example block has the line for the latest and the two lines for the latest that cannot be found, with
  one sentence on getting past it: a version in the project's file, or the harness on the host
* The examples of a held version, of the rebuild's lines and of how to see what an image holds stay as they are.
  "An image built by a release that did not write the labels" stays
* "What follows from that" gains: on a host without a harness, the sandbox's version of it is the latest of the
  day the image was last built
* "The kit promises less for a version it did not pin" becomes what the kit promises for a harness version: for
  any, the confinement and the exact version; for none, the four things. What a developer sees stays. In "To
  recover", "hold the version the kit pins, or any that works" becomes "hold a version that works", and whatever
  follows in that bullet about the pinned versions is made to fit

Elsewhere in the README: the sentence after the login command says the label is the one OpenCode used when this
was written and that another version may name it differently, with no "the kit pins"; and the bullet on
`./agent-dev.sh` says it takes the harness versions as `./agent.sh` does and builds on every start, so on a host
without a harness it gets the latest at each start. `grep -n -i 'pin' README.md` afterwards shows only the lines
on a model pinned in a role wrapper, on the URL as the pin of the kit, and on a tarball pinned by its hash.

**The tests.** `tests/wrapper-fixture.mjs` gains an `npm` in the fake host's `bin`: for `view <package> version`
it prints the version of `latestVersions`, a new export beside `hostVersions`, with values no release has and
that differ from `hostVersions`, such as `97.3.0` and `96.4.0`; it records its calls in a file the fixture
returns a reader for; and it fails when a file `npmFails` is there. It needs `npm` nowhere else: the fakes are
bash scripts.

In `tests/agent-wrapper.test.mjs`, `pinOf`, `pins` and `noVersionLine` as it is go. The cases, old and new:

| Today's test, by its name                                   | Becomes                                           |
|-------------------------------------------------------------|---------------------------------------------------|
| hands Compose the kit's pins with neither harness on the    | With neither on the `PATH` and an image whose     |
| PATH, and says nothing                                      | labels are versions: runs with the labels'        |
|                                                             | versions, builds nothing, calls no `npm`, says    |
|                                                             | nothing                                           |
| takes the host's version of one and the kit's pin of the    | The host's of one and the label's of the absent   |
| other, which is absent (two cases)                          | one, no build, no `npm`                           |
| uses the kit's pin, and says so, for a harness on the host  | The line of requirement 8, and the label's        |
| that misbehaves (each case), and the one for OpenCode       | version kept, no build                            |
| names the project's file for a version it gives that equals | Dropped: there is no pin to equal. The case of a  |
| the kit's pin                                               | project's version that equals the host's stays    |
| rebuilds for the kit's pins when the host has neither       | With neither and no image: asks `npm` for both,   |
| harness, and names the kit                                  | prints both lines of requirement 6, builds with   |
|                                                             | `latestVersions`                                  |
| refuses to run when the Dockerfile beside it holds no pin   | Dropped                                           |

New cases: `--rebuild` with neither harness asks `npm` and builds with the latest although the labels are
versions; `--rebuild` with both on the host calls no `npm`; one harness absent and the other differing from its
label builds, with the line of the difference for the one and the line of the latest for the other; a label that
is empty or `latest` for an absent harness builds; `npm` that fails, `npm` that prints something that is not a
version, and no `npm` on the `PATH`, each stop with the two lines, exit 2, and no build or run; the command line
`npm` was given holds `--fetch-retries=0`.

In `tests/harness-versions.test.mjs`, the first test becomes: no line of the Dockerfile gives
`CLAUDE_CODE_VERSION` or `OPENCODE_VERSION` a default, and the last stage declares both. The last test, of where a
pin is written, goes, with `pins` and `filesUnder` if nothing else uses them. The tests of the labels and of the
base Compose file stay.

`tests/agent-dev.test.mjs` uses the same fixture and holds no version. See that it passes unchanged.

**0027's record.** An amendment, by the implementer, when the work is done: that 0030 took the kit's pin away;
that 0027's requirements 1, 3 and 4, its decisions "The pins stay where they are" and "What the pin is for", and
the part of its boundary on the pinned versions are changed by it; and that its tests of the pins were changed or
removed here.

**For the release notes, later.** What a project that updates should know, which requirement 11 holds: no edit
is needed; on a host that has both harnesses nothing changes; on a host without one, the sandbox keeps the
version the kit pinned until `./agent.sh --rebuild`, which then installs the latest published one, and from then
on every build does; the kit no longer says of any harness version that it was checked; and a build on such a
host runs `npm view` on the host.

## Files

- `container/agent.sh`: where the two versions come from, and the head comment
- `container/Dockerfile`: the two `ARG` lines with defaults and their comment
- `container/compose.yml`: one comment
- `README.md`: "The harness versions", the sentence on the login's label, the bullet on `./agent-dev.sh`
- `tests/wrapper-fixture.mjs`: a fake `npm`, and `latestVersions`
- `tests/agent-wrapper.test.mjs`: the cases of the table, and the new ones
- `tests/harness-versions.test.mjs`: no default in the Dockerfile, and the test of where a pin is written removed
- `changes/0027-harness-versions-follow-the-host/record.md`: an amendment
- `changes/0030-no-kit-harness-versions/record.md`: the log

## Tasks

- [x] Bring the branch up to date with `master` when `master` has moved, by a merge, and run `npm test`. Record
  whether 0028 is in it and how many tests pass (R16)
- [x] Add the fake `npm` and `latestVersions` to `tests/wrapper-fixture.mjs`. Change and add the cases of
  `tests/agent-wrapper.test.mjs` as the Approach gives them, and the two tests of
  `tests/harness-versions.test.mjs`. Run `npm test`, see the new and changed ones fail and the rest pass, and
  record the numbers (R16)
- [x] Change `container/agent.sh` as the Approach gives it, with the three lines word for word, and its head
  comment. See the wrapper's tests pass, and `bash -n container/agent.sh` (R1, R3, R4, R5, R6, R7, R8, R10)
- [x] Remove the two `ARG` lines with defaults from `container/Dockerfile` and write the comment in their place.
  Correct the comment in `container/compose.yml`. See every test pass, and that
  `grep -rn -E '[0-9]+\.[0-9]+\.[0-9]+' container templates` shows no version of a harness (R2, R9, R14)
- [ ] Rewrite the README's "The harness versions" as the Approach gives it, with the wrapper's lines copied from
  the wrapper, and correct the sentence on the login's label and the bullet on `./agent-dev.sh`. Go through
  0027's subsection paragraph by paragraph and record, for each, that it is kept, changed or removed, and why
  (R12, R13, R14)
- [ ] On the host, check the wrapper for real, as requirement 17 lists it, under the Compose project
  `ritenoar-agentrite-agent-check0030`, with `container/agent.sh "$PWD"` from the working copy and
  `AGENT_PROJECT_NAME` set to that name. Take the lists of images, volumes, networks and containers before and
  after and compare them. Touch no other image, volume or container, and log in to nothing. Restore
  `agent/compose.project.yml` with `git checkout` after the step that edits it. Record what each step showed, and
  the versions of Docker, Compose, npm and the host's harnesses. When the session may not run Docker, record that
  and leave the task to the human (R11, R17)
- [ ] Add the amendment to 0027's record (R15)
- [ ] Record what the release notes should say of this unit, from the Approach's last paragraph, corrected for
  what the check showed (R11)

## Verification

- [ ] `npm test` passes on the host
- [ ] `bash -n container/agent.sh` passes
- [ ] `grep -n -i -E 'pin|kit.s (claude|opencode|version)' container/agent.sh container/Dockerfile
  container/compose.yml` prints nothing
- [ ] `npm pack --dry-run` lists the same files as on `master`
- [ ] No line of the files this unit adds or changes is longer than 120 characters, and none holds an em dash
- [ ] `npm run check-changes` passes: 0027's `spec.md` and `plan.md` are untouched
- [ ] `docker image ls`, `docker volume ls` and `docker network ls` show nothing named
  `ritenoar-agentrite-agent-check0030`

## Commit Points

- [ ] The tests
- [ ] The wrapper
- [ ] The Dockerfile and the Compose comment
- [ ] The README
- [ ] The record of the check, and the amendment to 0027's record
