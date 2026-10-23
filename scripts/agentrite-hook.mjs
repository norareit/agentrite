import { isAbsolute, relative } from 'node:path';
import { wrapWords } from './agentrite-roles.mjs';

/**
 * The line by which `refresh` knows a `commit-msg` hook as the kit's. A hook without it is the project's own, which
 * the kit never writes over, since a project may have had one at that path before it took the kit.
 */
export const HOOK_MARK = '# agentrite: commit-msg hook';

const SECTION = 'See "Git hooks" in node_modules/agentrite/README.md';

// The longest line of a notice whose words are wrapped by the kit rather than by hand.
const NOTICE_WIDTH = 120;

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isKitHook(text) {
  return text.split(/\r?\n/).includes(HOOK_MARK);
}

/**
 * The hook's path as `init` and `refresh` print it: relative to the project root under it, and as it is outside it,
 * where a hooks directory that `core.hooksPath` names may be.
 *
 * @param {string} root
 * @param {string} path
 * @returns {string}
 */
export function printedHookPath(root, path) {
  const fromRoot = relative(root, path);
  return fromRoot.startsWith('..') || isAbsolute(fromRoot) ? path : fromRoot;
}

/**
 * @param {string} text
 * @returns {string}
 */
function notice(text) {
  return `${wrapWords(text, NOTICE_WIDTH, '').join('\n')}\n`;
}

/**
 * What `refresh` tells a project whose hook at the path is its own.
 *
 * @param {string} printedPath
 * @returns {string}
 */
export function foreignHookNotice(printedPath) {
  return notice(
    `${printedPath} is not the kit's commit-msg hook, and refresh leaves it as it is. Commit messages are not ` +
      `checked for the trailers the standards forbid unless that hook calls the kit's checker. ${SECTION} for how ` +
      'to call it.',
  );
}

/**
 * What `init` and `refresh` tell a project for which they write no hook, with the reason there is no hooks
 * directory to write it to.
 *
 * @param {string} reason
 * @returns {string}
 */
export function noRepositoryNotice(reason) {
  return notice(
    `No commit-msg hook was written, because ${reason}. Commit messages are not checked for the trailers the ` +
      `standards forbid until npx agentrite refresh writes it in a git repository. ${SECTION}.`,
  );
}
