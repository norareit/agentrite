import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const entrypoint = new URL('../container/entrypoint.sh', import.meta.url).pathname;

/**
 * The source of the named functions as `container/entrypoint.sh` defines them, joined in the order given, so that a
 * test runs the code that ships rather than a copy. A fresh bash script is built from them rather than sourcing the
 * whole entrypoint, whose root check and PATH reset would interfere.
 *
 * @param {...string} names
 * @returns {string}
 */
export function entrypointFunctions(...names) {
  const lines = readFileSync(entrypoint, 'utf-8').split('\n');
  return names
    .map((name) => {
      const start = lines.findIndex((line) => line.startsWith(`${name}() {`));
      assert.notEqual(start, -1, name + ' is not defined in entrypoint.sh');
      // die is a one-liner (`die() { ...; exit 1; }`); everything else closes on its own
      // line. A body that ends with `}` on its start line is taken as-is, otherwise the
      // block runs to the first standalone closing brace.
      if (/\}\s*$/.test(lines[start])) return lines[start];
      let end = start;
      while (end < lines.length && lines[end].trim() !== '}') end += 1;
      assert.ok(end < lines.length, name + ' is not closed in entrypoint.sh');
      return lines.slice(start, end + 1).join('\n');
    })
    .join('\n');
}
