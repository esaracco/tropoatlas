import { defineConfig } from 'vitest/config';

const [nodeMajor] = process.versions.node.split('.').map(Number);
// Node.js v25+ enables experimental Web Storage by default.
// Passing --no-webstorage disables it and eliminates ExperimentalWarning.
const execArgv = nodeMajor >= 25 ? ['--no-webstorage'] : [];

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        execArgv,
      },
      forks: {
        execArgv,
      },
    },
    projects: [
      'apps/*',
      'packages/*',
      'plugins/*/*'
    ]
  }
});
