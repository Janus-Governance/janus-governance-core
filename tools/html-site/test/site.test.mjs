import assert from 'node:assert/strict';
import { chmod, cp, lstat, mkdir, readFile, readdir, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, test } from 'node:test';
import {
  assertContainedPath,
  createGuardedTestRoot,
  listFiles,
  loadAndValidateAuthority,
  readToolConfiguration,
  REPOSITORY_SOURCE_BASE,
  resolveCliPaths,
  resolveContainedRegularFile,
  validateVisibleChromeConfiguration,
  writeContainedOutputFile
} from '../lib/contract.mjs';
import { buildExpectedSite } from '../lib/render.mjs';
import {
  buildIndependentSourceOracle,
  staticVerifierImportsAreIndependent,
  validateIndependentLink,
  verifyGeneratedSite
} from '../lib/verify.mjs';

const repositoryRoot = process.env.JANUS_REPO_ROOT;
const requestedTestRoot = process.env.JANUS_TEST_TMP_ROOT;
const repositoryRoots = (process.env.JANUS_REPOSITORY_ROOTS ?? repositoryRoot ?? '').split(path.delimiter).filter(Boolean);
assert.ok(repositoryRoot, 'JANUS_REPO_ROOT is required');
assert.ok(requestedTestRoot, 'JANUS_TEST_TMP_ROOT is required');

let testRoot;
let configuration;
let manifest;
let oracle;
let fixtureBase;
let baselineOutput;
let syntheticOutput;
let fixtureCounter = 0;

async function copyRelative(fromRoot, toRoot, relative) {
  const destination = path.join(toRoot, ...relative.split('/'));
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await cp(path.join(fromRoot, ...relative.split('/')), destination);
}

async function createFixtureBase() {
  const root = path.join(testRoot, 'fixture-base');
  await mkdir(root, { recursive: false, mode: 0o700 });
  await copyRelative(repositoryRoot, root, 'site/source-manifest.json');
  const sources = manifest.outputs.filter((entry) => entry.source_kind === 'MARKDOWN').map((entry) => entry.content_source);
  const inputs = new Set([...sources, manifest.normative_authority_ref, ...configuration.contract.repository_source_targets]);
  for (const relative of [...inputs].sort()) await copyRelative(repositoryRoot, root, relative);
  return root;
}

async function freshFixture(label) {
  fixtureCounter += 1;
  const root = path.join(testRoot, `fixture-${String(fixtureCounter).padStart(3, '0')}-${label}`);
  await cp(fixtureBase, root, { recursive: true });
  await assertContainedPath(testRoot, root, 'fixture copy');
  return root;
}

async function writeSite(outputRoot, site) {
  await mkdir(outputRoot, { recursive: false, mode: 0o700 });
  for (const [relative, page] of site.pages) await writeContainedOutputFile(outputRoot, relative, page.content);
}

async function buildFixtureOutput(repoRoot, label) {
  const fixtureManifest = await loadAndValidateAuthority(repoRoot, configuration);
  const site = await buildExpectedSite(repoRoot, fixtureManifest, configuration);
  const outputRoot = path.join(testRoot, `rendered-${label}`);
  await writeSite(outputRoot, site);
  return { fixtureManifest, outputRoot };
}

async function copyOutput(source, label) {
  const destination = path.join(testRoot, `mutated-${label}`);
  await cp(source, destination, { recursive: true });
  await assertContainedPath(testRoot, destination, 'mutated output');
  return destination;
}

async function verifyFailure(outputDir, repoRoot = repositoryRoot, sourceManifest = manifest) {
  await assert.rejects(() => verifyGeneratedSite({ repoRoot, outputDir, manifest: sourceManifest, configuration }));
}

async function findOutputContaining(outputRoot, needle) {
  for (const relative of await listFiles(outputRoot)) {
    const value = await readFile(path.join(outputRoot, ...relative.split('/')), 'utf8');
    if (value.includes(needle)) return relative;
  }
  throw new Error(`output marker not found: ${needle}`);
}

async function tamper(label, needle, replacement, source = baselineOutput) {
  const outputDir = await copyOutput(source, label);
  const relative = await findOutputContaining(outputDir, needle);
  const file = path.join(outputDir, ...relative.split('/'));
  const value = await readFile(file, 'utf8');
  const changed = value.replace(needle, replacement);
  assert.notEqual(changed, value, `${label} must mutate output`);
  await writeFile(file, changed, 'utf8');
  await verifyFailure(outputDir);
}

async function mutateManifest(label, mutation) {
  const root = await freshFixture(label);
  const file = path.join(root, 'site/source-manifest.json');
  await chmod(file, 0o600);
  const value = JSON.parse(await readFile(file, 'utf8'));
  mutation(value);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await assert.rejects(() => loadAndValidateAuthority(root, configuration));
}

async function mutateSource(label, relative, mutation, verifier = 'oracle') {
  const root = await freshFixture(label);
  const file = path.join(root, ...relative.split('/'));
  await chmod(file, 0o600);
  const source = await readFile(file, 'utf8');
  await writeFile(file, mutation(source), 'utf8');
  const fixtureManifest = await loadAndValidateAuthority(root, configuration);
  if (verifier === 'oracle') await assert.rejects(() => buildIndependentSourceOracle(root, fixtureManifest, configuration));
  return root;
}

async function moveBoundaryToFence(label, relative, phrase) {
  return mutateSource(label, relative, (source) => {
    assert.ok(source.includes(phrase), `${label} boundary fixture must exist`);
    return `${source.replace(phrase, 'Boundary removed from visible prose.')}\n\n\`\`\`text\n${phrase}\n\`\`\`\n`;
  });
}

before(async () => {
  testRoot = await createGuardedTestRoot(requestedTestRoot, repositoryRoots);
  configuration = await readToolConfiguration();
  manifest = await loadAndValidateAuthority(repositoryRoot, configuration);
  oracle = await buildIndependentSourceOracle(repositoryRoot, manifest, configuration);
  fixtureBase = await createFixtureBase();
  const fixtureManifest = await loadAndValidateAuthority(fixtureBase, configuration);
  await buildIndependentSourceOracle(fixtureBase, fixtureManifest, configuration);
  const baseline = await buildFixtureOutput(repositoryRoot, 'baseline');
  baselineOutput = baseline.outputRoot;

  const syntheticRoot = await freshFixture('synthetic');
  const syntheticPath = path.join(syntheticRoot, 'docs/demo-run.md');
  await chmod(syntheticPath, 0o600);
  await writeFile(syntheticPath, '# Synthetic\n\nParagraph with *emphasis*, **strong**, and `inline`.  \nHard break.\nSoft break.\n\n> Quote\n\n1. First\n2. Second\n\n- Loose first\n\n- Loose second\n\n```js extra\nconst value = 1;\n```\n\n    indented code\n\n| A | B |\n| :-- | --: |\n| one | two |\n', 'utf8');
  const syntheticManifestPath = path.join(syntheticRoot, 'site/source-manifest.json');
  await chmod(syntheticManifestPath, 0o600);
  const syntheticManifest = JSON.parse(await readFile(syntheticManifestPath, 'utf8'));
  syntheticManifest.outputs.find((entry) => entry.content_source === 'docs/demo-run.md').title = 'Synthetic';
  await writeFile(syntheticManifestPath, `${JSON.stringify(syntheticManifest, null, 2)}\n`, 'utf8');
  syntheticOutput = (await buildFixtureOutput(syntheticRoot, 'synthetic')).outputRoot;
  await verifyGeneratedSite({ repoRoot: syntheticRoot, outputDir: syntheticOutput, manifest: syntheticManifest, configuration });
});

test('verifier is statically independent from renderer and generator Markdown modules', async () => {
  const verifierPath = fileURLToPath(new URL('../lib/verify.mjs', import.meta.url));
  const source = await readFile(verifierPath, 'utf8');
  assert.equal(staticVerifierImportsAreIndependent(source), true);
  const imports = source.split('\n').filter((line) => /^import\b/.test(line.trim())).join('\n');
  assert.doesNotMatch(imports, /render\.mjs|markdown\.mjs/);
});

test('manifest and source oracle preserve exact 22/20/2 authority', () => {
  assert.equal(manifest.outputs.length, 22);
  assert.equal(manifest.outputs.filter((entry) => entry.source_kind === 'MARKDOWN').length, 20);
  assert.equal(manifest.outputs.filter((entry) => entry.source_kind === 'ALIAS').length, 2);
  assert.equal(oracle.sources.size, 20);
});

test('complete independently verified generated site passes', async () => {
  const result = await verifyGeneratedSite({ repoRoot: repositoryRoot, outputDir: baselineOutput, manifest, configuration });
  assert.equal(result.records.length, 22);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test('omitted paragraph fails independent semantics', () => tamper('omitted-paragraph', '<p>Publication is <strong>BLOCKED</strong>', '<p>'));
test('duplicated paragraph fails independent semantics', () => tamper('duplicated-paragraph', '</article>', '<p>duplicate</p></article>'));
test('reordered blocks fail independent semantics', () => tamper('reordered-blocks', '<h1', '<p>moved</p><h1'));
test('altered heading fails independent semantics', () => tamper('altered-heading', '>Demos</h1>', '>Changed</h1>'));
test('changed list fails independent semantics', () => tamper('changed-list', '<li>Core Lite v0.1', '<li>changed Core Lite v0.1'));
test('changed blockquote fails independent semantics', () => tamper('changed-blockquote', '<blockquote>', '<blockquote><p>changed</p>'));
test('changed emphasis fails independent semantics', () => tamper('changed-emphasis', '<em>', '<em>changed ', syntheticOutput));
test('changed strong text fails independent semantics', () => tamper('changed-strong', '<strong>', '<strong>changed '));
test('changed inline code fails independent semantics', () => tamper('changed-inline-code', '<code>', '<code>changed '));
test('changed fenced code and info fail independent semantics', () => tamper('changed-fence', 'data-janus-code-info="js extra"', 'data-janus-code-info="js changed"', syntheticOutput));
test('changed indented code fails independent semantics', () => tamper('changed-indented-code', 'indented code', 'changed code', syntheticOutput));
test('changed table fails independent semantics', () => tamper('changed-table', '>one</td>', '>changed</td>', syntheticOutput));
test('changed link fails independent semantics', () => tamper('changed-link', 'data-janus-link-kind="rendered-route"', 'data-janus-link-kind="external"'));
test('wrong heading ID fails independent semantics', () => tamper('wrong-heading-id', 'id="demos"', 'id="wrong-demos"'));
test('extra source prose fails independent semantics', () => tamper('extra-source-prose', '</article>', '<p>extra source prose</p></article>'));
test('tight list changed to loose fails independent semantics', () => tamper('tight-to-loose', '<li>First</li>', '<li><p>First</p></li>', syntheticOutput));
test('loose list changed to tight fails independent semantics', () => tamper('loose-to-tight', '<li>\n<p>Loose first</p>\n</li>', '<li>Loose first</li>', syntheticOutput));
test('missing fenced language class fails', () => tamper('fence-missing-class', ' class="language-js"', '', syntheticOutput));
test('wrong fenced language class fails', () => tamper('fence-wrong-class', 'class="language-js"', 'class="language-ts"', syntheticOutput));
test('extra fenced language class fails', () => tamper('fence-extra-class', 'class="language-js"', 'class="language-js extra"', syntheticOutput));
test('extra fenced code attribute fails', () => tamper('fence-extra-attribute', 'data-janus-code-info="js extra"', 'data-janus-code-info="js extra" title="x"', syntheticOutput));
test('fenced code represented as indented fails', () => tamper('fence-as-indented', '<code data-janus-code-info="js extra" class="language-js">', '<code>', syntheticOutput));
test('indented code represented as fenced fails', () => tamper('indented-as-fence', '<pre><code>indented code', '<pre><code data-janus-code-info="">indented code', syntheticOutput));

test('footer injection fails closed chrome', () => tamper('footer-injection', '</footer>', '<p>Published</p></footer>'));
test('breadcrumb injection fails closed chrome', () => tamper('breadcrumb-injection', '</ol></nav>\n<main', '<li>Injected</li></ol></nav>\n<main'));
test('status injection fails closed chrome', () => tamper('status-injection', '</section>\n<article', '<p>Injected</p></section>\n<article'));
test('authority injection fails closed chrome', () => tamper('authority-injection', '<span class="authority-status">DRAFT</span>', '<span class="authority-status">DRAFT published</span>'));
test('site-name tag substitution fails closed chrome', () => tamper('site-name-tag', '<p class="site-name">Janus Governance Core</p>', '<div class="site-name">Janus Governance Core</div>'));
test('navigation direct text injection fails closed chrome', () => tamper('navigation-text', 'aria-label="Primary"><ul>', 'aria-label="Primary">Injected<ul>'));
test('alias injection fails exact alias DOM', () => tamper('alias-injection', '<article class="alias-fallback">', '<article class="alias-fallback"><p>Injected</p>'));
test('repository-source indicator injection fails', () => tamper('indicator-injection', '</article>', '<span class="repository-source-indicator" aria-label="Repository source"> [repository source]</span></article>'));
test('moved repository-source indicator fails', () => tamper('indicator-moved', '</a><span class="repository-source-indicator"', '</a>intervening text<span class="repository-source-indicator"'));
test('duplicate repository-source indicator fails', () => tamper('indicator-duplicate', '<span class="repository-source-indicator" aria-label="Repository source"> [repository source]</span>', '<span class="repository-source-indicator" aria-label="Repository source"> [repository source]</span><span class="repository-source-indicator" aria-label="Repository source"> [repository source]</span>'));
test('wrong repository-source indicator class fails', () => tamper('indicator-class', 'class="repository-source-indicator"', 'class="repository-source-indicator extra"'));
test('wrong repository-source indicator aria fails', () => tamper('indicator-aria', 'aria-label="Repository source"', 'aria-label="Other"'));
test('wrong repository-source indicator text fails', () => tamper('indicator-text', '> [repository source]</span>', '> changed</span>'));

test('hidden publication block fails exact attributes', () => tamper('hidden-publication', '<p class="publication-block" role="status">', '<p class="publication-block" role="status" hidden>'));
test('hidden status panel fails exact attributes', () => tamper('hidden-status', '<section class="status-panel">', '<section class="status-panel" hidden>'));
test('hidden main fails exact attributes', () => tamper('hidden-main', '<main id="main-content">', '<main id="main-content" hidden>'));
test('hidden source article fails exact attributes', () => tamper('hidden-article', '<article data-janus-source-content=', '<article hidden data-janus-source-content='));
test('hidden source paragraph fails exact attributes', () => tamper('hidden-paragraph', '<p>Official documentation entry point.</p>', '<p hidden>Official documentation entry point.</p>'));
test('aria-hidden fails exact attributes', () => tamper('aria-hidden', '<header class="site-header">', '<header class="site-header" aria-hidden="true">'));
test('inert fails exact attributes', () => tamper('inert', '<body>', '<body inert>'));
test('display none fails exact attributes', () => tamper('display-none', '<header class="site-header">', '<header class="site-header" style="display:none">'));
test('extra heading attribute fails', () => tamper('heading-attribute', 'id="demos"', 'id="demos" title="x"'));
test('extra source link attribute fails', () => tamper('link-attribute', 'data-janus-link-kind="rendered-route"', 'data-janus-link-kind="rendered-route" aria-label="x"'));
test('source link target attribute fails', () => tamper('link-target', 'data-janus-link-kind="rendered-route"', 'data-janus-link-kind="rendered-route" target="_blank"'));
test('source link rel attribute fails', () => tamper('link-rel', 'data-janus-link-kind="rendered-route"', 'data-janus-link-kind="rendered-route" rel="alternate"'));
test('source link download attribute fails', () => tamper('link-download', 'data-janus-link-kind="rendered-route"', 'data-janus-link-kind="rendered-route" download'));

test('CSS content declarations and unreviewed visible chrome fail', () => {
  assert.throws(() => validateVisibleChromeConfiguration({ ...configuration.sourceTexts, style: `${configuration.sourceTexts.style}\nbody::before { content: "Published"; }\n` }));
  assert.throws(() => validateVisibleChromeConfiguration({ ...configuration.sourceTexts, template: configuration.sourceTexts.template.replace('{{SITE_NAME}}', 'Release') }));
});

test('extra head meta fails exact head allowlist', () => tamper('head-extra-meta', '</title>', '</title><meta name="author" content="x">'));
test('base element fails exact head allowlist', () => tamper('head-base', '</title>', '</title><base href="/">'));
test('alternate link fails exact head allowlist', () => tamper('head-alternate', '</title>', '</title><link rel="alternate" href="/other">'));
test('Open Graph metadata fails exact head allowlist', () => tamper('head-og', '</title>', '</title><meta property="og:title" content="x">'));
test('JSON-LD fails exact head allowlist', () => tamper('head-jsonld', '</title>', '</title><script type="application/ld+json">{}</script>'));
test('extra head style fails exact head allowlist', () => tamper('head-style', '</title>', '</title><style></style>'));
test('altered charset fails exact head allowlist', () => tamper('head-charset', 'charset="utf-8"', 'charset="iso-8859-1"'));
test('altered viewport fails exact head allowlist', () => tamper('head-viewport', 'content="width=device-width, initial-scale=1"', 'content="width=100"'));
test('head visible text fails exact head allowlist', () => tamper('head-text', '</title>', '</title>undeclared head text'));
test('extra head attribute fails exact head allowlist', () => tamper('head-attribute', '<title>', '<title title="x">'));

test('H1/title mismatch fails source validation', () => mutateSource('h1-title', 'demos/index.md', (source) => source.replace('# Demos', '# Changed')));
test('Core status changed from Draft fails', () => mutateSource('core-status', 'core/lite/JANUS_CORE_LITE_v0.2.md', (source) => source.replace('Status: Draft', 'Status: Final')));
test('RFC status changed fails', () => mutateSource('rfc-status', 'rfcs/0002-evidence-model.md', (source) => source.replace('Status: Draft', 'Status: Final')));
test('RFC subordination removed fails', () => mutateSource('rfc-subordination', 'rfcs/0003-omission-detection.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', 'Independent RFC.')));
test('glossary subordination removed fails', () => mutateSource('glossary-subordination', 'docs/glossary.md', (source) => source.replace('is the primary normative authority and controls any conflict', 'is merely related')));
test('Informative status conflict fails', () => mutateSource('informative-conflict', 'docs/roadmap.md', (source) => source.replace('**Status:** Informative.', '**Status:** Draft.')));
test('second visible Status fails', () => mutateSource('second-status', 'rfcs/0002-evidence-model.md', (source) => `${source}\nStatus: Final\n`));
test('Draft and Final status fails', () => mutateSource('qualified-status', 'core/lite/JANUS_CORE_LITE_v0.2.md', (source) => source.replace('Status: Draft  ', 'Status: Draft and Final  ')));
test('second conflicting Informative status fails', () => mutateSource('informative-second-status', 'docs/roadmap.md', (source) => `${source}\n> **Status:** Draft.\n`));
test('manifest-only structured Status fails', () => mutateSource('manifest-only-status', 'docs/demo-run.md', (source) => `${source}\n\nStatus: Informative.\n`));
test('conflicting suffix on an otherwise exact Informative status fails', () => mutateSource('status-conflicting-suffix', 'docs/roadmap.md', (source) => source.replace('which remains **Draft**.', 'which remains **Draft**, but is Final.')));
test('Status candidate in a tight-list item fails', () => mutateSource('status-tight-list', 'rfcs/0002-evidence-model.md', (source) => `${source}\n- Status: Final\n`));
test('Status candidate in a loose-list item fails', () => mutateSource('status-loose-list', 'rfcs/0002-evidence-model.md', (source) => `${source}\n- Status: Final\n\n  Loose continuation.\n`));
test('Status candidate in a heading fails', () => mutateSource('status-heading', 'rfcs/0002-evidence-model.md', (source) => `${source}\n## Status: Final\n`));
test('Status candidate on the second line of an ordinary paragraph fails', () => mutateSource('status-second-line', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', 'This nonnormative Draft is subordinate to Core Lite v0.2.  \nStatus: Final')));
test('Core Status rendered as inline code fails its structural profile', () => mutateSource('core-status-inline-code', 'core/lite/JANUS_CORE_LITE_v0.2.md', (source) => source.replace('Status: Draft  ', '`Status: Draft`  ')));
test('RFC Status rendered as inline code fails its structural profile', () => mutateSource('rfc-status-inline-code', 'rfcs/0002-evidence-model.md', (source) => source.replace('Status: Draft  ', '`Status: Draft`  ')));
test('Core Status moved into a blockquote fails its structural profile', () => mutateSource('core-status-blockquote', 'core/lite/JANUS_CORE_LITE_v0.2.md', (source) => source.replace('Status: Draft  ', '> Status: Draft\n')));
test('RFC Status moved into a blockquote fails its structural profile', () => mutateSource('rfc-status-blockquote', 'rfcs/0002-evidence-model.md', (source) => source.replace('Status: Draft  ', '> Status: Draft\n')));
test('Informative Status removed from its blockquote fails', () => mutateSource('informative-status-unquoted', 'docs/roadmap.md', (source) => source.replace('> **Status:**', '**Status:**')));
test('Informative Status without strong formatting fails', () => mutateSource('informative-status-not-strong', 'docs/roadmap.md', (source) => source.replace('**Status:**', 'Status:')));
test('Informative Status with changed link href fails', () => mutateSource('informative-status-link-href', 'docs/roadmap.md', (source) => source.replace('(../core/lite/JANUS_CORE_LITE_v0.2.md)', '(../rfcs/0001-core-lite.md)')));
test('demo index plain Draft changed to strong Draft fails', () => mutateSource('demo-status-strong-draft', 'demos/index.md', (source) => source.replace('which remains Draft.', 'which remains **Draft**.')));
test('runtime index plain Draft changed to strong Draft fails', () => mutateSource('runtime-status-strong-draft', 'runtimes/index.md', (source) => source.replace('which remains Draft.', 'which remains **Draft**.')));
test('roadmap strong Draft changed to plain Draft fails', () => mutateSource('roadmap-status-plain-draft', 'docs/roadmap.md', (source) => source.replace('which remains **Draft**.', 'which remains Draft.')));
test('Core status moved to fenced code fails', () => mutateSource('core-status-fenced', 'core/lite/JANUS_CORE_LITE_v0.2.md', (source) => `${source.replace('Status: Draft  ', 'Core status removed.  ')}\n\n\`\`\`text\nStatus: Draft\n\`\`\`\n`));
test('RFC 0001 authority boundary moved to fenced code fails', () => moveBoundaryToFence('rfc1-boundary-fenced', 'rfcs/0001-core-lite.md', 'This RFC is a nonnormative Draft proposal.'));
test('RFC subordinate boundary moved to fenced code fails', () => moveBoundaryToFence('rfc-boundary-fenced', 'rfcs/0002-evidence-model.md', 'This nonnormative Draft is subordinate to Core Lite v0.2.'));
test('glossary boundary moved to fenced code fails', () => moveBoundaryToFence('glossary-boundary-fenced', 'docs/glossary.md', 'is the primary normative authority and controls any conflict'));
test('theorem boundary moved to fenced code fails', () => moveBoundaryToFence('theorem-boundary-fenced', 'docs/janus-theorem.md', 'It is nonnormative and does not assert a theorem'));
test('omission boundary moved to fenced code fails', () => moveBoundaryToFence('omission-boundary-fenced', 'docs/omission-principle.md', 'informative and subordinate to Core Lite v0.2'));
test('demo legacy boundary moved to fenced code fails', () => moveBoundaryToFence('demo-boundary-fenced', 'demos/index.md', 'LEGACY_NONCONFORMING_PENDING_GATE_3'));
test('runtime legacy boundary moved to fenced code fails', () => moveBoundaryToFence('runtime-boundary-fenced', 'runtimes/index.md', 'LEGACY_NONCONFORMING_PENDING_GATE_3'));
test('RFC 0001 contradiction retaining its old boundary substring fails', () => mutateSource('rfc1-boundary-contradiction', 'rfcs/0001-core-lite.md', (source) => source.replace('This RFC does not replace, extend, or override it.', 'This RFC does not replace, extend, or override it. It is independently normative.')));
test('RFC 0002 contradiction retaining its old boundary substring fails', () => mutateSource('rfc2-boundary-contradiction', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', 'This nonnormative Draft is subordinate to Core Lite v0.2. It overrides Core.')));
test('glossary contradiction retaining its old boundary substring fails', () => mutateSource('glossary-boundary-contradiction', 'docs/glossary.md', (source) => source.replace('controls any conflict.', 'controls any conflict. It may override Core.')));
test('theorem contradiction retaining its old boundary substring fails', () => mutateSource('theorem-boundary-contradiction', 'docs/janus-theorem.md', (source) => source.replace('measurable conformance result.', 'measurable conformance result; nevertheless runtime proof.')));
test('omission contradiction retaining its old boundary substring fails', () => mutateSource('omission-boundary-contradiction', 'docs/omission-principle.md', (source) => source.replace('informative and subordinate to Core Lite v0.2.', 'informative and subordinate to Core Lite v0.2; nevertheless normative.')));
test('demo contradiction retaining its old boundary substring fails', () => mutateSource('demo-boundary-contradiction', 'demos/index.md', (source) => source.replace('claim of conformance.', 'claim of conformance. It proves conformance.')));
test('runtime additional contradiction paragraph retaining its old boundary substring fails', () => mutateSource('runtime-boundary-extra-paragraph', 'runtimes/index.md', (source) => source.replace('\nFramework owns runtime implementation work.', '\nNevertheless, it is a reference implementation.\n\nFramework owns runtime implementation work.')));
test('RFC 0001 exact boundary moved to blockquote fails', () => mutateSource('rfc1-boundary-blockquote', 'rfcs/0001-core-lite.md', (source) => source.replace('This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.', '> This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.')));
test('RFC 0001 exact boundary moved to list fails', () => mutateSource('rfc1-boundary-list', 'rfcs/0001-core-lite.md', (source) => source.replace('This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.', '- This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.')));
test('RFC 0001 exact boundary moved to heading fails', () => mutateSource('rfc1-boundary-heading', 'rfcs/0001-core-lite.md', (source) => source.replace('This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.', '### This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.')));
test('RFC 0002 exact boundary moved to blockquote fails', () => mutateSource('rfc2-boundary-blockquote', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', '> This nonnormative Draft is subordinate to Core Lite v0.2.')));
test('RFC 0002 exact boundary moved to list fails', () => mutateSource('rfc2-boundary-list', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', '- This nonnormative Draft is subordinate to Core Lite v0.2.')));
test('RFC 0002 exact boundary moved to indented code fails', () => mutateSource('rfc2-boundary-code', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', '    This nonnormative Draft is subordinate to Core Lite v0.2.')));
test('RFC 0002 exact boundary substituted by table fails', () => mutateSource('rfc2-boundary-table', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', '| Authority |\n| --- |\n| This nonnormative Draft is subordinate to Core Lite v0.2. |')));
test('RFC 0002 exact boundary substituted by thematic break fails', () => mutateSource('rfc2-boundary-thematic-break', 'rfcs/0002-evidence-model.md', (source) => source.replace('This nonnormative Draft is subordinate to Core Lite v0.2.', '---')));
test('glossary exact boundary moved to blockquote fails', () => mutateSource('glossary-boundary-blockquote', 'docs/glossary.md', (source) => source.replace('This glossary is normative only within its subordinate role. `core/lite/JANUS_CORE_LITE_v0.2.md` is the primary normative authority and controls any conflict.', '> This glossary is normative only within its subordinate role. `core/lite/JANUS_CORE_LITE_v0.2.md` is the primary normative authority and controls any conflict.')));
test('glossary exact boundary moved to list fails', () => mutateSource('glossary-boundary-list', 'docs/glossary.md', (source) => source.replace('This glossary is normative only within its subordinate role. `core/lite/JANUS_CORE_LITE_v0.2.md` is the primary normative authority and controls any conflict.', '- This glossary is normative only within its subordinate role. `core/lite/JANUS_CORE_LITE_v0.2.md` is the primary normative authority and controls any conflict.')));
test('demo governed paragraph moved to blockquote fails', () => mutateSource('demo-boundary-blockquote', 'demos/index.md', (source) => source.replace('Runtime migration and validation are deferred to Gate 3.', '> Runtime migration and validation are deferred to Gate 3.')));
test('runtime governed paragraph moved to list fails', () => mutateSource('runtime-boundary-list', 'runtimes/index.md', (source) => source.replace('Framework owns runtime implementation work.', '- Framework owns runtime implementation work.')));
test('demo governed paragraph moved to heading fails', () => mutateSource('demo-boundary-heading', 'demos/index.md', (source) => source.replace('Runtime migration and validation are deferred to Gate 3.', '### Runtime migration and validation are deferred to Gate 3.')));
test('contradictory extra list item inside governed runtime region fails', () => mutateSource('runtime-boundary-extra-list', 'runtimes/index.md', (source) => source.replace('\nFramework owns runtime implementation work.', '\n- Nevertheless, this is a reference implementation.\n\nFramework owns runtime implementation work.')));
test('RFC 0001 inserted H2 before exact Summary delimiter fails', () => mutateSource('rfc1-inserted-h2-delimiter', 'rfcs/0001-core-lite.md', (source) => source.replace('\n## Summary', '\n## Independent authority\n\n## Summary')));
test('RFC 0002 inserted H2 before exact Evidence classes delimiter fails', () => mutateSource('rfc2-inserted-h2-delimiter', 'rfcs/0002-evidence-model.md', (source) => source.replace('\n## Evidence classes', '\n## This RFC is independently normative\n\n## Evidence classes')));
test('glossary inserted H2 before exact Audit Writer delimiter fails', () => mutateSource('glossary-inserted-h2-delimiter', 'docs/glossary.md', (source) => source.replace('\n## Audit Writer', '\n## Glossary overrides Core\n\n## Audit Writer')));
test('duplicate Summary H2 before the real RFC 0001 delimiter fails', () => mutateSource('rfc1-duplicate-summary-delimiter', 'rfcs/0001-core-lite.md', (source) => source.replace('\n## Summary', '\n## Summary\n\n## Summary')));
test('duplicate Evidence classes H2 before the real RFC 0002 delimiter fails', () => mutateSource('rfc2-duplicate-evidence-delimiter', 'rfcs/0002-evidence-model.md', (source) => source.replace('\n## Evidence classes', '\n## Evidence classes\n\n## Evidence classes')));
test('strong-formatted terminal H2 preserving visible text fails', () => mutateSource('delimiter-strong', 'rfcs/0003-omission-detection.md', (source) => source.replace('## Detection conditions', '## **Detection conditions**')));
test('emphasis-formatted terminal H2 preserving visible text fails', () => mutateSource('delimiter-emphasis', 'rfcs/0004-human-authority-model.md', (source) => source.replace('## Human authority', '## *Human authority*')));
test('inline-code terminal H2 preserving visible text fails', () => mutateSource('delimiter-inline-code', 'rfcs/0005-governance-events.md', (source) => source.replace('## Canonical set', '## `Canonical set`')));
test('linked terminal H2 preserving visible text fails', () => mutateSource('delimiter-link', 'rfcs/0006-governance-evaluation-layer.md', (source) => source.replace('## Evaluation', '## [Evaluation](../docs/index.md)')));

test('manifest exact schema rejects extra keys', () => mutateManifest('manifest-extra-key', (value) => { value.extra = true; }));
test('manifest entry exact schema rejects extra keys', () => mutateManifest('entry-extra-key', (value) => { value.outputs[0].extra = true; }));
test('duplicate route is rejected', () => mutateManifest('duplicate-route', (value) => { value.outputs[1].route = value.outputs[0].route; }));
test('malformed route is rejected', () => mutateManifest('malformed-route', (value) => { value.outputs[0].route = '//demos.html'; }));
test('route/output relation mismatch is rejected', () => mutateManifest('route-relation', (value) => { value.outputs[0].route = '/wrong.html'; }));
test('unresolved alias target is rejected', () => mutateManifest('alias-target', (value) => { value.outputs[0].alias_target = '/missing/'; }));
test('alias target resolving to alias is rejected', () => mutateManifest('alias-chain', (value) => { value.outputs[0].alias_target = '/docs/what-is-janus.html'; }));
test('wrong page family is rejected', () => mutateManifest('wrong-family', (value) => { value.outputs.find((entry) => entry.output === 'index.html').page_family = 'CONTENT_DOC'; }));
test('wrong document status is rejected', () => mutateManifest('wrong-document-status', (value) => { value.outputs.find((entry) => entry.output === 'docs/glossary.html').document_status = 'INFORMATIVE'; }));

test('wrong or missing data-janus-link-kind fails', () => tamper('missing-link-kind', ' data-janus-link-kind="rendered-route"', ''));
test('wrong rendered route fails', () => tamper('wrong-rendered-route', 'href="/docs/demo-run.html"', 'href="/docs/roadmap.html"'));
test('wrong repository base fails', () => tamper('wrong-repository-base', 'https://github.com/Janus-Governance/', 'https://example.test/'));
test('wrong repository commit fails', () => tamper('wrong-repository-commit', 'f01f56a66730624c58f31232e39d5eda999fa922', '0000000000000000000000000000000000000000'));
test('wrong repository target fails', () => tamper('wrong-repository-target', 'core/lite/JANUS_CORE_LITE_v0.2.md', 'core/lite/OTHER.md'));

test('repository-source fragments are rejected independently', async () => {
  await assert.rejects(() => validateIndependentLink('../core/lite/JANUS_CORE_LITE_v0.2.md#section', 'docs/index.md', oracle));
});

test('malformed https and mailto are rejected independently', async () => {
  await assert.rejects(() => validateIndependentLink('https:///missing-host', 'docs/index.md', oracle));
  await assert.rejects(() => validateIndependentLink('https://user:secret@example.test/', 'docs/index.md', oracle));
  await assert.rejects(() => validateIndependentLink('mailto:', 'docs/index.md', oracle));
  await assert.rejects(() => validateIndependentLink('mailto:user@example.test%0AInjected', 'docs/index.md', oracle));
});

test('fixed repository-source base is commit-pinned', () => {
  assert.equal(REPOSITORY_SOURCE_BASE, 'https://github.com/Janus-Governance/janus-governance-core/blob/f01f56a66730624c58f31232e39d5eda999fa922/');
});

test('extra alias prose fails', () => tamper('alias-extra-prose', '</p></article>', '</p><p>extra</p></article>'));
test('wrong alias label fails', () => tamper('alias-label', '>Demos</a>.', '>Changed</a>.'));
test('wrong alias refresh fails', () => tamper('alias-refresh', 'content="0;url=/demos/"', 'content="1;url=/demos/"'));
test('wrong alias canonical fails', () => tamper('alias-canonical', 'rel="canonical" href="/demos/"', 'rel="canonical" href="/docs/"'));

test('manifest symlink escape is rejected', async () => {
  const root = await freshFixture('manifest-symlink');
  const manifestPath = path.join(root, 'site/source-manifest.json');
  await unlink(manifestPath);
  await symlink('/etc/hosts', manifestPath);
  await assert.rejects(() => loadAndValidateAuthority(root, configuration));
});

test('Markdown symlink escape is rejected', async () => {
  const root = await freshFixture('markdown-symlink');
  const sourcePath = path.join(root, 'docs/demo-run.md');
  await unlink(sourcePath);
  await symlink('/etc/hosts', sourcePath);
  await assert.rejects(() => loadAndValidateAuthority(root, configuration));
});

test('normative authority symlink reread is rejected', async () => {
  const root = await freshFixture('core-symlink');
  const sourcePath = path.join(root, 'core/lite/JANUS_CORE_LITE_v0.2.md');
  await unlink(sourcePath);
  await symlink('/etc/hosts', sourcePath);
  await assert.rejects(() => buildIndependentSourceOracle(root, manifest, configuration));
});

test('tool-config symlink escape is rejected', async () => {
  const toolRoot = path.join(testRoot, 'tool-config-symlink');
  await mkdir(toolRoot, { mode: 0o700 });
  for (const relative of ['generation-contract.json', 'navigation.json', 'templates/base.html', 'styles/site.css', 'package.json', 'package-lock.json']) {
    await copyRelative(path.resolve(fileURLToPath(new URL('..', import.meta.url))), toolRoot, relative);
  }
  const contractPath = path.join(toolRoot, 'generation-contract.json');
  await unlink(contractPath);
  await symlink('/etc/hosts', contractPath);
  await assert.rejects(() => readToolConfiguration(toolRoot));
  await assert.rejects(() => resolveContainedRegularFile(toolRoot, 'generation-contract.json', 'tool config'));
});

test('test root was created with guard, containment, and mode 0700', async () => {
  assert.equal(testRoot, await assertContainedPath(path.dirname(testRoot), testRoot, 'test root'));
  assert.equal((await stat(testRoot)).mode & 0o777, 0o700);
  assert.ok(path.basename(testRoot).startsWith('janus-html-test.'));
});

test('test-root guard rejects relative and broad paths', async () => {
  await assert.rejects(() => createGuardedTestRoot('janus-html-test.relative', repositoryRoots));
  for (const candidate of ['/', '/tmp', '/private/tmp']) await assert.rejects(() => createGuardedTestRoot(candidate, repositoryRoots));
});

test('test-root guard rejects repository and existing paths', async () => {
  await assert.rejects(() => createGuardedTestRoot(path.join(repositoryRoot, 'janus-html-test.repo'), repositoryRoots));
  const empty = path.join(testRoot, 'janus-html-test.existing-empty');
  const nonempty = path.join(testRoot, 'janus-html-test.existing-nonempty');
  await mkdir(empty);
  await mkdir(nonempty);
  await writeFile(path.join(nonempty, 'marker'), 'x');
  await assert.rejects(() => createGuardedTestRoot(empty, repositoryRoots));
  await assert.rejects(() => createGuardedTestRoot(nonempty, repositoryRoots));
});

test('test-root guard rejects symlinks into and outside repository', async () => {
  const into = path.join(testRoot, 'janus-html-test.symlink-repo');
  const outside = path.join(testRoot, 'janus-html-test.symlink-outside');
  await symlink(repositoryRoot, into);
  await symlink('/private/tmp', outside);
  await assert.rejects(() => createGuardedTestRoot(into, repositoryRoots));
  await assert.rejects(() => createGuardedTestRoot(outside, repositoryRoots));
});

test('output writer rejects symlink parent escape', async () => {
  const root = path.join(testRoot, 'output-writer-root');
  await mkdir(root, { mode: 0o700 });
  await symlink(repositoryRoot, path.join(root, 'escape'));
  await assert.rejects(() => writeContainedOutputFile(root, 'escape/file.html', 'x'));
});

test('output CLI rejects repository, existing nonempty, and symlink targets', async () => {
  await assert.rejects(() => resolveCliPaths(['--repo-root', fixtureBase, '--output-dir', path.join(fixtureBase, 'generated')]));
  const nonempty = path.join(testRoot, 'nonempty-output');
  await mkdir(nonempty);
  await writeFile(path.join(nonempty, 'marker'), 'x');
  await assert.rejects(() => resolveCliPaths(['--repo-root', fixtureBase, '--output-dir', nonempty]));
  const link = path.join(testRoot, 'output-link');
  await symlink(fixtureBase, link);
  await assert.rejects(() => resolveCliPaths(['--repo-root', fixtureBase, '--output-dir', link]));
});

test('runtime and lock verification accepted only exact installed graph', () => {
  assert.equal(process.versions.node, '24.13.1');
  assert.equal(configuration.packageJson.dependencies['markdown-it'], '14.3.3');
  assert.equal(configuration.packageJson.dependencies.parse5, '7.3.0');
  assert.equal(configuration.packageLock.lockfileVersion, 3);
  assert.equal(Object.keys(configuration.packageLock.packages).length, 10);
});

test('raw HTML remains escaped and scripts/event handlers fail', async () => {
  assert.match((await readFile(path.join(baselineOutput, 'docs/demo-run.html'), 'utf8')), /data-janus-source-content/);
  await tamper('script', '</main>', '<script>alert(1)</script></main>');
  await tamper('event-handler', '<main id="main-content">', '<main id="main-content" onclick="alert(1)">');
});

test('undeclared output and nondeterministic injection fail', async () => {
  const extra = await copyOutput(baselineOutput, 'extra-output');
  await writeFile(path.join(extra, 'extra.html'), '<!doctype html>\n');
  await verifyFailure(extra);
  await tamper('timestamp', '</footer>', '<p>2099-01-01T00:00:00Z</p></footer>');
});

test('all fixtures and mutations remain inside recorded test root', async () => {
  const children = await readdir(testRoot);
  assert.ok(children.length > 0);
  for (const child of children) {
    const artifact = path.resolve(testRoot, child);
    assert.equal(path.dirname(artifact), testRoot);
    await lstat(artifact);
  }
});
