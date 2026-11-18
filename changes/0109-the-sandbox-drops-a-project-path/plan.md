# 0109 The sandbox drops the PATH that a project's Dockerfile sets

## Approach

`container/entrypoint.sh` keeps the `PATH` it was started with, which Docker takes from the image's configuration,
in a shell variable before it exports its fixed `PATH`, and hands that variable to the agent's command at the drop.
The hand-over is made by `env` after the `--` of `setpriv`, so that `setpriv` is still looked up and run as root
with the fixed `PATH`, and `env` runs as the agent. `/usr/local/bin/known-terminal.sh` stays named by its absolute
path, so nothing that runs before the drop is looked up on the image's `PATH`.

The two lines that open the script after `set -euo pipefail` become:

```bash
image_path="$PATH"
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

and its last line becomes:

```bash
exec setpriv --reuid=agent --regid=agent --init-groups -- env "PATH=$image_path" /usr/local/bin/known-terminal.sh "$@"
```

`sandbox.sh --connect` gives `docker exec` no `--env PATH`, so the connected command has the `PATH` the container
was created with, which is the image's and the one the entrypoint now hands the first command.

The kit's image sets no `PATH` of its own: `container/Dockerfile` has no `ENV PATH`, and its base image,
`node:26-bookworm`, sets `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`, as `docker image inspect`
shows. So the agent's `PATH` on the kit's image, and on a project's image that sets none, is the one it has now
(R3), without the fix doing anything for it. A unit test holds `container/Dockerfile` to setting no `PATH`, so that
this stays true.

The entrypoint's top level is not a function, so its tests read the shipped lines out of the file, as
`firstCommandGets` in `tests/sandbox-unit-run.test.mjs` and the tests of `tests/known-terminal.test.mjs` already do,
and run those lines verbatim where they can be run on the host.

## Files

- `tests/entrypoint-path.test.mjs`: new. The regression tests of the entrypoint's two `PATH`s (R1, R3, R4, R6)
- `tests/sandbox-unit-run.test.mjs`: `connectCall` and `firstCommandGets`, and the test that holds `--connect`
  against the entrypoint, the compose file and the image (R2, R6)
- `tests/known-terminal.test.mjs`: the pattern of the entrypoint's last line, at line 102
- `tests/sandbox-dev.test.mjs`: the call of `--connect` that the test of the shim expects, at line 157 (R2)
- `container/entrypoint.sh`: the capture of the started-with `PATH`, its comment, and the last line (R1, R4)
- `container/sandbox.sh`: the `--env PATH=...` of the `docker exec` of `--connect`, and the comment above the
  `--connect` block that lists what the call gives (R2)
- `SANDBOX.md`: "Adding software to the sandbox" (R5)

## Tasks

- [x] Write `tests/entrypoint-path.test.mjs`, failing against the tree as it is. Its tests read
  `container/entrypoint.sh` as text, take its code lines as the lines that are neither blank nor comments, and:
    - [x] Assert that the first two code lines after `set -euo pipefail` are `image_path="$PATH"` and
      `export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`, in that order, so that nothing
      runs before the fixed `PATH` is set (R4, R6)
    - [x] Assert that no other code line of the entrypoint sets `PATH`: no line but those two and the last holds
      `PATH=`, and none runs `export PATH` (R4, R6)
    - [x] Assert that the last code line matches
      `^exec setpriv --reuid=\S+ --regid=\S+ --init-groups -- env "PATH=\$image_path" (\S+) "\$@"$`, so that the
      image's `PATH` is given only after the `--` of `setpriv`, to what runs as the agent, and the script the command
      runs through is named by an absolute path, starting with `/` (R1, R4, R6)
    - [x] Run, with bash, a script made of those two opening lines verbatim, then `printf 'root %s\n' "$PATH"`,
      then the text of the last line from `env` up to the script it names, verbatim, followed by `process.execPath`
      with `-e` and a program that prints `agent ` and its `process.env.PATH`. Start it with
      `PATH=/opt/tool/bin:` before the suite's `PATH`. Assert that it prints `root` with the fixed `PATH` and
      `agent` with the `PATH` it was started with, `/opt/tool/bin` first (R1, R4, R6)
    - [x] Assert that `container/Dockerfile` has no line that sets `PATH` with `ENV`, so that the kit's image has
      the `PATH` of its base image (R3)
- [x] In `tests/sandbox-unit-run.test.mjs`, make the tests of `--connect` fail against the tree as it is (R2, R6):
    - [x] Remove `'--env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin '` from `connectCall`,
      and say in its comment that the call gives no `PATH`, so the command has the container's
    - [x] In `firstCommandGets`, remove `path`, and match `through` with the pattern of the last line that the
      first task asserts, so that it still yields `/usr/local/bin/known-terminal.sh`. Say in its comment that the
      first command is given the `PATH` the container was started with
    - [x] In the test `--connect gives the command what the entrypoint, the compose file and the image give the
      first`, remove `--env PATH=${gets.path} ` from the expected call, and assert that the recorded call holds no
      `--env PATH`
- [x] In `tests/known-terminal.test.mjs`, at line 102, match the entrypoint's last line with
  `^exec setpriv --reuid=\S+ --regid=\S+ --init-groups -- env "PATH=\$image_path" (\S+) "\$@"$`, so that the test
  that the image holds the script still finds its path once the entrypoint changes. It fails against the tree as it
  is, which is expected until the next task
- [x] Run `npm test` and see the tests of the three tasks above fail, and no other (R6)
- [x] Commit: `bugfix-0109 Add the regression tests of the PATH the agent is given`
- [x] In `container/entrypoint.sh`, put `image_path="$PATH"` directly after `set -euo pipefail` and before the
  `export PATH=...` line, with a comment above the two that says why: the entrypoint runs as root and runs the
  programs of the system directories alone, whatever the image puts on its `PATH`, and the agent's command is given
  the `PATH` the container was started with, which Docker takes from the image (R1, R4)
- [x] In `container/entrypoint.sh`, make the last line the one "Approach" gives, of 118 characters, and add to the
  comment above it that `env`, which runs as the agent, gives the command the image's `PATH`, so
  that `setpriv` is looked up with the fixed one (R1, R4)
- [x] In `container/sandbox.sh`, remove the line
  `--env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \` of the `docker exec` of `--connect`.
  In the comment above the `--connect` block, say that HOME, USER and LOGNAME are the values the entrypoint
  exports, and that no PATH is given, so the command has the container's, which is the image's and the one the
  entrypoint hands the first command (R2)
- [x] In `tests/sandbox-dev.test.mjs`, in the test `the shim connects to a unit run under the dev name, and asks
  for no build`, remove `--env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin ` from the expected
  call, which the change of `--connect` makes fail (R2)
- [x] Run `npm test` and see every test pass (R1, R2, R3, R4, R6)
- [x] Commit: `bugfix-0109 Give the agent the PATH of the image`
- [x] In "Adding software to the sandbox" of `SANDBOX.md`, after the paragraph on the example and `TARGETARCH`, add
  a paragraph that says that a `PATH` the file sets with `ENV`, as `ENV PATH=/opt/tool/bin:$PATH` for a tool
  installed under `/opt`, is the `PATH` of the agent's commands: of the command a run starts and of a command that
  `--connect` runs. Leave the statement of "Two agents on one unit" that the connected command has `PATH` as the
  first command has it as it is, which the fix keeps true. Wrap at 120 characters (R5)
- [x] Commit: `bugfix-0109 Say that the PATH of a project's Dockerfile is the agent's`

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes, after the last commit
- [ ] Every line the unit changes or adds is within 120 characters, apart from a row of a Markdown table
- [ ] `docker image inspect` of the image `./sandbox-dev.sh --rebuild` builds shows a `PATH` of
  `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` in its configuration, and
  `./sandbox-dev.sh --in-place sh -c 'echo "$PATH"'` prints that `PATH`, on the host, where Docker is (R3)

## Commit Points

- [x] `bugfix-0109 Add the regression tests of the PATH the agent is given`: the failing tests
- [x] `bugfix-0109 Give the agent the PATH of the image`: the entrypoint and `--connect`, with every test passing
- [x] `bugfix-0109 Say that the PATH of a project's Dockerfile is the agent's`: `SANDBOX.md`
