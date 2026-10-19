#!/bin/sh
#
# Rings the bell of the terminal the session runs in: it writes the one byte BEL there
# and nothing else. Claude Code's hooks and OpenCode's plugin in container/bell/ run it,
# as the agent, when the harness waits for the developer or stops. A bell written to the
# sandbox's terminal comes out on the host's terminal, where tmux marks the window.
#
# The terminal is /dev/tty when the script has a controlling terminal. A harness may
# start its hooks in a session of their own, which has none, while its own output is
# still the terminal, so otherwise the script walks up its parents and writes to the
# first terminal one of their standard streams is. The walk stops at pid 1 and at a
# process whose streams it cannot read, which in the sandbox is every process of root.
# It writes to that terminal by its path, which the agent may since the image makes it
# a member of the group tty.
#
# It reads nothing of its standard input, which a hook of Claude Code fills with JSON,
# prints nothing and always exits 0, so that no harness shows an error or output for it,
# also with no terminal anywhere. POSIX sh and not bash, so that its tests run on any
# host.

if { printf '\a' >/dev/tty; } 2>/dev/null; then
  exit 0
fi

pid=$PPID
while [ "$pid" -gt 1 ] 2>/dev/null && [ -r "/proc/$pid/fd" ]; do
  for stream in 0 1 2; do
    target="$(readlink "/proc/$pid/fd/$stream" 2>/dev/null)" || continue
    case "$target" in
      /dev/pts/*)
        { printf '\a' >"$target"; } 2>/dev/null
        exit 0
        ;;
    esac
  done
  pid="$(sed -n 's/^PPid:[[:space:]]*//p' "/proc/$pid/status" 2>/dev/null)" || exit 0
done
exit 0
