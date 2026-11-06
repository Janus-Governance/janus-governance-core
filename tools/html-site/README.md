# Janus deterministic HTML site tool

This private tool derives temporary HTML from `site/source-manifest.json`. The manifest is the sole source-to-output authority. `generation-contract.json`, `navigation.json`, the template, and the stylesheet are subordinate technical configuration: they cannot add outputs, content sources, assets, authority, or publication permission.

The tool never reads tracked HTML or `sitemap.xml`. Generated output must be outside the repository and is not copied back by these commands.

## Toolchain

- Node.js `24.13.1`
- npm `11.8.0`
- `markdown-it` `14.3.3`, with `html`, `linkify`, `typographer`, and `breaks` disabled and no plugins
- `parse5` `7.3.0`

Install dependencies only in an isolated copy with lifecycle scripts disabled. Do not create repository `node_modules`.

## Commands

Both commands require explicit paths:

    node generate.mjs --repo-root /absolute/repository --output-dir /absolute/empty/output
    node check.mjs --repo-root /absolute/repository --output-dir /absolute/generated/output

The output directory must resolve outside the repository, must not be `/`, `/tmp`, or `/private/tmp`, and must be empty before generation. Existing symlink escapes are rejected.

## Heading identifiers

For each document, heading identifiers are generated in source order:

1. Normalize visible heading text with Unicode `NFKD`.
2. Convert to lowercase with JavaScript `toLowerCase`, without locale-dependent rules.
3. Remove combining marks.
4. Replace every run of characters other than Unicode letters and numbers with `-`.
5. Trim leading and trailing `-` characters and collapse repeated `-` characters.
6. Use `section` when normalization would otherwise be empty.
7. For repetitions, retain the first identifier and append stable suffixes `-2`, `-3`, and so on.

Local fragments are validated against these generated identifiers.

## Link classes

- Rendered-source links resolve a declared Markdown source and are rewritten to its manifest route.
- Repository-source links are limited to the eight paths in `generation-contract.json`, use the fixed commit-pinned GitHub base declared there, and receive a visible `[repository source]` indicator. Repository-source fragments are not supported in generator v1.
- Other local Markdown, missing, directory, escaping, ambiguous, or invalid-fragment targets fail.
- External links are limited to the explicitly declared safe schemes. Protocol-relative and unsafe or unknown schemes fail.

## Publication and semantic boundary

Every output visibly states `Publication blocked`, declares `noindex,nofollow`, and exposes manifest-derived document status plus the Draft governing authority. Alias output is limited to the two manifest aliases, uses no JavaScript, and provides a relative canonical target, deterministic meta refresh, and visible fallback.

All visible non-source content derives from reviewed `chrome_text`, navigation, or manifest fields and must satisfy the independent exact-DOM allowlist. The visible chrome boundary is also closed by byte-exact, versioned hashes for the generation contract, navigation, marker-only base template, and inline stylesheet. The checker enforces exact attributes and exact ordered `head` structure, extracts structured status only from visible Markdown paragraphs, preserves tight-versus-loose list semantics, and requires every repository-source indicator to be immediately adjacent to its link.

The checker is independent from `render.mjs` and `markdown.mjs`. It reads Markdown directly, creates its own exact-option `markdown-it` parser, projects tokens into an ordered semantic model, parses actual output with parse5, projects the source-content DOM separately, and compares the models. Added, omitted, reordered, or changed headings, prose, lists, blockquotes, formatting, code, tables, links, IDs, and breaks fail. Source H1, status, hierarchy, routes, aliases, and links are independently checked. A technical pass is not conformance, release, promotion, publication authorization, or Gate 1 closure.

Tests require a nonexistent absolute `JANUS_TEST_TMP_ROOT` whose basename starts with `janus-html-test.` and whose direct parent is a guarded task-created directory containing `.janus-task-root`. The guard rejects repository paths, broad roots, existing paths, and symlinks before the first test write.

Output creation revalidates parent containment, rejects symlink components, creates restrictive directories, and opens each leaf exclusively with no-follow semantics where supported. These checks mitigate concurrent hostile-host races; they do not claim to eliminate every filesystem race.
