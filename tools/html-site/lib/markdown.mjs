import { readFile } from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import { invariant, isWithin, normalizeRepoPath, resolveRepoFile } from './contract.mjs';

const MARKDOWN_OPTIONS = Object.freeze({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false
});

export function createHeadingIdFactory() {
  const counts = new Map();
  return (text) => {
    const base = text
      .normalize('NFKD')
      .toLowerCase()
      .replace(/\p{M}+/gu, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

function inlineVisibleText(inlineToken) {
  if (!Array.isArray(inlineToken?.children)) return inlineToken?.content ?? '';
  return inlineToken.children
    .filter((token) => ['text', 'code_inline', 'emoji', 'html_inline'].includes(token.type))
    .map((token) => token.content)
    .join('');
}

function assignHeadingIds(tokens) {
  const nextId = createHeadingIdFactory();
  const ids = new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'heading_open') continue;
    const inline = tokens[index + 1];
    invariant(inline?.type === 'inline', 'heading must be followed by an inline token');
    const id = nextId(inlineVisibleText(inline));
    token.attrSet('id', id);
    ids.add(id);
  }
  return ids;
}

function splitLocalHref(href) {
  invariant(!href.includes('?'), `local link queries are not supported: ${href}`);
  const hashIndex = href.indexOf('#');
  const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const fragmentPart = hashIndex === -1 ? '' : href.slice(hashIndex + 1);
  let decodedPath;
  let decodedFragment;
  try {
    decodedPath = decodeURIComponent(pathPart);
    decodedFragment = decodeURIComponent(fragmentPart);
  } catch {
    throw new Error(`invalid percent encoding in link: ${href}`);
  }
  return { pathPart: decodedPath, fragment: decodedFragment };
}

function ensureFragment(fragment, target, headingIds) {
  if (!fragment) return '';
  const ids = headingIds.get(target);
  invariant(ids?.has(fragment), `fragment does not resolve in ${target}: #${fragment}`);
  return `#${fragment}`;
}

export async function prepareMarkdownContext(repoRoot, manifest, contract) {
  const sourceEntries = new Map();
  const routeBySource = new Map();
  const headingIds = new Map();
  const parser = new MarkdownIt(MARKDOWN_OPTIONS);
  for (const entry of manifest.outputs.filter((item) => item.source_kind === 'MARKDOWN')) {
    const absolute = await resolveRepoFile(repoRoot, entry.content_source, 'content source');
    const source = await readFile(absolute, 'utf8');
    invariant(!source.includes('\r'), `content source must use LF line endings: ${entry.content_source}`);
    const tokens = parser.parse(source, {});
    headingIds.set(entry.content_source, assignHeadingIds(tokens));
    sourceEntries.set(entry.content_source, { entry, source, absolute });
    routeBySource.set(entry.content_source, entry.route);
  }
  return {
    repoRoot,
    contract,
    sourceEntries,
    routeBySource,
    headingIds,
    repositoryTargets: new Set(contract.repository_source_targets)
  };
}

export async function classifyLink(href, sourcePath, context) {
  invariant(typeof href === 'string' && href.length > 0, `empty link in ${sourcePath}`);
  invariant(!href.startsWith('//'), `protocol-relative URL is prohibited: ${href}`);
  const scheme = href.match(/^([A-Za-z][A-Za-z0-9+.-]*:)/)?.[1]?.toLowerCase();
  if (scheme) {
    invariant(context.contract.safe_external_schemes.includes(scheme), `unsafe or unknown URL scheme: ${scheme}`);
    if (scheme === 'https:') {
      let parsed;
      try { parsed = new URL(href); } catch { throw new Error(`malformed https URL: ${href}`); }
      invariant(parsed.protocol === 'https:' && parsed.hostname.length > 0 && !parsed.username && !parsed.password, `unsafe https URL: ${href}`);
    } else {
      const recipient = href.slice('mailto:'.length);
      invariant(recipient.length > 0 && !/[\r\n]/.test(recipient), `unsafe mailto URL: ${href}`);
    }
    return { kind: 'external', href };
  }

  const { pathPart, fragment } = splitLocalHref(href);
  const sourceDirectory = path.posix.dirname(sourcePath);
  const target = pathPart
    ? path.posix.normalize(path.posix.join(sourceDirectory, pathPart))
    : sourcePath;
  normalizeRepoPath(target, 'resolved link target');
  const candidate = path.resolve(context.repoRoot, ...target.split('/'));
  invariant(isWithin(context.repoRoot, candidate), `link target escapes repository: ${href}`);
  await resolveRepoFile(context.repoRoot, target, 'link target');
  invariant(target.endsWith('.md'), `local link target is not an allowed Markdown source: ${target}`);

  const suffix = ensureFragment(fragment, target, context.headingIds);
  if (context.routeBySource.has(target)) {
    return { kind: 'rendered-route', href: `${context.routeBySource.get(target)}${suffix}`, target };
  }
  invariant(context.repositoryTargets.has(target), `Markdown target is neither rendered nor an allowed repository source: ${target}`);
  invariant(!fragment, `repository-source fragments are prohibited in generator v1: ${href}`);
  const encodedTarget = target.split('/').map((part) => encodeURIComponent(part)).join('/');
  return { kind: 'repository-source', href: `${context.contract.repository_source_base}${encodedTarget}`, target };
}

function allInlineChildren(tokens) {
  return tokens.flatMap((token) => token.type === 'inline' && Array.isArray(token.children) ? token.children : []);
}

export async function renderMarkdownSource(sourcePath, context) {
  const sourceRecord = context.sourceEntries.get(sourcePath);
  invariant(sourceRecord, `unknown Markdown source: ${sourcePath}`);
  const markdown = new MarkdownIt(MARKDOWN_OPTIONS);
  const defaultFence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    const rendered = defaultFence(tokens, index, options, environment, renderer);
    const info = markdown.utils.escapeHtml(tokens[index].info.trim());
    return rendered.replace('<code', `<code data-janus-code-info="${info}"`);
  };
  const defaultLinkClose = markdown.renderer.rules.link_close
    ?? ((tokens, index, options, environment, renderer) => renderer.renderToken(tokens, index, options));
  markdown.renderer.rules.link_close = (tokens, index, options, environment, renderer) => {
    const close = defaultLinkClose(tokens, index, options, environment, renderer);
    return tokens[index].meta?.repositorySourceClose
      ? `${close}<span class="repository-source-indicator" aria-label="${markdown.utils.escapeHtml(context.contract.chrome_text.repository_source_indicator_aria)}"> ${markdown.utils.escapeHtml(context.contract.chrome_text.repository_source_indicator_visible)}</span>`
      : close;
  };

  const tokens = markdown.parse(sourceRecord.source, {});
  const ids = assignHeadingIds(tokens);
  invariant(JSON.stringify([...ids]) === JSON.stringify([...context.headingIds.get(sourcePath)]), `heading identifiers changed for ${sourcePath}`);
  const children = allInlineChildren(tokens);
  const linkStack = [];
  for (const token of children) {
    if (token.type === 'image') throw new Error(`content assets are not authorized: ${sourcePath}`);
    if (token.type === 'link_open') {
      const href = token.attrGet('href');
      const classified = await classifyLink(href, sourcePath, context);
      token.attrSet('href', classified.href);
      token.attrSet('data-janus-link-kind', classified.kind);
      linkStack.push(classified.kind);
    } else if (token.type === 'link_close') {
      const kind = linkStack.pop();
      invariant(kind, `unbalanced link tokens in ${sourcePath}`);
      if (kind === 'repository-source') token.meta = { ...token.meta, repositorySourceClose: true };
    }
  }
  invariant(linkStack.length === 0, `unbalanced link tokens in ${sourcePath}`);
  return {
    html: markdown.renderer.render(tokens, markdown.options, {}),
    headingIds: ids,
    tokens
  };
}

export const markdownOptions = MARKDOWN_OPTIONS;
