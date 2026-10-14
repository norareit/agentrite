#!/bin/sh
#
# Runs the command it is given with a TERM that the image holds a description of. The
# entrypoint runs the first command of a container through it, and container/sandbox.sh
# runs a command of --connect through it, both as the agent.
#
# The wrapper gives the command the TERM of the developer's terminal, so that a program
# is told what that terminal shows. Only the image knows which terminals it has a
# description of, and a program that looks up one it has none of cannot use it: tput
# refuses it as an unknown terminal. Such a TERM is replaced with xterm-256color, which
# most terminals emulate and the image describes. COLORTERM is left as it is, so a
# terminal that says it shows 24-bit colour keeps saying so beside the replacement. With
# no TERM, nothing is changed.
#
# POSIX sh and not bash, so that its tests run on any host. infocmp is of ncurses-bin,
# which every Debian image holds, and fails for a terminal it has no description of.
if [ -n "${TERM:-}" ] && ! infocmp "$TERM" >/dev/null 2>&1; then
  TERM=xterm-256color
  export TERM
fi
exec "$@"
