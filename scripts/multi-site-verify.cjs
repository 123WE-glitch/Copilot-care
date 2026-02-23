const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SITES = ['site-alpha', 'site-beta', 'site-gamma'];
const MIN_SAMPLES_PER_SITE = 120;

function verifySite(siteId) {
  const reportPath = path.join(ROOT, 'reports', 'scenarios', 'replicated', `${siteId}.json`);
  
  if (!fs.existsSync(reportPath)) {
    return { siteId, valid: false, error: 'Report file not found' };
  }

  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    const data = JSON.parse(content);

    if (data.sampleCount < MIN_SAMPLES_PER_SITE) {
      return { 
        siteId, 
        valid: false, 
        error: `Sample count ${data.sampleCount} < ${MIN_SAMPLES_PER_SITE}` 
      };
    }

    return { 
      siteId, 
      valid: true, 
      sampleCount: data.sampleCount,
      sourceScenarioCount: data.sourceScenarioCount 
    };
  } catch (err) {
    return { siteId, valid: false, error: err.message };
  }
}

function main() {
  console.log('[multi-site] Verifying replicated scenario sets...\n');

  const results = SITES.map(verifySite);
  const passed = results.filter(r => r.valid);
  const failed = results.filter(r => !r.valid);

  for (const r of results) {
    if (r.valid) {
      console.log(`[PASS] ${r.siteId}: ${r.sampleCount} samples from ${r.sourceScenarioCount} scenarios`);
    } else {
      console.log(`[FAIL] ${r.siteId}: ${r.error}`);
    }
  }

  console.log(`\n[multi-site] Summary: ${passed.length}/${SITES.length} sites passed`);

  if (failed.length > 0) {
    console.log('\n[multi-site] To generate missing reports, run:');
    for (const r of failed) {
      console.log(`  npm run scenarios:replicate -- --set-id ${r.siteId} --repeat 20`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
