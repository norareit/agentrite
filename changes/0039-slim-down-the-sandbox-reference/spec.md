# 0039 Slim down the sandbox reference

## Context

`SANDBOX.md` is 567 lines and 5576 words. Unit 0037 wrote it from the sandbox part of the old README, and took out
why a behavior is as it is. What the sandbox does, refuses and leaves behind stayed, which is most of it, so the
document is as long as the text it came from. The human did not read it through, and expects that nobody will.

Much of it is not what a reader acts on. It lists refusals that the wrapper explains itself when they happen, says
how the egress proxy works inside, says some things in two or three sections, and describes each failure in the
section of its subject, so that a reader with a failure in front of them has to know where to look.

This unit takes out what a reader does not act on, and puts the failures in one place to look them up.

## Requirements

1. Every section of `SANDBOX.md` keeps its title, except that:
    * "What a unit run defends against" becomes "What the sandbox defends against", and is the one section that
      says what the sandbox defends against and what it does not: for a unit run, for the project's log directory,
      for a process started with `docker exec`, and for egress
    * there is a new section, "When something goes wrong", which is the last
2. "When something goes wrong" is one table with the columns "What you see", "Why" and "What to do". It has a row
   for every failure of the sandbox that `SANDBOX.md` describes today and that a reader recovers from by doing
   something. A failure that is a row of the table is described nowhere else in the document: the section of its
   subject names "When something goes wrong" and no more
3. A refusal is not in `SANDBOX.md` when the message the wrapper or the entrypoint prints for it names both why it
   refused and what to do. This is checked against the message in the code, for every refusal that is taken out.
   A refusal stays, as a row of the table, when its message leaves either out
4. "The harness versions" says, and nothing else:
    * which version the image holds: the project's, else the host's, else the latest published when it is built
    * how a project holds a version, and that it is an exact version
    * what counts as the host's version
    * how a sandbox gets a newer version, and that the wrapper builds again by itself when a wanted version differs
    * how to see what an image holds
    * that the image is per machine, and that the versions are those of the checkout the command is run from
    * how to remove the images that rebuilds leave behind
5. "Egress" says, and nothing else:
    * what leaves the container, and that everything else is denied
    * the two lists, with the table of the kit's own hosts
    * what a project adds to its `ALLOWLIST`, and that an entry is a hostname, matched exactly
    * what is refused although a host is allowlisted: plain HTTP, and TLS on any port but 443
    * where a refused connection is logged
    * a pointer to "What the sandbox defends against" for what it does not stop
6. "The shared `node_modules`" says when it applies, what an install on one side removes for the other on a macOS
   host, the two commands that restore a side, and that it is `npm ci` and not `npm install`
7. Of moving from a release up to 4.0.0, `SANDBOX.md` holds the command that copies the logs out of a home volume,
   what its two placeholders are, when it must be run, and that it overwrites nothing. It stays where a reader of
   the notes of 4.1.0 in `CHANGELOG.md` finds it, which name "The harness logs" for it
8. A fact is stated once in `SANDBOX.md` and pointed to by the title of its section elsewhere in it. Where each
   harness keeps its login, and the refusal of a home volume in which a directory is not the agent's, are each
   stated once
9. `SANDBOX.md` says nowhere on which system something was shown to work or was not tried
10. Every command, path, option, host name and file name that stays keeps its exact spelling, and every statement
    that stays keeps its strength
11. The record lists every statement of the present `SANDBOX.md` that is not in it afterwards, grouped by the
    section it stood in, and says of each group which requirement it went by. For a refusal that went by
    requirement 3, the list quotes the message that explains it
12. Everything outside `SANDBOX.md` that names "What a unit run defends against" names the new title
13. This repository's `AGENTS.md` says, in "The documents", that a refusal whose message names why and what to do
    is not described in `SANDBOX.md`, and that a failure a reader recovers from is a row of "When something goes
    wrong"
14. The suites pass

## For the reviewer

The reviewer compares `SANDBOX.md` with the one on the merge base, section by section, and does not take the
implementer's list of requirement 11 for that comparison. The review reports:

* every statement of the earlier document that is not in the new one and that the list does not name. Each is a
  finding
* every statement the list names that, in the reviewer's judgement, a reader needs in order to use the sandbox or
  to recover from a failure, with the reason. Each is a finding for the human, who decides whether it comes back
* every refusal that went by requirement 3 whose message does not name both why and what to do

Whether a loss is a problem is the human's to decide in every case. A loss that the human accepted is recorded as a
decision, and a later review treats it as settled.

## Decisions

* **A unit of its own, on the human's word.** 0037 was reviewed and marked implemented first. What it kept, it
  kept by its requirement 9, and this unit draws that line closer
* **No target length, on the human's word.** The document is as long as what the requirements keep takes, and a
  number would have something a reader needs dropped to meet it
* **Failures in one table.** A reader comes to the reference with a failure more often than with a wish to read
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
* **The copy command stays, cut down.** The notes of 4.1.0 send a reader to "The harness logs" for it and hold
  everything else about the move. `CHANGELOG.md` is not changed by a unit, so the command cannot move there, and
  taking it out would leave that pointer with nothing to find
* **What was tried goes.** It reads as a test report, and the notes of the release that brought a behavior say
  what was tried for it
* **One document, not two.** Splitting it into an everyday part and a part for failures was the alternative to
  cutting. It leaves the same amount of text to keep true, and the table of failures gives the reader most of what
  the split would
* **The titles stay.** The README, `CONTRIBUTING.md`, the comments of the kit and `CHANGELOG.md` name the sections
  by title. One title changes, because its section now covers more than a unit run

## Non-goals

* A change to what the sandbox does, to what any command accepts, or to any message it prints. A message that does
  not say what to do stays as it is, and its refusal stays in the document
* A change to `README.md` or `CONTRIBUTING.md`, apart from a pointer of requirement 12
* A change to `CHANGELOG.md`
* Correcting the content on the way. A statement that is out of date and stays is left as it is, and named in the
  record for the human

## Beyond the request

* The rule of requirement 3 for `README.md` too. "Running a role" lists what makes `agentrite run` start nothing,
  and "Installing it into a project" what `init` refuses, and some of those messages explain themselves. It would
  make the three documents follow one rule. Its cost is a second loss list and a second comparison for the
  reviewer, in a document the human has just read and accepted. Without it the README holds a few refusals that
  the commands also explain, which misleads nobody
