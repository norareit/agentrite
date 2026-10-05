import { wrapWords } from './agentrite-roles.mjs';

// The longest line the commands print, which is the width the kit wraps its own text at.
const LINE_WIDTH = 120;

/**
 * What `agentrite roles` prints: each role's name on a line of its own, its description under it, indented and
 * wrapped, and an empty line between two roles.
 *
 * @param {{ name: string, description: string }[]} roles
 * @returns {string}
 */
export function rolesListing(roles) {
  const blocks = roles.map((role) => [role.name, ...wrapWords(role.description, LINE_WIDTH, '  ')].join('\n'));
  return `${blocks.join('\n\n')}\n`;
}
