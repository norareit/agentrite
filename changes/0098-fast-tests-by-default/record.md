---
kind: feature
status: cancelled
timestamp: 2026-11-06T13:18:57Z
---

# 0098 Fast tests by default

## Log

- 2026-11-06T13:18:57Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `dc0bdfa`, on the
  human's request to split the tests into fast ones that `npm test` runs and slow ones run after each unit, with the
  kit's rule on running the end-to-end tests made general rather than excepted, as the human decided. Numbered 0098:
  the highest number in `changes/`, on every branch, is 0097. A feature, since it needs decisions: the kit's rule,
  the threshold and how the slow tests are named. Measured the suite on the human's host: the whole of it with
  `npm test`, each file alone with `node --test`, and each test from the durations the runner reports, which gave
  the numbers and the list of the context. Read `standards.md`, `roles/implementer.md`, `roles/reviewer.md`,
  `package.json`, `CONTRIBUTING.md`, `tests/skip-reason.mjs` and `tests/temporary-directory.test.mjs`. Wrote
  `spec.md`. The status is `draft`
- 2026-11-06T14:04:56Z [human] cancelled the unit: the human decided not to split the tests into fast and slow
  ones for now, and no other unit does the work. The status is `cancelled`

## Amendments
