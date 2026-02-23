const fs = require('fs');
const { execSync } = require('child_process');

const DIST_DIR = 'dist';

function removeWithNode() {
  fs.rmSync(DIST_DIR, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

function removeWithShell() {
  if (process.platform === 'win32') {
    execSync(`cmd /c if exist ${DIST_DIR} rmdir /s /q ${DIST_DIR}`, {
      stdio: 'ignore',
    });
    return;
  }

  execSync(`rm -rf ${DIST_DIR}`, {
    stdio: 'ignore',
  });
}

removeWithNode();

if (fs.existsSync(DIST_DIR)) {
  removeWithShell();
}

if (fs.existsSync(DIST_DIR)) {
  throw new Error('Failed to clean dist directory.');
}
