import { createHash } from 'node:crypto';
import { invariant } from './contract.mjs';
import { prepareMarkdownContext, renderMarkdownSource } from './markdown.mjs';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function escapeText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function escapeAttribute(value) {
  return escapeText(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function navigationHtml(entry, configuration) {
  const items = configuration.navigation[entry.navigation_owner];
  invariant(items, `missing navigation owner: ${entry.navigation_owner}`);
  const links = items
    .map((item) => `<li><a href="${escapeAttribute(item.route)}">${escapeText(item.label)}</a></li>`)
    .join('');
  return `<nav class="primary-navigation" aria-label="${escapeAttribute(configuration.contract.chrome_text.primary_navigation_label)}"><ul>${links}</ul></nav>\n`;
}

function breadcrumbHtml(entry, configuration) {
  const chrome = configuration.contract.chrome_text;
  const home = entry.route === '/'
    ? ''
    : `<li><a href="/">${escapeText(chrome.breadcrumb_home)}</a></li>`;
  return `<nav class="breadcrumb" aria-label="${escapeAttribute(chrome.breadcrumb_label)}"><ol>${home}<li aria-current="page">${escapeText(entry.title)}</li></ol></nav>\n`;
}

function statusHtml(entry, manifest, configuration) {
  const chrome = configuration.contract.chrome_text;
  return `<section class="status-panel"><p class="document-status"><span class="document-status-prefix">${escapeText(chrome.document_status_prefix)}</span> <span class="document-status-value">${escapeText(entry.document_status)}</span></p><p class="authority-badge"><span class="authority-prefix">${escapeText(chrome.authority_prefix)}</span> <span class="authority-name">${escapeText(chrome.authority_name)}</span> <span class="authority-status">${escapeText(manifest.normative_authority_status)}</span></p></section>\n`;
}

function footerHtml(manifest, configuration, sourceHash) {
  const chrome = configuration.contract.chrome_text;
  return `<footer class="technical-footer"><p><span class="contract-version"><span class="technical-label">${escapeText(chrome.contract_label)}</span> ${escapeText(manifest.contract_version)}</span> <span class="generator-version"><span class="technical-label">${escapeText(chrome.generator_label)}</span> ${escapeText(configuration.contract.generator_version)}</span> <span class="source-hash"><span class="technical-label">${escapeText(chrome.source_hash_label)}</span> ${escapeText(sourceHash)}</span></p></footer>\n`;
}

function applyTemplate(configuration, values) {
  let html = configuration.template;
  for (const [name, value] of Object.entries(values)) {
    const marker = `{{${name}}}`;
    invariant(html.includes(marker), `base template marker is missing: ${marker}`);
    html = html.replace(marker, value);
  }
  invariant(!/\{\{[A-Z_]+\}\}/.test(html), 'unresolved base template marker');
  invariant(!html.includes('\r'), 'generated output must use LF line endings');
  return html.endsWith('\n') ? html : `${html}\n`;
}

function renderBase(entry, manifest, configuration, { headExtra = '', mainContent, sourceHash }) {
  return applyTemplate(configuration, {
    LANG: escapeAttribute(configuration.contract.language),
    ROBOTS: escapeAttribute(configuration.contract.robots),
    DESCRIPTION: escapeAttribute(entry.description),
    TITLE: escapeText(entry.title),
    HEAD_EXTRA: headExtra,
    STYLE: configuration.style,
    SITE_NAME: escapeText(configuration.contract.chrome_text.site_name),
    SKIP_LINK: escapeText(configuration.contract.chrome_text.skip_link),
    BLOCKED_BANNER: escapeText(configuration.contract.chrome_text.blocked_banner),
    NAVIGATION: navigationHtml(entry, configuration),
    BREADCRUMB: breadcrumbHtml(entry, configuration),
    MAIN_CONTENT: mainContent,
    FOOTER: footerHtml(manifest, configuration, sourceHash)
  });
}

async function renderMarkdownPage(entry, manifest, configuration, markdownContext) {
  const rendered = await renderMarkdownSource(entry.content_source, markdownContext);
  const source = markdownContext.sourceEntries.get(entry.content_source).source;
  const mainContent = `${statusHtml(entry, manifest, configuration)}<article data-janus-source-content="${escapeAttribute(entry.content_source)}">\n${rendered.html}</article>\n`;
  return {
    content: renderBase(entry, manifest, configuration, {
      mainContent,
      sourceHash: sha256(source)
    }),
    sourceContentHtml: rendered.html,
    sourceHash: sha256(source)
  };
}

function renderAliasPage(entry, manifest, configuration) {
  const target = escapeAttribute(entry.alias_target);
  const chrome = configuration.contract.chrome_text;
  const headExtra = `<meta http-equiv="refresh" content="0;url=${target}">\n<link rel="canonical" href="${target}">\n`;
  const status = statusHtml(entry, manifest, configuration);
  const mainContent = `${status}<article class="alias-fallback"><h1>${escapeText(entry.title)}</h1><p>${escapeText(chrome.alias_continue_prefix)} <a href="${target}">${escapeText(entry.title)}</a>${escapeText(chrome.alias_continue_suffix)}</p></article>\n`;
  const sourceHash = sha256(JSON.stringify({ output: entry.output, alias_target: entry.alias_target }));
  return {
    content: renderBase(entry, manifest, configuration, { headExtra, mainContent, sourceHash }),
    sourceContentHtml: null,
    sourceHash
  };
}

export async function buildExpectedSite(repoRoot, manifest, configuration) {
  const markdownContext = await prepareMarkdownContext(repoRoot, manifest, configuration.contract);
  const pages = new Map();
  for (const entry of manifest.outputs) {
    const page = entry.source_kind === 'MARKDOWN'
      ? await renderMarkdownPage(entry, manifest, configuration, markdownContext)
      : renderAliasPage(entry, manifest, configuration);
    pages.set(entry.output, { entry, ...page });
  }
  return { pages, markdownContext };
}
