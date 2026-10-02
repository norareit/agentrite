#!/usr/bin/env python3
"""Compares what `agentrite refresh` makes of a wrapper's frontmatter with what a YAML parser reads.

The reader in scripts/wrapper-frontmatter.mjs is not a YAML parser. It reads one exact form and refuses the rest,
and its promise is that it never changes a wrapper wrongly. This script looks for a counterexample. It builds
random frontmatter, and for every one that the reader accepts and that is a valid YAML mapping it checks that

  * the refreshed frontmatter is still valid YAML
  * every key the project added has the value it had
  * every key the kit writes has the release's value, once
  * a second refresh changes nothing

A frontmatter the reader refuses is never a failure: refusing is always safe.

It is not part of `npm test`, which needs no install: this needs Python 3 with PyYAML, and node.

    python3 tests/manual/frontmatter-vs-yaml.py [cases per kind, default 20000] [seed, default 1]

It exits 1 and prints the failing cases when it finds any. A failure becomes a test in
tests/agentrite-refresh.test.mjs before it is fixed.
"""
import json
import os
import random
import subprocess
import sys
import tempfile

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))

# Whole keys with their values: ones the reader takes, ones it must refuse, and ones built to mislead it, where a
# line inside a value is shaped like a key the kit owns.
PIECES = [
    ["model: a/b"], ["temperature: 0.1"], ["model:"], ["steps: 5"], ["2fa: true"], ["-x: 1"],
    ['notes: "a: b # c"'], ["notes: 'it''s'"], ['label: "say \\"x\\""  # c'], ['e: ""'], ["e2: ''"],
    ["notes: 'first", "mode: x", "last'"], ['notes: "first', '"mode": primary', 'last"'],
    ['notes: "a\\"', 'mode: b"'], ["notes: 'first", "  second'"],
    ["tools: [a, b]"], ["m: {a: 1, b: [c, d]}"], ["tools: [a,", "b]"], ["tools: [a,", "mode: b]"],
    ["tools: [read, # ]", "mode: primary", "  ]"], ["m: {a: 1, # }", "mode: 2}"], ["tools: [a] # ]"],
    ["tools: [a#b]"], ['tools: ["]", a]'], ["tools: [a, 'b,", "mode: c']"], ["m: {a: 1,", "mode: 2}"],
    ["prompt: |", "  it's", "  mode: x", "", '  "q": 1'], ["prompt2: >-", "  a", "", "  b"],
    ["prompt3: |+", "  a", "", ""], ["prompt4: |2", "   a", "  'b"], ["prompt5: | # c", "  [a,"],
    ["prompt6: >", " one", ' "mode": x'], ["prompt7: |", "  a", "# c"],
    ["permission:", "  edit: deny", '  "git *": allow', "  'rm *': ask", "  bash:", "    ls: allow"],
    ["permission:", "  note: 'a", "mode: b'"], ["permission:", "  x: [a,", "mode: b]"],
    ["permission:", "  x: [a, # ]", "mode: b]"], ["permission:", "  it's: 'a", "mode: b'"],
    ["p:", "- a", "- b: c", "  d: e"], ["q:", "  - r: |", "      it's", "    s: 1"], ["t:", "  - - a", "    - b"],
    ["u:", "  k: >-", "    don't", "  j: 1"], ["v:", "  # inner", "  w: 1", "", "  x: 2"], ["p:", "- 'a", "mode: b'"],
    ["list:", "- [a, b]", "- {c: d}", "-"], ["list:", "- [a,", "mode: b]"], ["list:", "- [a, # ]", "mode: b]"],
    ['"model": a'], ["'mode': primary"], ["mode : primary"], ["? model", ": a"], ['"mo\\x64e": primary'],
    ["# c"], [""], ["# mode: x"], ["#"], ["  # indented"],
    ["a: &x 1"], ["b: &y [1,", "mode: 2]"], ["k: !!str 5"], ["k: !!seq [a,", "mode: b]"], ["alias: *nope"],
    ["mode: primary"], ["description: old"], ["description: >-", "  old", "  text's", ""], ["name: other"],
    ['description: "old', 'mode: primary"'], ["description: |", "  old", "", "  more"],
    ["notes2: a b", " c d"], ["url: http://x/y"], ["time: 12:30"], ["x: a # b"], ["x: a # it's"], ["w: don't"],
    ["x: # [a,", "mode: b"], ["x: >- # ]", "  [a,"], ["x: a", "  >-", "    'b", "mode: c"],
    ["tools: [a] # ] 'x"], ["x: a # 'b"], ["x: 'a' # 'b"], ["m: {a: 1} # }", "mode: 2"], ["x: a #b", "mode: c"],
    ["tools: [a]# b", "mode: c"], ["tools: [a,#b]", "mode: c"], ["tools: [#a]", "mode: c", "]"], ["x: a# 'b"],
]

# Single tokens, for frontmatter no one would write and a parser still accepts.
TOKENS = [
    "model", "mode", "name", "description", "notes", "a", "b", "x y", "2fa", "1", "true", "~",
    ": ", ": ", ": ", ":", " ", "- ", "- ", "-", '"', "'", "''", '\\"', "\\", "[", "]", "{", "}", ",", ", ",
    "#", " # ", " #", "|", ">", ">-", "|+", "&x ", "*x", "!!str ", "? ",
]
INDENTS = ["", "", "", "  ", "  ", "    ", " "]
KEYS = ["model", "mode", "name", "description", "notes", "tools"]


def from_pieces():
    lines = []
    for piece in random.sample(PIECES, random.randint(1, 7)):
        lines += piece
    return "\n".join(lines)


def from_tokens():
    lines = []
    for _ in range(random.randint(1, 6)):
        indent = random.choice(INDENTS)
        # Most lines open the way a key does, or nearly nothing would parse as a mapping.
        start = random.choice(KEYS) + ": " if random.random() < 0.6 else ""
        lines.append(indent + start + "".join(random.choices(TOKENS, k=random.randint(0, 5))))
    return "\n".join(lines)


def mapping(text):
    """The mapping `text` parses to, or None when it is not valid YAML or not a mapping."""
    try:
        parsed = yaml.safe_load(text + "\n")
    except Exception:  # every way PyYAML has of rejecting a text
        return None
    if parsed is None:
        return {}
    return parsed if isinstance(parsed, dict) else None


def check(case):
    """What is wrong with the refresh of `case`, or None."""
    existing = mapping(case["existing"])
    if case["result"] is None or existing is None:
        return None
    release = mapping(case["release"])
    result = mapping(case["result"])
    if result is None:
        return "the result is not a valid YAML mapping"
    expected = {key: value for key, value in existing.items() if key not in release}
    expected.update(release)
    if result != expected:
        return f"the meaning changed: {result!r} is not {expected!r}"
    if not case["stable"]:
        return "a second refresh changes it"
    return None


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
    random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
    cases = [from_pieces() for _ in range(count)] + [from_tokens() for _ in range(count)]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as file:
        json.dump(cases, file)
    try:
        node = subprocess.run(
            ["node", os.path.join(HERE, "refresh-cases.mjs"), file.name], capture_output=True, text=True, check=True
        )
    finally:
        os.unlink(file.name)
    results = json.loads(node.stdout)

    refused = sum(1 for case in results if case["result"] is None)
    read = [case for case in results if case["result"] is not None]
    compared = [case for case in read if mapping(case["existing"]) is not None]
    failures = [(case, why) for case in compared if (why := check(case)) is not None]
    print(f"{len(results)} refreshes: {refused} refused, {len(read)} read, {len(compared)} of those valid YAML")
    print(f"{len(failures)} failures")
    for case, why in failures[:10]:
        print(f"--- {case['harness']}: {why}")
        print(case["existing"])
        print("=>")
        print(case["result"])
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
