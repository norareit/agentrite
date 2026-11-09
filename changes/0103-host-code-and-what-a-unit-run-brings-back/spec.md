# 0103 The kit's code on the host and what a unit run brings back

## Context

A unit run gives an agent the clone of the unit's branch at `/work` and mounts the host's `.reviews` and
`.orchestrator` in it, read-write. "What the sandbox defends against" of `SANDBOX.md` takes that agent to be one that
may have been misled, and that writes whatever it likes there. What it wrote reaches code of the kit that runs on the
host in three places:

* `npx agentrite orchestrate` makes and writes the directories of its runs under `.orchestrator`, and with
  `--resume` takes the run it resumes, and the definition, the position and the sessions it runs with, from the
  files of a run there
* the harness of each step is started with arguments that hold values the command read from those files, the
  session it continues among them
* `./sandbox.sh`, landing a unit run, compares the files of the clone with the commit of the unit's branch, to decide
  whether the clone holds anything the host lacks

`SANDBOX.md` leaves out of what the sandbox defends against what a file under `.orchestrator` says "to a human or a
program that reads it on the host". The human decided that the kit's own commands are not among those programs: the
kit's code on the host treats everything a unit run brings back as written by an adversary. This unit makes that
true of the three places above and states it as a rule for the kit's code. It is the fix of findings of the security
reviewer, specified, as "Security findings" of `AGENTS.md` says, by what will be true once it is done.

### The adversary and the supported usage

The adversary is the agent of a unit run as `SANDBOX.md` describes it: misled, and writing anything in the clone,
its `.git` included, and in `.reviews` and `.orchestrator`, while its container runs. What it writes may be a file of
any name and content, a directory, or a symbolic link to any path of the host.

The unit defends the host against that agent in the kit's own commands that run on the host: `agentrite
orchestrate`, run or resumed, and the wrapper's landing of a clone.

It does not defend against what it leaves out under "Non-goals", nor against what `SANDBOX.md` already leaves out:
what a commit contains, a run with `--in-place` or `--workdir`, and a flaw in git or Docker.

The supported usage is that of `SANDBOX.md`: one developer, one host, branches made on the host, and a clone that only
the wrapper and the sandbox touch. A run of the orchestrator is resumed where it was made, as "On the host and in the
sandbox" of `ORCHESTRATOR.md` already says: a run made on the host is resumed on the host, and one made in a unit run
is resumed in a unit run of the same project.

## Requirements

The rule:

1. `AGENTS.md` holds a rule that code of the kit that runs on the host treats what a unit run brings back as written by
   an adversary: the files of the clone, its `.git` among them, and everything under `.reviews` and `.orchestrator`.
   By the rule, such code follows no symbolic link there, writes only inside the directory it means to write in,
   passes a value read there into the arguments of a program only when the value matches an exact pattern, and runs
   no program that such content selects. The content of the commits of the unit's branch is outside the rule, as it
   is outside what the sandbox defends against
2. "What the sandbox defends against" of `SANDBOX.md` says, among what a unit run defends the host against, that the
   kit's commands on the host follow no link the agent made under `.orchestrator`, write under it only in the
   directory of their own run, resume only a run made where it is resumed whose files are as that run left them,
   and that the wrapper compares the clone's files with the branch without running any filter of git. Its line on
   what a file under `.orchestrator` says names a human, or a program other than the kit's commands

Writing under `.orchestrator`, in a run and in a resume alike:

3. Before it writes anything, the command refuses, starts nothing, writes nothing and exits `1` when `.orchestrator`,
   `.orchestrator/.gitignore` or `.orchestrator/<unit-directory>` is a symbolic link, when `.orchestrator` or
   `.orchestrator/<unit-directory>` is there and is not a directory, or when `.orchestrator/.gitignore` is there and is
   not a regular file. It names the path, says that it is not what the command makes there, and says to remove it
4. A `.orchestrator/.gitignore` that is a regular file holding anything but `*` and a line break is replaced as
   requirement 5 says a file is written. One that holds them alone is not written
5. Every file the command writes under `.orchestrator`, whole or by adding lines, is one it created itself. It opens
   no file that was there before to write or add to it, and it follows no symbolic link at the name of the file it
   creates. When something stands at that name, the temporary name that opens with `.` among them, the command
   removes that entry itself, never what a link names, and then creates the file. When the creation still finds
   something there, the write fails, and a failed write has the effect "What .orchestrator holds" of
   `ORCHESTRATOR.md` gives it
6. A followed file is created when its step starts, as requirement 5 says, and each line is added through the file
   the command created, which it does not open again by its path
7. Before each write, the command checks that the run's directory, with every link resolved, is
   `.orchestrator/<unit-directory>/<run>` of the project root, with the links of the project root's own path resolved
   alone. When it is not, the command makes no write, stops the step that runs, says which directory it found where,
   and exits `1`

Resuming:

8. The command keeps, outside `.orchestrator`, a record of each run it makes, a resume among them: one file per run in
   `<state>/agentrite/.orchestrator-runs/`, where `<state>` is `$XDG_STATE_HOME` when that is set and `~/.local/state`
   when it is not. The file is named by the SHA-256, in hexadecimal, of the absolute path of the run's directory with
   every link resolved, followed by `.json`, and holds the SHA-256 of the run's `definition.json` and of its
   `state.json`, as the command last wrote each. The command writes the record whole, as it writes a file of a run,
   each time it writes the run's `state.json`, and makes the directory when it is not there
9. A resume refuses, starts nothing, writes nothing and exits `1` when the run it would resume has no record, or when
   its `definition.json` or `state.json` is not what the record holds. It names the run, says that a resume takes a
   run made where it is resumed whose files are as that run left them, and that `npx agentrite orchestrate <unit>`
   starts a new run
10. A resume reads the run's `definition.json` with the project's roles and harnesses, as a run reads its definition,
    and refuses a definition that names a role or a harness the project does not have, as a run refuses it
11. No session is passed to a harness unless it matches `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`. A resume refuses, starts
    nothing, writes nothing and exits `1` when the run's `state.json` holds a session that does not match, naming its
    role and harness and the form a session takes. A session that a step's harness gives during a run and that does
    not match is not kept among the run's sessions and is passed to no later step, so the next step of its role and
    harness starts a session of its own, and the command says so on standard error
12. The refusals of requirements 3, 9, 10 and 11 are listed in "agentrite orchestrate" of `COMMANDS.md`. The record,
    where it is, that the command writes it, that a resume takes only a run with its record, and that the developer
    removes the directory with `rm -rf` when no run of any project is to be resumed, are in `ORCHESTRATOR.md`

Landing a clone:

13. When it lands a unit run, the wrapper finds the files of the clone that are not committed on the branch without
    running any filter of git, whatever the attributes in the clone's files, in its `.git`, in the commit and in the
    host's configuration and attribute files name. It runs no program for it but git
14. A file is listed as not committed when its bytes differ from those of the blob at its path in the commit, when it
    is in the commit and missing from the clone, or when it is in the clone, not in the commit and not ignored. Which
    files are ignored is read as `--exclude-standard` reads it today
15. "When something goes wrong" of `SANDBOX.md` has an entry for a clone that is kept listing files the agent did not
    change, which are files git converts when it checks them out, as Git LFS and an end-of-line attribute make it do:
    what is seen, that the comparison takes the bytes as they are, and that such a clone is removed with `rm -rf`
    once the developer has made sure that nothing else is listed

Tests:

16. Tests show that:
    * a run and a resume refuse, writing nothing, with a link at each of the three paths of requirement 3
    * a link at the name of a file of a run, the temporary name among them, and at the name of a followed file, is
      removed, and the file is written in its place and what the link names is unchanged
    * a run's directory that resolves outside `.orchestrator/<unit-directory>` stops the run with `1` before the write
    * a resume refuses a run with no record, a run whose `definition.json` differs from its record, and one whose
      `state.json` does
    * a resume refuses a session that opens with `-`, and a definition naming a role the project does not have
    * a clone whose `.gitattributes` names a filter that the host's configuration defines, with a command that leaves
      a mark when it runs, lands with no mark left, and a file the agent changed is still listed

## Decisions

* **The kit's code is not a program that `SANDBOX.md`'s exclusion covers.** The exclusion is kept for a human and for
  a program other than the kit's, which the kit cannot make careful. The kit's own commands read and write these
  directories as part of the workflow it ships, and a developer runs them as the next step after a unit run, so the
  kit makes them careful rather than tell the developer to judge files they do not read
* **A link at one of the three paths is refused, not replaced.** The command never makes a link there, so one
  means something other than the kit wrote it, which the developer should see. Removing it silently was rejected for
  that reason. Inside the run's directory, which the command makes anew for each run, an entry at a name it is
  about to create is removed instead, since the command owns that directory and refusing would let anything that
  writes there stop every run
* **The record is outside `.orchestrator`.** Anything inside `.orchestrator` can be written by the agent, a mark of
  where a run was made among it. The state directory is mounted into no container: the agent's home is a volume of
  its own, and the project's log directory is under `<data>`, not `<state>`. The directory's name opens with a dot,
  which no Compose project's name does, so no clone's directory, `<state>/agentrite/<Compose project>/<branch>`, can
  be it or hold it. In a unit run the record is in the container's home volume, so a run made in a unit run is
  resumed in a later unit run of the project, as the documents already say
* **The record holds digests of both files, not only that the run was made.** The agent can write the files of a run
  that the host made, as it can any file under `.orchestrator`. Comparing the digests makes a resume run what the
  command itself wrote and nothing else
* **A run made before this unit is not resumed.** It has no record. Trusting a run without one was rejected, since a
  run without a record is exactly what the agent can make. A run that stopped before the update is started anew
* **A run whose project root moved is not resumed.** Its record is named by the run's absolute path. Naming it by
  something that survives a move, such as the unit and the run's name alone, was rejected, since that would match a
  run of another project
* **Printing what a resume will run and asking the developer was rejected.** A resume can run headless and unattended,
  and the developer cannot judge a prompt and a session from a line
* **One pattern for the sessions of every harness.** It admits the ids the kit's three harnesses give, which open with
  a letter or a digit and hold letters, digits, `-` and `_`, and its first character rules out an option. A form for
  each harness was rejected: each would have to follow the harness's releases, and the record already makes a resume
  pass only sessions the command itself took from a harness. The planner confirms the ids of the three harnesses
  against it, and a harness whose ids do not match is a correction of this spec. Passing the session as
  `--resume=<session>` was rejected as the means, since Codex takes it as a word after `resume` and not as the value
  of an option
* **A resume reads its definition with the project's roles and harnesses.** The record already makes the definition
  the one the command wrote. Reading it as a run does keeps the role and the harness passed to `agentrite run` to the
  names the project has, as the rule of requirement 1 asks of every value passed into arguments
* **The comparison of a clone takes bytes as they are.** A filter of git is a program the host's configuration names,
  and the attributes that select it are files the agent writes, so the comparison runs none. Reading attributes from
  an empty tree was rejected: it needs a newer git than the kit asks for, and still runs a filter that the host's own
  attribute files select, over files the agent wrote. Setting `core.attributesFile` was rejected, since the
  attributes in the work tree outrank it. The cost falls on a project whose files git converts on checkout: those
  files are listed as differing and the clone is kept, which requirement 15 tells the developer how to recover from

## Non-goals

* What the kit's commands show the developer of a file under `.orchestrator` or `.reviews`, as `agentrite runs` and a
  refusal that names what a file holds do. What a file says to a human stays outside what the sandbox defends
  against
* A role that reads `.reviews` on the host. What a review file says, to a human or an agent, stays outside it
* The wrapper's making of the directories `.reviews` and `.orchestrator` of the project root and of the clone, which
  writes no file
* A run with `--in-place` or `--workdir`, which mounts a directory as it is
* Removing the records of runs. They are small, and the developer removes the directory
* What the container can reach over the network, which is a unit of its own

## Beyond the request

None
