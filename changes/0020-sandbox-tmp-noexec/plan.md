# 0020 The sandbox refuses to run anything from `/tmp`

## Approach

One entry of `container/compose.yml` changes, from `/tmp` to `/tmp:exec`. The work around it is what proves it and
says so: a regression test that reads the compose file, the comment above the list, a paragraph of the README, and
a real run.

**The test.** A new file, `tests/compose-tmpfs.test.mjs`, reads `container/compose.yml` as text and collects the
entries of the agent's `tmpfs:` list: the lines that follow `    tmpfs:` and open with `      - `, up to the first
line that does not. It asserts that the list is exactly `/tmp:exec` and `/run`. It holds the whole list, not only
the `/tmp` entry, so that a mount added later, or `exec` put on `/run`, fails it and is decided on purpose.

**The real run.** This repository's installed kit is the release, not the working copy, so `./agent.sh` would run
the old compose file. Run Compose as the wrapper does, with the working copy's file in place of the installed one:

```sh
export AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container AGENT_UID=$(id -u) AGENT_GID=$(id -g)
docker compose --project-directory "$PWD" -f container/compose.yml -f agent/compose.project.yml \
  run --rm --volume "$PWD:/work" agent <command>
```

That needs `agent/compose.project.yml` and a built image, which 0018's uncommitted work on this branch provides:
0018 is in progress and waits for this unit. If they are not in the tree, do the same in a scratch project with
the kit packed from this branch, as 0017 did, and say which was done.

This unit is written on the branch `feature-0017-sandbox-without-playwright`, which holds 0017, the 2.2.0 release
commit and 0018. `master` holds none of them yet.

## Files

- `tests/compose-tmpfs.test.mjs`: new, the regression test
- `container/compose.yml`: the `/tmp` entry, and the comment above the `tmpfs:` list
- `README.md`: a paragraph under "Running the sandbox"
- `changes/0020-sandbox-tmp-noexec/record.md`: the log

## Tasks

- [ ] Write `tests/compose-tmpfs.test.mjs` as the Approach describes, asserting that the agent's `tmpfs` list is
  exactly `/tmp:exec` and `/run`. Run `npm test` on the host and see this one test fail, with `/tmp` where
  `/tmp:exec` is expected (R3)
- [ ] In `container/compose.yml`, change the entry to `/tmp:exec`, and extend the comment above `read_only`: Docker
  mounts a tmpfs `noexec` unless told otherwise; `/tmp` is given `exec` because test suites and tools run what they
  write there, and because the agent can already run what it writes to `/work` and to its home, so `noexec` there
  confined nothing; `/tmp` keeps `nosuid` and `nodev`. Change nothing else in the file. See the test pass (R1, R2,
  R3)
- [ ] On a host with Docker, with the working copy's compose file as the Approach describes, run and record: the
  probe of the spec's steps to reproduce, which exits 0 and prints `ran`; `findmnt -no OPTIONS /tmp`, which holds
  `nosuid` and `nodev` and no `noexec`; `findmnt -no OPTIONS /`, which holds `ro`; and `npm test`, which exits 0
  with no failing test. Record the Docker and Compose versions (R1, R2, R4)
- [ ] In `README.md`, under "Running the sandbox", after the paragraph that says where the confinement lives, add
  a paragraph: the root filesystem is read-only; the agent writes the working directory, its home volume and
  `/tmp`; `/tmp` is in memory, is emptied when the container stops, and files in it can be run, so a test suite or
  a tool that runs what it writes to the temporary directory works as on the host. Remove nothing (R5)

## Verification

- [ ] `npm test` passes on the host
- [ ] `npm pack --dry-run` lists the same 22 files
- [ ] The real run is in the record, with the Docker and Compose versions and what each check showed
- [ ] `npm run check-changes` passes

## Commit Points

- [ ] The regression test and the fix
- [ ] The README
- [ ] The record of the real run
