import { parseArgs } from 'node:util';
import { declineDecision, proposedDecline, reviewForm, runEntries } from './agentrite-log-forms.mjs';
import { VARIANT_PATTERN } from './agentrite-orchestrate.mjs';
import { commitPrefix, loggedRecord } from './agentrite-record.mjs';
import { optionError } from './agentrite-run.mjs';
import { untickedTaskCount } from './check-changes.mjs';

/** How `complete` is run, on one line. */
export const COMPLETE_FORM = 'usage: agentrite complete <unit>';

/** The command takes no option, so every option given is an unknown one. */
const COMPLETE_OPTIONS = /** @type {const} */ ({});

/**
 * What `complete` is given: the unit, as it was given. Throws the line that says what is wrong, a line feed and the
 * form, for the entry point to print and exit 2 with.
 *
 * @param {string[]} args
 * @returns {{ unit: string }}
 */
export function parseCompleteArgs(args) {
  // Not strict, so that an option the command does not take is named in the kit's words and not in node's.
  const { positionals, tokens } = parseArgs({
    args,
    options: COMPLETE_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const error = tokensError(tokens) ?? (positionals.length === 0 ? 'no unit given' : undefined);
  if (error !== undefined) throw new Error(`${error}\n${COMPLETE_FORM}`);
  return { unit: positionals[0] };
}

/**
 * What is wrong with the first token of the arguments that the command does not take, or `undefined`: an option, a
 * `--`, or a word after the unit.
 *
 * @param {ReturnType<typeof parseArgs>['tokens']} tokens
 * @returns {string | undefined}
 */
function tokensError(tokens) {
  let words = 0;
  for (const token of tokens ?? []) {
    if (token.kind === 'option') return optionError(COMPLETE_OPTIONS, {}, token);
    if (token.kind === 'option-terminator') return 'unexpected argument: --';
    words += 1;
    if (words > 1) return `unexpected argument: ${token.value}`;
  }
  return undefined;
}

/**
 * @param {string} branch the branch checked out
 * @param {string} unitBranch the branch of the unit, as its kind's prefix, a hyphen and the name of its directory
 * @returns {{ variant: string | null } | null} the run the branch is of, `null` for the unit's branch and the name of
 *   the variant for a variant's branch, or `null` when the branch is neither
 */
export function runOfBranch(branch, unitBranch) {
  if (branch === unitBranch) return { variant: null };
  const variant = branch.startsWith(`${unitBranch}--`) ? branch.slice(unitBranch.length + 2) : null;
  if (variant === null || !new RegExp(`^${VARIANT_PATTERN}$`).test(variant)) return null;
  return { variant };
}

/**
 * @param {string} branch
 * @param {string} unitBranch
 * @returns {string}
 */
export function branchRefusal(branch, unitBranch) {
  return (
    `the branch checked out is ${branch}, and the unit is set to implemented on its branch ${unitBranch} ` +
    "or a variant's branch of it"
  );
}

/**
 * @param {string} directory
 * @param {string} status
 * @returns {string | undefined} why a unit with this status is not set to implemented, or `undefined` for one in
 *   progress
 */
export function statusRefusal(directory, status) {
  const unit = `the unit changes/${directory}/`;
  if (status === 'in-progress') return undefined;
  if (status === 'implemented') {
    return (
      `${unit} is implemented already on the branch checked out, and a later correction is an amendment, or a new ` +
      'unit that names it in supersedes'
    );
  }
  if (status === 'cancelled') {
    return (
      `${unit} is cancelled, and a cancelled unit is never set back: taking it up again is a new unit that names ` +
      'it in supersedes'
    );
  }
  if (status === 'draft') {
    return `${unit} is not approved, and a unit is approved on the default branch with npx agentrite approve`;
  }
  if (status === 'approved') {
    return `${unit} is approved and its work has not begun, and the implementer moves it to in-progress as it begins`;
  }
  return `${unit} is ${status}, and a unit is set to implemented from in-progress`;
}

/**
 * @param {string} directory
 * @param {string} kind
 * @param {string | undefined} plan the text of the unit's `plan.md`, or `undefined` when it has none
 * @returns {string | undefined} why the plan stops the unit, or `undefined`
 */
export function planRefusal(directory, kind, plan) {
  const planFile = `changes/${directory}/plan.md`;
  if (plan === undefined) {
    return kind === 'feature' ? `${planFile} does not exist, and a feature is built by its plan` : undefined;
  }
  const open = untickedTaskCount(plan);
  if (open === 0) return undefined;
  return `${planFile} has ${open} task${open === 1 ? '' : 's'} not ticked`;
}

/**
 * @param {string} batchCheckOutput what `git cat-file --batch-check='%(objectname) %(objecttype)'` printed
 * @returns {string[]} the object names of the commits among the objects it described
 */
export function commitsNamed(batchCheckOutput) {
  return batchCheckOutput
    .split('\n')
    .filter((line) => line.endsWith(' commit'))
    .map((line) => line.slice(0, -' commit'.length));
}

/**
 * @param {string} diffOutput what `git diff --no-renames --name-only -z` printed: the paths from the top of the
 *   repository, a renamed file by both of them
 * @param {string} prefix the path from the top of the repository to the project root
 * @param {string} directory the name of the unit's directory in `changes/`
 * @returns {string[]} the paths that are not in the unit's directory
 */
export function filesOutside(diffOutput, prefix, directory) {
  const own = `${prefix}changes/${directory}/`;
  return diffOutput.split('\0').filter((path) => path !== '' && !path.startsWith(own));
}

/**
 * The last review of a run, refused when the run has none or when it is not of the form of a review.
 *
 * @param {import('./agentrite-log-forms.mjs').LogEntry[]} entries every entry of `## Log`
 * @param {string | null} variant the run, `null` for the unit's branch
 * @param {string} runName the run as a message names it
 * @returns {{ commit: string, blocking: string[], index: number }} the commit it names, the labels it lists as
 *   blocking and still open, and the place of its entry among `entries`
 */
export function lastReview(entries, variant, runName) {
  const reviews = runEntries(entries, variant).filter((entry) => entry.role === 'reviewer');
  const last = reviews.at(-1);
  if (last === undefined) {
    throw new Error(`the run of ${runName} has no review, and the reviewer reviews the unit first`);
  }
  const form = reviewForm(last.text);
  if (form === null) {
    throw new Error(
      `the last review of ${runName}, at ${last.timestamp}, is not of the form the command reads, and a review in ` +
        'that form, as a delta review of the commit checked out, lets the command go on',
    );
  }
  return { ...form, index: entries.indexOf(last) };
}

/**
 * What the record still holds back after the last review, in order: a blocking finding still open, a proposed
 * decline the human has not decided, and a decision to fix a finding that no review has seen applied.
 *
 * @param {import('./agentrite-log-forms.mjs').LogEntry[]} entries every entry of `## Log`
 * @param {string | null} variant
 * @param {{ blocking: string[], index: number }} review the last review of the run
 * @returns {string | undefined}
 */
export function decisionsRefusal(entries, variant, review) {
  if (review.blocking.length > 0) {
    return `the last review lists blocking findings still open: ${review.blocking.join(', ')}`;
  }
  const run = runEntries(entries, variant);
  const undecided = run.flatMap((entry, position) => {
    const label = proposedDecline(entry.text);
    const decided = run.slice(position + 1).some((later) => declineDecision(later)?.label === label);
    return label === null || decided ? [] : [label];
  });
  if (undecided.length > 0) {
    const labels = [...new Set(undecided)];
    return `the proposed declines of ${labels.join(', ')} have no decision of the human, and the human decides them`;
  }
  const toFix = entries
    .slice(review.index + 1)
    .filter((entry) => entry.variant === variant)
    .flatMap((entry) => declineDecision(entry) ?? [])
    .filter(({ decision }) => decision === 'to be fixed');
  if (toFix.length > 0) {
    const labels = toFix.map(({ label }) => label);
    return `the human decided ${labels.join(', ')} to be fixed after the last review, and the fix is reviewed first`;
  }
  return undefined;
}

/**
 * @param {string} instant
 * @param {string} commit the commit the last review names, as its entry has it
 * @returns {string} the entry, on one line
 */
export function completionEntry(instant, commit) {
  return (
    `- ${instant} [human] set the unit to implemented, on the review at \`${commit}\`. ` +
    'The status is `implemented`'
  );
}

/**
 * @param {string} record
 * @param {string[]} entryLines
 * @returns {string} the record with its status set to `implemented` and the entry after the last one of `## Log`
 */
export function completedRecord(record, entryLines) {
  return loggedRecord(record, 'implemented', entryLines);
}

/**
 * @param {string} kind
 * @param {string} directory the name of the unit's directory in `changes/`
 * @returns {string}
 */
export function completionMessage(kind, directory) {
  return `${commitPrefix(kind)}-${directory.slice(0, 4)} Set the unit to implemented`;
}

/**
 * @param {string} directory
 * @param {string} branch
 * @param {string} hash
 * @param {string} message
 * @returns {string}
 */
export function completedLine(directory, branch, hash, message) {
  return `changes/${directory}/ is implemented on ${branch}, in ${hash} ${message}`;
}
