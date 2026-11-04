// GIT_CONFIG_COUNT with its numbered GIT_CONFIG_KEY_<n> and GIT_CONFIG_VALUE_<n> are git's environment
// configuration, which stands above every configuration file. The sandbox sets them in `container/compose.yml`,
// where they point git at the image's hooks, so a process started with them looks for the hooks there and not in
// the repository a test set up.
const GIT_ENVIRONMENT_CONFIGURATION = /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/;

export function withoutGitEnvironmentConfiguration(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => !GIT_ENVIRONMENT_CONFIGURATION.test(name)),
  );
}
