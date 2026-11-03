# 0092 The sandbox keeps Claude Code's sessions as long as the host

## Context

Claude Code removes its session transcripts, and the other data its documentation lists under "Cleaned up
automatically", once they are older than `cleanupPeriodDays`, in a sweep it runs in the background after a session
starts. The key takes a whole number of days, at least 1, and defaults to 30. Any settings file may set it, and in
managed settings a later drop-in in `managed-settings.d/` replaces an earlier value of a single-valued key.

In the sandbox the sweep is made by the Claude Code in the container, which reads its user settings from the home
volume's `~/.claude/settings.json` and not from the host's. The sessions it sweeps are those in the project's log
directory on the host, `<logs>/.claude/projects`, which the host's own Claude Code never reads. So a developer who
set `cleanupPeriodDays` in the host's `~/.claude/settings.json` to keep their transcripts longer, as the human did to
keep a year of them for research into model and harness behavior, still has the sandbox's sessions removed after 30
days. `SANDBOX.md` now says to set the key in each project's home volume instead, a step taken once per project
that is lost when the volume is removed, and in a file the agent can change.

The human wants the sandbox to follow the host's setting, and does not want a longer retention as a default of the
kit, or as a setting of a project, which would hold for every contributor to it.

## Requirements

1. At each start of a sandbox, other than one with `--connect`, the wrapper reads `cleanupPeriodDays` from the
   host's `~/.claude/settings.json`, and from no other file of the host
2. When that file holds the key with a whole number of 1 or more, the Claude Code of the sandbox uses that number as
   its `cleanupPeriodDays`. It holds in the run that start begins and in every shell connected to it with
   `--connect`. A `cleanupPeriodDays` set in the home volume's settings does not change it, and the agent cannot
   change it from the sandbox
3. When there is no such file, or it holds no `cleanupPeriodDays`, nothing is given to the sandbox for it, and the
   Claude Code of the sandbox keeps its sessions as long as the settings of the home volume say, which is Claude
   Code's own default of 30 days unless the developer set the key there. This holds also when an earlier start of
   the project gave the sandbox a number
4. When the file exists and cannot be read, is not a JSON object, or holds a `cleanupPeriodDays` that is not a
   whole number of 1 or more, the start is refused before Docker is asked anything and before a branch is cut, with
   a message that names the file, says what is wrong with it, and says to correct the file or remove the key
5. Nothing of the host's `~/.claude/settings.json` but the number reaches the sandbox, and the sandbox can read no
   file under the host's `~/.claude` that it could not read before this unit
6. The kit's `container/claude-managed-settings.json` and `container/bell/claude-managed-settings.json` are as they
   were, and a start with no `cleanupPeriodDays` on the host passes Docker the same arguments as before this unit
7. Tests of the wrapper show, with a fake home:
    * a start with a number in the host's settings giving the sandbox that number, alone and together with the
      status line and the bell
    * a start with no file, and with a file without the key, giving nothing, also after a start that gave a number
    * a refused start for a file that is not JSON, one whose top level is not an object, and a `cleanupPeriodDays`
      of `0`, of `1.5`, of `-1` and of `"365"`, with nothing started
    * a start with `--connect` reading nothing of the host's settings
8. `SANDBOX.md` describes how long the sandbox keeps Claude Code's sessions, in the section on the project's log
   directory, in place of the paragraph that tells the developer to set `cleanupPeriodDays` in the home volume. It
   says:
    * that the Claude Code of the sandbox removes its sessions older than `cleanupPeriodDays`, by default 30 days,
      each time it starts
    * that the wrapper takes the number from the host's `~/.claude/settings.json` at each start, and from no other
      file of the host, so a value in the host's project or local settings, or in a file under
      `CLAUDE_CONFIG_DIR`, is not taken
    * that only the number reaches the sandbox, where it stands above a value set in the home volume, which the
      agent cannot change
    * that with no number on the host the sandbox keeps Claude Code's default, or a value set in the home volume
    * that a change on the host holds from the next start, with no rebuild, and that a shell connected with
      `--connect` has the number of the run it joins
    * that a number made smaller removes, at the next start, the sessions older than it, and that sessions removed
      earlier do not come back when it is made larger
    * which values are refused, and that the start is then refused
    * that when the developer's organization delivers managed settings from the claude.ai console, Claude Code may
      ignore the number, as it does the status line, and then keeps sessions as that policy says
    * that OpenCode's sessions are not affected
9. Every other place in `SANDBOX.md` that says what the sandbox reads of the host's Claude Code settings is true
   after this unit, such as the bell's statement that the sandbox reads none of the host's settings, and the status
   line's that its script is the only file under the host's `~/.claude` the sandbox can read. When the wrapper keeps
   a file on the host for the number, "Where things are kept on the host" names it, with how it is removed

## Decisions

* **The kind is feature.** The sandbox works as documented. The human asked for it to follow a setting of the host
* **The number comes from the host's user settings, and from that file alone.** It is the developer's own
  preference, as the human's was, and it is set where Claude Code itself takes a preference of a developer for every
  project. A key in `agentrite.json` was rejected because the file is committed, so the number would hold for every
  contributor to the project. A value in the kit's `container/claude-managed-settings.json` was rejected because it
  ships to every user of the kit, would make the longer retention the kit's default, and is mounted only when the
  host has a status line. The host's project and local settings, and `CLAUDE_CONFIG_DIR`, are not read: the human
  chose the global file for now, to be widened when a need arises
* **Only the number is copied, and the file is not mounted.** The host's settings can hold secrets in `env`, and
  hooks, permissions and plugins whose paths exist only on the host, and `SANDBOX.md` says the host's settings stay
  on the host. The wrapper reads the file on the host and gives the sandbox nothing but the number
* **The number is given as managed settings.** It is mounted read-only in `/etc/claude-code/managed-settings.d/`, as
  the bell's hooks are, which Claude Code merges with the status line's `managed-settings.json`. Managed settings
  stand above the home volume's, so the agent cannot shorten the retention, and the number is not lost when the home
  volume is removed. The cost is that a developer whose host holds a number cannot set another for the sandbox
  alone, which the human did not ask for. Writing the number into the home volume's settings was rejected: the agent
  can change that file, and the wrapper would have to merge into a file the developer edits. Passing
  `--settings` was rejected because the developer starts Claude Code in the sandbox themselves, and the wrapper does
  not start it
* **A value Claude Code would refuse refuses the start.** Claude Code refuses a number below 1, and refuses to start
  when a managed settings file is not valid JSON, so the wrapper gives it only a whole number of 1 or more. Starting
  with Claude Code's default and a warning was rejected: it would remove sessions after 30 days, which is what a
  developer who set the key meant to prevent, a warning scrolls past, and correcting the file is quick. The refusal
  says what to do, so it is not an entry of "When something goes wrong", by the rule of this project
* **The file is read at every start, also for a project whose `harnesses` lack `claude`.** The image holds Claude
  Code whatever the project names, and a developer can run it in the shell, so its sessions are swept the same way
* **The documentation of the home volume's setting is replaced.** The paragraph committed on `master` at
  `cea7f34` describes the way that works before this unit, and is rewritten by it, as the human asked

## Non-goals

* OpenCode's sessions. Whether OpenCode removes old sessions of its own was not checked, and nothing of OpenCode is
  changed
* The host's project settings, local settings, managed settings and `CLAUDE_CONFIG_DIR`
* Any other key of the host's settings, such as `desktopSessionCleanupPeriodDays`
* A setting of the retention in `agentrite.json`, or a default of the kit other than Claude Code's own
* Keeping the sessions from the agent. The agent can write to `<logs>/.claude/projects` and can remove sessions
  itself, and this unit does not prevent that. It prevents only that the agent changes the number
* Bringing back sessions the sandbox removed before this unit

## Beyond the request

1. Follow `CLAUDE_CONFIG_DIR` of the wrapper's environment, reading `$CLAUDE_CONFIG_DIR/settings.json` when it is
   set, as the host's Claude Code does. It costs a branch in the wrapper, a test and a sentence of `SANDBOX.md`.
   Without it a developer who sets the variable on the host gets the default of 30 days in the sandbox, which they
   see as sessions missing after a month, and fix by asking for this item then
2. Read the host's `.claude/settings.local.json` of the project root too, so that one project can keep its sessions
   longer than the others. It costs a second file to read and the precedence between the two to specify and test.
   Without it a developer who wants that sets the number in the global file, which holds for every project
