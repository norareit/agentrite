import { VARIANT_PATTERN } from './agentrite-orchestrate.mjs';

/**
 * One entry of `## Log`: its instant, who made it as the text of its brackets, the role it acted in, the variant it
 * names, the line it opens at as the record has it, and what follows all of them, its lines joined.
 *
 * @typedef {{
 *   timestamp: string,
 *   author: string,
 *   role: string | null,
 *   variant: string | null,
 *   firstLine: string,
 *   text: string,
 * }} LogEntry
 */

const ENTRY = /^- (\S+) \[([^\]]*)\] ?(.*)$/;
const ROLE = /^as the ([a-z0-9]+(?:-[a-z0-9]+)*)(?:, | )/;
const VARIANT_PHRASE = new RegExp(`^on the variant \`(${VARIANT_PATTERN})\`, `);
const REVIEW_OPENING = /^reviewed the unit at `([0-9a-f]{7,40})` /;
const BLOCKING_SENTENCE = /\. Blocking findings: (none|`[^\s`]+`(?:, `[^\s`]+`)*)\.(?: |$)/;
const PROPOSED_DECLINE = /^proposed to decline `([^\s`]+)`:(?: |$)/;
const DECLINE_DECISION = /^decided the proposed decline of `([^\s`]+)`: (declined|to be fixed)(?=$| |\.)/;

/**
 * The entries of `## Log` of a record, in their order. An entry opens at a line that starts with `- ` and takes each
 * line after it that starts with white space and is not blank, the indent read as one space. A blank line ends it, and
 * so does a line that is neither.
 *
 * @param {string} record
 * @returns {LogEntry[]}
 */
export function logEntries(record) {
  const lines = record.split(/\r?\n/);
  const heading = lines.findIndex((line) => /^## Log\s*$/.test(line));
  if (heading === -1) return [];
  const next = lines.findIndex((line, index) => index > heading && line.startsWith('## '));
  const section = lines.slice(heading + 1, next === -1 ? lines.length : next);

  /** @type {{ firstLine: string, text: string }[]} */
  const joined = [];
  let open = false;
  for (const line of section) {
    if (line.startsWith('- ')) {
      joined.push({ firstLine: line, text: line });
      open = true;
    } else if (open && /^\s/.test(line) && line.trim() !== '') {
      joined[joined.length - 1].text += ` ${line.trimStart()}`;
    } else {
      open = false;
    }
  }
  return joined.flatMap(({ firstLine, text }) => entryOf(firstLine, text) ?? []);
}

/**
 * @param {string} firstLine the line the entry opens at
 * @param {string} text an entry, its lines joined
 * @returns {LogEntry | null} `null` when it does not open with an instant and who made it
 */
function entryOf(firstLine, text) {
  const matched = ENTRY.exec(text);
  if (matched === null) return null;
  const [, timestamp, author, afterAuthor] = matched;
  const role = ROLE.exec(afterAuthor);
  const afterRole = role === null ? afterAuthor : afterAuthor.slice(role[0].length);
  // A role followed by a space and not by a comma names no variant, since the phrase stands after the comma.
  const variant = role !== null && !role[0].endsWith(', ') ? null : VARIANT_PHRASE.exec(afterRole);
  return {
    timestamp,
    author,
    role: role === null ? null : role[1],
    variant: variant === null ? null : variant[1],
    firstLine,
    text: variant === null ? afterRole : afterRole.slice(variant[0].length),
  };
}

/**
 * @param {LogEntry[]} entries
 * @param {string | null} variant the name of a variant, or `null` for the unit's branch
 * @returns {LogEntry[]} the entries of that run
 */
export function runEntries(entries, variant) {
  return entries.filter((entry) => entry.variant === variant);
}

/**
 * @param {string} text the text of an entry of the reviewer
 * @returns {{ commit: string, blocking: string[] } | null} the commit reviewed and the labels of the blocking findings
 *   still open, or `null` when the text is not of the form of a review
 */
export function reviewForm(text) {
  const opening = REVIEW_OPENING.exec(text);
  if (opening === null || text.split('Blocking findings:').length !== 2) return null;
  const sentence = BLOCKING_SENTENCE.exec(text);
  if (sentence === null) return null;
  const blocking = sentence[1] === 'none' ? [] : sentence[1].split(', ').map((label) => label.slice(1, -1));
  return { commit: opening[1], blocking };
}

/**
 * @param {string} text the text of an entry
 * @returns {string | null} the label of the finding it proposes to decline, or `null`
 */
export function proposedDecline(text) {
  return PROPOSED_DECLINE.exec(text)?.[1] ?? null;
}

/**
 * @param {LogEntry} entry
 * @returns {{ label: string, decision: 'declined' | 'to be fixed' } | null} what the human decided of a proposed
 *   decline, or `null` for any other entry
 */
export function declineDecision(entry) {
  if (entry.author !== 'human') return null;
  const matched = DECLINE_DECISION.exec(entry.text);
  if (matched === null) return null;
  return { label: matched[1], decision: /** @type {'declined' | 'to be fixed'} */ (matched[2]) };
}
