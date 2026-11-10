---
kind: feature
status: in-progress
timestamp: 2026-11-10T11:54:10Z
---

# 0106 OpenCode in the sandbox is given the host's local model providers

## Log

- 2026-11-10T11:54:10Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `718bc87`, on the
  human's request to have OpenCode in the sandbox use the local model provider of the host's OpenCode configuration.
  The human decided that only the local providers cross, of each the keys the spec names, that OpenCode alone is
  covered, and that what else a developer wants in the sandbox, an API key among it, they set in the home volume.
  Read "The local model server", "What the sandbox defends against" and "Where things are kept on the host" of
  `SANDBOX.md`, the sandbox members of `scripts/harnesses/opencode.mjs` and `scripts/harnesses/claude.mjs`, the host
  reader of `scripts/agentrite-sandbox.mjs`, and the precedence and file names of OpenCode's configuration in its
  documentation at https://opencode.ai/docs/config/. Wrote `spec.md`. The status is `draft`
- 2026-11-10T12:07:05Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take the
  first item of "Beyond the request", the line a start prints of the providers it hands to OpenCode, made it requirement
  9 and numbered the later requirements on from 10. The two items left of "Beyond the request" are numbered 1 and 2. The
  human declined a review of the spec before approving it. The status is `draft`
- 2026-11-10T12:07:52Z [human] approved the spec. The status is `approved`
- 2026-11-10T12:15:18Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0106-host-local-model-providers-for-opencode` cut from `master` at `f80a148`, wrote `plan.md`. The status
  is `approved`
- 2026-11-10T12:27:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on
  `feature-0106-host-local-model-providers-for-opencode` at `d1f3f90`. The status is `in-progress`
- 2026-11-10T12:38:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built a `provider` key that is
  absent or not an object as holding no local provider, and a `baseURL` that is no string or no URL as making its
  provider not local, since requirements 10 and 11 list every refusal
- 2026-11-10T12:38:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the file the host member gives
  as replacing the kit's mount at `/etc/opencode/opencode.json`, since the providers are to be in the kit's
  configuration and Docker takes one mount for each target
- 2026-11-10T12:38:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the line of requirement 9 as
  going to standard error, as the wrapper's other lines of what it does
- 2026-11-10T12:38:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, put the test that `--connect` reads
  nothing of the host's OpenCode file in `tests/sandbox-only.test.mjs` rather than in `tests/sandbox-wrapper.test.mjs`,
  since the fixture of the latter has no branch for `--connect` to join. The test also runs the branch, which reads the
  file and is refused for it
- 2026-11-10T12:38:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave the test of
  `tests/sandbox-wrapper.test.mjs` that the fixture's `container/` holds no Dockerfile the entry `harnesses` among what
  it lists, since the fixture now copies the kit's `container/harnesses/opencode/opencode.json`, which OpenCode's host
  member reads
- 2026-11-10T12:39:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, finished the tasks of `plan.md` in
  the commits `ebd0eea`, `06d890a`, `7812b1a`, `004e736` and `dc2d0bc`. On `dc2d0bc`, `npm test` passes, 1892 tests with
  none failed or skipped, `npm run check-changes` exits 0, and no line the branch adds is longer than 120 characters but
  the rows of Markdown tables. Not checked: OpenCode itself reading the written configuration in a running container and
  listing the local provider's models, and a request to a model server through it. The status stays `in-progress`, for
  the review
- 2026-11-10T13:09:28Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0106 at
  `1dae517e3936ff71471f81d4870c54c538a23c9f` in a full review against merge base `f80a148`. Returned S1 in
  `.reviews/0106-host-local-model-providers-for-opencode/review-20261110T130928Z.md`. `npm test` passes, 1892 tests
  with none failed or skipped, and `npm run check-changes` passes. Not verified: OpenCode loading the generated
  configuration and listing models in a running sandbox, or a request through it to a local model server
- 2026-11-10T14:41:16Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, accepted S1 of
  `review-20261110T130928Z.md` and fixed it in `4c903db`: a line comment of the host's file now ends at a carriage
  return as at a line feed, and a comma after `[`, `{` or another comma is refused rather than taken out, with tests
  of both through the configuration reader. On `4c903db`, `npm test` passes, 1898 tests with none failed or skipped,
  and the new tests fail on the parser before the fix. The status stays `in-progress`
- 2026-11-10T14:45:59Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0106 at
  `494efde17c4bfcca24ec6b616fba9e877975522f` in a delta review from `1dae517`. Returned no findings, saved in
  `.reviews/0106-host-local-model-providers-for-opencode/review-20261110T144559Z.md`. `npm test` passes, 1898 tests
  with none failed or skipped, and `npm run check-changes` passes. Not verified: OpenCode loading the generated
  configuration and listing models in a running sandbox, or a request through it to a local model server

## Amendments
