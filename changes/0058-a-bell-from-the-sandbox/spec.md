# 0058 A bell from the sandbox

## Context

The human has Claude Code and OpenCode ring the terminal's bell when they need them or stop, and uses it in tmux,
which marks the window whose pane rang. On the host it is done by files of their own:

* Claude Code: two hooks in `~/.claude/settings.json`, on `Notification` and on `Stop`, that run a script
  `~/.local/bin/ring-bell`
* OpenCode: a plugin `~/.config/opencode/plugins/ring-bell.js`, which runs the same script at the events
  `session.idle` and `permission.asked`, and at `permission.updated`, the older name of the latter
* The script exits unless `TMUX_PANE` is set, and writes the bell to the pane's terminal, which it asks
  `tmux display` for

The human asked that the bell work inside the sandbox, for both harnesses, with nothing to set up per project.

It does not work today:

* Claude Code and OpenCode in the sandbox read their user settings and plugins from the home volume, and not the
  host's. The hooks and the plugin are not there. That is on purpose: "The status line" of `SANDBOX.md` says that the
  host's credentials, settings and history stay on the host
* The script needs tmux and `TMUX_PANE`, and the sandbox has neither. tmux runs on the host, around the terminal
  that `docker compose run` is attached to
* A developer could set a bell in the home volume, but each project has a volume of its own, so it would be set
  once per project, and again for each new volume

What does reach the host is a bell written to the sandbox's terminal. The specifier showed it on the human's host
on 2026-10-19: a process of another user than root, in a container of the sandbox's image and of the sandbox's
settings, started with `docker compose run` in a pseudo-terminal, wrote `x`, a bell and `y` to `/dev/tty`, and the
three bytes came out on the host's side unchanged. tmux marks a window on a bell that reaches its pane, whatever
wrote it.

The kit already gives the sandbox a developer's setting of Claude Code at each start, without the home volume: the
status line, through managed settings that the wrapper mounts read-only. OpenCode reads a configuration of the kit's
from the image, whose path `OPENCODE_CONFIG` names, and loads plugins.

A project's settings for the kit are in its `agentrite.json`. Today every key the kit knows is required, and a key
it does not know is ignored.

## Requirements

When the sandbox rings:

1. In the sandbox, with `"bell": true` in `agentrite.json`, the harness rings the bell of the terminal the sandbox
   was started from:
    * Claude Code, at each `Notification` and at each `Stop`, the moments of its hooks of those names
    * OpenCode, each time a session goes idle and each time it asks for a permission
2. That holds in every project, for every home volume, a new one included, and needs nothing in the home volume or
   on the host besides the kit and the project's files
3. It holds in every form of `./sandbox.sh` that starts a session with a terminal, and in `./sandbox-dev.sh`. A run
   with no terminal, as `agentrite run --headless`, rings nothing, and the harness shows no error and no output for
   it
4. The bell is the one byte BEL, written to the session's terminal, and nothing else: no text, no other escape
   sequence. A bell that the developer sets themselves in the home volume rings besides, and is not removed
5. A bell that a process of the agent writes to its terminal in the sandbox reaches the terminal the sandbox was
   started from, unchanged

Turning it off:

6. `agentrite.json` holds a key `bell`, which is required, as every other key of the file is, and holds `true` or
   `false`. With `true`, the sandbox rings as requirement 1 says. With `false`, nothing of requirement 1 is set in the
   sandbox, and the harnesses ring only as they would with no kit
7. A start reads the key from the `agentrite.json` of the checkout the command is run from, at each start, so that a
   change to it holds at the next start with no rebuild. A start whose file is missing, is not a JSON object, lacks
   `bell`, or holds a `bell` that is neither `true` nor `false`, is refused, with a message that names the file, the
   key, what it holds or that it is missing, and what it must hold, and starts nothing. A start judges no other key
   of the file
8. Every command of the kit that judges `agentrite.json` judges `bell` as requirement 6 says, and refuses a file that
   lacks it, or whose `bell` holds anything else, as it refuses any key at fault
9. The default `agentrite.json` that `init` and `config` write holds `"bell": true`, after `sandbox`. `init` with
   arguments writes it too. No command adds the key to a file that exists

Tests:

10. The suite holds a test that starts a container with the kit's settings, in a pseudo-terminal, has a process of
    the agent's user write a bell to `/dev/tty`, and finds the bell in what comes out on the host's side. Where Docker
    is not available, it is skipped as the suite's other tests that need Docker are
11. The suite tests requirements 6 to 9 for each value of `bell`: `true`, `false`, absent, and one of each other JSON
    type
12. The implementer checks by hand, in a sandbox started in a tmux pane on the host, that each harness rings at the
    moments of requirement 1, with nothing in the home volume, and that with `"bell": false` neither rings. The
    check is logged in `record.md`, with the version of each harness

The documents:

13. `SANDBOX.md` has a section on the bell, beside "The status line", which says:
    * when each harness rings, and that it rings in every project whose `agentrite.json` holds `"bell": true`,
      which `init` and `config` write, with nothing to set in the home volume or on the host
    * that the bell reaches the host's terminal, and through it tmux, which marks the window
    * that the host's own hooks, plugins and settings of a bell do not hold in the sandbox, and that a hook that calls
      `tmux` cannot work there, since tmux runs on the host
    * how a project turns it off, with `"bell": false` in `agentrite.json`, and that it holds from the next start
    * that a bell the developer sets in the home volume rings besides
    * that when the developer's organization delivers managed settings of Claude Code from the claude.ai console,
      Claude Code may ignore the kit's, as "The status line" says of the status line, and then rings as that policy
      says
14. `README.md` describes the key `bell` where it describes the keys of `agentrite.json`: what it holds, that it is
    required, that it is read at each start of the sandbox, and that it has no effect outside
    the sandbox

## Decisions

* **The bell is on by default.** The human wants it to need no setting up. A bell when the harness waits for the
  developer is what a developer at a terminal wants of a session they are not watching, and a terminal that does not
  want bells mutes them for every program at once. Rejected: an opt-in, which leaves every developer to find the
  setting first; and a bell set once per home volume, which is once per project and again for each new volume
* **A project turns it off in `agentrite.json`.** The human chose a setting of the project over a variable of the
  developer's environment. It is committed, so it holds for every developer of the project and in every checkout, and
  it is where a project's other settings for the kit already are
* **`bell` is required.** The human decided this while the spec was a draft, in the place of an optional key that
  meant `true` when absent. It is unit 0045's "Nothing is implicit", which unit 0054 kept: every setting a project
  works by is in its `agentrite.json`, and nothing holds because a key is absent. It also keeps a misspelled key
  from going unnoticed: the kit ignores a key it does not know, and a `bel` would be ignored while the bell rang,
  where now the missing `bell` is refused. The cost, accepted: an existing project's `agentrite.json` is refused by
  every command that reads it, and every start of its sandbox, until the key is added, which the release notes say,
  with the line to add. Rejected: an optional key, which needs no change of an existing project
* **The default is on, through the file that `init` and `config` write.** `"bell": true` in the default file is how
  a new project rings with no setting up, and shows where the bell is turned off
* **A start reads only `bell`.** The sandbox starts today whatever `agentrite.json` holds, and reads the file only to
  cut a unit's branch. A start is not refused for another key at fault because of this unit. A `bell` it cannot read
  is refused rather than taken as either value, since either guess would ring or be silent against what the file
  says, or against what it would say once the key is added
* **The kit rings at the moments of the human's own hooks and plugin.** For Claude Code, `Notification` is when it
  needs the developer and `Stop` is when it has finished; for OpenCode, an idle session and a permission asked are
  the same two. Rejected: Claude Code's own setting `preferredNotifChannel` with the value `"terminal_bell"`, which
  its documentation says rings only when Claude Code judges the developer away, and which OpenCode has nothing like
* **The kit rings in the sandbox, and not on the host.** The host's harnesses are the developer's, and the kit
  changes nothing of their configuration. `bell` has no effect outside the sandbox
* **A test keeps the bell passing through.** The bell rests on how the sandbox attaches its terminal, which a later
  unit may change. The test is the one place that would notice
* **The check that the harnesses ring is by hand.** It needs a logged-in session of each harness, which the suite has
  not. The passing of the bell that the check rests on is tested by requirement 10

## Non-goals

* A desktop notification, or any signal other than the bell
* A setting of the bell per developer, apart from the one of the project. A developer who wants no bell in a project
  that rings mutes it in their terminal or in tmux
* A setting of when the harnesses ring, other than on or off
* Changing the host's hooks, plugin or the `ring-bell` script, which are the human's and not the kit's
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

None
