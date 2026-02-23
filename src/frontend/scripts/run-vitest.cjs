const { realpathSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const packageRoot = realpathSync(resolve(__dirname, '..'));
const vitestPackagePath = require.resolve('vitest/package.json', {
  paths: [packageRoot],
});
const vitestPackage = require(vitestPackagePath);
const vitestBinRelPath = typeof vitestPackage.bin === 'object'
  ? vitestPackage.bin.vitest
  : undefined;

if (typeof vitestBinRelPath !== 'string') {
  throw new Error('Unable to resolve vitest executable path from package metadata.');
}

const vitestEntrypoint = resolve(dirname(vitestPackagePath), vitestBinRelPath);

const args = process.argv.slice(2);
const hasRootArg = args.some((arg) => {
  return arg === '--root' || arg.startsWith('--root=');
});

const finalArgs = hasRootArg
  ? args
  : [...args, '--root', packageRoot];

const result = spawnSync(process.execPath, [vitestEntrypoint, ...finalArgs], {
  cwd: packageRoot,
  env: process.env,
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
