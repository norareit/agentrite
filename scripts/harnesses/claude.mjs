import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { cleanupPeriodOf } from '../agentrite-cleanup-period.mjs';
import { callFollowed, isRecord, jsonRecord, jsonRecords, stringOrNone, textFollowed } from '../agentrite-headless.mjs';
import { INSTRUCTIONS_SECTION, instructionPaths, isOwnStandards, STANDARDS_PATH } from '../agentrite-instructions.mjs';
import { descriptionBlock, isKitWrapper, refreshedWrapper, wrapperBody } from '../agentrite-roles.mjs';

/**
 * @typedef {import('../agentrite-headless.mjs').Call} Call
 * @typedef {import('../agentrite-headless.mjs').Followed} Followed
 * @typedef {import('../agentrite-instructions.mjs').ProjectFile} ProjectFile
 * @typedef {import('../agentrite-roles.mjs').Role} Role
 * @typedef {import('../agentrite-harness.mjs').Given} Given
 */

/** The file Claude Code reads the kit's instructions from, at the project root. */
const CLAUDE_FILE = 'CLAUDE.md';

/**
 * @param {Role} role
 * @returns {string}
 */
function claudeFile(role) {
  return `---\nname: ${role.name}\n${descriptionBlock(role.description)}---\n\n${wrapperBody(role.path)}`;
}

const CLAUDE_TOOLS = { shell: 'Bash', paths: ['file_path', 'notebook_path'] };

/**
 * The calls Claude Code refused for lack of permission: those of `permission_denials` of every `result` event, since
 * a step can end several turns and each turn ends with a `result` event of its own. A refusal carries no instant.
 *
 * @param {string} stdout
 * @returns {Call[]}
 */
function refusedClaude(stdout) {
  return jsonRecords(stdout)
    .filter((event) => event.type === 'result' && Array.isArray(event.permission_denials))
    .flatMap((event) => /** @type {unknown[]} */ (event.permission_denials))
    .filter(isRecord)
    .flatMap((denial) => {
      if (typeof denial.tool_name !== 'string') return [];
      const input = isRecord(denial.tool_input) ? denial.tool_input : {};
      return [callFollowed(undefined, denial.tool_name, input, CLAUDE_TOOLS)];
    });
}

/**
 * What Claude Code makes known in one line of `stream-json`: the text blocks and tool calls of an event of the step's
 * agent's message, in their order. An event of a subagent's carries the id of the call that started it.
 *
 * @param {string} line
 * @returns {Followed[]}
 */
function followClaude(line) {
  const event = jsonRecord(line);
  if (event?.type !== 'assistant' || typeof event.parent_tool_use_id === 'string') return [];
  if (!isRecord(event.message)) return [];
  const { content } = event.message;
  if (!Array.isArray(content)) return [];
  const timestamp = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
  const time = Number.isNaN(timestamp) ? undefined : timestamp;
  return content.filter(isRecord).flatMap((block) => {
    if (block.type === 'text') return textFollowed(time, block.text);
    if (block.type !== 'tool_use' || typeof block.name !== 'string') return [];
    return [callFollowed(time, block.name, isRecord(block.input) ? block.input : {}, CLAUDE_TOOLS)];
  });
}

/**
 * The lines `CLAUDE.md` must hold for Claude Code to load the kit's instructions, in the order init writes them.
 *
 * @param {string} standards
 * @returns {string[]}
 */
export function claudeLines(standards) {
  return [...instructionPaths(standards).map((path) => `@${path}`), '@AGENTS.md'];
}

/**
 * The lines of a `CLAUDE.md`, each without its LF or CRLF.
 *
 * @param {string} text
 * @returns {string[]}
 */
function linesOf(text) {
  return text.split('\n').map((line) => line.replace(/\r$/, ''));
}

/**
 * The lines of `claudeLines(standards)` that a `CLAUDE.md` lacks, in their order. A line counts when it is exactly
 * the text, ending in LF or CRLF. A file that is missing or cannot be read lacks them all, as Claude Code reads
 * nothing from it.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
export function claudeLacks(read, standards) {
  const wanted = claudeLines(standards);
  if (!('text' in read)) return wanted;
  const lines = linesOf(read.text);
  return wanted.filter((line) => !lines.includes(line));
}

/**
 * What `init` tells a project whose `CLAUDE.md` exists and lacks `lines`.
 *
 * @param {string[]} lines
 * @returns {string}
 */
export function claudeInitNotice(lines) {
  return (
    "CLAUDE.md exists and was left as it is. It lacks the lines below, and Claude Code does not read the kit's\n" +
    'instructions without them. Add each on a line of its own, outside a code span or a fenced block:\n\n' +
    `${lines.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * What `refresh` tells a project whose `CLAUDE.md` is missing, or lacks `lines`.
 *
 * @param {boolean} missing
 * @param {string[]} lines
 * @returns {string}
 */
export function claudeRefreshNotice(missing, lines) {
  const problem = missing ? 'it is missing' : 'it lacks the lines below';
  return (
    `CLAUDE.md does not load the kit's instructions, because ${problem}. Claude Code does not read\n` +
    'them without these lines, each on a line of its own and outside a code span or a fenced block, ' +
    'and refresh does\n' +
    'not add them:\n\n' +
    `${lines.join('\n')}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * True when the project's standards are another file than the kit's and a `CLAUDE.md` still imports the kit's, on
 * a line that is exactly the import, as `claudeLacks` judges a line. False for a file that is missing or cannot be
 * read.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {boolean}
 */
export function claudeLoadsKitStandards(read, standards) {
  if (!isOwnStandards(standards) || !('text' in read)) return false;
  return linesOf(read.text).includes(`@${STANDARDS_PATH}`);
}

/**
 * What `init` and `refresh` tell a project whose `CLAUDE.md` imports the kit's standards beside its own.
 *
 * @param {string} standards
 * @returns {string}
 */
export function claudeKitStandardsNotice(standards) {
  return (
    `CLAUDE.md imports the kit's standards.md, and the project's standards are ${standards}. Claude Code then loads\n` +
    'both sets of rules. Remove this line, which init and refresh do not remove:\n\n' +
    `@${STANDARDS_PATH}\n\n${INSTRUCTIONS_SECTION}\n`
  );
}

/**
 * The notice of a `CLAUDE.md` that imports the kit's standards beside the project's own, or none.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
function kitStandardsNotices(read, standards) {
  return claudeLoadsKitStandards(read, standards) ? [claudeKitStandardsNotice(standards)] : [];
}

/**
 * Claude Code, as the kit knows it.
 *
 * @type {import('../agentrite-harness.mjs').Harness}
 */
/** The host's status line script, relative to the host's home, and where Claude Code in the sandbox runs it. */
const STATUS_LINE_SCRIPT = '.claude/statusline-command.sh';

/**
 * What Claude Code in the sandbox is given of the host: the developer's own status line, and how long the host keeps
 * its sessions. The status line is the host's script and the kit's managed settings, whose one setting runs it, both
 * or neither, and only for a script that is a file that can be read: a managed status line with no script to run
 * would blank one set inside the sandbox. The number of days is the `cleanupPeriodDays` of the host's
 * `~/.claude/settings.json`, and nothing else of that file crosses, since it can hold secrets. It is a drop-in of the
 * managed settings, which stand above the home volume's, so the agent cannot change it.
 *
 * @param {string} home
 * @param {(path: string) => ProjectFile} read
 * @returns {Given}
 */
function claudeHost(home, read) {
  const script = read(STATUS_LINE_SCRIPT);
  const statusLine =
    'text' in script
      ? [
          /** @type {const} */ ({
            from: 'host',
            path: `${home}/${STATUS_LINE_SCRIPT}`,
            target: '/etc/claude-code/statusline-command.sh',
          }),
          /** @type {const} */ ({
            from: 'kit',
            path: 'managed-settings.json',
            target: '/etc/claude-code/managed-settings.json',
          }),
        ]
      : [];
  const days = cleanupPeriodOf(read('.claude/settings.json'), join(home, '.claude', 'settings.json'));
  const cleanupPeriod =
    days === undefined
      ? []
      : [
          {
            name: `claude-cleanup-period-${days}.json`,
            content: `{"cleanupPeriodDays": ${days}}`,
            target: '/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json',
          },
        ];
  return { environment: [], mounts: statusLine, files: cleanupPeriod, notes: [] };
}

export const claude = {
  name: 'claude',
  title: 'Claude Code',
  wrappers: {
    directory: '.claude/agents',
    render: claudeFile,
    // The names of the agents Claude Code has of its own, as its documentation writes them on 2026-10-19:
    // https://code.claude.com/docs/en/sub-agents
    ownAgents: ['Explore', 'Plan', 'general-purpose', 'claude', 'statusline-setup', 'claude-code-guide', 'fork'],
    extension: '.md',
    isKit: isKitWrapper,
    refreshed: refreshedWrapper,
  },
  start: {
    command: 'claude',
    skipPermissions: '--dangerously-skip-permissions',
    interactive: (options, prompt) => [...options, '--', prompt],
    headless: (options, prompt) => ['--print', ...options, '--', prompt],
    role: (role) => ({ options: ['--agent', role], opening: undefined }),
  },
  headless: {
    arguments(session) {
      // Claude Code takes `stream-json` in `--print` only beside `--verbose`.
      const stream = ['--output-format', 'stream-json', '--verbose'];
      if (session !== undefined) return { args: [...stream, '--resume', session], session };
      const id = randomUUID();
      return { args: [...stream, '--session-id', id], session: id };
    },
    // One JSON event per line, the last of them of type `result`, whose `result` is the final response.
    read(stdout) {
      const printed = stdout
        .split('\n')
        .map(jsonRecord)
        .findLast((event) => event?.type === 'result');
      return { response: stringOrNone(printed?.result), session: stringOrNone(printed?.session_id) };
    },
    follow: followClaude,
    refused: refusedClaude,
  },
  instructions: {
    file: CLAUDE_FILE,
    // `init` writes `CLAUDE.md` from its template where it is missing before it judges it, and a file it wrote holds
    // every line and gives no notice. A file that is missing, which `init` does not leave, gives none either.
    init(read, standards) {
      if (!read.found) return { content: undefined, line: undefined, notices: [] };
      const lacks = claudeLacks(read, standards);
      return {
        content: undefined,
        line: undefined,
        notices: [...(lacks.length > 0 ? [claudeInitNotice(lacks)] : []), ...kitStandardsNotices(read, standards)],
      };
    },
    refresh(read, standards) {
      const lacks = claudeLacks(read, standards);
      return [
        ...(lacks.length > 0 ? [claudeRefreshNotice(!read.found, lacks)] : []),
        ...kitStandardsNotices(read, standards),
      ];
    },
  },
  sandbox: {
    package: '@anthropic-ai/claude-code',
    versionArgument: 'CLAUDE_CODE_VERSION',
    // `2.1.288 (Claude Code)`: the version is the first word of the first line.
    readVersion(printed) {
      const word = printed.split('\n')[0].trim().split(/\s+/)[0];
      return word === '' ? undefined : word;
    },
    // DISABLE_AUTOUPDATER stops Claude Code's background check; DISABLE_UPDATES also blocks `claude update`.
    updates: { environment: ['DISABLE_AUTOUPDATER=1', 'DISABLE_UPDATES=1'], mounts: [] },
    // Its sessions. Its login and its settings stay in the home volume, in the .claude above them.
    logDirectories: ['.claude/projects'],
    hosts: [
      { host: 'api.anthropic.com', reason: 'the Anthropic API that Claude Code uses' },
      { host: 'platform.claude.com', reason: 'Claude Code contacts it at start-up when it holds no saved login' },
    ],
    // Its hooks of Notification and Stop, in the drop-in directory of its managed settings, which holds them beside
    // the status line's managed-settings.json or without it.
    bell: {
      environment: [],
      mounts: [
        {
          from: 'kit',
          path: 'bell-settings.json',
          target: '/etc/claude-code/managed-settings.d/agentrite-bell.json',
        },
      ],
    },
    host: claudeHost,
  },
};
