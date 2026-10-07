---
kind: task
status: in-progress
timestamp: 2026-10-06T22:50:00Z
---

# 0036 Drop models.dev from what init writes

## Description

`init` writes `models.dev` into the `ALLOWLIST` of a project that uses OpenCode, under the comment that OpenCode
fetches its model catalog from there at start-up. That has not been true since OpenCode moved its catalog to
`models.opencode.ai`, which the kit admits itself since 0015. 0015 found this and left the entry, under "Beyond the
request", because nothing fails with it. It is not free, though: the entrypoint refuses to start when a listed host is
unreachable, so every OpenCode project depends on a host it never uses, and the comment `init` writes beside it is
false. Take the entry out, and with it what exists only to carry it:

* In `scripts/agentrite.mjs`, remove `HARNESS_HOSTS`, whose one entry this is, the function `harnessHosts` and the
  `harness_hosts` value passed to the template. A registry with no entry and a placeholder that is always empty are
  a hook nothing calls
* In `templates/project/agent/compose.project.yml`, remove the `{{harness_hosts}}` line, so that the `ALLOWLIST`
  ends with its three comment lines
* In `tests/agentrite-init.test.mjs`, remove the test that the compose file admits `models.dev` for OpenCode. The
  test before it, that the compose file carries no host the kit supplies, asserts an empty host list for `claude`
  alone: make it assert the same for `claude` and `opencode` together, which is now the case that could regress
* In this repository's own `agent/compose.project.yml`, remove `models.dev` and its comment line. `api.openai.com`
  and its comment stay
* In the record of 0010, add an amendment that its decision "Harness hosts in the generated allowlist" no longer
  holds, naming this unit. Its spec is frozen and is not edited

Before removing anything, check that the OpenCode this sandbox runs does not contact `models.dev`. 0015's evidence is
the binary of 1.18.30, and the harness versions have followed the host since 0030. On a host with Docker, with
`models.dev` taken out of this repository's `ALLOWLIST`, start OpenCode in `./agent-dev.sh` and send it a prompt:
`grep models.dev /run/egress-proxy.log` shows no line, and `grep 'not allowlisted' /run/egress-proxy.log` shows no
refusal that the run with the entry did not have. Record the OpenCode version the check ran with. If it does contact
`models.dev`, stop and say so in the record: the host then belongs in `KIT_ALLOWLIST`, which is a bug unit and not
this task.

Afterwards `npm test` and `npm run check-changes` pass.

Not part of this task: the README, which names `models.opencode.ai` as the catalog's host and `models.dev` nowhere;
`tests/entrypoint-allowlist.test.mjs`, which uses `models.dev` only as an example of a hostname; the `CHANGELOG.md`
section, which is written at the release; and the `ALLOWLIST` of any existing project, which `init` wrote once and
`refresh` does not touch, so the entry stays there until the project removes it.

## Log

- 2026-10-06T22:50:00Z [human] asked why the README names `models.opencode.ai` as the host of OpenCode's model
  catalog while `init` writes `models.dev` with the same description, and, on hearing that the second is a leftover
  0015 chose to leave, asked for a small task that fixes it and whatever else has to change with it
- 2026-10-06T22:50:00Z [Claude Code, anthropic/claude-opus-5-5] took the specifier role and wrote this record, on
  `master` at `d77de6e`. A task: one entry and the code, test and template line that exist for it, with no decision
  left open, since removing a registry left empty follows from the code standards. The number is the highest
  existing, `history-0040`, plus one. Checked before writing: `HARNESS_HOSTS` holds the one entry and is read only
  by `harnessHosts`, which is called once; `{{harness_hosts}}` appears in the one template; the README and
  `RELEASING.md` name `models.dev` nowhere; `container/compose.yml` admits `models.opencode.ai`. Not checked: that
  the OpenCode in use today leaves `models.dev` alone, which the description has the implementer check first.
  Status left at `draft` for the human's approval
- 2026-10-07T12:41:25Z [human] asked for this unit to be renumbered from 0041 to 0036. It had taken 0041 because the
  `history-` directories run up to `history-0040`, while the units beside them had been numbered up to 0035 without
  counting those, and the jump from 0035 to 0041 read as five units missing. A `history-` directory and a unit of the
  same number are not the same thing
- 2026-10-07T12:41:25Z [Claude Code, anthropic/claude-opus-5-5] in the main session and in no role, on `master` at
  `9597dab`, moved the directory to `changes/0036-drop-models-dev-from-init` and changed the number in the title.
  Nothing else in the unit changed, and no other file named it as 0041: the 0041 in `history-0037-kit-as-an-npm-package`
  is an older unit of another name. The one commit made under the old number, `909d084`, keeps its prefix `task-0041`.
  The record of 0042 says that 0041 was the highest number when it was written, which it was. The status stays `draft`
- 2026-10-07T12:56:44Z [human] asked for the unit to be implemented, was told that it was still `draft`, and approved
  it, asking for the renumbering to be committed on `master` first. The status is `approved`
- 2026-10-07T12:59:30Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role on the host, fast-forwarded
  the branch `task-0036-drop-models-dev-from-init`, which existed at `5efbdf1` with no commit of its own, to `master`
  at `ead1e39`, and works on it in the main checkout. Status `in-progress`
- 2026-10-07T12:59:30Z [Claude Code, anthropic/claude-opus-5-5] made the check the description asks for before
  removing anything, on the host, a Linux host with Docker, with OpenCode 1.18.35 in the image, which is the host's
  version and what `opencode --version` printed in the sandbox. Two runs of one command, the first with this
  repository's `ALLOWLIST` as `master` holds it and the second with `models.dev` and its comment line taken out of
  `agent/compose.project.yml` in the working tree:
  `./agent-dev.sh --in-place bash -c 'opencode --version; opencode run "Reply with the single word ok. Do not use
  any tool."; grep models.dev /run/egress-proxy.log; grep "not allowlisted" /run/egress-proxy.log; cat
  /run/egress-proxy.log'`. OpenCode was logged in with the ChatGPT account the log directory holds, answered `ok`
  from `gpt-5.6-terra-fast` and exited 0, in both runs.
    * Without the entry: `grep models.dev /run/egress-proxy.log` printed no line and exited 1. `grep 'not
      allowlisted'` printed one line, `refused example.com: not allowlisted`, which is the entrypoint's own canary
      check and not OpenCode. After the entrypoint's checks the log holds two connections to `chatgpt.com`, both
      allowed, and nothing else that names a host
    * With the entry: `grep 'not allowlisted'` gives the same one line for `example.com`, so the run without the
      entry has no refusal that this one lacks. `models.dev` is in the log twice, in the proxy's line that lists
      what it listens for and as one allowed connection among the entrypoint's start-up checks of every listed host,
      before the canary. After those checks OpenCode connected to `models.opencode.ai`, `registry.npmjs.org` and
      `chatgpt.com`, and not to `models.dev`, although the proxy would have admitted it
    * What this does not show: the second run made no connection to `models.opencode.ai` either, so OpenCode took
      its catalog from what the first run left in the home volume, and that run says nothing about a fetch of the
      catalog. The fetch was seen in the first run only, where it went to `models.opencode.ai`. Not checked: any
      version but 1.18.35, the interactive session, which was not started, since `opencode run` sent the prompt,
      any provider but the ChatGPT login, and a home volume that holds no catalog while `models.dev` is not listed
    * The sandbox left the checkout as it was: `git status` showed the one edited file after both runs
- 2026-10-07T12:59:57Z [Claude Code, anthropic/claude-opus-5-5] implemented the description, in `85f97de` and `535f5ba`.
  `85f97de` removes `HARNESS_HOSTS`, `harnessHosts` and the `harness_hosts` value from `scripts/agentrite.mjs`, the
  `{{harness_hosts}}` line from the compose template, whose `ALLOWLIST` now ends with its three comment lines, the
  test for `models.dev` from `tests/agentrite-init.test.mjs`, and `models.dev` with its comment line from this
  repository's `agent/compose.project.yml`, where `api.openai.com` and its comment stay. `535f5ba` adds the
  amendment to the record of 0010. The test that the compose file carries no host now asks for `claude` and
  `opencode` together. It was changed before the code and failed then, as the one failing test of the suite, and
  passes since. What was run, on the host with Node 26.9.0, on the tree of `535f5ba`: `npm test`, 364 of 364
  passed, none skipped; `npm run check-changes`, which printed no finding and exited 0. Not checked: `agentrite
  init` run in a project outside the tests, and a start of the sandbox from the committed tree, which is the tree
  the second run of the check above had for `agent/compose.project.yml`. The unit stays `in-progress`, since no
  review has been made
