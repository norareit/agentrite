# 0034 Connect to a unit run

## Context

A unit run of the sandbox gives one shell, or one command, in one container. `./agent.sh 0012` makes a clone of the
unit's branch, starts a container named after the Compose project and the branch, and opens a shell in it. A second
`./agent.sh 0012` is refused while that container runs, because two runs never work on one branch.

The loop of implementing and reviewing uses two harnesses on one unit: the implementer in one, the reviewer in
another, and back. With one shell that means ending one harness to start the other, each time. Starting a second run
does not help, since it is refused, and it should be: a second run would be a second clone.

Docker can start a second process in a running container, and a developer who knows the container's name can ask it
to. Asked plainly, that process skips the sandbox's entrypoint, and so is root, with the capabilities the entrypoint
keeps for installing the firewall. The sandbox exists to keep those from a harness.

### What the human asked for

On 2026-10-06, trying the release 4.0.0 in another project: "Im running into an issue during testing this all out: I
want claude code and opencode open both in the container for the implementation/review loop. Can I connect a second
client to the container for this?" And, told that Docker can and how: "I really think it is worth making this into its
own unit. Can you act as the @specifier and create a spec for this? maybe something like npx agentrite connect 0012"

Asked by the specifier, the human chose:

* **`./agent.sh --connect 0012`**, a form of the sandbox's wrapper, over `npx agentrite connect 0012` and over both
* **A connected shell ends with the container**, over a run that waits for connected shells and over a warning from
  the first shell
* **A unit with no run under way is refused, and the command that starts one is named**, over a connect that starts
  the run

Everything else in this spec is the specifier's, and has not been read by the human yet.

### What was found while specifying

On `master` at `3ec09ad`, which holds the release 4.0.0.

* A unit run names its container: the Compose project's name, a dash and the branch, with every character a
  container's name cannot hold made a dash. The Compose project's name is the project's own, from its compose file,
  and the wrapper learns it by asking Compose for the merged configuration. A run with `--in-place` or `--workdir`
  gives its container no name, and Compose makes one up
* The wrapper asks Docker whether a container of that name is running, and that answer is what refuses a second run.
  When Docker cannot be asked, the wrapper says so and starts nothing
* A unit is given by its branch's name, or by a number that one branch's name holds as a whole number. Since 0033 a
  number that no branch holds gets its branch cut from `master`. A number that several branches hold is refused, with
  the branches listed
* The container starts as root with three capabilities and no others: `NET_ADMIN`, for the firewall, and `SETUID` and
  `SETGID`, for leaving root. It is started with `no-new-privileges`. Its entrypoint installs the firewall and starts
  the egress proxy, proves both, and then becomes the user `agent`, with `HOME`, `USER` and `LOGNAME` set for that
  user, and runs the command. The README says: "The agent process ends up with an empty capability set"
* The firewall is state of the container's network, so it holds for every process in the container, whoever started
  it. A root process in the container that holds `NET_ADMIN` can change it
* The image holds both harnesses, and their logins are in the home volume, which every container of a project shares
* The first command of a container is the container: when it ends the container stops, every other process in it ends,
  and the wrapper then brings the work of the run back. The wrapper waits only for its own `run`
* The wrapper refuses to run as uid or gid 0, before anything else
* The README states what a unit run defends against: an agent that was misled and writes whatever it likes under
  `/work`. It names the supported usage: one developer, one host

**Not established.**

* That a process Docker starts in the running container as the user `agent` holds no capability and cannot gain one.
  The specifier read the compose file and the entrypoint, and tried nothing. Whether the human's second shell, if one
  was opened, was opened this way is not known here
* That two harnesses with a terminal each work side by side in one container: the size of each terminal, and what each
  does to the files the other has open
* What a connected command's wrapper prints and exits with when the container stops under it

## Requirements

The command:

1. `./agent.sh --connect <unit> [COMMAND...]` runs a command in the container of the unit run that is under way for
   the unit, beside what runs there already. With no command it opens the shell a unit run opens
2. The unit is given as a unit run takes it: by its branch's name, or by a number that one local branch's name holds
   as a whole number. It names the container that the unit run of that branch named, in the same Compose project
3. The command is given a terminal when `--connect` is run from one, and runs without when it is not. The wrapper
   exits with the status the command exited with

What the connected command is:

4. It runs as the user the first command of the unit run runs as, with that user's groups, and with `HOME`, `USER`,
   `LOGNAME` and `PATH` as the first command has them. Its working directory is `/work`
5. It holds no capability, and cannot gain one: what the README says of "the agent process" is true of it
6. It is in the container, not in one like it: it sees the same `/work`, the same home and the same processes, and the
   firewall and the egress proxy stand between it and the network as they do for the first command. A host that is not
   on the allowlist is as unreachable for it

What connecting leaves alone:

7. `--connect` starts no container and stops none, builds no image, asks npm nothing, makes no clone, cuts no branch,
   fetches nothing, and changes nothing in the host's repository or in the state directory. A number that no branch
   holds is refused, although `master` holds a unit of that number
8. A unit run is as it was. The first command owns the container: when it ends the container stops, every connected
   command ends with it, and the wrapper of the unit run brings the work back as it does today. A connected command
   that ends changes nothing for the first command or for another connected command
9. Any number of commands may be connected to one run at a time

What it refuses:

10. `--connect` runs nothing, says why on standard error and exits 2, when:
    * no unit is given
    * the unit names no local branch. It says so, and does not say that a branch can be cut
    * the unit names several branches. It lists them, as a unit run does
    * no container of the unit's run is running. It says that no run is under way for the unit, and names the command
      that starts one, with the unit as it was given
    * Docker could not be asked whether the container is running. It says so
    * it is given together with `--in-place`, `--workdir`, `--mount` or `--rebuild`. It names the option
11. The wrapper's refusal to run as uid or gid 0 holds for `--connect` too

What says that it exists:

12. The refusal of a second unit run for a branch whose container is running names `--connect`, with the unit, beside
    what it names today
13. The usage the wrapper prints, and the forms it lists when nothing to mount was given, hold `--connect`
14. The README describes `--connect` where it describes a unit run: the form, an example with a harness in each of two
    terminals, that the first shell owns the container and what ends with it, what `--connect` refuses, and that a
    process started in the container with Docker's own command and no user named is root with the firewall's
    capabilities, which is why `--connect` is the way

The proof:

15. The suite covers requirements 1 to 3 and 7 to 13 with the stand-in for Docker it has, and shows of requirement 4
    what the wrapper asks Docker for
16. Requirements 4, 5 and 6 are shown once on a real Docker, on the host, with what was run and what it printed in the
    unit's record: the user and the groups, the capability sets of the connected process, that a new privilege cannot
    be gained, and one host that is not on the allowlist refused from the connected shell. The stand-in cannot show
    these, and they are the ones the sandbox rests on

## Decisions

* **A form of `./agent.sh`, not a command of `agentrite`. The human's, on the specifier's advice against the human's
  first proposal.** Everything that knows Docker, the Compose project's name and how a unit becomes a branch and a
  container's name is in the wrapper. `agentrite` knows nothing of Docker, and its `run` is made to be used inside the
  sandbox, where there is no Docker. A `connect` there would be its first command that works on the host only, and
  would either hold a second copy of how a container is named or hand over to the wrapper anyway. `./agent.sh
  --connect 0012` also reads beside the command that started the run
* **`--connect`, an option before the unit, like `--in-place`.** What follows the unit is the command, as in every
  other form, so the word cannot stand after it
* **The adversary is the sandbox's own, and nothing is added to it.** The sandbox defends against an agent in the
  container that was misled. `--connect` is run by the developer, on the host, and the container holds no Docker to
  run it with. So what the unit has to keep is that a connected command is no more than the first command is: the same
  user, no capability, the same firewall. Requirements 4 to 6 are that, and requirement 16 is why they are shown on a
  real Docker and not argued from the files. It does not defend against a developer who starts a process in the
  container with Docker's own command: the README says what that gives. The supported usage is the sandbox's: one
  developer, one host
* **A connected shell ends with the container. The human's.** The first command stays the owner of the run, and how a
  unit run ends does not change: the work is brought back when the container has stopped, as today. A run that waited
  for connected shells would change that, and would need something that counts them. The cost: a developer who ends
  the first shell first loses what the second had not saved. The README says so
* **No run under way is a refusal. The human's.** A connect that started the run would make which shell owns the
  container depend on which came first, and would be a second way to build, clone and cut. Refused, with the command
  to run, costs the developer one line
* **`--connect` cuts no branch. The specifier's.** A unit run cuts the branch of a number that has none. A unit with
  no branch has no run, so there is nothing to connect to, and a command that is asked to look should change nothing
* **Only a unit run can be connected to. The specifier's.** A unit run's container has a name that follows from the
  unit, which is what the command takes. A run with `--in-place` or `--workdir` has a name Compose made up, and no
  unit to give. It is under "Beyond the request"
* **A command may be appended, as to a unit run. The specifier's.** `./agent.sh --connect 0012 opencode` is what the
  request is for, and the form is the one the wrapper has. Requirement 3 follows from it: a command may be one a
  script runs
* **The options of a run are refused, not ignored. The specifier's.** `--mount` and `--rebuild` are about a container
  that is being started. Taken and dropped, they would look as if they had worked
* **Any number of connections. The specifier's.** Nothing counts them, and a limit would need a counter. Two harnesses
  that write the same files at the same time is the developer's to avoid, as it is with two terminals on the host
* **The refusal of a second run names `--connect`. The specifier's.** It is where a developer who wants a second shell
  arrives first: by running the same command again

## Non-goals

* A command of `agentrite` that connects
* Connecting to a run with `--in-place` or `--workdir`
* Starting a run, or keeping a container running, from `--connect`
* A change to how a unit run ends, or to when its work is brought back
* A terminal multiplexer in the image
* Keeping two harnesses in one clone from writing the same file, or from committing at the same time
* A limit on the number of connected commands, or a list of them
* Connecting to the container of another project, or of another host
* A change to the image, the entrypoint, the firewall or the compose file

## Beyond the request

* **`npx agentrite connect <unit>`, handing over to the wrapper.** It was the human's first proposal. It would cost a
  second spelling to document and to test, and a command of `agentrite` that needs the host. Without it, the command
  is `./agent.sh --connect`, beside the one that starts the run
* **Connecting to an in-place run.** It would cost a name for such a container, which it does not have today, and a
  way to say which one is meant when several run. Without it, a second shell on an in-place run is opened with
  Docker's own command, by a developer who names the user
* **The first shell says that others are connected before it ends.** It would cost something in the container that
  knows of them, or a question to Docker from a wrapper that has no say in when the shell ends. Without it, the README
  says that the first shell is ended last, and a developer who forgets loses a session and no commit: what was
  committed is brought back
* **A unit run that waits for its connected commands.** The human chose against it. It is named here because it is
  what would make the order of ending not matter
