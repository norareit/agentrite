// The check of a commit message against the trailers the standards forbid. The commit-msg hook that `init` writes in
// a project and the one in the sandbox's image both run this file, so that the rule is written here and nowhere else.
// It lives in container/ because the image build reads only that directory of the installed kit.
//
// Usage: node check-commit-message.mjs <commit message file>
// It prints nothing and exits 0 for a message that may be used, names each offending line and exits 1 for one that
// may not, and exits 2 for wrong arguments.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Git reads a trailer's name whatever its case, so the names are matched the same way.
const FORBIDDEN_TRAILER = /^(?:co-authored-by|claude-session):/i;

const CLOSING_SENTENCE =
  'The standards forbid the trailers Co-Authored-By and Claude-Session, so remove these lines and make the commit ' +
  'again.';

const USAGE = 'usage: node node_modules/agentrite/container/check-commit-message.mjs <commit message file>';

/**
 * A line that starts with `#` is never a trailer: git removes it from a message that is edited.
 *
 * @param {string} text
 * @returns {{ number: number, line: string }[]}
 */
export function offendingLines(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ number: index + 1, line }))
    .filter(({ line }) => !line.startsWith('#') && FORBIDDEN_TRAILER.test(line));
}

/**
 * @param {{ number: number, line: string }[]} lines
 * @returns {string}
 */
export function refusal(lines) {
  return [...lines.map(({ number, line }) => `line ${number}: ${line}`), CLOSING_SENTENCE].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = process.argv.slice(2);
  if (paths.length !== 1) {
    console.error(
      paths.length === 0
        ? 'check-commit-message: no commit message file was given.'
        : `check-commit-message: it takes one commit message file, and was given ${paths.length}.`,
    );
    console.error(USAGE);
    process.exit(2);
  }

  const [path] = paths;
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    console.error(`check-commit-message: cannot read ${path}: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const lines = offendingLines(text);
  if (lines.length > 0) {
    console.error(refusal(lines));
    process.exit(1);
  }
}
