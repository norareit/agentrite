# 0039 Slim down the sandbox reference

## Context

`SANDBOX.md` is 581 lines and 5635 words. Unit 0037 wrote it from the sandbox part of the old README, and took out
why a behavior is as it is. What the sandbox does, refuses and leaves behind stayed, which is most of it, so the
document is as long as the text it came from. The human did not read it through, and expects that nobody will.

Its reader is someone who uses AgentRite and wants to know how to use the sandbox in more detail than the README
gives. That reader comes with something to do: run two agents on one unit, let the sandbox reach another host, get
the work back after a crash. The document is ordered by the parts of the sandbox instead, "The home volume", "The
harness logs", "Egress", so the reader has to know which part a question belongs to. It lists refusals that the
wrapper explains itself when they happen, says how the egress proxy works inside, says some things in two or three
sections, and has no one place that says where on the host the sandbox keeps what.

This unit orders the document by what a reader does, takes out what a reader does not act on, and puts the places
on the host and the failures each in one table.

## Requirements

1. `SANDBOX.md` holds these sections, in this order, after an opening that says what the document is and that the
   commands are in the README, and after its table of contents, which links to each of them:
    1. "Running a unit": how a unit is named, what the first run of a unit does, what the clone holds and what it
       does not, what is done first in a new clone, and that the sandbox's configuration is that of the checkout
       the command is run from
    2. "Getting the work back": what the wrapper does when the container exits, when the commits wait instead,
       when a clone is kept, and how a kept clone is resumed
    3. "Two agents on one unit": `--connect`, what a connected command shares with the first, which command to
       end last and what is lost otherwise
    4. "Running on the tree as it is": `--in-place`, `--workdir`, `--mount`, and that the host and the sandbox
       then share one `node_modules`
    5. "Logging in": how each harness is logged in, and how often
    6. "Reaching more hosts": what leaves the container, the kit's own hosts, and what a project adds
    7. "Holding a harness version": which version the image holds, how a project holds one, and how a sandbox gets
       a newer one
    8. "The status line"
    9. "The local model server"
    10. "Where things are kept on the host"
    11. "What the sandbox defends against"
    12. "When something goes wrong"
    13. "Moving from a release up to 4.0.0"
2. Each of the sections 1 to 9 opens with the command a reader types for it, in a code block, where there is one,
   then says what happens, then what a reader needs to know. What is done in an order is said in that order, as a
   numbered list. A statement of the present document that belongs in one of the sections 1 to 6, 8 and 9, and
   that no other requirement takes out, stays when it says what a reader types, sees, can find or can observe,
   must do or must not do, or loses or keeps. It goes, by this requirement, when it lists what a command does not
   do, or says what the wrapper, the entrypoint or the proxy does inside, which a reader cannot observe. That
   `--connect` "starts no container and stops none, builds no image, asks npm nothing" goes. That the host's other
   branches are in the clone as `origin/*`, and that Claude Code's sessions are under `.claude/projects/-work`,
   stay
3. "Where things are kept on the host" is one table with a row for the clone of a unit run, the project's log
   directory, the home volume and the image. Its columns say what it is, where it is, what it holds, and how it is
   removed. Where one of them is, and how it is removed, is said nowhere else in the document: a section that
   needs it, as "Getting the work back" does for discarding a clone, names the table by its title, which is not
   saying it. The command of requirement 10 spells the path of the log directory and the name of the home volume,
   as it must. The present document does not say how the project's log directory or the image is removed. Those
   two cells are new statements: the implementer writes them from the code and from Docker's own commands, tries
   each, and names them in the record as new
4. "What the sandbox defends against" is the one section that says what the sandbox defends against and what it
   does not: for a unit run, for the project's log directory, for a process started with `docker exec`, and for
   egress. It states the supported usage
5. "When something goes wrong" is one table with the columns "What you see", "Why" and "What to do". It has a row
   for every failure of the sandbox that `SANDBOX.md` describes today and that a reader recovers from by doing
   something. A failure that is a row of the table is described nowhere else in the document: the section of its
   subject names "When something goes wrong" by its title, and no more. Among the rows are these, which the
   present document has in the section of their subject:
    * a container, a wrapper or a host that crashed during a unit run
    * commits that wait at `sandbox/<branch>`, with the command that merges them
    * a `node_modules` that an install on the other side changed, with what was removed, the two commands that
      restore a side, and that it is `npm ci` and not `npm install`
    * a login that sends the browser back to a port on `localhost`, with the login that needs no callback
    * a connection that is refused, with where it is logged
    * a local model server that is not reached from a Linux host whose firewall denies incoming traffic
6. A refusal is not in `SANDBOX.md` when the message the wrapper or the entrypoint prints for it names both why it
   refused and what to do. This is checked against the message in the code, for every refusal that is taken out.
   A refusal stays, as a row of the table, when its message leaves either out. The two refusals of a home volume,
   one owned by another uid and one in which a directory is not the agent's, go by this requirement
7. "Holding a harness version" says, and nothing else:
    * which version the image holds: the project's, else the host's, else the latest published when it is built
    * how a project holds a version, and that it is an exact version
    * what counts as the host's version
    * how a sandbox gets a newer version, and that the wrapper builds again by itself when a wanted version differs
    * how to see what an image holds
    * that the image is per machine, and that the versions are those of the checkout the command is run from
8. "Reaching more hosts" says, and nothing else:
    * what leaves the container, and that everything else is denied
    * the two lists, with the table of the kit's own hosts
    * what a project adds to its `ALLOWLIST`, and that an entry is a hostname, matched exactly
    * what is refused although a host is allowlisted: plain HTTP, and TLS on any port but 443
9. Of the shared `node_modules`, "Running on the tree as it is" says when it applies and that an install on either
   side writes into the one directory, and names "When something goes wrong" for the rest
10. "Moving from a release up to 4.0.0" holds the command that copies the logs out of a home volume, what its two
    placeholders are, when it must be run, that it overwrites nothing, and that a home volume the entrypoint
    refuses still allows it, so that a developer who wants that volume's logs copies them before removing it, and
    no more
11. A fact is stated once in `SANDBOX.md` and pointed to by the title of its section elsewhere in it. Where each
    harness keeps its login is stated once
12. `SANDBOX.md` says nowhere on which system something was shown to work or was not tried
13. Every command, path, option, host name and file name that stays keeps its exact spelling, and every statement
    that stays keeps its strength
14. The record lists every statement of the present `SANDBOX.md` that is not in it afterwards, grouped by the
    section it stood in, and says of each group which requirement it went by. A statement that moved to another
    section is not a loss and is not listed. For a refusal that went by requirement 6, the list quotes the message
    that explains it
15. Everything outside `SANDBOX.md` that names a section of it by title names the title under which that text now
    is. That holds for `README.md`, for `CONTRIBUTING.md`, for what the kit writes into a project, for what a
    command prints, and for comments
16. This repository's `AGENTS.md` says, in "The documents":
    * that `SANDBOX.md` is kept complete for its reader: a unit that adds, changes or removes something a
      developer does with the sandbox, or meets in it, changes `SANDBOX.md` in the same unit
    * that `SANDBOX.md` is ordered by what a reader does, and that a unit which adds to it puts the text in the
      section of what the reader is doing
    * that a refusal whose message names why and what to do is not described in it
    * that a failure a reader recovers from is a row of "When something goes wrong", and that the table of where
      things are kept is kept up to date, in the unit that changes either
17. The suites pass

## For the reviewer

The reviewer compares `SANDBOX.md` with the one on the merge base, statement by statement, and does not take the
implementer's list of requirement 14 for that comparison. The sections do not match one to one, so a statement of
the earlier document is looked for in the whole of the new one. The review reports:

* every statement of the earlier document that is nowhere in the new one and that the list does not name. Each is
  a finding
* every statement the list names that, in the reviewer's judgement, a reader needs in order to use the sandbox or
  to recover from a failure, with the reason. Each is a finding for the human, who decides whether it comes back
* every refusal that went by requirement 6 whose message does not name both why and what to do
* every statement that stayed and no longer says what it said, by requirement 13

Whether a loss is a problem is the human's to decide in every case. A loss that the human accepted is recorded as a
decision, and a later review treats it as settled.

## Decisions

* **A unit of its own, on the human's word.** 0037 was reviewed and marked implemented first. What it kept, it
  kept by its requirement 9, and this unit draws that line closer
* **Ordered by what a reader does, on the human's word.** The human expects a user of AgentRite to open the
  document to find out how to use the sandbox in more detail than the README gives. Such a reader has a task and
  not a part of the sandbox in mind. Keeping the order by parts and only cutting was the first draft of this spec,
  and was rejected for that: it would be shorter, and still ask the reader to know where to look
* **The titles change.** `README.md`, `CONTRIBUTING.md` and comments of the kit name the present sections by
  title, and are brought along by requirement 15. `CHANGELOG.md` is not: its earlier notes name sections of the
  README as it was when they were written, which 0037 already moved
* **No target length, on the human's word.** The document is as long as what the requirements keep takes, and a
  number would have something a reader needs dropped to meet it
* **The document is kept by a rule in `AGENTS.md`, on the human's word.** 0037 wrote such a rule for the commands
  of the README and for the two tables, and none for the sandbox. Without one, a later feature of the sandbox is
  in its unit and in the code and not in the document a user reads
* **What can be observed stays, on the human's word.** The planner found that the sections of what a reader does
  had no rule for what leaves them. Three rules were put to the human: only what a reader acts on, also what a
  reader can observe, or nothing beyond the cuts the other requirements name. The human took the second. So the
  document still says what a reader finds when they look, and loses the lists of what a command does not do and
  what happens inside unseen
* **Every failure is a row, on the human's word.** The first spec had some failures both in a section and in the
  table. Splitting them by whether a reader meets them unexpectedly was offered and not taken: with all of them
  in the table, a reader with a failure has one place to look, and never has to guess which kind theirs is
* **The home volume's refusals go, on the human's word.** Their messages name why and the command that removes
  the volume. What the messages do not say, that the logs can be copied out first, is in the section on moving
  from a release up to 4.0.0, which is the one case it is for
* **Two new cells, on the human's word.** How the log directory and the image are removed is not in the present
  document, and the table would have two empty cells without it. It is the one place where this unit writes
  something the document did not say
* **The places on the host in one table.** The clone, the log directory, the home volume and the image are each
  described in a section of their own today, and a reader who wants to find or remove one reads that section for
  one line of it
* **Failures in one table.** A reader comes to the document with a failure more often than with a wish to read
  about a subject. A table of what is seen, why, and what to do answers that in one place, and a failure takes a
  row where it took a paragraph or a list
* **A refusal that explains itself is not repeated.** The message is in front of the reader when it happens, and
  it is kept right by the tests of the wrapper, which the document is not. This changes what 0037 had the documents
  hold, "what is refused, and how to recover", so `AGENTS.md` says it. It is checked against the code, because a
  refusal whose message does not say what to do is the one a reader needs the document for
* **How the proxy works goes.** That the proxy reads the hostname from the TLS ClientHello, resolves the host
  itself, terminates no TLS, and how Encrypted ClientHello is judged, is what the proxy does and not what a reader
  does. Unit 0018 and the proxy's own source hold it. What a reader meets stays: what is refused, and where it is
  logged
* **What the kit promises for a harness version goes.** It says what holds whatever the version and what is not
  checked. A reader acts on none of it until something breaks, and then the table has the row
* **The copy command stays, in a section of its own.** The notes of 4.1.0 hold everything else about the move and
  send a reader to the README's "The harness logs" for the command, which 0037 moved here. `CHANGELOG.md` is not
  changed by a unit, so the command cannot go there. It is the last section, since it is for a project that still
  has a home volume of that time and for nobody else
* **What was tried goes.** It reads as a test report, and the notes of the release that brought a behavior say
  what was tried for it
* **One document, not two.** Splitting it into an everyday part and a part for failures was considered. The order
  by what a reader does, with the two tables after it, is that split inside one document

## Non-goals

* A change to what the sandbox does, to what any command accepts, or to any message it prints, apart from a
  pointer of requirement 15 in a message. A message that does not say what to do stays as it is, and its refusal
  stays in the document
* A change to `README.md` or `CONTRIBUTING.md`, apart from a pointer of requirement 15
* A change to `CHANGELOG.md`
* Correcting the content on the way, apart from the two cells of requirement 3. A statement that is out of date
  and stays is left as it is, and named in the record for the human

## Beyond the request

* The rule of requirement 6 for `README.md` too. "Running a role" lists what makes `agentrite run` start nothing,
  and "Installing it into a project" what `init` refuses, and some of those messages explain themselves. It would
  make the three documents follow one rule. Its cost is a second loss list and a second comparison for the
  reviewer, in a document the human has just read and accepted. Without it the README holds a few refusals that
  the commands also explain, which misleads nobody
