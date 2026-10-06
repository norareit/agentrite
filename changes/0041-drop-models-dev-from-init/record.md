---
kind: task
status: draft
timestamp: 2026-10-06T22:50:00Z
---

# 0041 Drop models.dev from what init writes

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
