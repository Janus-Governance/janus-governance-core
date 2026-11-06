#!/usr/bin/env node
import { loadAndValidateAuthority, readToolConfiguration, resolveCliPaths } from './lib/contract.mjs';
import { verifyGeneratedSite } from './lib/verify.mjs';

async function main() {
  const paths = await resolveCliPaths(process.argv.slice(2), { allowExistingNonempty: true });
  const configuration = await readToolConfiguration();
  const manifest = await loadAndValidateAuthority(paths.repoRoot, configuration);
  const outputManifest = await verifyGeneratedSite({ ...paths, manifest, configuration });
  process.stdout.write(`${JSON.stringify({ checked_outputs: outputManifest.records.length, output_manifest_sha256: outputManifest.sha256, technical_result: 'PASS_NOT_CONFORMANCE' })}\n`);
}

main().catch((error) => {
  process.stderr.write(`checker error: ${error.message}\n`);
  process.exitCode = 1;
});
