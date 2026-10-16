import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSettings, settingsText } from '../scripts/agentrite-settings.mjs';

// What the suite's projects need of an installed kit: the kit's paths in `agentrite.json`, and files at those paths.

const KIT_ROOT = join(import.meta.dirname, '..');

const TEMPLATE = readFileSync(join(KIT_ROOT, 'templates', 'project', 'agentrite.json'), 'utf-8');

const { standards, roles } = parseSettings(TEMPLATE);

// The `standards` and `roles` of the default file, which name the kit's own files.
export const KIT_SETTINGS = { standards, roles };

// The text of an `agentrite.json` with the three settings given and the kit's own files.
export function kitSettingsText({ defaultBranch, harnesses, sandbox }) {
  return settingsText({ defaultBranch, harnesses, sandbox, ...KIT_SETTINGS });
}

// Installs the kit's instruction files into `node_modules/agentrite` of the project at `root`, so that the kit's paths
// name copies of the working tree's `process.md`, `standards.md` and role files. They are copies and not a link to
// this repository, so that a test that writes under `node_modules/agentrite` cannot change the kit itself. A project
// that is a git repository ignores `node_modules` before its first `git add`, so that the copies are not committed.
export function installKit(root) {
  copyKitInstructions(join(root, 'node_modules', 'agentrite'));
}

// Copies the kit's instruction files into `installed`, a directory that stands for an installed kit, for a test
// that copies the kit's `scripts/` into one.
export function copyKitInstructions(installed) {
  mkdirSync(installed, { recursive: true });
  for (const file of ['process.md', 'standards.md']) cpSync(join(KIT_ROOT, file), join(installed, file));
  cpSync(join(KIT_ROOT, 'roles'), join(installed, 'roles'), { recursive: true });
}
