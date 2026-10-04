# 0022 The developer's Claude Code status line in the sandbox

## Context

A developer who has a Claude Code status line on the host does not see it in the sandbox. Claude Code reads the
status line from its settings, and the sandbox's home is a volume of its own, which starts without the developer's
settings and without the script they name. The only host dotfile the sandbox mounts is the developer's git
configuration.

The way to get it today is to copy the script into the home volume by hand and add the `statusLine` setting there,
once for every home volume, which is every project and every time a volume is removed. The human, in the session
that implemented 0015: "I don't want to be doing that every time. Even if it's only once a month. I just want my
statusline to be included."

The human named two ways to do it, shipping the human's own status line in the kit or a per-project setting that
points at a status line file, and asked the implementer of 0015 for an opinion. The implementer proposed a third,
after the git configuration's precedent: mount the developer's own script read-only, and have a system-level Claude
Code settings file run it. This unit takes that proposal as its starting point. The decisions below say what was
kept, what was changed after checking it, and why the two the human named were not taken.

### What was checked before writing

On Linux with Docker Engine 28.4.0, in throwaway containers built from `node:26-bookworm` with Claude Code 2.1.266,
the version the sandbox image pins, plus `jq` and `git`. Claude Code's terminal interface was started on a pseudo
terminal with no network and a made-up API key, with onboarding and the trust of `/work` pre-seeded, so nothing
was logged in to. Each status line command appended to a file, and the terminal's output was captured.

| Case                                                                         | Status line that ran      |
|------------------------------------------------------------------------------|---------------------------|
| `statusLine` in the user's `~/.claude/settings.json` only                    | the user's                |
| `statusLine` in `/etc/claude-code/managed-settings.json` only                | the managed one           |
| in both                                                                      | the managed one only      |
| in `/etc/claude-code/managed-settings.d/statusline.json` and the user's      | the managed one only      |
| managed, with a command that prints nothing, and the user's                  | neither shows: blank      |
| the human's script and a settings file both bind-mounted, and the user's     | the human's script        |

In the last case the terminal showed `/work (master) | Opus 5 (1M context)`, which is the human's script run on what
Claude Code gave it, and the user's own status line did not run.

Also seen, in a container with a read-only root filesystem, as uid 1000 with every capability dropped:

* Docker creates the `/etc/claude-code` directory for the two bind mounts although the image has none and the root
  is read-only. Appending to either mounted file, and creating a file beside them, fail with `Read-only file system`
* The human's script, as it is on the host, mode 0664 and not executable, runs with `bash` and exits 0
* A symbolic link at the mounted host path mounts the file it points at

And with a bind mount whose source file does not exist on the host:

* Docker creates a directory at the source path on the host, owned by root, and mounts that
* In the container the target is then a directory. `bash` on it exits 126

Claude Code's documentation, read on 2026-10-04, agrees with the table and adds what a run could not show:

* Managed settings stand above every other level: "no user, project, local, or `--settings` value overrides them".
  There is no system-level settings file below the user's
* The file is `/etc/claude-code/managed-settings.json` on Linux, which is what the sandbox is on every host
* When an organization delivers managed settings from the claude.ai console, Claude Code by default uses that source
  and ignores the file
* A status line that exits non-zero or prints nothing leaves the line blank, and a status line runs only in a
  folder whose trust dialog was accepted

## Requirements

1. When `~/.claude/statusline-command.sh` is a file on the host when the sandbox is started, Claude Code in the
   sandbox shows the status line that script prints, in a home volume that holds no `statusLine` setting and no copy
   of the script, with no step by the developer other than starting the sandbox
2. The script is the only file under the host's `~/.claude` that the sandbox can read. It is mounted read-only at
   `/etc/claude-code/statusline-command.sh`, and the agent cannot change it
3. The setting that runs it is a managed settings file of the kit's own, mounted read-only at
   `/etc/claude-code/managed-settings.json`. It holds the `statusLine` key and no other, and its command is
   `bash /etc/claude-code/statusline-command.sh`
4. When there is no file at `~/.claude/statusline-command.sh` on the host, neither mount is made, nothing is created
   on the host, and the sandbox starts and behaves as it does without this unit. A `statusLine` in the sandbox's own
   `~/.claude/settings.json` then works as before. A directory at that path counts as no file
5. Nothing writes to the home volume, and the image does not change: a sandbox built before this unit shows the
   status line the first time it is started through a wrapper that has it, without a rebuild
6. The suite holds each of these without Docker: with the script present, the wrapper passes Compose exactly the two
   read-only mounts of R2 and R3; with it absent, and with a directory in its place, it passes neither and leaves the
   path as it found it; and the kit's settings file is valid JSON with the one key and the command of R3. The
   wrapper's existing tests do not depend on what the home of whoever runs them holds
7. The behavior is checked for real on a host with Docker, through the working copy's wrapper and not by hand-built
   `docker run` flags: with the script present, Claude Code's terminal shows the script's line, and both files are
   read-only to the agent on the sandbox's read-only root; with it absent, neither target exists in the container
   and no directory appears on the host. No login is made for it. What was seen is in the record, with the Docker
   and Compose versions
8. The README says, under "Running the sandbox": that the developer's status line is shown and from which file;
   that only that file is exposed, read-only; that the tools the script calls must be in the image, which has `jq`
   and `git`; that it replaces a status line set inside the sandbox while the host file exists; that a script under
   another name is reached with a symbolic link at that path; that a start picks it up with no rebuild; that
   OpenCode has no such status line; and the limitation with organization-managed settings below. Every place in
   the kit that says the git configuration is the only host dotfile mounted is true again

## Decisions

* **The developer's own script is mounted, after the git configuration's precedent.** A status line is a personal
  choice of the developer's, like a git identity: not the project's and not the kit's. The two alternatives the
  human named were weighed against that
  * *Ship the human's status line in the kit.* It needs no mount and works on every host. It was not taken because
    it makes one person's taste the kit's: every developer on every project gets it, a change to it needs a kit
    release and an update in every project, and a developer with a status line of their own still does not see
    theirs. It is the fallback if the mount is refused: the implementer of 0015 preferred it to the next one, and so
    does this spec
  * *A per-project setting that points at a status line file.* It was not taken because the file is tracked, so it
    repeats a personal choice in every project and applies it to everyone who works on that project
* **The setting comes from Claude Code's managed settings, because nothing lower exists.** The proposal was a
  system-level settings file. Claude Code has one system-level file, the managed settings, and it is the highest
  level, not the lowest as `/etc/gitconfig` is for git. So it overrides a status line set inside the sandbox, which
  the run above confirmed. The alternatives were to write the setting into `~/.claude/settings.json` in the home
  volume at start-up, rejected because the kit would then edit a file Claude Code itself rewrites and R5 would not
  hold; and `claude --settings`, rejected because the sandbox does not start Claude Code, the developer does
* **Both files are mounted by the wrapper, and only when the script exists.** The proposal put the mount in the
  base Compose file and the settings in the image. Two findings changed that
  * A Compose file cannot make a mount conditional, and a mount whose source is missing makes Docker create a
    root-owned directory there, which here would be inside the developer's `~/.claude`. The wrapper can look first,
    and already adds the per-run mounts
  * A managed `statusLine` in the image is there on every start. Without a host script it would run a command that
    prints nothing, and that blanks a status line the developer set inside the sandbox, which is the fifth row of
    the table. Mounting the settings file together with the script, or not at all, leaves a sandbox without a host
    script exactly as it is today

  It also means no image change, so no rebuild in any project. The cost is that the settings file is read from the
  installed kit at each start and not baked into the image. That gives the agent nothing new, as the next decision
  says
* **What this exposes, and to whom.** The sandbox's adversary is the agent and whatever it is tricked into running.
  This unit adds two read-only files to what it can see and nothing to what it can do
  * The agent can read the developer's status line script. A developer who keeps a secret in that script exposes
    it, as with the git configuration. Nothing else under the host's `~/.claude` is mounted: not the credentials,
    the settings or the history
  * The agent cannot change the script or the settings file from inside a running sandbox. It holds no capability
    and the mounts are read-only
  * The script runs inside the sandbox, as the agent, behind the same firewall. Nothing of it runs on the host,
    and nothing the agent does reaches the host's copy
  * The agent can write the installed kit under the working directory, the settings file and the wrapper included,
    and a later start would use what it wrote. That is so today for the wrapper and the Compose file, which run on
    the host, and it is not this unit's to change. A rewritten settings file gains the agent managed Claude Code
    settings inside the sandbox, which confine nothing there: it can already write the user and project settings
  * Not defended: a developer whose own script is hostile or broken. It is the developer's file
* **The host path is fixed at `~/.claude/statusline-command.sh`.** It is where the human's script is. Claude Code's
  documentation uses `~/.claude/statusline.sh` in its examples, so the name is not universal, and the host's
  `statusLine` setting cannot be read instead because it holds an arbitrary command. A developer with another name
  puts a symbolic link at the fixed path, which was seen to mount the file it points at on Linux. An environment
  variable naming another file, or none, is under "Beyond the request"
* **The script is run with `bash`.** The human's setting runs it that way and the file is not executable. A script
  in another language is a non-goal
* **`managed-settings.json`, not a file in `managed-settings.d/`.** Both were seen to work. Nothing else of the
  kit's or a project's uses managed settings today, so the plain file is enough. A later unit that needs to share
  the directory can move it to the drop-in directory
* **Tools are the image's.** The script runs in the sandbox, so what it calls must be there. The human's script uses
  `jq` and `git`, which the image has. The image gains nothing for the sake of another developer's script

## Non-goals

* OpenCode. It has no status line that a script feeds, so nothing is mounted or set for it
* Any other host file: the host's Claude Code settings, credentials, commands, agents or memory
* A status line script that is not bash, or that needs tools the image lacks
* A status line when the developer's organization delivers managed settings from the claude.ai console. Claude
  Code then ignores the file by default, and the sandbox shows whatever that policy gives. Not observed, since no
  login was made; it is what the documentation says
* The sandbox failing on a host with no `~/.gitconfig`. Docker creates a root-owned directory there, and git in the
  sandbox then exits 128 on every command, which was seen while checking this unit with plain `docker run`. It is
  an existing fault of the git configuration mount and wants a unit of its own
* That the agent can write the installed kit, which runs on the host at the next start
* A release, and moving any project to it

## Beyond the request

* An environment variable, for example `AGENT_STATUSLINE`, naming another host file, or empty for none. Cost: one
  more line in the wrapper, two more tests and a README sentence. Without it, a developer whose script has another
  name makes a symbolic link, and a developer whose host script does not work in the sandbox sees a blank line there
  and cannot replace it from inside, until they rename the host file or make the script cope. Both are visible and
  cheap to recover from, and the only developer today has neither
* Running an executable script directly instead of with `bash`, so that a script in another language works. Cost: a
  test of the mode in the settings command, and the image must hold the interpreter. Without it such a script
  prints nothing in the sandbox
