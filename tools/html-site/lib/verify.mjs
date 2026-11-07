import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import { parse } from 'parse5';
import {
  invariant,
  isWithin,
  listFiles,
  normalizeRepoPath,
  REPOSITORY_SOURCE_BASE,
  resolveRepoFile
} from './contract.mjs';

const MARKDOWN_OPTIONS = Object.freeze({ html: false, linkify: false, typographer: false, breaks: false });

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function elements(node, predicate = () => true, result = []) {
  if (node?.tagName && predicate(node)) result.push(node);
  for (const child of node?.childNodes ?? []) elements(child, predicate, result);
  return result;
}

function directElements(node) {
  return (node?.childNodes ?? []).filter((child) => child.tagName);
}

function attr(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value ?? null;
}

function requireAttributes(node, expected, label) {
  const actual = Object.fromEntries((node?.attrs ?? []).map((item) => [item.name, item.value]));
  const normalize = (value) => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  invariant(JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected)), `${label} attributes differ from the exact allowlist`);
}

function hasClass(node, name) {
  return (attr(node, 'class') ?? '').split(/\s+/).includes(name);
}

function textContent(node) {
  if (node?.nodeName === '#text') return node.value;
  return (node?.childNodes ?? []).map(textContent).join('');
}

function requireOnlyWhitespaceText(node, label) {
  for (const child of node.childNodes ?? []) {
    if (child.nodeName === '#text') invariant(child.value.trim() === '', `${label} contains undeclared visible text`);
  }
}

function exactlyOne(nodes, label) {
  invariant(nodes.length === 1, `${label} must occur exactly once`);
  return nodes[0];
}

function fenceLanguageClass(info) {
  const first = info.trim().split(/\s+/)[0];
  return first ? `language-${first}` : null;
}

export function parseStrict(html, label) {
  const errors = [];
  const document = parse(html, { onParseError: (error) => errors.push(error) });
  invariant(errors.length === 0, `${label} has parse5 errors: ${errors.map((error) => error.code).join(', ')}`);
  return document;
}

function independentHeadingIdFactory() {
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

function tokenInlineText(children = []) {
  let value = '';
  for (const token of children) {
    if (token.type === 'text' || token.type === 'code_inline') value += token.content;
    else if (token.type === 'softbreak' || token.type === 'hardbreak') value += '\n';
  }
  return value;
}

function collectHeadingIds(tokens) {
  const nextId = independentHeadingIdFactory();
  const ids = new Set();
  let h1Count = 0;
  let h1Text = null;
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'heading_open') continue;
    const inline = tokens[index + 1];
    invariant(inline?.type === 'inline', 'heading token must be followed by inline content');
    const text = tokenInlineText(inline.children);
    ids.add(nextId(text));
    if (tokens[index].tag === 'h1') {
      h1Count += 1;
      h1Text = text;
    }
  }
  return { ids, h1Count, h1Text };
}

function encodedRepositoryPath(target) {
  return target.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function validateExternalHref(href) {
  invariant(!href.startsWith('//'), `protocol-relative URL is prohibited: ${href}`);
  const scheme = href.match(/^([A-Za-z][A-Za-z0-9+.-]*:)/)?.[1]?.toLowerCase();
  invariant(scheme === 'https:' || scheme === 'mailto:', `unsafe or unknown URL scheme: ${href}`);
  if (scheme === 'https:') {
    invariant(/^https:\/\/[^/]/i.test(href), `malformed https URL: ${href}`);
    let parsed;
    try { parsed = new URL(href); } catch { throw new Error(`malformed https URL: ${href}`); }
    invariant(parsed.protocol === 'https:' && parsed.hostname.length > 0, `malformed https URL: ${href}`);
    invariant(!parsed.username && !parsed.password, `credentials are prohibited in URL: ${href}`);
  } else {
    const recipient = href.slice('mailto:'.length);
    let decodedRecipient;
    try { decodedRecipient = decodeURIComponent(recipient); } catch { throw new Error(`malformed mailto URL: ${href}`); }
    invariant(recipient.length > 0 && !/[\r\n]/.test(recipient) && !/[\r\n]/.test(decodedRecipient), `malformed mailto URL: ${href}`);
  }
}

function splitLocalHref(href) {
  invariant(!href.includes('?'), `local query is prohibited: ${href}`);
  const index = href.indexOf('#');
  const rawPath = index === -1 ? href : href.slice(0, index);
  const rawFragment = index === -1 ? '' : href.slice(index + 1);
  try {
    return { targetPart: decodeURIComponent(rawPath), fragment: decodeURIComponent(rawFragment) };
  } catch {
    throw new Error(`invalid percent encoding in link: ${href}`);
  }
}

export async function validateIndependentLink(href, sourcePath, oracle) {
  invariant(typeof href === 'string' && href.length > 0, `empty link in ${sourcePath}`);
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(href) || href.startsWith('//')) {
    validateExternalHref(href);
    return { kind: 'external', href };
  }
  const { targetPart, fragment } = splitLocalHref(href);
  const target = targetPart ? path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), targetPart)) : sourcePath;
  normalizeRepoPath(target, 'independently resolved link target');
  const candidate = path.resolve(oracle.repoRoot, ...target.split('/'));
  invariant(isWithin(oracle.repoRoot, candidate), `link traversal is prohibited: ${href}`);
  await resolveRepoFile(oracle.repoRoot, target, 'independently resolved link target');
  invariant(target.endsWith('.md'), `local target is not Markdown: ${target}`);

  if (oracle.routeBySource.has(target)) {
    if (fragment) invariant(oracle.headingsBySource.get(target)?.has(fragment), `rendered fragment does not resolve: ${href}`);
    return { kind: 'rendered-route', href: `${oracle.routeBySource.get(target)}${fragment ? `#${fragment}` : ''}`, target };
  }
  invariant(oracle.repositoryTargets.has(target), `undeclared repository-source target: ${target}`);
  invariant(!fragment, `repository-source fragments are prohibited: ${href}`);
  return { kind: 'repository-source', href: `${REPOSITORY_SOURCE_BASE}${encodedRepositoryPath(target)}`, target };
}

function normalizeInline(items) {
  const result = [];
  for (const item of items) {
    if (item.type === 'text' && item.value === '') continue;
    const previous = result.at(-1);
    if (item.type === 'text' && previous?.type === 'text') previous.value += item.value;
    else result.push(item);
  }
  return result;
}

async function projectTokenInline(children, sourcePath, oracle) {
  const root = [];
  const stack = [{ type: 'root', children: root }];
  const current = () => stack.at(-1).children;
  for (const token of children ?? []) {
    if (token.type === 'text') current().push({ type: 'text', value: token.content });
    else if (token.type === 'softbreak') current().push({ type: 'softbreak' });
    else if (token.type === 'hardbreak') current().push({ type: 'hardbreak' });
    else if (token.type === 'code_inline') current().push({ type: 'inline_code', value: token.content });
    else if (['em_open', 'strong_open', 's_open'].includes(token.type)) {
      const node = { type: token.type.replace('_open', ''), children: [] };
      current().push(node);
      stack.push(node);
    } else if (['em_close', 'strong_close', 's_close'].includes(token.type)) {
      invariant(stack.length > 1 && stack.at(-1).type === token.type.replace('_close', ''), `unbalanced inline token: ${token.type}`);
      stack.pop();
    } else if (token.type === 'link_open') {
      const resolved = await validateIndependentLink(token.attrGet('href'), sourcePath, oracle);
      const node = { type: 'link', kind: resolved.kind, href: resolved.href, children: [] };
      current().push(node);
      stack.push(node);
    } else if (token.type === 'link_close') {
      invariant(stack.at(-1).type === 'link', 'unbalanced link token');
      stack.pop();
    } else if (token.type === 'image') throw new Error(`images are not authorized: ${sourcePath}`);
    else throw new Error(`unsupported inline token in independent oracle: ${token.type}`);
  }
  invariant(stack.length === 1, `unbalanced inline structure in ${sourcePath}`);
  const normalizeNode = (node) => node.children ? { ...node, children: normalizeInline(node.children.map(normalizeNode)) } : node;
  return normalizeInline(root.map(normalizeNode));
}

function alignmentFromStyle(style) {
  if (!style) return null;
  const match = style.match(/^text-align:(left|center|right)$/);
  invariant(match, `unsupported table alignment style: ${style}`);
  return match[1];
}

async function projectMarkdownTokens(tokens, sourcePath, oracle) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const nextHeadingId = independentHeadingIdFactory();
  const openTypes = new Map([
    ['blockquote_open', 'blockquote'], ['bullet_list_open', 'ul'],
    ['ordered_list_open', 'ol'], ['list_item_open', 'li'], ['table_open', 'table'],
    ['thead_open', 'thead'], ['tbody_open', 'tbody'], ['tr_open', 'tr'], ['th_open', 'th'], ['td_open', 'td']
  ]);
  const closeTypes = new Map([...openTypes].map(([key, value]) => [key.replace('_open', '_close'), value]));
  for (const token of tokens) {
    if (token.type === 'heading_open') {
      const node = { type: 'heading', level: Number(token.tag.slice(1)), id: null, inline: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (token.type === 'heading_close') {
      invariant(stack.at(-1).type === 'heading', 'unbalanced heading tokens');
      stack.pop();
    } else if (token.type === 'paragraph_open') {
      const node = { type: token.hidden ? 'tight_paragraph' : 'paragraph', children: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (token.type === 'paragraph_close') {
      invariant(['paragraph', 'tight_paragraph'].includes(stack.at(-1).type), 'unbalanced paragraph tokens');
      stack.pop();
    } else if (openTypes.has(token.type)) {
      const type = openTypes.get(token.type);
      const node = { type, children: [] };
      if (type === 'ol') node.start = Number(token.attrGet('start') ?? 1);
      if (type === 'th' || type === 'td') node.align = alignmentFromStyle(token.attrGet('style'));
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (closeTypes.has(token.type)) {
      invariant(stack.at(-1).type === closeTypes.get(token.type), `unbalanced block token: ${token.type}`);
      stack.pop();
    } else if (token.type === 'inline') {
      const parent = stack.at(-1);
      parent.inline = await projectTokenInline(token.children, sourcePath, oracle);
      if (parent.type === 'heading') parent.id = nextHeadingId(tokenInlineText(token.children));
    } else if (token.type === 'fence') {
      const info = token.info.trim();
      stack.at(-1).children.push({ type: 'code_block', kind: 'fenced', info, languageClass: fenceLanguageClass(info), value: token.content });
    } else if (token.type === 'code_block') {
      stack.at(-1).children.push({ type: 'code_block', kind: 'indented', info: '', languageClass: null, value: token.content });
    } else if (token.type === 'hr') stack.at(-1).children.push({ type: 'hr' });
    else throw new Error(`unsupported block token in independent oracle: ${token.type}`);
  }
  invariant(stack.length === 1, `unbalanced Markdown block structure in ${sourcePath}`);
  return root.children;
}

function domInline(nodes, chrome) {
  const result = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.nodeName === '#text') {
      const pieces = node.value.split('\n');
      for (let piece = 0; piece < pieces.length; piece += 1) {
        if (pieces[piece]) result.push({ type: 'text', value: pieces[piece] });
        const rendererNewlineAfterHardbreak = piece === 0 && pieces[piece] === '' && result.at(-1)?.type === 'hardbreak';
        if (piece < pieces.length - 1 && !rendererNewlineAfterHardbreak) result.push({ type: 'softbreak' });
      }
      continue;
    }
    if (node.tagName === 'br') {
      requireAttributes(node, {}, 'source hard break');
      result.push({ type: 'hardbreak' });
      continue;
    }
    if (hasClass(node, 'repository-source-indicator')) {
      requireAttributes(node, { class: 'repository-source-indicator', 'aria-label': chrome.repository_source_indicator_aria }, 'repository-source indicator');
      invariant(textContent(node).trim() === chrome.repository_source_indicator_visible, 'repository-source indicator visible text differs');
      const previous = nodes[index - 1];
      invariant(previous?.tagName === 'a' && attr(previous, 'data-janus-link-kind') === 'repository-source', 'repository-source indicator must immediately follow its link');
      continue;
    }
    if (node.tagName === 'code') {
      requireAttributes(node, {}, 'inline code');
      result.push({ type: 'inline_code', value: textContent(node) });
    } else if (['em', 'strong', 's'].includes(node.tagName)) {
      requireAttributes(node, {}, `source ${node.tagName}`);
      result.push({ type: node.tagName, children: domInline(node.childNodes ?? [], chrome) });
    }
    else if (node.tagName === 'a') {
      const kind = attr(node, 'data-janus-link-kind');
      invariant(['rendered-route', 'repository-source', 'external'].includes(kind), 'link kind is missing or invalid');
      requireAttributes(node, { href: attr(node, 'href'), 'data-janus-link-kind': kind }, 'source link');
      if (kind === 'repository-source') {
        const indicator = nodes[index + 1];
        invariant(indicator?.tagName === 'span' && hasClass(indicator, 'repository-source-indicator'), 'repository-source link must be immediately followed by its indicator');
      }
      result.push({ type: 'link', kind, href: attr(node, 'href'), children: domInline(node.childNodes ?? [], chrome) });
    } else throw new Error(`unsupported inline DOM element: ${node.tagName}`);
  }
  return normalizeInline(result);
}

function domBlock(node, chrome) {
  if (/^h[1-6]$/.test(node.tagName)) {
    requireAttributes(node, { id: attr(node, 'id') }, 'source heading');
    return { type: 'heading', level: Number(node.tagName.slice(1)), id: attr(node, 'id'), inline: domInline(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'p') {
    requireAttributes(node, {}, 'source paragraph');
    return { type: 'paragraph', children: [], inline: domInline(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'blockquote') {
    requireAttributes(node, {}, 'source blockquote');
    return { type: 'blockquote', children: domBlocks(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'ul') {
    requireAttributes(node, {}, 'source unordered list');
    return { type: 'ul', children: domBlocks(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'ol') {
    const start = Number(attr(node, 'start') ?? 1);
    requireAttributes(node, start === 1 ? {} : { start: String(start) }, 'source ordered list');
    return { type: 'ol', children: domBlocks(node.childNodes ?? [], chrome), start };
  }
  if (node.tagName === 'li') {
    requireAttributes(node, {}, 'source list item');
    return { type: 'li', children: domListItemChildren(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'pre') {
    requireAttributes(node, {}, 'source code block wrapper');
    const code = exactlyOne(directElements(node).filter((child) => child.tagName === 'code'), 'code block child');
    const info = attr(code, 'data-janus-code-info');
    if (info === null) requireAttributes(code, {}, 'indented code');
    else {
      const languageClass = fenceLanguageClass(info);
      requireAttributes(code, languageClass ? { 'data-janus-code-info': info, class: languageClass } : { 'data-janus-code-info': info }, 'fenced code');
    }
    return { type: 'code_block', kind: info === null ? 'indented' : 'fenced', info: info ?? '', languageClass: info === null ? null : fenceLanguageClass(info), value: textContent(code) };
  }
  if (node.tagName === 'hr') {
    requireAttributes(node, {}, 'source thematic break');
    return { type: 'hr' };
  }
  if (['table', 'thead', 'tbody', 'tr'].includes(node.tagName)) {
    requireAttributes(node, {}, `source ${node.tagName}`);
    return { type: node.tagName, children: domBlocks(node.childNodes ?? [], chrome) };
  }
  if (node.tagName === 'th' || node.tagName === 'td') {
    const align = alignmentFromStyle(attr(node, 'style'));
    requireAttributes(node, align ? { style: `text-align:${align}` } : {}, `source ${node.tagName}`);
    return { type: node.tagName, children: [], align, inline: domInline(node.childNodes ?? [], chrome) };
  }
  throw new Error(`unsupported block DOM element: ${node.tagName}`);
}

function domListItemChildren(nodes, chrome) {
  const result = [];
  let inline = [];
  const flushInline = () => {
    if (inline.length === 0) return;
    result.push({ type: 'tight_paragraph', children: [], inline: domInline(inline, chrome) });
    inline = [];
  };
  for (const node of nodes) {
    if (node.nodeName === '#text') {
      if (node.value.trim() !== '') inline.push(node);
      continue;
    }
    if (['a', 'br', 'code', 'em', 's', 'span', 'strong'].includes(node.tagName)) {
      inline.push(node);
      continue;
    }
    flushInline();
    result.push(domBlock(node, chrome));
  }
  flushInline();
  return result;
}

function domBlocks(nodes, chrome) {
  const result = [];
  for (const node of nodes) {
    if (node.nodeName === '#text') {
      invariant(node.value.trim() === '', 'nonstructural source text is prohibited between blocks');
      continue;
    }
    result.push(domBlock(node, chrome));
  }
  return result;
}

function normalizeGovernedText(value) {
  return value.normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/\s+/g, ' ').trim();
}

function splitInlineTokenLines(children = []) {
  const lines = [[]];
  for (const child of children) {
    if (child.type === 'softbreak' || child.type === 'hardbreak') lines.push([]);
    else lines[lines.length - 1].push(child);
  }
  return lines;
}

function visibleInlineText(children = []) {
  return normalizeGovernedText(children
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join(''));
}

function canonicalInlineSignature(children = []) {
  const signature = [];
  for (const child of children) {
    if (child.type === 'text') {
      const value = normalizeGovernedText(child.content);
      if (value) signature.push(`text:${value}`);
    } else if (child.type === 'code_inline') signature.push(`code:${normalizeGovernedText(child.content)}`);
    else if (child.type === 'strong_open') signature.push('strong+');
    else if (child.type === 'strong_close') signature.push('strong-');
    else if (child.type === 'em_open') signature.push('em+');
    else if (child.type === 'em_close') signature.push('em-');
    else if (child.type === 'link_open') signature.push(`link+:${child.attrGet('href')}`);
    else if (child.type === 'link_close') signature.push('link-');
    else if (child.type === 'softbreak') signature.push('softbreak');
    else if (child.type === 'hardbreak') signature.push('hardbreak');
    else signature.push(`${child.type}:${normalizeGovernedText(child.content ?? '')}`);
  }
  return signature.join('\u001f');
}

function visibleInlineLines(children = []) {
  return splitInlineTokenLines(children).map(visibleInlineText);
}

function visibleParagraphRecords(tokens) {
  const records = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'paragraph_open' || tokens[index].hidden) continue;
    const inline = tokens[index + 1];
    invariant(inline?.type === 'inline', 'visible paragraph must contain inline content');
    const lines = visibleInlineLines(inline.children);
    records.push({
      tokenIndex: index,
      lines,
      text: normalizeGovernedText(lines.join(' '))
    });
  }
  return records;
}

function statusContainerKind(stack) {
  const container = [...stack].reverse().find((token) => ['paragraph_open', 'heading_open', 'th_open', 'td_open'].includes(token.type));
  if (container?.type === 'paragraph_open') return 'paragraph';
  if (container?.type === 'heading_open') return 'heading';
  if (container?.type === 'th_open' || container?.type === 'td_open') return 'table-cell';
  return 'other';
}

function structuredStatusCandidates(tokens) {
  const candidates = [];
  const stack = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.nesting === -1) {
      invariant(stack.length > 0, `unbalanced closing block token: ${token.type}`);
      stack.pop();
      continue;
    }
    if (token.type === 'inline') {
      const paragraph = [...stack].reverse().find((item) => item.type === 'paragraph_open');
      const lines = splitInlineTokenLines(token.children);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const value = visibleInlineText(lines[lineIndex]);
        if (!value.startsWith('Status:')) continue;
        candidates.push({
          value,
          containerKind: statusContainerKind(stack),
          blockquoteDepth: stack.filter((item) => item.type === 'blockquote_open').length,
          listDepth: stack.filter((item) => item.type === 'bullet_list_open' || item.type === 'ordered_list_open').length,
          listItemDepth: stack.filter((item) => item.type === 'list_item_open').length,
          paragraphHidden: paragraph?.hidden ?? null,
          lineIndex,
          signature: canonicalInlineSignature(lines[lineIndex])
        });
      }
    }
    if (token.nesting === 1) stack.push(token);
  }
  invariant(stack.length === 0, 'unbalanced block tokens while collecting Status candidates');
  return candidates;
}

function requireExactStatusProfile(tokens, expected, label) {
  const candidates = structuredStatusCandidates(tokens);
  invariant(JSON.stringify(candidates) === JSON.stringify(expected), `${label} structured Status candidates differ from the exact profile`);
}

const PLAIN_DRAFT_STATUS = Object.freeze([{
  value: 'Status: Draft', containerKind: 'paragraph', blockquoteDepth: 0, listDepth: 0,
  listItemDepth: 0, paragraphHidden: false, lineIndex: 0, signature: 'text:Status: Draft'
}]);

const ROADMAP_STATUS_SIGNATURE = ['strong+', 'text:Status:', 'strong-', 'text:Informative. This roadmap is subordinate to', 'link+:../core/lite/JANUS_CORE_LITE_v0.2.md', 'text:Core Lite v0.2', 'link-', 'text:, which remains', 'strong+', 'text:Draft', 'strong-', 'text:.'].join('\u001f');
const INDEX_STATUS_SIGNATURE = ['strong+', 'text:Status:', 'strong-', 'text:Informative. This index is subordinate to', 'link+:../core/lite/JANUS_CORE_LITE_v0.2.md', 'text:Core Lite v0.2', 'link-', 'text:, which remains Draft.'].join('\u001f');

const STATUS_PROFILES = new Map([
  ['core/lite/JANUS_CORE_LITE_v0.2.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0001-core-lite.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0002-evidence-model.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0003-omission-detection.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0004-human-authority-model.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0005-governance-events.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0006-governance-evaluation-layer.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0007-audit-writer-authority.md', PLAIN_DRAFT_STATUS],
  ['rfcs/0008-log-reference-model.md', PLAIN_DRAFT_STATUS],
  ['docs/roadmap.md', [{
    value: 'Status: Informative. This roadmap is subordinate to Core Lite v0.2, which remains Draft.',
    containerKind: 'paragraph', blockquoteDepth: 1, listDepth: 0, listItemDepth: 0,
    paragraphHidden: false, lineIndex: 0,
    signature: ROADMAP_STATUS_SIGNATURE
  }]],
  ['demos/index.md', [{
    value: 'Status: Informative. This index is subordinate to Core Lite v0.2, which remains Draft.',
    containerKind: 'paragraph', blockquoteDepth: 1, listDepth: 0, listItemDepth: 0,
    paragraphHidden: false, lineIndex: 0,
    signature: INDEX_STATUS_SIGNATURE
  }]],
  ['rfcs/index.md', [{
    value: 'Status: Informative. All RFCs listed here are Draft, nonnormative, and subordinate to Core Lite v0.2.',
    containerKind: 'paragraph', blockquoteDepth: 1, listDepth: 0, listItemDepth: 0,
    paragraphHidden: false, lineIndex: 0,
    signature: ['strong+', 'text:Status:', 'strong-', 'text:Informative. All RFCs listed here are Draft, nonnormative, and subordinate to', 'link+:../core/lite/JANUS_CORE_LITE_v0.2.md', 'text:Core Lite v0.2', 'link-', 'text:.'].join('\u001f')
  }]],
  ['runtimes/index.md', [{
    value: 'Status: Informative. This index is subordinate to Core Lite v0.2, which remains Draft.',
    containerKind: 'paragraph', blockquoteDepth: 1, listDepth: 0, listItemDepth: 0,
    paragraphHidden: false, lineIndex: 0,
    signature: INDEX_STATUS_SIGNATURE
  }]],
  ['index.md', []],
  ['docs/demo-run.md', []],
  ['docs/glossary.md', []],
  ['docs/index.md', []],
  ['docs/janus-explained.md', []],
  ['docs/janus-theorem.md', []],
  ['docs/omission-principle.md', []],
  ['docs/runtime-model.md', []]
]);

function expectedParagraph(text, signature, topLevelDepth = 0) {
  return { type: 'paragraph', topLevelDepth, hidden: false, text, signature };
}

const METADATA_SIGNATURE = ['text:Status: Draft', 'hardbreak', 'text:Author: Martín Nicolás Sánchez Morales', 'hardbreak', 'text:Created: 2026'].join('\u001f');
const SUBORDINATE_SIGNATURE = 'text:This nonnormative Draft is subordinate to Core Lite v0.2.';

const BOUNDARY_PROFILES = new Map([
  ['rfcs/0001-core-lite.md', [expectedParagraph(
    'This RFC is a nonnormative Draft proposal. The current primary normative baseline is core/lite/JANUS_CORE_LITE_v0.2.md. This RFC does not replace, extend, or override it.',
    ['text:This RFC is a nonnormative Draft proposal. The current primary normative baseline is', 'code:core/lite/JANUS_CORE_LITE_v0.2.md', 'text:. This RFC does not replace, extend, or override it.'].join('\u001f')
  )]],
  ['rfcs/0002-evidence-model.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0003-omission-detection.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0004-human-authority-model.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0005-governance-events.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0006-governance-evaluation-layer.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0007-audit-writer-authority.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['rfcs/0008-log-reference-model.md', [expectedParagraph('Status: Draft Author: Martín Nicolás Sánchez Morales Created: 2026', METADATA_SIGNATURE), expectedParagraph('This nonnormative Draft is subordinate to Core Lite v0.2.', SUBORDINATE_SIGNATURE)]],
  ['docs/glossary.md', [
    expectedParagraph('This glossary is normative only within its subordinate role. core/lite/JANUS_CORE_LITE_v0.2.md is the primary normative authority and controls any conflict.', ['text:This glossary is normative only within its subordinate role.', 'code:core/lite/JANUS_CORE_LITE_v0.2.md', 'text:is the primary normative authority and controls any conflict.'].join('\u001f')),
    expectedParagraph('When a subordinate glossary definition changes, dependent active specifications, documentation, and derived surfaces MUST be reviewed. Any remaining divergence MUST be recorded under the Core hierarchy. This review safeguard does not give the glossary authority to amend or override Core Lite v0.2.', 'text:When a subordinate glossary definition changes, dependent active specifications, documentation, and derived surfaces MUST be reviewed. Any remaining divergence MUST be recorded under the Core hierarchy. This review safeguard does not give the glossary authority to amend or override Core Lite v0.2.')
  ]],
  ['docs/janus-theorem.md', [expectedParagraph('This document preserves a pedagogical intuition formerly described as a “completeness property.” It is nonnormative and does not assert a theorem, exhaustive outcome algebra, runtime proof, or measurable conformance result.', 'text:This document preserves a pedagogical intuition formerly described as a “completeness property.” It is nonnormative and does not assert a theorem, exhaustive outcome algebra, runtime proof, or measurable conformance result.')]],
  ['docs/omission-principle.md', [expectedParagraph('This pedagogical note is informative and subordinate to Core Lite v0.2.', 'text:This pedagogical note is informative and subordinate to Core Lite v0.2.')]],
  ['demos/index.md', [
    { type: 'blockquote', topLevelDepth: 0 },
    expectedParagraph('Status: Informative. This index is subordinate to Core Lite v0.2, which remains Draft.', INDEX_STATUS_SIGNATURE, 1),
    expectedParagraph('The current Node demo has status LEGACY_NONCONFORMING_PENDING_GATE_3. It is an illustrative legacy surface, not an approved Core Lite v0.2 implementation, executable proof, or claim of conformance.', ['text:The current', 'link+:../runtimes/demo-node/README.md', 'text:Node demo', 'link-', 'text:has status', 'code:LEGACY_NONCONFORMING_PENDING_GATE_3', 'text:. It is an illustrative legacy surface, not an approved Core Lite v0.2 implementation, executable proof, or claim of conformance.'].join('\u001f')),
    expectedParagraph('Runtime migration and validation are deferred to Gate 3. The illustrative walkthrough describes the bounded demonstration context without authorizing direct execution.', ['text:Runtime migration and validation are deferred to Gate 3. The', 'link+:../docs/demo-run.md', 'text:illustrative walkthrough', 'link-', 'text:describes the bounded demonstration context without authorizing direct execution.'].join('\u001f')),
    expectedParagraph('Publication is BLOCKED pending Gate 6 and explicit HEAD authorization. This repository source does not assert that the future public directory route is currently available.', ['text:Publication is', 'strong+', 'text:BLOCKED', 'strong-', 'text:pending Gate 6 and explicit HEAD authorization. This repository source does not assert that the future public directory route is currently available.'].join('\u001f'))
  ]],
  ['runtimes/index.md', [
    { type: 'blockquote', topLevelDepth: 0 },
    expectedParagraph('Status: Informative. This index is subordinate to Core Lite v0.2, which remains Draft.', INDEX_STATUS_SIGNATURE, 1),
    expectedParagraph('No runtime currently proves conformance with Core Lite v0.2. The Node demo has status LEGACY_NONCONFORMING_PENDING_GATE_3; it is neither a reference implementation nor proof of conformance.', ['text:No runtime currently proves conformance with Core Lite v0.2. The', 'link+:demo-node/README.md', 'text:Node demo', 'link-', 'text:has status', 'code:LEGACY_NONCONFORMING_PENDING_GATE_3', 'text:; it is neither a reference implementation nor proof of conformance.'].join('\u001f')),
    expectedParagraph('Framework owns runtime implementation work. Runtime migration and the conformance profile are deferred to Gate 3.', 'text:Framework owns runtime implementation work. Runtime migration and the conformance profile are deferred to Gate 3.'),
    expectedParagraph('Publication is BLOCKED pending Gate 6 and explicit HEAD authorization.', ['text:Publication is', 'strong+', 'text:BLOCKED', 'strong-', 'text:pending Gate 6 and explicit HEAD authorization.'].join('\u001f'))
  ]]
]);

const TERMINAL_H2_PROFILES = new Map([
  ['rfcs/0001-core-lite.md', 'Summary'],
  ['rfcs/0002-evidence-model.md', 'Evidence classes'],
  ['rfcs/0003-omission-detection.md', 'Detection conditions'],
  ['rfcs/0004-human-authority-model.md', 'Human authority'],
  ['rfcs/0005-governance-events.md', 'Canonical set'],
  ['rfcs/0006-governance-evaluation-layer.md', 'Evaluation'],
  ['rfcs/0007-audit-writer-authority.md', 'Exclusive writer'],
  ['rfcs/0008-log-reference-model.md', 'Typed references'],
  ['docs/glossary.md', 'Audit Writer'],
  ['docs/janus-theorem.md', 'Evidence classes'],
  ['docs/omission-principle.md', 'Core idea']
]);

function headingTextAt(tokens, index) {
  const inline = tokens[index + 1];
  invariant(inline?.type === 'inline', 'H2 must be followed by inline content');
  return normalizeGovernedText(tokenInlineText(inline.children));
}

function headingSignatureAt(tokens, index) {
  const inline = tokens[index + 1];
  invariant(inline?.type === 'inline', 'H2 must be followed by inline content');
  return canonicalInlineSignature(inline.children);
}

function h2Indexes(tokens) {
  return tokens.map((token, index) => token.type === 'heading_open' && token.tag === 'h2' ? index : -1).filter((index) => index !== -1);
}

function headingCloseAfter(tokens, openingIndex, tag) {
  const index = tokens.findIndex((token, candidate) => candidate > openingIndex && token.type === 'heading_close' && token.tag === tag);
  invariant(index !== -1, `${tag} closing token is missing`);
  return index;
}

function governedDelimiterRange(sourcePath, tokens) {
  const terminalText = TERMINAL_H2_PROFILES.get(sourcePath);
  invariant(terminalText, `${sourcePath} terminal H2 profile is missing`);
  const indexes = h2Indexes(tokens);
  const terminalMatches = indexes.filter((index) => headingTextAt(tokens, index) === terminalText);
  invariant(terminalMatches.length === 1, `${sourcePath} terminal H2 ${terminalText} must occur exactly once`);
  const terminalIndex = terminalMatches[0];
  invariant(headingSignatureAt(tokens, terminalIndex) === `text:${terminalText}`, `${sourcePath} terminal H2 ${terminalText} must have an exact plain-text signature`);

  const h1Close = tokens.findIndex((token) => token.type === 'heading_close' && token.tag === 'h1');
  invariant(h1Close !== -1, `${sourcePath} H1 closing boundary is missing`);
  if (sourcePath === 'rfcs/0001-core-lite.md') {
    const openingText = 'Status and authority';
    const openingMatches = indexes.filter((index) => headingTextAt(tokens, index) === openingText);
    invariant(openingMatches.length === 1, `${sourcePath} opening H2 ${openingText} must occur exactly once`);
    const openingIndex = openingMatches[0];
    invariant(headingSignatureAt(tokens, openingIndex) === `text:${openingText}`, `${sourcePath} opening H2 ${openingText} must have an exact plain-text signature`);
    invariant(indexes.find((index) => index > h1Close) === openingIndex, `${sourcePath} opening H2 must be the first H2 after H1`);
    invariant(indexes.find((index) => index > openingIndex) === terminalIndex, `${sourcePath} ${terminalText} must be the first H2 after ${openingText}`);
    return { start: headingCloseAfter(tokens, openingIndex, 'h2') + 1, end: terminalIndex };
  }

  invariant(indexes.find((index) => index > h1Close) === terminalIndex, `${sourcePath} ${terminalText} must be the first H2 after the governed-region start`);
  return { start: h1Close + 1, end: terminalIndex };
}

function structuralBlock(token, tokens, index) {
  const typeByToken = new Map([
    ['blockquote_open', 'blockquote'], ['bullet_list_open', 'unordered-list'], ['ordered_list_open', 'ordered-list'],
    ['list_item_open', 'list-item'], ['table_open', 'table'], ['thead_open', 'table-head'],
    ['tbody_open', 'table-body'], ['tr_open', 'table-row'], ['th_open', 'table-header-cell'], ['td_open', 'table-cell'],
    ['fence', 'fence'], ['code_block', 'indented-code'], ['hr', 'thematic-break']
  ]);
  if (token.type === 'paragraph_open' || token.type === 'heading_open') {
    const inline = tokens[index + 1];
    invariant(inline?.type === 'inline', `${token.type} must be followed by inline content`);
    const base = {
      type: token.type === 'paragraph_open' ? 'paragraph' : `heading-${token.tag}`,
      topLevelDepth: token.level,
      hidden: Boolean(token.hidden),
      text: normalizeGovernedText(tokenInlineText(inline.children)),
      signature: canonicalInlineSignature(inline.children)
    };
    return base;
  }
  return { type: typeByToken.get(token.type), topLevelDepth: token.level };
}

function structuralBlocks(tokens, start, end) {
  const recognized = new Set(['paragraph_open', 'heading_open', 'blockquote_open', 'bullet_list_open', 'ordered_list_open', 'list_item_open', 'table_open', 'thead_open', 'tbody_open', 'tr_open', 'th_open', 'td_open', 'fence', 'code_block', 'hr']);
  const blocks = [];
  for (let index = start; index < end; index += 1) {
    if (recognized.has(tokens[index].type)) blocks.push(structuralBlock(tokens[index], tokens, index));
  }
  return blocks;
}

function governedBoundaryBlocks(sourcePath, record) {
  const { tokens } = record;
  if (TERMINAL_H2_PROFILES.has(sourcePath)) {
    const { start, end } = governedDelimiterRange(sourcePath, tokens);
    return structuralBlocks(tokens, start, end);
  } else {
    const start = tokens.findIndex((token) => token.type === 'heading_close' && token.tag === 'h1') + 1;
    const end = tokens.length;
    invariant(start > 0, `${sourcePath} H1 boundary is missing`);
    return structuralBlocks(tokens, start, end);
  }
}

function requireExactBoundaryProfile(sourcePath, record) {
  const actual = governedBoundaryBlocks(sourcePath, record);
  const expected = BOUNDARY_PROFILES.get(sourcePath);
  invariant(JSON.stringify(actual) === JSON.stringify(expected), `${sourcePath} authority boundary blocks differ from the exact structural profile`);
}

export async function buildIndependentSourceOracle(repoRoot, manifest, configuration) {
  const markdown = new MarkdownIt(MARKDOWN_OPTIONS);
  const sources = new Map();
  const routeBySource = new Map();
  const headingsBySource = new Map();
  const repositoryTargets = new Set(configuration.contract.repository_source_targets);
  for (const entry of manifest.outputs.filter((item) => item.source_kind === 'MARKDOWN')) {
    const absolute = await resolveRepoFile(repoRoot, entry.content_source, 'independent source input');
    const source = await readFile(absolute, 'utf8');
    invariant(!source.includes('\r'), `source must use LF: ${entry.content_source}`);
    const tokens = markdown.parse(source, {});
    const headingData = collectHeadingIds(tokens);
    invariant(headingData.h1Count === 1, `${entry.content_source} must contain exactly one H1`);
    invariant(headingData.h1Text === entry.title, `${entry.content_source} H1 must equal manifest title`);
    sources.set(entry.content_source, { entry, source, tokens, visibleParagraphs: visibleParagraphRecords(tokens) });
    routeBySource.set(entry.content_source, entry.route);
    headingsBySource.set(entry.content_source, headingData.ids);
  }
  const oracle = { repoRoot, manifest, configuration, sources, routeBySource, headingsBySource, repositoryTargets };
  for (const [sourcePath, record] of sources) record.semanticModel = await projectMarkdownTokens(record.tokens, sourcePath, oracle);
  await validateSourceStatuses(oracle, markdown);
  return oracle;
}

export async function validateSourceStatuses(oracle, markdown = new MarkdownIt(MARKDOWN_OPTIONS)) {
  const corePath = oracle.manifest.normative_authority_ref;
  const coreSource = await readFile(await resolveRepoFile(oracle.repoRoot, corePath, 'normative authority reread'), 'utf8');
  const coreTokens = markdown.parse(coreSource, {});
  const coreHeadings = collectHeadingIds(coreTokens);
  invariant(coreHeadings.h1Count === 1 && coreHeadings.h1Text === 'Janus Core Lite v0.2', 'normative authority H1 mismatch');
  requireExactStatusProfile(coreTokens, STATUS_PROFILES.get(corePath), corePath);
  invariant(oracle.manifest.normative_authority_status === 'DRAFT', 'manifest authority status must remain DRAFT');

  invariant(STATUS_PROFILES.size === oracle.sources.size + 1, 'status profile matrix must cover every rendered source plus Core');
  for (const [sourcePath, record] of oracle.sources) {
    invariant(STATUS_PROFILES.has(sourcePath), `${sourcePath} exact Status profile is missing`);
    requireExactStatusProfile(record.tokens, STATUS_PROFILES.get(sourcePath), sourcePath);
  }
  const nonTerminalBoundarySources = new Set(['demos/index.md', 'runtimes/index.md']);
  invariant(TERMINAL_H2_PROFILES.size === BOUNDARY_PROFILES.size - nonTerminalBoundarySources.size, 'terminal H2 profile matrix coverage mismatch');
  for (const [sourcePath] of BOUNDARY_PROFILES) {
    invariant(nonTerminalBoundarySources.has(sourcePath) || TERMINAL_H2_PROFILES.has(sourcePath), `${sourcePath} terminal H2 profile is missing`);
  }
  for (const [sourcePath] of BOUNDARY_PROFILES) {
    const record = oracle.sources.get(sourcePath);
    invariant(record, `${sourcePath} authority boundary source is missing`);
    requireExactBoundaryProfile(sourcePath, record);
  }
}

function validateCommonSecurity(document, html, entry, configuration, repoRoot, outputDir) {
  const forbidden = new Set(['script', 'iframe', 'form', 'object', 'embed', 'img']);
  invariant(elements(document, (node) => forbidden.has(node.tagName)).length === 0, `${entry.output} contains forbidden content`);
  invariant(elements(document, (node) => (node.attrs ?? []).some((item) => item.name.toLowerCase().startsWith('on'))).length === 0, `${entry.output} contains an event handler`);
  invariant(elements(document, (node) => node.tagName === 'link' && (attr(node, 'rel') ?? '').split(/\s+/).includes('stylesheet')).length === 0, `${entry.output} contains an external stylesheet`);
  invariant(elements(document, (node) => node.tagName === 'meta' && attr(node, 'property')?.toLowerCase() === 'og:url').length === 0, `${entry.output} contains a public Open Graph URL`);
  invariant(!html.includes(repoRoot) && !html.includes(outputDir) && !/(?:file:\/\/|\/Users\/|\/home\/|\/private\/tmp\/|[A-Za-z]:\\)/.test(html), `${entry.output} leaks a local path`);
  invariant(!html.includes('\r') && html.endsWith('\n'), `${entry.output} must use LF and a trailing newline`);
  const htmlNode = exactlyOne(elements(document, (node) => node.tagName === 'html'), `${entry.output} html root`);
  requireAttributes(htmlNode, { lang: configuration.contract.language }, `${entry.output} html root`);
  const ids = elements(document).map((node) => attr(node, 'id')).filter((value) => value !== null);
  invariant(ids.every(Boolean) && new Set(ids).size === ids.length, `${entry.output} IDs must be nonempty and unique`);
}

function validateNavigation(node, entry, configuration) {
  const chrome = configuration.contract.chrome_text;
  requireAttributes(node, { class: 'primary-navigation', 'aria-label': chrome.primary_navigation_label }, 'primary navigation');
  requireOnlyWhitespaceText(node, 'primary navigation');
  const list = exactlyOne(directElements(node).filter((child) => child.tagName === 'ul'), 'primary navigation list');
  requireAttributes(list, {}, 'primary navigation list');
  requireOnlyWhitespaceText(list, 'primary navigation list');
  const items = directElements(list);
  const expected = configuration.navigation[entry.navigation_owner];
  invariant(items.length === expected.length && items.every((item) => item.tagName === 'li'), 'primary navigation item structure mismatch');
  for (let index = 0; index < expected.length; index += 1) {
    requireAttributes(items[index], {}, 'primary navigation item');
    requireOnlyWhitespaceText(items[index], 'primary navigation item');
    const link = exactlyOne(directElements(items[index]).filter((child) => child.tagName === 'a'), 'primary navigation link');
    requireAttributes(link, { href: expected[index].route }, 'primary navigation link');
    invariant(attr(link, 'href') === expected[index].route && textContent(link) === expected[index].label, 'primary navigation content mismatch');
  }
}

function validateBreadcrumb(node, entry, configuration) {
  const chrome = configuration.contract.chrome_text;
  requireAttributes(node, { class: 'breadcrumb', 'aria-label': chrome.breadcrumb_label }, 'breadcrumb');
  requireOnlyWhitespaceText(node, 'breadcrumb');
  const list = exactlyOne(directElements(node).filter((child) => child.tagName === 'ol'), 'breadcrumb list');
  requireAttributes(list, {}, 'breadcrumb list');
  requireOnlyWhitespaceText(list, 'breadcrumb list');
  const items = directElements(list);
  invariant(items.length === (entry.route === '/' ? 1 : 2) && items.every((item) => item.tagName === 'li'), 'breadcrumb item count mismatch');
  if (entry.route !== '/') {
    requireAttributes(items[0], {}, 'breadcrumb home item');
    requireOnlyWhitespaceText(items[0], 'breadcrumb home item');
    const home = exactlyOne(directElements(items[0]).filter((child) => child.tagName === 'a'), 'breadcrumb home link');
    requireAttributes(home, { href: '/' }, 'breadcrumb home link');
    invariant(attr(home, 'href') === '/' && textContent(home) === chrome.breadcrumb_home, 'breadcrumb home mismatch');
  }
  const current = items.at(-1);
  requireAttributes(current, { 'aria-current': 'page' }, 'breadcrumb current item');
  invariant(attr(current, 'aria-current') === 'page' && textContent(current) === entry.title, 'breadcrumb current item mismatch');
}

function validateStatusPanel(node, entry, manifest, configuration) {
  const chrome = configuration.contract.chrome_text;
  requireAttributes(node, { class: 'status-panel' }, 'status panel');
  const children = directElements(node);
  invariant(children.length === 2 && children.every((child) => child.tagName === 'p'), 'status panel structure mismatch');
  invariant(textContent(children[0]) === `${chrome.document_status_prefix} ${entry.document_status}`, 'document status chrome mismatch');
  invariant(textContent(children[1]) === `${chrome.authority_prefix} ${chrome.authority_name} ${manifest.normative_authority_status}`, 'authority chrome mismatch');
  requireAttributes(children[0], { class: 'document-status' }, 'document status paragraph');
  requireAttributes(children[1], { class: 'authority-badge' }, 'authority paragraph');
  const statusSpans = directElements(children[0]);
  const authoritySpans = directElements(children[1]);
  invariant(statusSpans.length === 2 && authoritySpans.length === 3, 'status panel span structure mismatch');
  requireAttributes(statusSpans[0], { class: 'document-status-prefix' }, 'status prefix');
  requireAttributes(statusSpans[1], { class: 'document-status-value' }, 'status value');
  requireAttributes(authoritySpans[0], { class: 'authority-prefix' }, 'authority prefix');
  requireAttributes(authoritySpans[1], { class: 'authority-name' }, 'authority name');
  requireAttributes(authoritySpans[2], { class: 'authority-status' }, 'authority status');
}

function validateFooter(node, entry, manifest, configuration, sourceHash) {
  const chrome = configuration.contract.chrome_text;
  requireAttributes(node, { class: 'technical-footer' }, 'technical footer');
  const paragraph = exactlyOne(directElements(node).filter((child) => child.tagName === 'p'), 'technical footer paragraph');
  requireAttributes(paragraph, {}, 'technical footer paragraph');
  const groups = directElements(paragraph);
  invariant(groups.length === 3 && groups.every((group) => group.tagName === 'span'), 'technical footer group count mismatch');
  const expected = [
    `${chrome.contract_label} ${manifest.contract_version}`,
    `${chrome.generator_label} ${configuration.contract.generator_version}`,
    `${chrome.source_hash_label} ${sourceHash}`
  ];
  const groupClasses = ['contract-version', 'generator-version', 'source-hash'];
  for (let index = 0; index < groups.length; index += 1) {
    requireAttributes(groups[index], { class: groupClasses[index] }, 'technical footer group');
    const label = exactlyOne(directElements(groups[index]), 'technical footer label');
    invariant(label.tagName === 'span', 'technical footer label tag mismatch');
    requireAttributes(label, { class: 'technical-label' }, 'technical footer label');
    invariant(textContent(groups[index]) === expected[index], 'technical footer content mismatch');
  }
  invariant(textContent(node) === expected.join(' '), 'technical footer contains injected prose');
  invariant(entry.publication_state === 'BLOCKED', 'footer validation requires blocked entry');
}

function validateExactHead(document, entry, configuration) {
  const head = exactlyOne(elements(document, (node) => node.tagName === 'head'), 'head');
  requireAttributes(head, {}, 'head');
  requireOnlyWhitespaceText(head, 'head');
  const children = directElements(head);
  const alias = entry.source_kind === 'ALIAS';
  invariant(children.length === (alias ? 8 : 6), `${entry.output} head child count mismatch`);
  const [charset, viewport, robots, description, title] = children;
  invariant(charset.tagName === 'meta' && viewport.tagName === 'meta' && robots.tagName === 'meta' && description.tagName === 'meta' && title.tagName === 'title', `${entry.output} head order mismatch`);
  requireAttributes(charset, { charset: 'utf-8' }, 'charset meta');
  requireAttributes(viewport, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, 'viewport meta');
  requireAttributes(robots, { name: 'robots', content: configuration.contract.robots }, 'robots meta');
  requireAttributes(description, { name: 'description', content: entry.description }, 'description meta');
  requireAttributes(title, {}, 'title');
  invariant(textContent(title) === entry.title, 'document title mismatch');
  let style;
  if (alias) {
    const refresh = children[5];
    const canonical = children[6];
    invariant(refresh.tagName === 'meta' && canonical.tagName === 'link', 'alias head order mismatch');
    requireAttributes(refresh, { 'http-equiv': 'refresh', content: `0;url=${entry.alias_target}` }, 'alias refresh');
    requireAttributes(canonical, { rel: 'canonical', href: entry.alias_target }, 'alias canonical');
    style = children[7];
  } else style = children[5];
  invariant(style.tagName === 'style', 'reviewed inline style position mismatch');
  requireAttributes(style, { 'data-janus-template-style': '' }, 'reviewed inline style');
  invariant(textContent(style).trim() === configuration.style.trim(), 'inline style differs from reviewed CSS');
}

function validateClosedChrome(document, entry, manifest, configuration, sourceHash) {
  const chrome = configuration.contract.chrome_text;
  validateExactHead(document, entry, configuration);
  const body = exactlyOne(elements(document, (node) => node.tagName === 'body'), 'body');
  requireAttributes(body, {}, 'body');
  requireOnlyWhitespaceText(body, 'body');
  const bodyElements = directElements(body);
  invariant(bodyElements.length === 5, `${entry.output} body must contain exactly five chrome/content structures`);
  const [skip, header, breadcrumb, main, footer] = bodyElements;
  invariant(skip.tagName === 'a' && textContent(skip) === chrome.skip_link, 'skip link mismatch');
  requireAttributes(skip, { class: 'skip-link', href: '#main-content' }, 'skip link');
  invariant(header.tagName === 'header', 'site header structure mismatch');
  requireAttributes(header, { class: 'site-header' }, 'site header');
  requireOnlyWhitespaceText(header, 'site header');
  const headerChildren = directElements(header);
  invariant(headerChildren.length === 3, 'site header contains undeclared chrome');
  invariant(headerChildren[0].tagName === 'p' && headerChildren[1].tagName === 'p', 'site header text structures must be paragraphs');
  requireAttributes(headerChildren[0], { class: 'site-name' }, 'site name');
  invariant(textContent(headerChildren[0]) === chrome.site_name, 'site name mismatch');
  requireAttributes(headerChildren[1], { class: 'publication-block', role: 'status' }, 'publication block');
  invariant(textContent(headerChildren[1]) === chrome.blocked_banner, 'publication block mismatch');
  invariant(headerChildren[2].tagName === 'nav' && hasClass(headerChildren[2], 'primary-navigation'), 'primary navigation structure mismatch');
  validateNavigation(headerChildren[2], entry, configuration);
  invariant(breadcrumb.tagName === 'nav' && hasClass(breadcrumb, 'breadcrumb'), 'breadcrumb structure mismatch');
  validateBreadcrumb(breadcrumb, entry, configuration);
  invariant(main.tagName === 'main', 'main landmark mismatch');
  requireAttributes(main, { id: 'main-content' }, 'main landmark');
  requireOnlyWhitespaceText(main, 'main landmark');
  const mainChildren = directElements(main);
  invariant(mainChildren.length === 2 && mainChildren[0].tagName === 'section' && hasClass(mainChildren[0], 'status-panel') && mainChildren[1].tagName === 'article', 'main contains undeclared chrome or prose');
  validateStatusPanel(mainChildren[0], entry, manifest, configuration);
  invariant(footer.tagName === 'footer', 'technical footer structure mismatch');
  validateFooter(footer, entry, manifest, configuration, sourceHash);
  return { main, article: mainChildren[1] };
}

function validateAliasDom(document, article, entry, manifest, configuration) {
  const chrome = configuration.contract.chrome_text;
  requireAttributes(article, { class: 'alias-fallback' }, 'alias article');
  requireOnlyWhitespaceText(article, 'alias fallback');
  const children = directElements(article);
  invariant(children.length === 2 && children[0].tagName === 'h1' && children[1].tagName === 'p', 'alias fallback exact structure mismatch');
  requireAttributes(children[0], {}, 'alias heading');
  requireAttributes(children[1], {}, 'alias paragraph');
  invariant(textContent(children[0]) === entry.title, 'alias H1 mismatch');
  const paragraph = children[1];
  const links = directElements(paragraph);
  invariant(links.length === 1 && links[0].tagName === 'a', 'alias must contain exactly one fallback link');
  requireAttributes(links[0], { href: entry.alias_target }, 'alias fallback link');
  invariant(attr(links[0], 'href') === entry.alias_target && textContent(links[0]) === entry.title, 'alias fallback link mismatch');
  const textNodes = paragraph.childNodes.filter((node) => node.nodeName === '#text').map((node) => node.value);
  invariant(JSON.stringify(textNodes) === JSON.stringify([`${chrome.alias_continue_prefix} `, chrome.alias_continue_suffix]), 'alias prefix or suffix mismatch');
  const refresh = exactlyOne(elements(document, (node) => node.tagName === 'meta' && attr(node, 'http-equiv')?.toLowerCase() === 'refresh'), 'alias refresh');
  invariant(attr(refresh, 'content') === `0;url=${entry.alias_target}`, 'alias refresh target mismatch');
  const canonical = exactlyOne(elements(document, (node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical'), 'alias canonical');
  invariant(attr(canonical, 'href') === entry.alias_target && !/^https?:/i.test(entry.alias_target), 'alias canonical target mismatch');
  invariant(elements(document, (node) => node.tagName === 'h1').length === 1, 'alias must contain exactly one H1');
  invariant(manifest.outputs.some((candidate) => candidate.source_kind === 'MARKDOWN' && candidate.route === entry.alias_target), 'alias target must resolve directly to Markdown');
}

function validateRepositoryIndicators(article, configuration) {
  const chrome = configuration.contract.chrome_text;
  const repositoryLinks = elements(article, (node) => node.tagName === 'a' && attr(node, 'data-janus-link-kind') === 'repository-source');
  const indicators = elements(article, (node) => hasClass(node, 'repository-source-indicator'));
  invariant(indicators.length === repositoryLinks.length, 'repository-source indicator count mismatch');
  for (const indicator of indicators) {
    invariant(attr(indicator, 'aria-label') === chrome.repository_source_indicator_aria, 'repository-source indicator aria mismatch');
    invariant(textContent(indicator).trim() === chrome.repository_source_indicator_visible, 'repository-source indicator visible text mismatch');
  }
}

export async function verifyGeneratedSite({ repoRoot, outputDir, manifest, configuration }) {
  const oracle = await buildIndependentSourceOracle(repoRoot, manifest, configuration);
  const actualPaths = await listFiles(outputDir);
  const expectedPaths = manifest.outputs.map((entry) => entry.output);
  invariant(JSON.stringify(actualPaths) === JSON.stringify(expectedPaths), 'generated output allowlist differs from manifest');
  const parsedByOutput = new Map();

  for (const entry of manifest.outputs) {
    const absolute = path.join(outputDir, ...entry.output.split('/'));
    const bytes = await readFile(absolute);
    const html = bytes.toString('utf8');
    invariant(Buffer.from(html, 'utf8').equals(bytes), `${entry.output} is not valid UTF-8`);
    const document = parseStrict(html, entry.output);
    validateCommonSecurity(document, html, entry, configuration, repoRoot, outputDir);
    const sourceHash = entry.source_kind === 'MARKDOWN'
      ? sha256(oracle.sources.get(entry.content_source).source)
      : sha256(JSON.stringify({ output: entry.output, alias_target: entry.alias_target }));
    const { article } = validateClosedChrome(document, entry, manifest, configuration, sourceHash);
    if (entry.source_kind === 'MARKDOWN') {
      requireAttributes(article, { 'data-janus-source-content': entry.content_source }, `${entry.output} source article`);
      const actualModel = domBlocks(article.childNodes ?? [], configuration.contract.chrome_text);
      const expectedModel = oracle.sources.get(entry.content_source).semanticModel;
      invariant(
        JSON.stringify(actualModel) === JSON.stringify(expectedModel),
        `${entry.output} independent Markdown-token/DOM semantic comparison failed: expected=${JSON.stringify(expectedModel)} actual=${JSON.stringify(actualModel)}`
      );
      validateRepositoryIndicators(article, configuration);
      invariant(elements(document, (node) => node.tagName === 'meta' && attr(node, 'http-equiv')?.toLowerCase() === 'refresh').length === 0, 'Markdown output may not redirect');
      invariant(elements(document, (node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical').length === 0, 'blocked Markdown output may not declare canonical');
    } else validateAliasDom(document, article, entry, manifest, configuration);
    parsedByOutput.set(entry.output, document);
  }
  return orderedOutputManifest(expectedPaths, outputDir);
}

export async function orderedOutputManifest(paths, outputDir) {
  const records = [];
  for (const output of paths) {
    const bytes = await readFile(path.join(outputDir, ...output.split('/')));
    records.push({ output, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const serialized = records.map((record) => `${record.sha256}  ${record.output}\n`).join('');
  return { records, sha256: sha256(serialized) };
}

export function staticVerifierImportsAreIndependent(sourceText) {
  const imports = sourceText.split('\n').filter((line) => /^import\b/.test(line.trim())).join('\n');
  return !/from\s+['"]\.\/render\.mjs['"]|from\s+['"]\.\/markdown\.mjs['"]/.test(imports);
}
