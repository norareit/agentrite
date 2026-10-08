#!/usr/bin/env node

// Reached when `npx agentrite-roles` finds no such command in the project: npx then fetches the registry package of
// that name, which is this one. AgentRite had a command of that name once and has not any more.
console.error(
  'AgentRite has no command named agentrite-roles any more.\n' +
    'To write the role wrappers, run `npx agentrite init claude | opencode` in a project that has AgentRite, and\n' +
    '`npx agentrite refresh claude | opencode` to bring them up to date. Add `--no-sandbox` to either for a project\n' +
    'without the sandbox.\n' +
    'AgentRite is the package @ritenoar/agentrite. It is installed from a release URL, not from the npm registry.\n' +
    'The command to install it is in the README at https://bitbucket.org/ritenoar/agentrite',
);
process.exit(1);
