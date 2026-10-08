---
kind: feature
status: draft
timestamp: 2026-10-08T10:54:55Z
---

# 0038 `--no-sandbox` replaces `agentrite-roles`

## Log

- 2026-10-08T10:54:55Z [human] in an earlier session of Claude Code on the host, while unit 0037 was specified, was
  told that `agentrite-roles` and `agentrite roles` do unrelated things under nearly the same name, and that the
  first is nearly redundant since `init` and `refresh`. Proposed to move it into `agentrite init --roles-only` and
  `agentrite refresh --roles-only`. Was answered that `--no-sandbox` fits the case better, and that the choice is
  between removing `agentrite-roles` with that option on both commands, and removing it with no option at all. In
  this session, gave that exchange to the specifier and decided: "I agree with that last part. Make it a
  --no-sandbox !"
- 2026-10-08T10:54:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `3f61b74`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made the
  unit as a feature, since it takes decisions on what two commands leave out and on what becomes of a published
  name. Numbered 0038: the plain directories run from 0001 to 0037 and then hold 0042, the `history-` directories do
  not count, and the number continues after the last of the consecutive run, as the human said for 0037. Wrote
  `spec.md`. Read for it `scripts/agentrite.mjs`, `scripts/agentrite-roles.mjs`, the pointer package under
  `pointers/agentrite-roles/`, the parts of `README.md` on installing and updating, and the spec of unit 0037.
  Searched the repository for `agentrite-roles`. Found by that: the usage text of `init` and `refresh` is the usage
  text of `agentrite-roles` with the name replaced, and `scripts/agentrite.mjs` and `scripts/agentrite-run.mjs`
  import the wrappers from the file of the old command, so that file's logic stays whatever becomes of the command.
  Ran no command of the kit and no suite. The human decided the removal and the option on both commands. The rest in
  the spec is the specifier's and was not the human's in those words:
    * that the pointer package is kept, reworded and given a higher version, and that publishing it is the human's
    * that `init --no-sandbox` runs without a `name` in `package.json` and does not read `package-lock.json`
    * that no line is printed for a file that is left out
    * that the option is accepted at any place and counts once when repeated
    * that there is no release that warns first, and that the release that carries the unit is a major one
    * that nothing of unit 0037 is changed here, though its requirement 5 lists `agentrite-roles`
  Status left at `draft`

## Amendments
