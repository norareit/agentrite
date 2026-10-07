# 0042 The home check cannot enter a directory only the agent may enter

## Context

`0035-harness-logs-on-the-host`, released in 4.1.0, mounts two directories of the host inside the agent's home, and
gave the entrypoint a second check of the home volume. Docker makes a mount point that the volume lacks, and every
missing directory above it, as root, and the agent then cannot write beside the mount. So the entrypoint looks at the
three directories above the two mounts, `.claude`, `.local` and `.local/share`, and refuses to start when one of them
does not belong to the agent.

On the first project the human moved to 4.1.0, the sandbox did not start. Its home volume is sound: all three
directories are the agent's. The check itself failed, with an error of the tool it uses and no refusal of its own.

The human asked for the bug to be specified, and whether the project can simply be started again once a release
holds the fix, with nothing done to its volume by hand. It can: the failed start changed nothing in the volume, and
requirement 1 is that such a volume starts.

## Observed behavior

In a project on 4.1.0, after its image was built again, `./agent.sh --in-place --rebuild true` builds the image and
then ends with one line, before the firewall is installed and before the command runs:

```
stat: cannot statx '/home/agent/.local/share': Permission denied
```

Nothing of the entrypoint's own is printed: no `[entrypoint] FATAL`, no directory named as the wrong owner's, and no
way to recover. Every start of that project ends so.

The project's home volume, read from a container with the volume mounted read-only:

```
drwxr-xr-x  9 1000 1000 4096 Oct  6 17:25 /h
drwxr-xr-x 12 1000 1000 4096 Oct  6 17:25 /h/.claude
drwx------  3 1000 1000 4096 Oct  4 13:00 /h/.claude/projects
drwx------  4 1000 1000 4096 Sep  9 15:17 /h/.local
drwx------  6 1000 1000 4096 Oct  6 14:14 /h/.local/share
drwxr-xr-x  6 1000 1000 4096 Oct  6 14:14 /h/.local/share/opencode
```

The agent is uid 1000. `.local` and `.local/share` are the agent's, and only their owner may enter them. They were
made so on 2026-09-09 by something that ran in the sandbox. Which program was not looked for: tools that follow the
XDG convention make such directories for their owner alone.

## Expected behavior

A home volume in which the three directories are the agent's starts, whoever else may enter them. A home volume in
which one of them is not the agent's is refused as 0035's requirement 12 says, by the entrypoint, with the directory
named and the recovery given. The entrypoint never ends on the bare error of a tool it ran.

## Steps to reproduce

On Docker Engine 28.4.0 on Linux, with an image built by the release 4.1.0:

1. Make a home volume from the image, and in it, as the agent, `chmod 700 ~/.local`
2. Start the sandbox of a project with that volume, as `./agent.sh --in-place true`
3. Observe the line above, and that the command did not run

A volume in which a tool made `.local` for its owner alone, as the human's project has, is step 1 done by that tool.

## Root cause

Reproduced on the host above, on a volume made for it from the image of 4.1.0 as in step 1, in a container started
with the capabilities the base compose file gives, `NET_ADMIN`, `SETUID` and `SETGID` and no others, and
`no-new-privileges`:

* As the container's root, `stat -c %u` of `/home/agent/.claude` and of `/home/agent/.local` printed `1000`, and of
  `/home/agent/.local/share` printed `stat: cannot statx '/home/agent/.local/share': Permission denied` and exited 1
* In the same container, as the agent, through `setpriv --reuid=agent --regid=agent --init-groups`, the same `stat`
  printed `1000`, and all three directories were writable

The check runs before the entrypoint leaves root. The container's root is uid 0 with none of the capabilities that
let root pass a file's permissions: every capability is dropped but the three above, on purpose. So it enters a
directory only as any other user would, and `.local` admits its owner alone. Looking at `.local/share` needs
entering `.local`. The entrypoint runs with `set -e`, the failed `stat` is the right side of an assignment, and the
script ends there with `stat`'s message as its last line.

The check of the top of the home does not have the fault: `/home` admits everyone.

Why the unit's own proof did not find it. 0035's requirement 18 was shown on volumes made for it and on one of an
earlier release in which the harnesses had made the directories, and in all of them `.local` admitted everyone. The
suite runs the check's function as the user who owns the directories, who may always enter them.

## Fix

The three directories are examined as the agent, which the entrypoint can already become, and no longer as root.
What makes a volume refused stays what it is: a directory among the three that does not belong to the agent. A
directory that cannot be examined at all is refused by the entrypoint in its own words.

## Requirements

1. A home volume in which `.claude`, `.local` and `.local/share` belong to the agent passes the check and the
   container starts, whatever the modes of the three are. That holds when one of them, or each, admits its owner
   alone
2. A home volume in which one of the three does not belong to the agent is refused as it is in 4.1.0: before the
   firewall is installed and before the command runs, naming the first such directory, its owner and the agent's
   uid, saying how the volume came to hold it, and ending in the recovery
3. When one of the three cannot be examined, the start is refused by the entrypoint: the message opens as its other
   refusals do, names the directory, says that it could not be examined, and ends in the same recovery. The bare
   error of a tool is never the last thing a refused start prints
4. The container is given no capability it did not have, and the base compose file is as it was. The check changes
   nothing in the volume
5. The suite holds a test that shows the three directories are examined as the agent and not as the user the
   entrypoint starts as, and tests of requirements 2 and 3 as far as they can be run by a user who is not root
6. Requirements 1 and 2 are shown once on a real Docker, on a Linux host, with what was run and what it printed in
   the unit's record: the sandbox started through the wrapper on a home volume in which `.local` admits its owner
   alone, and on one in which Docker made a directory above a mount as root, which is refused. The suite's user owns
   what it makes and is not root, so it can show neither the fault nor its absence
7. What the README and the entrypoint's comments say of this check is true of it: who examines the directories, and
   the refusal quoted in the README, to the letter, if its text changed

## Decisions

* **As the agent, not with a capability for root.** The entrypoint holds `SETUID` and `SETGID` to leave root, so it
  can ask as the agent with what it has. Giving the container the capability to pass permissions would undo what
  the base compose file drops on purpose, for a question that is about the agent in the first place: whether the
  agent can use its home
* **Ownership stays the test.** 0035's requirement 12 refuses a directory that does not belong to the agent, and the
  refusal names an owner. A test of whether the agent can write would be a second rule, with a case of its own: a
  directory of the agent's that the agent closed to itself. Nobody has that case. It is under "Beyond the request"
* **A directory that cannot be examined is refused, not let through.** Asked as the agent, that happens when a
  directory above it is not the agent's, which the check has refused by then because it goes from the top down, or
  when the agent closed its own directory to itself. Starting anyway would bring back what the check exists to
  prevent: a harness that fails later with nothing naming the cause
* **A bug of 0035, in a unit of its own.** 0035 is implemented, so its spec and plan are frozen. Its requirement 12
  stands, and this unit makes the entrypoint meet it on a volume it did not think of
* **The adversary is unchanged.** The check is not a defence. It tells a developer why a sandbox would not work,
  before it does not. An agent that changes the modes of its own home can make its own sandbox refuse to start, as
  it can by removing its own files, and the recovery is the one the refusal gives

## Non-goals

* A change to the capabilities of the container, or to anything else that confines it
* Changing the mode of a directory in a home volume, or repairing a volume in any other way
* A change to which directories are examined, or to the check of the top of the home
* The image being built again when the kit changed, which is under "Beyond the request"

## Beyond the request

* **Building the image again when the kit changed.** The entrypoint is in the image, and the wrapper builds the
  image again only when it is missing, when a harness's version differs, or on `--rebuild`. A project that moves to
  a release with this fix has the faulty entrypoint until its image is built again, and nothing says so. It would
  cost a mark of the kit's version in the image and a comparison in the wrapper, as the harness versions have.
  Without it, a developer who updates the kit and starts the sandbox gets the old entrypoint, sees the same line
  as before, and gets past it with `--rebuild` once they know to. The specifier advises a unit of its own for it
* **Refusing on what the agent can write instead of on who owns it.** It would say directly what matters. It would
  cost a second wording of the refusal and a change to what 0035 specified. Without it, a directory of the agent's
  that the agent cannot write is not refused and fails later, which no volume is known to hold
