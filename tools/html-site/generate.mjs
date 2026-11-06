#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { loadAndValidateAuthority, readToolConfiguration, resolveCliPaths, writeContainedOutputFile } from './lib/contract.mjs';
import { buildExpectedSite } from './lib/render.mjs';

async function main() {
  const paths = await resolveCliPaths(process.argv.slice(2), { allowExistingNonempty: false });
  const configuration = await readToolConfiguration();
  const manifest = await loadAndValidateAuthority(paths.repoRoot, configuration);
  const expectedSite = await buildExpectedSite(paths.repoRoot, manifest, configuration);
  if (!paths.outputExists) await mkdir(paths.outputDir, { recursive: false, mode: 0o700 });
  for (const [output, page] of expectedSite.pages) {
    await writeContainedOutputFile(paths.outputDir, output, page.content);
  }
  process.stdout.write(`${JSON.stringify({ generated_outputs: expectedSite.pages.size, publication_state: manifest.publication_state })}\n`);
}

main().catch((error) => {
  process.stderr.write(`generator error: ${error.message}\n`);
  process.exitCode = 1;
});
