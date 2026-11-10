/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

/**
 * The words of a fault for the first key of `object`, in the order of the object, that its place does not take, or
 * `undefined` when it takes them all. The place is named, with the sentence that says which keys it holds.
 *
 * @param {Record<string, unknown>} object
 * @param {string} path
 * @param {{ name: string, keys: string[], holds: string }} place
 * @returns {string | undefined}
 */
export function jsonKeyFault(object, path, place) {
  const extra = Object.keys(object).find((key) => !place.keys.includes(key));
  return extra === undefined ? undefined : `${jsonPath(path, extra)} is no key of ${place.name}. ${place.holds}`;
}

/**
 * The value of `text` read as JSON with comments and trailing commas, as OpenCode reads its configuration: `//` and
 * `/* *\/` comments are taken out, and a comma that only white space and comments separate from a closing `}` or `]`,
 * with the text of strings left as it is. Throws the error of `JSON.parse` for what is still not JSON.
 *
 * @param {string} text
 * @returns {unknown}
 */
export function parseJsonc(text) {
  let kept = '';
  // The index in `kept` of a comma that only white space has followed since, or -1.
  let comma = -1;
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') {
      const end = stringEnd(text, index);
      kept += text.slice(index, end);
      comma = -1;
      index = end;
    } else if (text.startsWith('//', index)) {
      const end = text.indexOf('\n', index);
      index = end === -1 ? text.length : end;
    } else if (text.startsWith('/*', index)) {
      const end = text.indexOf('*/', index + 2);
      // An unclosed comment is left in, for JSON.parse to refuse.
      if (end === -1) {
        kept += text.slice(index);
        index = text.length;
      } else {
        kept += ' ';
        index = end + 2;
      }
    } else {
      if ((character === '}' || character === ']') && comma !== -1) {
        kept = `${kept.slice(0, comma)} ${kept.slice(comma + 1)}`;
      }
      if (character === ',') comma = kept.length;
      else if (!/\s/.test(character)) comma = -1;
      kept += character;
      index += 1;
    }
  }
  return JSON.parse(kept);
}

/**
 * The index just past the end of the string that opens at `start` of `text`, or the length of `text` for a string
 * that is never closed.
 *
 * @param {string} text
 * @param {number} start
 * @returns {number}
 */
function stringEnd(text, start) {
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === '\\') index += 2;
    else if (text[index] === '"') return index + 1;
    else index += 1;
  }
  return text.length;
}
