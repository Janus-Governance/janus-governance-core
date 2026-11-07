import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = 'site/source-manifest.json';
export const REQUIRED_NAVIGATION_OWNERS = Object.freeze([
  'ROOT_NAVIGATION',
  'DEMOS_NAVIGATION',
  'DOCS_NAVIGATION',
  'RFCS_NAVIGATION',
  'RUNTIMES_NAVIGATION'
]);
export const EXACT_ALIASES = Object.freeze(new Map([
  ['demos.html', '/demos/'],
  ['docs/what-is-janus.html', '/docs/janus-explained.html']
]));
export const REPOSITORY_SOURCE_BASE = 'https://github.com/Janus-Governance/janus-governance-core/blob/f01f56a66730624c58f31232e39d5eda999fa922/';
export const CHROME_TEXT_KEYS = Object.freeze([
  'site_name',
  'skip_link',
  'blocked_banner',
  'primary_navigation_label',
  'breadcrumb_label',
  'breadcrumb_home',
  'document_status_prefix',
  'authority_prefix',
  'authority_name',
  'contract_label',
  'generator_label',
  'source_hash_label',
  'repository_source_indicator_visible',
  'repository_source_indicator_aria',
  'alias_continue_prefix',
  'alias_continue_suffix'
]);

const TOP_LEVEL_MANIFEST_KEYS = Object.freeze([
  'contract_version',
  'normative_authority_ref',
  'normative_authority_status',
  'publication_state',
  'source_precedence',
  'excluded_assets',
  'outputs'
]);
const COMMON_ENTRY_KEYS = Object.freeze([
  'output',
  'route',
  'source_kind',
  'page_family',
  'document_status',
  'title',
  'description',
  'publication_state',
  'allowed_assets',
  'navigation_owner'
]);
const EXPECTED_LOCK_PACKAGES = Object.freeze(new Map([
  ['node_modules/argparse', '2.0.1'],
  ['node_modules/entities', '4.5.0'],
  ['node_modules/linkify-it', '5.0.2'],
  ['node_modules/markdown-it', '14.3.3'],
  ['node_modules/mdurl', '2.1.0'],
  ['node_modules/parse5', '7.3.0'],
  ['node_modules/parse5/node_modules/entities', '6.0.1'],
  ['node_modules/punycode.js', '2.3.1'],
  ['node_modules/uc.micro', '2.1.0']
]));
const VISIBLE_CHROME_SOURCE_HASHES = Object.freeze({
  generationContract: '3da22e91c9d9edc771bb91b5495f7d6b0211731d1b948cccc89566e32202b610',
  navigation: '932a0cc353aa247606d2c160f5b71396b68472342d07ffadd22818840edd83b5',
  template: '8996191f344cc847abe65d117456c3007bace6c36bea6032b92195a00f347d3c',
  style: 'd83d9e2ce3783b1b3d3c535b28c95426cb8dbf3f4e0e6300a45ade13e934220f'
});
const LOCKFILE_SHA256 = '8a4caa6aa117b5c9c929ac76599554ec526dd118e837f19c464f0af5fcf396c2';

export function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(object, expected, label) {
  invariant(object && typeof object === 'object' && !Array.isArray(object), `${label} must be an object`);
  const actual = Object.keys(object).sort();
  invariant(JSON.stringify(actual) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`);
}

function requireTrimmedString(value, label) {
  invariant(typeof value === 'string' && value.length > 0 && value.trim() === value, `${label} must be a nonempty trimmed string`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function normalizeRepoPath(value, label = 'repository path') {
  requireTrimmedString(value, label);
  invariant(!value.includes('\\'), `${label} must use POSIX separators`);
  invariant(!path.posix.isAbsolute(value), `${label} must be repository-relative`);
  invariant(!value.includes('?') && !value.includes('#'), `${label} may not contain query or fragment`);
  const normalized = path.posix.normalize(value);
  invariant(normalized === value, `${label} must already be normalized: ${value}`);
  invariant(value !== '.' && value !== '..' && !value.startsWith('../'), `${label} escapes the repository: ${value}`);
  invariant(!value.split('/').some((part) => part === '.' || part === '..' || part.length === 0), `${label} contains a dot or empty segment: ${value}`);
  return normalized;
}

async function assertComponentsNotSymlinks(root, relative, { leafMayBeMissing = false } = {}) {
  let cursor = root;
  const parts = relative.split(path.sep).filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    cursor = path.join(cursor, parts[index]);
    try {
      const info = await lstat(cursor);
      invariant(!info.isSymbolicLink(), `symlink component is prohibited: ${cursor}`);
      if (index < parts.length - 1) invariant(info.isDirectory(), `path component is not a directory: ${cursor}`);
    } catch (error) {
      if (error.code === 'ENOENT' && leafMayBeMissing) return;
      throw error;
    }
  }
}

export async function resolveContainedRegularFile(root, relative, label = 'file') {
  const rootReal = await realpath(root);
  const normalized = normalizeRepoPath(relative, label);
  await assertComponentsNotSymlinks(rootReal, normalized.split('/').join(path.sep));
  const candidate = path.resolve(rootReal, ...normalized.split('/'));
  invariant(isWithin(rootReal, candidate), `${label} escapes containment: ${relative}`);
  const info = await lstat(candidate);
  invariant(info.isFile() && !info.isSymbolicLink(), `${label} must be a regular non-symlink file: ${relative}`);
  const resolved = await realpath(candidate);
  invariant(isWithin(rootReal, resolved), `${label} realpath escapes containment: ${relative}`);
  return resolved;
}

export async function resolveRepoFile(repoRoot, repoPath, label = 'source') {
  return resolveContainedRegularFile(repoRoot, repoPath, label);
}

async function readContainedFile(root, relative, label) {
  return readFile(await resolveContainedRegularFile(root, relative, label), 'utf8');
}

async function nearestExistingParent(candidate) {
  let cursor = candidate;
  const suffix = [];
  for (;;) {
    try {
      const info = await lstat(cursor);
      invariant(!info.isSymbolicLink(), `existing parent is a symlink: ${cursor}`);
      invariant(info.isDirectory(), `existing parent is not a directory: ${cursor}`);
      return { parent: await realpath(cursor), suffix: suffix.reverse() };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const next = path.dirname(cursor);
      invariant(next !== cursor, `no existing parent for path: ${candidate}`);
      suffix.push(path.basename(cursor));
      cursor = next;
    }
  }
}

export async function resolveCliPaths(argv, { allowExistingNonempty = false } = {}) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    invariant(key === '--repo-root' || key === '--output-dir', `unknown argument: ${key}`);
    invariant(!values.has(key), `duplicate argument: ${key}`);
    const value = argv[index + 1];
    invariant(value && !value.startsWith('--'), `missing value for ${key}`);
    values.set(key, value);
    index += 1;
  }
  invariant(values.size === 2 && values.has('--repo-root') && values.has('--output-dir'), 'both --repo-root and --output-dir are required');
  invariant(path.isAbsolute(values.get('--repo-root')), '--repo-root must be absolute');
  invariant(path.isAbsolute(values.get('--output-dir')), '--output-dir must be absolute');

  const repoInput = values.get('--repo-root');
  const repoInfo = await lstat(repoInput);
  invariant(repoInfo.isDirectory() && !repoInfo.isSymbolicLink(), '--repo-root must be a non-symlink directory');
  const repoRoot = await realpath(repoInput);
  await resolveRepoFile(repoRoot, MANIFEST_PATH, 'source manifest');

  const outputInput = values.get('--output-dir');
  const { parent, suffix } = await nearestExistingParent(outputInput);
  const prospective = path.resolve(parent, ...suffix);
  const forbiddenRoots = new Set(['/', '/tmp', '/private/tmp'].map((item) => path.resolve(item)));
  invariant(!forbiddenRoots.has(prospective), '--output-dir may not be /, /tmp, or /private/tmp');
  invariant(!isWithin(repoRoot, prospective), '--output-dir may not equal or be inside the repository');

  let outputExists = false;
  let outputDir = prospective;
  try {
    const info = await lstat(outputInput);
    outputExists = true;
    invariant(info.isDirectory() && !info.isSymbolicLink(), '--output-dir must be a non-symlink directory when it exists');
    outputDir = await realpath(outputInput);
    invariant(!forbiddenRoots.has(outputDir), '--output-dir resolves to a forbidden root');
    invariant(!isWithin(repoRoot, outputDir), '--output-dir resolves inside the repository');
    if (!allowExistingNonempty) invariant((await readdir(outputDir)).length === 0, '--output-dir must be empty before generation');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { repoRoot, outputDir, outputExists };
}

async function findInstalledPackageJson(packageName) {
  let cursor = path.dirname(require.resolve(packageName));
  for (;;) {
    const candidate = path.join(cursor, 'package.json');
    try {
      const info = await lstat(candidate);
      invariant(info.isFile() && !info.isSymbolicLink(), `${packageName} package.json must be a regular file`);
      const metadata = JSON.parse(await readFile(candidate, 'utf8'));
      if (metadata.name === packageName) return candidate;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const next = path.dirname(cursor);
    invariant(next !== cursor, `cannot locate package.json for ${packageName}`);
    cursor = next;
  }
}

async function validateRuntimeAndLock(packageJson, packageLock, packageLockText) {
  invariant(process.versions.node === '24.13.1', `Node runtime must be exactly 24.13.1, received ${process.versions.node}`);
  invariant(packageJson.private === true && packageJson.type === 'module', 'package must remain private ESM');
  invariant(packageJson.engines?.node === '24.13.1' && packageJson.packageManager === 'npm@11.8.0', 'toolchain declarations differ from contract');
  exactKeys(packageJson.dependencies, ['markdown-it', 'parse5'], 'package dependencies');
  invariant(packageJson.dependencies['markdown-it'] === '14.3.3' && packageJson.dependencies.parse5 === '7.3.0', 'root dependencies must use exact authorized versions');
  invariant(packageLock.lockfileVersion === 3, 'package lockfile version must be 3');
  invariant(sha256(packageLockText) === LOCKFILE_SHA256, 'package-lock.json changed from its reviewed bytes');
  exactKeys(packageLock.packages, ['', ...EXPECTED_LOCK_PACKAGES.keys()], 'locked package graph');
  invariant(packageLock.packages[''].dependencies['markdown-it'] === '14.3.3' && packageLock.packages[''].dependencies.parse5 === '7.3.0', 'locked root versions differ');
  for (const [packagePath, version] of EXPECTED_LOCK_PACKAGES) {
    const entry = packageLock.packages[packagePath];
    invariant(entry.version === version, `locked version differs: ${packagePath}`);
    invariant(typeof entry.integrity === 'string' && entry.integrity.startsWith('sha512-'), `locked integrity missing: ${packagePath}`);
    invariant(typeof entry.resolved === 'string' && entry.resolved.startsWith('https://registry.npmjs.org/'), `locked provenance differs: ${packagePath}`);
    invariant(!entry.hasInstallScript, `install lifecycle is prohibited: ${packagePath}`);
    invariant(!/^(?:git|http:|file:|workspace:)/i.test(entry.resolved), `unauthorized resolution: ${packagePath}`);
  }
  for (const [name, version] of [['markdown-it', '14.3.3'], ['parse5', '7.3.0']]) {
    const loaded = JSON.parse(await readFile(await findInstalledPackageJson(name), 'utf8'));
    invariant(loaded.name === name && loaded.version === version, `loaded ${name} version differs from ${version}`);
  }
}

export async function readToolConfiguration(toolRoot = TOOL_ROOT) {
  const toolInfo = await lstat(toolRoot);
  invariant(toolInfo.isDirectory() && !toolInfo.isSymbolicLink(), 'TOOL_ROOT must be a non-symlink directory');
  const names = {
    generationContract: 'generation-contract.json',
    navigation: 'navigation.json',
    template: 'templates/base.html',
    style: 'styles/site.css',
    packageJson: 'package.json',
    packageLock: 'package-lock.json'
  };
  const texts = {};
  for (const [key, relative] of Object.entries(names)) texts[key] = await readContainedFile(toolRoot, relative, `tool configuration ${relative}`);
  const contract = JSON.parse(texts.generationContract);
  const navigation = JSON.parse(texts.navigation);
  const packageJson = JSON.parse(texts.packageJson);
  const packageLock = JSON.parse(texts.packageLock);
  validateGenerationContract(contract);
  validateVisibleChromeConfiguration(texts);
  await validateRuntimeAndLock(packageJson, packageLock, texts.packageLock);
  return { contract, navigation, template: texts.template, style: texts.style, packageJson, packageLock, sourceTexts: texts };
}

export function validateGenerationContract(contract) {
  exactKeys(contract, ['contract_version', 'generator_version', 'manifest_contract_version', 'markdown_engine', 'safe_external_schemes', 'repository_source_base', 'repository_source_targets', 'chrome_text', 'robots', 'language'], 'generation contract');
  invariant(contract.contract_version === 'janus-html-generator-v1' && contract.generator_version === '1.0.0', 'generator contract version mismatch');
  invariant(contract.manifest_contract_version === 'janus-html-source-authority-v1', 'manifest contract version mismatch');
  exactKeys(contract.markdown_engine, ['name', 'version', 'options', 'plugins'], 'markdown engine contract');
  invariant(contract.markdown_engine.name === 'markdown-it' && contract.markdown_engine.version === '14.3.3', 'Markdown engine version mismatch');
  exactKeys(contract.markdown_engine.options, ['html', 'linkify', 'typographer', 'breaks'], 'Markdown options');
  invariant(JSON.stringify(contract.markdown_engine.options) === JSON.stringify({ html: false, linkify: false, typographer: false, breaks: false }), 'Markdown options differ');
  invariant(Array.isArray(contract.markdown_engine.plugins) && contract.markdown_engine.plugins.length === 0, 'Markdown plugins are prohibited');
  invariant(JSON.stringify(contract.safe_external_schemes) === JSON.stringify(['https:', 'mailto:']), 'safe external schemes differ');
  invariant(contract.repository_source_base === REPOSITORY_SOURCE_BASE, 'repository-source base differs from fixed commit URL');
  const exactTargets = ['CONTRIBUTING.md', 'core/lite/JANUS_CORE_LITE_v0.2.md', 'docs/architecture/core-lite-overview.md', 'docs/architecture/governance-event-structure.md', 'docs/architecture/rebuild-model.md', 'docs/governance/governance-pipeline.md', 'docs/governance/governance-scope.md', 'runtimes/demo-node/README.md'];
  invariant(JSON.stringify(contract.repository_source_targets) === JSON.stringify(exactTargets), 'repository-source target allowlist differs');
  exactKeys(contract.chrome_text, CHROME_TEXT_KEYS, 'chrome_text');
  for (const key of CHROME_TEXT_KEYS) requireTrimmedString(contract.chrome_text[key], `chrome_text.${key}`);
  invariant(contract.chrome_text.blocked_banner === 'Publication blocked', 'blocked publication wording changed');
  invariant(contract.robots === 'noindex,nofollow' && contract.language === 'en', 'publication or language contract changed');
}

export function validateVisibleChromeConfiguration(texts) {
  invariant(sha256(texts.generationContract) === VISIBLE_CHROME_SOURCE_HASHES.generationContract, 'generation contract differs from reviewed chrome contract');
  invariant(sha256(texts.navigation) === VISIBLE_CHROME_SOURCE_HASHES.navigation, 'navigation differs from reviewed chrome contract');
  invariant(sha256(texts.template) === VISIBLE_CHROME_SOURCE_HASHES.template, 'template differs from reviewed chrome contract');
  invariant(sha256(texts.style) === VISIBLE_CHROME_SOURCE_HASHES.style, 'stylesheet differs from reviewed chrome contract');
  invariant(!/(^|[;{]\s*)content\s*:/im.test(texts.style), 'CSS generated visible content is prohibited');
}

function validateOutputPath(output) {
  normalizeRepoPath(output, 'output');
  invariant(output.endsWith('.html'), `output must end with .html: ${output}`);
  invariant(!output.includes('%'), `output percent encoding is prohibited: ${output}`);
}

function validateRoute(route, output) {
  requireTrimmedString(route, `route for ${output}`);
  invariant(route === '/' || /^\/(?!\/)/.test(route), `route must be an absolute single-slash web route: ${route}`);
  invariant(!route.includes('\\') && !route.includes('?') && !route.includes('#') && !route.includes('%') && !route.includes('//'), `route contains a prohibited component: ${route}`);
  invariant(!route.split('/').some((part) => part === '.' || part === '..'), `route contains a dot segment: ${route}`);
  const expected = output === 'index.html'
    ? '/'
    : output.endsWith('/index.html')
      ? `/${output.slice(0, -'index.html'.length)}`
      : `/${output}`;
  invariant(route === expected, `route does not match output relation: ${output} -> ${route}, expected ${expected}`);
}

function expectedPageProfile(output) {
  if (output === 'demos.html' || output === 'docs/what-is-janus.html') return ['ACCESSIBLE_ALIAS', 'INFORMATIVE_ALIAS'];
  if (output === 'index.html') return ['CUSTOM_LANDING', 'CURATED'];
  if (['demos/index.html', 'docs/index.html', 'rfcs/index.html', 'runtimes/index.html'].includes(output)) return ['DIRECTORY_INDEX', 'INFORMATIVE'];
  if (/^rfcs\/000[1-8]-[^/]+[.]html$/.test(output)) return ['RFC', 'DRAFT'];
  if (output === 'docs/glossary.html') return ['CONTENT_DOC', 'SUBORDINATE'];
  if (/^docs\/[^/]+[.]html$/.test(output)) return ['CONTENT_DOC', 'INFORMATIVE'];
  throw new Error(`output has no authorized page profile: ${output}`);
}

export async function loadAndValidateAuthority(repoRoot, configuration) {
  const manifestText = await readFile(await resolveRepoFile(repoRoot, MANIFEST_PATH, 'source manifest'), 'utf8');
  const manifest = JSON.parse(manifestText);
  exactKeys(manifest, TOP_LEVEL_MANIFEST_KEYS, 'source manifest');
  invariant(manifest.contract_version === configuration.contract.manifest_contract_version, 'source manifest contract mismatch');
  invariant(manifest.normative_authority_ref === 'core/lite/JANUS_CORE_LITE_v0.2.md' && manifest.normative_authority_status === 'DRAFT', 'normative authority mismatch');
  invariant(manifest.publication_state === 'BLOCKED_PENDING_PUBLICATION_GATE' && manifest.source_precedence === 'MARKDOWN_SOURCE_PREVAILS', 'publication or source precedence mismatch');
  invariant(JSON.stringify(manifest.excluded_assets) === JSON.stringify(['assets/diagrams/janus-governance-flow.svg']), 'excluded asset list differs');
  invariant(Array.isArray(manifest.outputs) && manifest.outputs.length === 22, 'manifest must contain 22 outputs');

  const outputSet = new Set();
  const routeSet = new Set();
  const sourceSet = new Set();
  const markdownEntries = [];
  const aliasEntries = [];
  for (const entry of manifest.outputs) {
    const kindKey = entry.source_kind === 'MARKDOWN' ? 'content_source' : entry.source_kind === 'ALIAS' ? 'alias_target' : null;
    invariant(kindKey, `unknown source_kind for ${entry.output ?? 'entry'}`);
    exactKeys(entry, [...COMMON_ENTRY_KEYS, kindKey], `${entry.source_kind} manifest entry`);
    for (const key of ['output', 'route', 'source_kind', 'page_family', 'document_status', 'title', 'description', 'publication_state', 'navigation_owner', kindKey]) requireTrimmedString(entry[key], `${entry.output}.${key}`);
    invariant(Array.isArray(entry.allowed_assets) && entry.allowed_assets.length === 0, `allowed_assets must remain empty: ${entry.output}`);
    validateOutputPath(entry.output);
    validateRoute(entry.route, entry.output);
    invariant(!outputSet.has(entry.output), `duplicate output: ${entry.output}`);
    invariant(!routeSet.has(entry.route), `duplicate route: ${entry.route}`);
    outputSet.add(entry.output);
    routeSet.add(entry.route);
    invariant(entry.publication_state === 'BLOCKED', `output publication must remain blocked: ${entry.output}`);
    invariant(REQUIRED_NAVIGATION_OWNERS.includes(entry.navigation_owner), `unknown navigation owner: ${entry.navigation_owner}`);
    const [expectedFamily, expectedStatus] = expectedPageProfile(entry.output);
    invariant(entry.page_family === expectedFamily && entry.document_status === expectedStatus, `page profile mismatch for ${entry.output}`);
    if (entry.source_kind === 'MARKDOWN') {
      normalizeRepoPath(entry.content_source, 'content source');
      invariant(entry.content_source.endsWith('.md'), `content source must be Markdown: ${entry.content_source}`);
      invariant(!sourceSet.has(entry.content_source), `duplicate content source: ${entry.content_source}`);
      sourceSet.add(entry.content_source);
      await resolveRepoFile(repoRoot, entry.content_source, 'content source');
      markdownEntries.push(entry);
    } else aliasEntries.push(entry);
  }
  invariant(JSON.stringify([...outputSet]) === JSON.stringify([...outputSet].sort()), 'outputs must be sorted');
  invariant(markdownEntries.length === 20 && aliasEntries.length === 2, 'manifest must contain 20 MARKDOWN and 2 ALIAS entries');
  const markdownRoutes = new Set(markdownEntries.map((entry) => entry.route));
  for (const alias of aliasEntries) {
    invariant(EXACT_ALIASES.get(alias.output) === alias.alias_target, `alias differs from exact contract: ${alias.output}`);
    invariant(markdownRoutes.has(alias.alias_target), `alias target is not a declared MARKDOWN route: ${alias.alias_target}`);
    invariant(alias.alias_target !== alias.route, `self alias is prohibited: ${alias.output}`);
  }
  invariant(aliasEntries.every((entry) => !aliasEntries.some((candidate) => candidate.route === entry.alias_target)), 'alias chain or cycle is prohibited');

  exactKeys(configuration.navigation, REQUIRED_NAVIGATION_OWNERS, 'navigation');
  const aliasRoutes = new Set(aliasEntries.map((entry) => entry.route));
  for (const [owner, items] of Object.entries(configuration.navigation)) {
    invariant(Array.isArray(items) && items.length > 0, `navigation must be nonempty: ${owner}`);
    const seen = new Set();
    for (const item of items) {
      exactKeys(item, ['label', 'route'], `navigation item in ${owner}`);
      requireTrimmedString(item.label, `navigation label in ${owner}`);
      requireTrimmedString(item.route, `navigation route in ${owner}`);
      invariant(routeSet.has(item.route) && !aliasRoutes.has(item.route), `navigation route is undeclared or alias-owned: ${item.route}`);
      invariant(!seen.has(item.route), `duplicate navigation route in ${owner}: ${item.route}`);
      seen.add(item.route);
    }
  }
  for (const target of configuration.contract.repository_source_targets) await resolveRepoFile(repoRoot, target, 'repository-source target');
  await resolveRepoFile(repoRoot, manifest.normative_authority_ref, 'normative authority source');
  return manifest;
}

export async function listFiles(root) {
  const rootReal = await realpath(root);
  const result = [];
  async function visit(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      invariant(!entry.isSymbolicLink(), `symlink is prohibited in output tree: ${relative}`);
      const absolute = path.join(directory, entry.name);
      invariant(isWithin(rootReal, await realpath(absolute)), `output entry escapes root: ${relative}`);
      if (entry.isDirectory()) await visit(absolute, relative);
      else if (entry.isFile()) result.push(relative);
      else throw new Error(`unsupported output entry: ${relative}`);
    }
  }
  await visit(rootReal);
  return result.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

export async function createGuardedTestRoot(candidate, repositoryRoots) {
  invariant(path.isAbsolute(candidate), 'JANUS_TEST_TMP_ROOT must be absolute');
  invariant(path.basename(candidate).startsWith('janus-html-test.'), 'JANUS_TEST_TMP_ROOT basename must start with janus-html-test.');
  const forbidden = new Set(['/', '/tmp', '/private/tmp'].map((item) => path.resolve(item)));
  invariant(!forbidden.has(path.resolve(candidate)), 'JANUS_TEST_TMP_ROOT may not be a broad root');
  try {
    await lstat(candidate);
    throw new Error('JANUS_TEST_TMP_ROOT must not already exist');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const parentInput = path.dirname(candidate);
  const parentInfo = await lstat(parentInput);
  invariant(parentInfo.isDirectory() && !parentInfo.isSymbolicLink(), 'test-root parent must be a non-symlink directory');
  const parent = await realpath(parentInput);
  invariant((await lstat(path.join(parent, '.janus-task-root'))).isFile(), 'test-root parent must be a task-created guarded root');
  const prospective = path.resolve(parent, path.basename(candidate));
  for (const repositoryRoot of repositoryRoots) {
    const repositoryReal = await realpath(repositoryRoot);
    invariant(!isWithin(repositoryReal, prospective), 'test root may not be inside a repository');
  }
  await mkdir(prospective, { recursive: false, mode: 0o700 });
  const created = await realpath(prospective);
  invariant(created === prospective && isWithin(parent, created), 'created test root escaped its guarded parent');
  return created;
}

export async function assertContainedPath(root, candidate, label = 'path') {
  const rootReal = await realpath(root);
  const candidateReal = await realpath(candidate);
  invariant(isWithin(rootReal, candidateReal), `${label} escapes guarded root`);
  return candidateReal;
}

export async function writeContainedOutputFile(outputRoot, relativeOutput, content) {
  const rootReal = await realpath(outputRoot);
  normalizeRepoPath(relativeOutput, 'output write path');
  const parts = relativeOutput.split('/');
  const fileName = parts.pop();
  let parent = rootReal;
  for (const part of parts) {
    const next = path.join(parent, part);
    try {
      const info = await lstat(next);
      invariant(info.isDirectory() && !info.isSymbolicLink(), `output parent is unsafe: ${next}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(next, { recursive: false, mode: 0o700 });
    }
    parent = await realpath(next);
    invariant(isWithin(rootReal, parent), `output parent escaped root: ${relativeOutput}`);
  }
  const leaf = path.join(parent, fileName);
  try {
    await lstat(leaf);
    throw new Error(`output leaf already exists: ${relativeOutput}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  invariant(isWithin(rootReal, await realpath(parent)), `output parent escaped before write: ${relativeOutput}`);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(leaf, flags, 0o600);
  try {
    invariant((await handle.stat()).isFile(), `output leaf is not a regular file: ${relativeOutput}`);
    await handle.writeFile(content, { encoding: 'utf8' });
  } finally {
    await handle.close();
  }
  invariant(isWithin(rootReal, await realpath(leaf)), `output leaf escaped after write: ${relativeOutput}`);
}
