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
