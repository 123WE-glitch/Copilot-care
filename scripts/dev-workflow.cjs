const { spawnSync } = require('child_process');

const STEPS = {
  architecture: [
    'npm run todos:doctor',
    'npm run gate:safety',
    'npm run gate:workflow',
    'npm run test --workspace=@copilot-care/shared',
    'npm run build --workspace=@copilot-care/backend',
    'npm run test --workspace=@copilot-care/backend',
    'npm run test --workspace=@copilot-care/frontend',
  ],
  iterate: [
    'npm run test',
  ],
  full: [
    'npm run todos:doctor',
    'npm run gate:all',
    'npm run build --workspace=@copilot-care/backend',
    'npm run build --workspace=@copilot-care/frontend',
    'npm run test',
  ],
};

function run(command) {
  console.log(`[dev-workflow] ${command}`);
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command}`);
  }
}

function main() {
  const phase = process.argv[2] || 'architecture';
  const commands = STEPS[phase];

  if (!commands) {
    console.error(`Unknown phase: ${phase}`);
    console.error('Available phases: architecture, iterate, full');
    process.exit(2);
  }

  for (const command of commands) {
    run(command);
  }

  console.log(`[dev-workflow] phase "${phase}" completed`);
}

main();
