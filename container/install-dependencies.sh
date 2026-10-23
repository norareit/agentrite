#!/bin/sh
#
# Installs the dependencies of a unit run's new clone with npm ci in its working
# directory, /work, and then runs the command it is given. container/sandbox.sh puts it
# before the command of a unit run whose clone it has just made, when the clone holds a
# package-lock.json, and the entrypoint runs it as the agent once the firewall is in
# place, as it runs any command.
#
# What npm prints goes to standard error, its standard output among it, so that the
# standard output of the run is the command's alone: a command may print what a script
# reads. An install that fails starts no command, and the status is npm's.
#
# POSIX sh and not bash, so that its tests run on any host.
echo "install-dependencies.sh: the clone is new, so its dependencies are installed with npm ci" >&2
npm ci >&2 || exit $?
exec "$@"
