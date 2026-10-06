# 0035 Harness logs on the host

## Context

Claude Code and OpenCode each keep a log of every session on disk: what was asked, what was answered and how many
tokens it took. In the sandbox those logs are written to the agent's home, which is a named Docker volume. Nothing on
the host reads a named volume as a plain directory. On Linux its files are under Docker's own directory, which the
developer cannot enter, and on macOS they are inside Docker Desktop's virtual machine.

A tool on the host that reads the harnesses' logs therefore sees the sessions run on the host and none of those run
in a sandbox. The human has such a tool, which collects token usage from both harnesses' logs, and found that the
usage of every sandboxed session is missing from it.

### What the human asked for

On 2026-10-06, in a session of Claude Code on the host, about that tool: "It uses my local claude logs and opencode
database to push metrics to a rpi SQL database... BUT I just realised this probably doesn't happen when I'm running in
the agentrite containers, becasue they have their own claude and opencode 'homes', right?!"

Several ways out were weighed in that session, and the human chose:

* **A directory of the host is mounted for the harnesses' logs**, over reading the volumes from the host, which does
  not work on macOS, and over running the tool in the sandbox, which would need the tool's database login and a way
  to its server from inside
* **That directory is outside the project**, over one inside it: "I'm really not a fan of polluting a project
  directory with this type of stuff. Someone could accidentally commit this."
* **It is named after the project root's directory, under one place for all projects**: "the kit puts it in a GENERIC
  path, but uses the projects root folder as the directory. Something like: .local/share/agentrite/norareit/ and
  .local/share/agentrite/projectx"
* **Not the host's own harness directories**, which the human proposed and dropped when told what they hold
* **`/work` stays `/work`**, which the human proposed changing and left for later

Then: "Can you write the plan for harness-telemetry AND act as the @specifier for the changes necessary to fix this
for agentrite?" Asked by the specifier, the human chose:

* **The whole of OpenCode's data directory is mounted, its login included**, over moving Claude Code's logs only and
  over a requirement that the login stays in the volume
* **The logs already in a home volume are not moved by the kit.** The human wants them collected and does not mind
  how: "If you tell me how to do it manually, that's fine."

After the trials below, told that a home volume of an earlier release may hold directories that are not the
agent's, and given three ways out, the human chose:

* **Such a volume is refused, and the developer removes it**: "Can't we just show a clear error when that happens and
  instruct to remove the volume? Then it'll be recreated after and all is gut."

Everything else in this spec is the specifier's, and has not been read by the human yet.

### What was found while specifying

On `master` at `f6998db`, which holds the release 4.0.0, and on the human's Linux host. The trials were made later
the same day, with the image of that release and the two mounts given by hand: on the human's Mac by a session
there, which the unit's record holds in full, and of the home alone on the Linux host by the specifier.

* The home is one named volume for each Compose project, mounted at `/home/agent`, and every container of a project
  shares it. The base compose file mounts one host dotfile, the developer's git configuration, read-only. The wrapper
  adds the developer's Claude Code status line, read-only, when the host has one
* The README says of the container: "The agent writes the working directory, its home volume and `/tmp`."
* Claude Code writes its sessions under `/home/agent/.claude/projects`, in one directory for each working directory
  a session was started in. Every sandboxed session is started in `/work`, so they are all in `-work`. On the host
  that same directory, for a project, also holds Claude Code's memory files
* OpenCode writes under `/home/agent/.local/share/opencode`. On the host that directory holds the database
  `opencode.db` with its two SQLite companions, `opencode.db-wal` and `opencode.db-shm`, and beside them `auth.json`,
  which is the login, and `log`, `repos`, `snapshot` and `tool-output`. SQLite makes the companions beside the
  database, so the database cannot be mounted as a file apart from its directory
* Read from a container with the volume mounted read-only, five home volumes on the host hold, between them, six
  Claude Code session files and two OpenCode databases. The oldest volume is from 2026-09-09
* The wrapper keeps the clones of unit runs on the host at `~/.local/state/agentrite/<Compose project>/<branch>`, or
  under `$XDG_STATE_HOME`. It is the kit's one place on the host outside the project
* Docker makes a mount's missing source as root. The wrapper makes both `.reviews` directories itself for that
  reason, and looks for the status line before mounting it
* The entrypoint refuses to start when the top of the home is not owned by the agent, and compares the top only
* The agent in the container has the uid and gid of the developer on the host
* This repository runs two sandboxes from one project root: `./agent.sh`, of the released kit, and `./agent-dev.sh`,
  of the working copy. They differ in the Compose project's name, and so in image and home volume
* The README states what the sandbox defends against: an agent that was misled and writes whatever it likes under
  `/work`. It names as not defended "the saved logins in the home volume"
* The home in the image holds `.bash_logout`, `.bashrc` and `.profile`, and neither `.claude` nor `.local`. Docker
  fills a new volume from the image once, and never again
* A mount point that the home volume does not hold is made by Docker, as root, with every directory above it that
  is missing. Tried on a new volume, on Linux and on macOS alike: `.claude`, `.local` and `.local/share` were root's,
  the agent could not write in them, and the two mounted directories were writable. Claude Code keeps its settings
  and its login in `.claude`
* The container's root holds no capability to change a file's owner, which the entrypoint says of itself, so
  nothing in the container can make such a directory the agent's
* A volume in which the agent had made the directories before the mounts were given has none of this: every
  directory above the mounts was the agent's
* Of the five home volumes on the Linux host, three lack `.claude`, and one of those lacks `.local` too. They are
  the sandboxes in which Claude Code, or either harness, was never started. The other two hold every directory above
  both mounts
* On macOS 15.1.1 with Docker Desktop 4.26.0 and VirtioFS as its file sharing, in a volume prepared so, both
  harnesses worked with their logs on a mounted directory of the host. A second container continued Claude Code's
  session, listed OpenCode's, and found OpenCode logged in. Two containers at the same time ran ten OpenCode
  sessions and two Claude Code prompts without an error, and the database's integrity check passed. Read from the
  Mac every three seconds while a container wrote, the database gave a current count each time, and Claude Code's
  log arrived on the Mac as it was written. What the container wrote belonged to the developer on the Mac

**Not established.**

* That both harnesses work so on a Linux host. Of the trial, only the home was repeated there, and no harness was
  started. A mounted directory is the host's own file system on Linux, with no layer between
* That it holds with Docker Desktop's other file sharing implementations, gRPC FUSE and osxfs. Neither was tried
* That OpenCode has no setting that puts its database apart from its login. None was found, and none was looked for
  beyond the directory's contents

## Requirements

Where the logs are:

1. In every run of the sandbox, Claude Code's projects directory, `/home/agent/.claude/projects`, and OpenCode's data
   directory, `/home/agent/.local/share/opencode`, are directories of the host and not of the home volume. That holds
   for a unit run, for `--in-place` and for `--workdir`
2. On the host they are in the project's log directory, `<data>/agentrite/<name>/`. `<data>` is `$XDG_DATA_HOME` when
   that is set and `~/.local/share` when it is not. `<name>` is the name of the project root's directory, so a
   project at `~/projects/norareit` has `~/.local/share/agentrite/norareit/`
3. Inside the log directory the two have the places they have in a home: `.claude/projects` and
   `.local/share/opencode`. So the log directory can be read as a home that holds nothing but the two
4. Every run of one project root uses the same log directory, whatever is mounted at `/work`: the clone of any
   branch, the project root, or another directory
5. The log directory and the two directories in it exist before the container starts, made by the wrapper as the
   developer. Docker makes none of them
6. On the host, what a harness writes there belongs to the developer, who reads it as any other file of theirs,
   without Docker and without another user's rights

What stays as it was:

7. Everything else of the home is in the home volume: Claude Code's login and settings, the npm cache, and whatever a
   harness keeps outside the two directories
8. Both harnesses work in the sandbox as they did. Each starts, is logged in, and holds a session. A second container
   of the project finds that session: Claude Code continues it, and OpenCode lists it. That holds on a home volume
   that did not exist before, and on one of an earlier release that holds every directory above both mounts
9. In a container that starts, the agent can write its whole home, the two directories and every directory above
   them included. The entrypoint's refusal of a home the agent does not own stands
10. Two containers of one project that run at the same time both write their sessions, as they do today in one home
    volume

The home volume:

11. In a home volume that this release makes, the two mount points and every directory above them belong to the
    agent, whichever harness is started first and whether one is started at all
12. A home volume in which a directory above either mount does not belong to the agent is refused when the container
    starts, before the command runs, as a home the agent does not own is refused today. The refusal names the
    directory, says that the volume was made by an earlier release in which that directory was never made, and says
    how to recover: remove the project's home volume, with the command, and start again. It says that this discards
    the logins saved in the volume

What the sandbox reaches on the host:

13. A container reaches its own project's log directory and no other project's. Besides that directory the sandbox
    mounts what it mounted before and nothing more: none of the host's own harness directories, and no directory
    above the log directory

What says so:

14. The comments of the base compose file and of the wrapper, which state what is mounted and what the agent can
    write, are true of the sandbox with this unit
15. The README states, where it describes the sandbox:
    * where the logs are on the host, and that a tool on the host can read them there
    * that the agent writes this directory of the host besides `/work`, and that what is in it was written by an
      agent that may have been misled, so that whatever reads it treats it as data
    * that OpenCode's login is in that directory, in a file of the host, and no longer in the home volume, while
      Claude Code's stays in the volume
    * that two projects whose root directories have one name share a log directory, and what that does: either
      harness may continue or list the other project's sessions, and a reader cannot tell them apart
    * what moving to this release does to a project that has a home volume: the sessions in it are no longer listed,
      OpenCode asks for its login once more, and nothing is deleted. It gives the command that copies a volume's
      logs to the log directory by hand
    * that a home volume in which a harness was never started may be refused after moving to this release, what the
      refusal says, and that removing the volume is the way on. It tells a developer who wants the volume's logs to
      copy them first
    * with which file sharing of Docker Desktop for macOS this was shown to work, and that it was shown with no
      other
16. Each sentence of the README that this unit makes untrue is corrected, among them that the agent writes "the
    working directory, its home volume and `/tmp`", that a harness's login is kept in the home volume, and the list
    of what a unit run does not defend against

The proof:

17. The suite shows, with the stand-in for Docker it has, what the wrapper asks Docker to mount and which directories
    it makes first, for a unit run, for `--in-place` and for `--workdir`, with `$XDG_DATA_HOME` set and unset
18. Requirements 6 and 8 to 12 are shown once on a real Docker, on a Linux host, with what was run and what it
    printed in the unit's record: on a home volume this release made, on one of an earlier release that holds the
    directories, and on one that lacks them, which is refused. The stand-in cannot show these, and they are what
    the unit can break

## Decisions

* **A directory of the host, mounted. The human's.** It is the one way that is the same on Linux and on macOS, and
  it asks nothing of the tool that reads the logs but a path. Reading the volumes from the host was the specifier's
  first advice and works on Linux alone. A reader in a container of its own would make Docker a requirement of the
  reader
* **Named after the project root's directory. The human's.** The name is the one a developer knows the project by,
  and the human's tool shows a project by the last part of its path, so sandboxed and host sessions of one project
  come together there without a rule. The Compose project's name would have matched where the clones are kept, and
  would have given this repository's two sandboxes a directory each. It was not chosen because it is a name made for
  Docker: `norareit-agent`, `ritenoar-agentrite-agent`. The cost is requirement 15's fourth point, and that this
  repository's `./agent.sh` and `./agent-dev.sh` share their logs and their OpenCode login
* **Under the data directory, not the state directory. The human named the path.** The state directory holds a
  directory for each Compose project, with the clones in it. A directory for each project root beside those would put
  two kinds of name in one place, and a project root may be named as another project's Compose project is
* **Laid out as a home. The specifier's.** A reader is then given one path for each project and finds both harnesses
  under it where it finds them in any home. Two directories with names of the kit's own would need the reader to know
  the kit
* **OpenCode's whole data directory. The human's, on the specifier's advice.** The database cannot be mounted apart
  from its directory, and the login is in that directory. Leaving OpenCode out would leave half of what was asked for
  undone. The cost: the login is a file on the host, as the developer's own OpenCode login is, and each project logs
  in to OpenCode once more
* **Of Claude Code, the projects directory alone. The specifier's.** It holds the sessions. The login and the
  settings are beside it and are not needed on the host, so they stay where the README says they are
* **Always, with no way to turn it off. The specifier's.** A sandbox that sometimes writes its logs to the volume and
  sometimes to the host has two places to look and two things to test. An option is under "Beyond the request"
* **The kit moves nothing out of an existing volume. The human's.** A copy made by hand, once for each volume, does
  it, and the README gives the command. Code that runs once on each host would have to be tested and then kept
* **The kit knows no reader. The specifier's.** The unit puts the logs where a tool can read them and names no tool.
  The human's tool is another project, which reads more than one such directory through a change of its own
* **The adversary is the sandbox's own, and it gains one directory.** The sandbox defends against an agent in the
  container that was misled. With this unit that agent writes one more directory of the host: its own project's log
  directory. It can put anything there, a false record of usage and a link to a file elsewhere among it. The unit
  defends the logs of other projects and the host's own harness directories, which the container does not reach, and
  that is requirement 13. It does not defend a tool that reads the log directory against what is in it, and it does
  not keep apart two projects whose roots have one name. Nothing on the host reads the directory unless the
  developer points something at it. The supported usage is the sandbox's: one developer, one host
* **A home volume with a directory that is not the agent's is refused, and removed by the developer. The human's.**
  Docker has made the directory as root before anything of the kit runs in the container, and nothing in the
  container can change its owner. Left alone, the harness fails later with nothing naming the cause, which is what
  the entrypoint's present refusal exists to prevent. Removing the volume costs its saved logins, and here that is
  little: a volume without `.claude` holds no login of Claude Code, and OpenCode's login leaves the volume with this
  unit in any case. Two other ways were given to the human. A container that the wrapper starts before each run,
  without the mounts, to make the directories as the agent: it repairs every volume, and every start of every
  sandbox then pays for a second container and its firewall, for a fault a volume can have once. A capability for
  the entrypoint to change the owner: the container is started without it on purpose
* **Shown on macOS with VirtioFS, and to be shown on Linux. The specifier's.** The trial on the human's Mac is what
  is known of macOS, and the README names the file sharing it was made with rather than macOS as a whole. On Linux
  no harness was started, so requirement 18 asks for it on the host the unit is built on

## Non-goals

* The tool that reads the logs, and anything that names it
* Mounting the host's own `~/.claude` or OpenCode directories, or any part of them
* Another path than `/work` for the working directory
* Moving, copying or deleting the logs an existing home volume holds
* Removing a log directory when its project is gone
* Keeping apart two projects whose root directories have one name
* Keeping OpenCode's login in the home volume
* An option for where the log directory is, or for not having one
* A change to the firewall or the egress allowlist
* Repairing a home volume that is refused
* The logs of a harness other than Claude Code and OpenCode

## Beyond the request

* **Showing it with Docker Desktop's other file sharing implementations.** It would cost the trial on the Mac once
  more for each. Without it the README names the one it was shown with, and a developer on another who finds
  OpenCode failing sees it at once, in the sandbox, with nothing of the host's lost
* **A wrapper that repairs a refused home volume.** The human chose against it. It is named here because it is what
  would spare a developer the removal
* **Copying a volume's logs at the first start.** It would cost code in the wrapper or the entrypoint that runs once
  for each project, and its tests. Without it the README's command does the same by hand, and a developer who skips
  it loses the listing of old sessions and no file
* **Telling two project roots of one name apart.** The log directory could record the root it was made for, and the
  wrapper refuse another. It would cost a file of the kit's in the log directory and a refusal to explain. Without
  it the two projects' sessions are mixed, which the developer sees in either harness, and renaming one root ends it
* **An option that turns the mount off.** It would cost a second path through the wrapper and the tests. Without it
  a developer who wants no logs on the host has them in one directory they may delete
* **OpenCode's login kept in the home volume.** It needs a way to put the login apart from the database, which was
  not found. Without it the login is in a file of the host that only the developer and the project's own sandbox
  read
* **The project mounted at its path on the host instead of at `/work`.** The human proposed it. The logs would then
  name the project's real path, and a reader would need no name for the directory. It would cost a change to every
  place the kit and its projects name `/work`, in a release that breaks them. Without it the log directory's name
  says which project the sessions are of
