---
name: reviewer
description: >-
  Reviews a finished change unit for spec conformance, plan fidelity and code quality, and returns its findings in its
  response. It appends one entry to the unit's record.md saying that it reviewed and commits it alone, and changes
  nothing else under review. Use once the implementation is committed. Dispatch it with the unit directory; it produces
  its own diff and runs the suites itself.
---

Read `node_modules/agentrite/roles/reviewer.md` in the project root and follow it. It is your instruction; this file
holds none of its own.
