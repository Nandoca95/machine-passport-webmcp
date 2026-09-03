// Prep a DEDICATED Chrome test profile with the WebMCP testing flag enabled.
// Non-destructive: writes only to .chrome-test-profile inside this repo.
// Flag experiment name: "enable-webmcp-testing" (chrome://flags/#enable-webmcp-testing)
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROFILE = join(HERE, '..', '.chrome-test-profile');

async function main() {
  await mkdir(PROFILE, { recursive: true });
  const localStatePath = join(PROFILE, 'Local State');
  let state = {};
  try { state = JSON.parse(await readFile(localStatePath, 'utf8')); } catch { /* first run */ }
  state.browser = state.browser || {};
  // "enable-webmcp-testing@1" => flag Enabled
  const experiments = new Set(state.browser.enabled_labs_experiments || []);
  experiments.add('enable-webmcp-testing@1');
  state.browser.enabled_labs_experiments = [...experiments];
  await writeFile(localStatePath, JSON.stringify(state, null, 2));
  console.log(`[prep-chrome] WebMCP testing flag seeded in ${PROFILE}`);
  console.log('[prep-chrome] experiments =', JSON.stringify(state.browser.enabled_labs_experiments));
}

main().catch((e) => { console.error(e); process.exit(1); });