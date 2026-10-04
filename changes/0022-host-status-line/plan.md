# 0022 The developer's Claude Code status line in the sandbox

## Approach

One new file in the kit and a few lines in the wrapper. The image, the entrypoint and the Compose services do not
change.

**The settings file.** `container/claude-managed-settings.json` holds exactly:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash /etc/claude-code/statusline-command.sh"
  }
}
```

It ships with the rest of `container/`, which `package.json` already lists whole, so `npm pack --dry-run` goes from
22 files to 23.

**The wrapper.** In `container/agent.sh`, after the argument loop and before the `exec`, look for the host script
and add both mounts to the `mounts` array the `--mount` flags already fill:

```sh
statusline="${HOME:-}/.claude/statusline-command.sh"
if [ -f "$statusline" ]; then
  mounts+=(
    --volume "$statusline:/etc/claude-code/statusline-command.sh:ro"
    --volume "$here/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro"
  )
fi
```

`[ -f ]` is false for a missing path and for a directory, and follows a symbolic link. `${HOME:-}` keeps `set -u`
from stopping the wrapper where `HOME` is unset. The comment above it says why the wrapper looks first: Docker
creates a root-owned directory at a missing source, and a managed `statusLine` with no script blanks the sandbox's
own. The header comment of the file, which says what the wrapper adds, gains the status line.

**The tests.** `tests/agent-wrapper.test.mjs` runs the wrapper with the environment of whoever runs the suite, so
on the human's machine the existing tests would see the human's real script and get two more `--volume` flags.
`setUp` therefore gives every run a `HOME` of its own under its temporary directory, empty unless the test fills
it. That change comes first and on its own, since it changes no behavior.

**The real run.** This repository's `./agent.sh` runs the released kit from `node_modules`, and its Compose project
owns the human's image and home volume, which must not be touched. Do the run with `./agent-dev.sh` instead, which
0021 added after this plan was first written: it runs the working copy's wrapper, under an image and a home volume
of its own. Remove that home volume afterwards with the command the README gives, so that it is empty again.

Claude Code shows no status line until it is past the login screen, and no login is made. Planning used a made-up
API key instead, which the implementer repeats inside the scratch sandbox:

* Write `/home/agent/.claude.json` with `hasCompletedOnboarding: true`, a `theme`, the last 20 characters of the
  made-up key under `customApiKeyResponses.approved`, and `projects["/work"].hasTrustDialogAccepted: true`
* Start `claude` with `ANTHROPIC_API_KEY` set to the made-up key, under `timeout 25 script -qec claude <logfile>`
  so it has a terminal, and read the script's line out of the log after stripping the escape sequences
* The key reaches `api.anthropic.com`, which refuses it. Nothing is authenticated and no credential is stored

Run it twice: once with the host script in place, and once with `HOME` set, for the wrapper only, to a scratch
directory that holds nothing but an empty `.gitconfig` file, which is the host with no script. The `.gitconfig` is
there because the base Compose file mounts it, and Docker would otherwise create a root-owned directory in its
place. If Docker needs its own configuration from the real home, pass `DOCKER_CONFIG`. Never move or edit the
human's `~/.claude`. If the made-up key no longer gets Claude Code to its prompt, record that
and what was seen instead, and leave the terminal check to the human, who has a login.

**0015.** The branch `bugfix-0015-harnesses-fail-to-start` is not on `master` yet and also edits
`container/compose.yml` and `README.md`, in other places. Expect a small merge, not a conflict of meaning.

## Files

- `container/claude-managed-settings.json`: new, the settings file
- `container/agent.sh`: the two conditional mounts, the comment, the header
- `container/compose.yml`: the comment on the git configuration mount, which says it is the only host dotfile
  mounted
- `tests/agent-wrapper.test.mjs`: a `HOME` per run in `setUp`, and the new tests
- `tests/agent-dev.test.mjs`: a `HOME` per run in `setUp`
- `tests/claude-managed-settings.test.mjs`: new, the settings file's content
- `README.md`: a subsection under "Running the sandbox", and the `container/` row or wrapper description where they
  list what the wrapper mounts
- `changes/0022-host-status-line/record.md`: the log

## Tasks

- [x] In `tests/agent-wrapper.test.mjs`, have `setUp` create an empty home directory under its temporary directory,
  pass it as `HOME` in the environment of every `run`, and return its path. Run `npm test` and see all 178 tests
  pass, on a machine whose real home holds a status line script (R6)
- [x] Do the same in `tests/agent-dev.test.mjs`, which 0021 added after this plan was written and which runs the
  wrapper through `agent-dev.sh` with the runner's environment too. There are 184 tests since 0015 and 0021 (R6)
- [x] Add the wrapper tests and see them fail: with a file at `<home>/.claude/statusline-command.sh`, the `run`
  call to Compose holds, after `--volume <root>:/work`, exactly the two flags below and then `agent`; with no such
  path, the call is as it is today and the path still does not exist afterwards; with a directory at that path, the
  call is as it is today. The existing tests already hold the absent case's exact call (R1, R2, R3, R4, R6)

  ```
  --volume <home>/.claude/statusline-command.sh:/etc/claude-code/statusline-command.sh:ro
  --volume <container>/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro
  ```
- [x] Add `tests/claude-managed-settings.test.mjs` and see it fail: `container/claude-managed-settings.json` parses
  as JSON and deep-equals the object in the Approach (R3, R6)
- [x] Add `container/claude-managed-settings.json` and the lines in `container/agent.sh` as the Approach gives
  them, with the comment and the header line. See the new tests pass and the suite with them (R1, R2, R3, R4, R5)
- [ ] In `container/compose.yml`, change the last sentence of the comment above the `.gitconfig` mount to say that
  it is the only host dotfile this file mounts, and that the wrapper adds the developer's status line script when
  there is one. Change nothing else in the file (R8)
- [ ] In `README.md`, add "### The status line" under "Running the sandbox", after "The home volume", saying
  everything R8 lists, and that the settings file is the kit's `container/claude-managed-settings.json`. Remove
  nothing (R8)
- [ ] Do the real run with `./agent-dev.sh` as the Approach describes, and record, with the Docker and Compose
  versions: the script's line as the terminal showed it; that appending to each of the two files in the sandbox
  fails with `Read-only file system`; that `findmnt -no OPTIONS /` opens with `ro`; and, for the run without a
  host script, that `/etc/claude-code` does not exist in the container and no `.claude` directory appeared in the
  scratch home. Remove the dev home volume, and say so (R1, R2, R4, R5, R7)

## Verification

- [ ] `npm test` passes on the host, with the new tests among them
- [ ] `npm pack --dry-run` lists 23 files, `container/claude-managed-settings.json` among them
- [ ] `git diff master -- container/Dockerfile container/entrypoint.sh` is empty
- [ ] The real run is in the record, with what each check showed and what was not checked
- [ ] `npm run check-changes` passes

## Commit Points

- [x] The `HOME` per run in the wrapper's tests
- [x] The tests, the settings file and the wrapper
- [ ] The Compose comment and the README
- [ ] The record of the real run
