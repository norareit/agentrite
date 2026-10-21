/**
 * The text of `value` as JSON laid out as `original` is: with the indentation of its first indented line that opens
 * a key, two spaces when it has none, and ending in a line break when it does.
 *
 * @param {string} original
 * @param {unknown} value
 * @returns {string}
 */
export function formattedLike(original, value) {
  const indent = original.match(/^[ \t]+(?=")/m)?.[0] ?? '  ';
  return JSON.stringify(value, null, indent) + (original.endsWith('\n') ? '\n' : '');
}

/**
 * The path of `key` below the place at `parent`, as a fault names where in a JSON value it is: `steps`, `steps[1]`,
 * `steps[1].repeat`. The root is the parent `''`.
 *
 * @param {string} parent
 * @param {string | number} key
 * @returns {string}
 */
export function jsonPath(parent, key) {
  if (typeof key === 'number') return `${parent}[${key}]`;
  return parent === '' ? key : `${parent}.${key}`;
}

/**
 * The words of a fault at `path` of a JSON value: what the place holds, or that it is missing, and what it must hold.
 *
 * @param {string} path
 * @param {unknown} value
 * @param {string} must
 * @returns {string}
 */
export function jsonFault(path, value, must) {
  const found = value === undefined ? 'missing' : JSON.stringify(value);
  return `${path} is ${found}. It must hold ${must}`;
}
