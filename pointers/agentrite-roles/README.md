# agentrite-roles

This package is a pointer. It holds the name `agentrite-roles` on the npm registry and installs nothing useful.

AgentRite has no command named `agentrite-roles` any more. To write the role wrappers into a project, run
`npx agentrite init claude opencode` in a project that has AgentRite, and `npx agentrite refresh claude opencode` to
bring them up to date. Name only the harnesses the project uses, and add `--no-sandbox` to either for a project
without the sandbox.

AgentRite is the package `agentrite`, which is installed with `npm install agentrite`. Its README is at
https://github.com/norareit/agentrite

`npx agentrite-roles` fetches this package, which prints the above and exits with an error.
