# 0059 A project adds software to the sandbox

## Context

The project AloudRite-IntelliJ is built with a JDK, and the sandbox's image has none, so an agent in its sandbox
cannot build or test it. The human asked for a way for a project that uses the kit to add a JDK, or whatever else
it needs, to the sandbox's image.

The kit builds the image from its own `container/Dockerfile`, with the project root as the context. What a project
can change of it today:

* the harness versions and the agent's user, through the build arguments of its `sandbox/compose.project.yml`
* Playwright's browser, which the kit adds when the project's `package-lock.json` resolves Playwright

Nothing else. AloudRite-IntelliJ's `sandbox/compose.project.yml` holds its name, its limits and its allowlist, and
nothing that builds. Unit 0054 named "software in the sandbox" as a non-goal, as something that "belongs in a
project's Dockerfile or Compose layer", and no unit has made such a layer.

`container/sandbox.sh` builds the image on `--rebuild`, when there is none, and when the version of a harness it
holds, which two labels of the image record, is not the version wanted. Otherwise a start builds nothing and needs
no network.

## Requirements

The project's file:

1. A project may hold a file `sandbox/Dockerfile`. When it does, the image the sandbox runs is the kit's image with
   that file built on top of it. When it does not, the image is the kit's, as today
2. The file builds on the kit's image by opening with these two lines, which `SANDBOX.md` gives:

   ```dockerfile
   ARG AGENTRITE_IMAGE
   FROM ${AGENTRITE_IMAGE}
   ```

   The kit gives `AGENTRITE_IMAGE` the name of its own image when it builds the file. The file is built with the
   project root as its context, as the kit's own file is
3. The image the sandbox runs keeps its name, the `image:` of the project's `sandbox/compose.project.yml`. With a
   `sandbox/Dockerfile`, the kit's own image is kept beside it under that name followed by `-base`
4. With the JDK of the example of requirement 11 in the file, `java -version` and `javac -version` succeed for the
   agent in the sandbox, and the firewall, the proxy and the drop to the agent are as they are without the file:
   the entrypoint's checks pass at start-up, and the agent holds no capability

When the image is built:

5. A start builds the image anew when the content of `sandbox/Dockerfile` is not the content the image was built
   from, when the file was added or removed since, and in every case where it builds today. A start where none of
   these holds builds nothing. Which content the image was built from is recorded on the image, as the harness
   versions are
6. When the kit's image is built anew, the project's file is built on it anew in the same start
7. A build of the project's file that fails ends the start with the build's own output and a status other than 0,
   and runs nothing, as a failing build of the kit's file does today

Keeping the sandbox:

8. A start with a `sandbox/Dockerfile` compares the image the sandbox would run with the kit's own image, the
   `-base` of requirement 3, and refuses when they differ in the entrypoint, the command, the user or the working
   directory. The refusal starts nothing, and its message names each that differs, with the kit's value and the
   image's, says that the kit's entrypoint is what installs the firewall and drops to the agent, and says to remove
   from `sandbox/Dockerfile` what sets it. The comparison is made at every such start, a start that builds nothing
   included, so that an image refused once is refused until the file is corrected and the image built anew. It
   reads the images on the host and needs no network
9. Whether a start builds, and which versions of the harnesses it takes the image to hold, do not depend on a label
   that `sandbox/Dockerfile` sets, one with the name of a label of the kit's included
10. Requirements 1 to 9 hold for `./sandbox.sh` in each form that starts a container, and for `./sandbox-dev.sh`

The documents:

11. `SANDBOX.md` has a section on adding software to the sandbox, which says:
    * where the file is, the two lines it opens with, and that it is built on the kit's image, as root, with the
      project root as the context
    * an example that installs a JDK from the image's Debian packages, and sets `JAVA_HOME`
    * that the file must not change the entrypoint, the command, the user or the working directory the kit's image
      sets, since the entrypoint is what installs the firewall and drops to the agent, and that a start refuses an
      image that changes one of them
    * that the build runs on the host, with the host's network, outside the sandbox's firewall, as the kit's build
      does
    * that the file is committed, and that the image is built from the file of the checkout the command is run from,
      so a change to it that an agent made in a unit run's clone reaches the image only once the developer has it in
      that checkout
    * when the image is built anew, by requirements 5 and 6, and that `--rebuild` builds both
    * that a tool the project adds that downloads at run time needs its hosts in the project's `ALLOWLIST`, with a
      link to "Reaching more hosts"
    * what the file must not do besides, each with what goes wrong and what to do instead:
        * install into `/home/agent` or `/work`, which are mounted over at run time, so that what is there is hidden,
          or, in the home, seen only in a home volume made after the build. Install under `/usr/local` or `/opt`
        * leave a tool to write outside the agent's home, `/work` and `/tmp` at run time, since the root filesystem
          is read-only then. Point its cache and its settings into the home or `/tmp`, as with an environment
          variable the tool reads
        * install or upgrade Claude Code or OpenCode, which leaves the image holding another version than the kit
          takes it to hold. Hold a version as "Holding a harness version" says
        * set an environment variable the kit's image sets, which changes how the harnesses or the browser tests
          behave, naming them
12. "Where things are kept on the host" of `SANDBOX.md` names the `-base` image of requirement 3, and how to remove
    it
13. `README.md` names `sandbox/Dockerfile` where it says what of the sandbox a project holds and may change, as
    a file the project may add, and that `init` and `refresh` do not write it

Tests:

14. The suite tests requirements 5, 6, 8 and 9 with Docker: a project file that adds a file to the image, one
    changed after a build, one removed, one each that sets its own entrypoint, command, user and working directory,
    and one that sets each label of the kit's to another value. Where Docker is not available, they are skipped as
    the suite's other tests that need Docker are

## Decisions

* **A Dockerfile of the project's, built on the kit's image.** It takes whatever a project needs: a package, a
  download, a toolchain at a version of its own, an environment variable. Rejected: a list of Debian packages in
  `sandbox/compose.project.yml`, which is enough for a JDK from Debian and for nothing that Debian does not carry
  at the version wanted, so the next need would bring the Dockerfile anyway
* **The file names the kit's image through an argument.** The kit's image is built as part of the same start, and
  its name follows the project's `image:`. An argument keeps the file the same in every project and on every
  builder. Rejected: a fixed image name in `FROM`, which would tie every project's file to one name; and a named
  build context of Compose, which depends on a version of Compose and of the builder that the kit does not require
  today
* **The project's file is trusted as `sandbox/compose.project.yml` is.** Both are the developer's files, built and
  read from the checkout the command is run from, and the compose file can already change any setting of the
  container. The sandbox defends against the agent, which reaches either file only through what the developer takes
  into that checkout. So the kit does not judge what the file installs
* **A start refuses an image that would run without the kit's entrypoint.** The human moved this into the unit from
  "Beyond the request" while the spec was a draft: a developer must not end up without a sandbox by accident. A
  file that sets its own `ENTRYPOINT`, `CMD`, `USER` or `WORKDIR` last, as a Dockerfile copied from elsewhere often
  does, would start a container without the firewall and the drop to the agent, and nothing would say so. The four
  are what the image's configuration holds of how a container starts, and they are compared, not a list of what is
  allowed. A file that replaces the entrypoint's script itself is not caught: that is not done by accident, and the
  developer is trusted, as with the compose file. Rejected: checking only at a build, which an image built and
  refused once would pass at the next start, since an unchanged file builds nothing
* **A change of the file builds the image, and an unchanged file does not.** The image is built only when a start
  needs it, so that a start needs no network otherwise. Recording the file's content on the image is how the kit
  already knows the harness versions it holds, and it catches every change, the adding and the removing of the file
  included. Rejected: building on every start, which needs the network on every start; and only on `--rebuild`,
  which leaves an image without what the file now says, with nothing to say so
* **The kit's own image is kept under a name of its own.** The project's file needs it as a base, and a start that
  rebuilds only the project's layer then builds it from that base without building the kit's again
* **The kit's labels are the kit's.** A file built on the kit's image can set a label of the same name as one of the
  kit's, and the image then holds the file's value. The kit decides on its labels whether to build, so such a label
  could leave an image unbuilt that should be built. Few would set one, and none on purpose, but it is cheap to rule
  out, where a check would need a message for it
* **What else a file can do wrong is said, and not checked.** Software installed where a mount hides it, a tool
  that writes to the read-only root filesystem, a harness installed over the kit's and a variable of the kit's set
  anew do not weaken the sandbox: the firewall and the drop to the agent are as they were, and the entrypoint's
  checks at start-up still judge the image as it is built, the agent's account and the firewall's tools among it.
  What breaks is the tool added, which the developer sees when they first use it. Rejected: checking for each, which
  would have the kit guess at what a file meant
* **`init` writes no `sandbox/Dockerfile`.** Most projects need none, and a file that adds nothing would be built on
  every project's image

## Non-goals

* A check of `sandbox/compose.project.yml`, which can set an entrypoint of its own as well. It is not new with this
  unit, and the developer writes it for the settings of the container, not to install software. The human decided
  to leave it out
* Software that the kit itself adds for every project, such as a JDK in the kit's image
* OpenCode or Claude Code at versions of the project's own, which "Holding a harness version" covers
* AloudRite-IntelliJ's own `sandbox/Dockerfile` and allowlist, which are that project's, made when it moves to the
  release that holds this unit
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

None
