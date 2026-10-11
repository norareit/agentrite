#!/usr/bin/env node

// Reached when `npx agentrite-roles` finds no such command in the project: npx then fetches the registry package of
// that name, which is this one. AgentRite had a command of that name once and has not any more.
console.error(
  'AgentRite has no command named agentrite-roles any more.\n' +
    'To write the role wrappers, run `npx agentrite init claude opencode` in a project that has AgentRite. Name\n' +
    'only the harnesses the project uses, and add `--no-sandbox` to that `npx agentrite init` for a project\n' +
    'without the sandbox. To bring the wrappers up to date, run `npx agentrite refresh`.\n' +
    'AgentRite is the package agentrite. Install it with `npm install --save-dev agentrite`.\n' +
    'Its README is at https://github.com/norareit/agentrite',
);
process.exit(1);
