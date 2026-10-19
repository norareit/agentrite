# 0058 A bell from the sandbox

## Context

The human has Claude Code ring the terminal's bell when it needs them or stops, and uses it in tmux, which marks the
window whose pane rang. On the host it is two hooks in `~/.claude/settings.json`, on `Notification` and on `Stop`,
that run a script `~/.local/bin/ring-bell`. The script exits unless `TMUX_PANE` is set, and writes the bell to the
pane's terminal, which it asks `tmux display` for. The human asked whether it works inside the sandbox, and how it
can be made to.

It does not work today, and nothing of it is the kit's doing:

* Claude Code in the sandbox reads its user settings from `~/.claude/settings.json` of the home volume, and not the
  host's. The hooks are not there. That is on purpose: "The status line" of `SANDBOX.md` says that the host's
  credentials, settings and history stay on the host
* The script needs tmux and `TMUX_PANE`, and the sandbox has neither. tmux runs on the host, around the terminal
  that `docker compose run` is attached to

What does reach the host is a bell written to the sandbox's terminal. The specifier showed it on the human's host
on 2026-10-19: a process of another user than root, in a container of the sandbox's image and of the sandbox's
settings, started with `docker compose run` in a pseudo-terminal, wrote `x`, a bell and `y` to `/dev/tty`, and the
three bytes came out on the host's side unchanged. tmux marks a window on a bell that reaches its pane, whatever
wrote it.

Claude Code can ring the bell itself. Its documentation of 2026-10-19, "Get a terminal bell or notification" at
`https://code.claude.com/docs/en/terminal-config`, says that it fires a notification when it finishes a task or
pauses for a permission prompt and the developer appears to be away, and that the setting `preferredNotifChannel`
with the value `"terminal_bell"` in `~/.claude/settings.json` makes it ring the bell. A hook on `Notification` or on
`Stop` that writes a bell to the terminal does the same at the moments the hook fires.

So a developer gets the bell in the sandbox by setting it in the sandbox, once per home volume, as the login is. What
is missing is that `SANDBOX.md` says so.

## Requirements

1. A bell that a process of the agent writes to its terminal in the sandbox reaches the terminal the sandbox was
   started from, unchanged, in every form of `./sandbox.sh` that starts a container, and in `./sandbox-dev.sh`
2. The suite holds a test that starts a container with the kit's settings, in a pseudo-terminal, has a process of
   the agent's user write a bell to `/dev/tty`, and finds the bell in what comes out on the host's side. Where Docker
   is not available, it is skipped as the suite's other tests that need Docker are
3. `SANDBOX.md` has a section on getting a bell from Claude Code in the sandbox, beside "The status line", which
   says:
    * that Claude Code in the sandbox does not read the host's `~/.claude/settings.json`, so a host's hooks and
      notification setting do not hold there, and a hook that calls `tmux` cannot work there, since tmux runs on
      the host
    * that a bell written in the sandbox reaches the host's terminal, and through it tmux, which marks the window
    * the two ways to have one, each as the text to put in the home volume's `~/.claude/settings.json`: the setting
      `"preferredNotifChannel": "terminal_bell"`, with when Claude Code rings by it; and hooks on `Notification` and
      on `Stop` whose command writes a bell to `/dev/tty`, which ring each time the hook fires
    * that the setting is kept in the home volume, as the login is, so it is made once per home volume and is gone
      when the volume is removed
4. The hooks that section gives ring the host's terminal from a session of Claude Code in the sandbox, at a
   `Notification` and at a `Stop`. The implementer checks it by hand in a sandbox, in a tmux pane on the host, and
   logs it in `record.md`, with the version of Claude Code

## Decisions

* **The kit sets no bell, and documents how a developer sets one.** A bell is a developer's taste, as the status line
  is, and the sandbox already keeps a developer's settings of Claude Code in its home volume, where the theme is.
  Rejected: the bell in the kit's managed settings, which stand above every other setting, so that every developer
  of every project gets it and cannot turn it off. Rejected as well: carrying the host's hooks into the sandbox,
  which reads the host's settings that the sandbox keeps out on purpose, and whose commands, as the human's, may
  call what is only on the host
* **Both ways are given.** The setting rings when Claude Code judges the developer away, and the hooks ring at
  every `Notification` and `Stop`, which is what the human has on the host. Which a developer wants differs
* **A test keeps the bell passing through.** `SANDBOX.md` promises it, and it rests on how the sandbox attaches its
  terminal, which a later unit may change. The test is the one place that would notice
* **The check that Claude Code rings by the hooks is by hand.** It needs a logged-in Claude Code in a session, which
  the suite has not. The passing of the bell that the check rests on is tested by requirement 2

## Non-goals

* OpenCode's notifications. The human asked for Claude Code
* A bell from `agentrite run --headless`, which has no terminal of a session
* Changing the host's hooks or the `ring-bell` script, which are the human's and not the kit's
* A desktop notification through an escape sequence of the terminal, which Claude Code sends by itself in some
  terminals and which passes through as the bell does

## Beyond the request

None
