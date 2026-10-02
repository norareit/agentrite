#!/usr/bin/env node
import { readFileSync } from 'node:fs';

// Reached only when the kit is not installed in the project: npx then fetches the registry package of the command's
// name, which is this one. The name comes from the manifest so that every pointer runs the same script.
const { name } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

console.error(
  `${name} is not installed in this project.\n` +
    'AgentRite is the package @ritenoar/agentrite. It is installed from a release URL, not from the npm registry.\n' +
    'The command to install it is in the README at https://bitbucket.org/ritenoar/agentrite',
);
process.exit(1);
