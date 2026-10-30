import GithubSlugger from 'github-slugger';

/**
 * Minimal hast node shape for local traversal. Kept structural (instead of
 * importing @types/hast) so this module has no type dependencies.
 */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * mdast-util-to-hast hardcodes a `user-content-` prefix into footnote ids
 * (to mimic GitHub), and hast-util-sanitize then clobbers `id` attributes
 * with the same prefix again. The result is `user-content-user-content-fn-1`
 * while the matching href stays `#user-content-fn-1`, so footnote links
 * (reference → definition and backref → reference) never resolve.
 *
 * Collapse the doubled prefix back into a single one. Only ids that literally
 * start with the doubled prefix are rewritten, so the output keeps the
 * `user-content-` protection against DOM clobbering.
 */
const DOUBLE_PREFIX = 'user-content-user-content-';
const SINGLE_PREFIX = 'user-content-';

function walk(node: HastNode, visit: (node: HastNode) => void): void {
  visit(node);
  if (node.children) {
    for (const child of node.children) walk(child, visit);
  }
}

/** Rehype plugin: fix the doubled clobber prefix on footnote ids. */
export function rehypeFootnoteIds() {
  return (tree: HastNode) => {
    walk(tree, (node) => {
      const id = node.properties?.id;
      if (typeof id === 'string' && id.startsWith(DOUBLE_PREFIX)) {
        node.properties!.id = SINGLE_PREFIX + id.slice(DOUBLE_PREFIX.length);
      }
    });
  };
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// Text inside these elements is left untouched: code must stay verbatim and
// existing anchors must not gain nested links.
const SKIP_TAGS = new Set(['pre', 'code', 'a']);

// [[#Some Heading]] → <a href="#some-heading">Some Heading</a>
const TOC_RE = /\[\[#([^\]\n]+)\]\]/g;

// ^superscript^ → <sup>superscript</sup> (single line; content must start
// and end with a non-space so lone carets like "^ atau ^^" stay literal)
const SUP_RE = /\^(\S(?:[^\^\n]*\S)?)\^/g;

/** Flattened plain text of a node (like a browser's textContent). */
function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (!node.children) return '';
  return node.children.map(textContent).join('');
}

function element(tagName: string, children: HastNode[], href?: string): HastNode {
  return {
    type: 'element',
    tagName,
    properties: href === undefined ? {} : { href },
    children,
  };
}

/**
 * Rehype plugin (runs after sanitize):
 *
 * - gives every heading without an id a GitHub-style slug id
 *   (unicode-safe, duplicates get a `-1` suffix — same algorithm as GitHub);
 * - rewrites [[#Heading]] into a link to that heading (or to the slugified
 *   text when no matching heading exists);
 * - rewrites ^text^ into <sup>text</sup>.
 *
 * A fresh slugger is created per run because the shared unified processors
 * are reused across requests.
 */
export function rehypeHeadingToc() {
  return (tree: HastNode) => {
    const slugger = new GithubSlugger();
    /** Base slug (without duplicate suffix) → id of first heading using it. */
    const slugToId = new Map<string, string>();

    // Pass 1 — assign heading ids.
    walk(tree, (node) => {
      if (
        node.type !== 'element' ||
        !node.tagName ||
        !HEADING_TAGS.has(node.tagName) ||
        !node.properties ||
        node.properties.id !== undefined
      ) {
        return;
      }

      const text = textContent(node).trim();
      if (!text) return;

      const id = slugger.slug(text);
      node.properties.id = id;

      const baseSlug = new GithubSlugger().slug(text);
      if (!slugToId.has(baseSlug)) slugToId.set(baseSlug, id);
    });

    /** ^text^ segments as sibling nodes. */
    const toSupNodes = (text: string): HastNode[] => {
      const out: HastNode[] = [];
      let lastIndex = 0;
      for (const match of text.matchAll(SUP_RE)) {
        const index = match.index ?? 0;
        if (index > lastIndex) out.push({ type: 'text', value: text.slice(lastIndex, index) });
        out.push(element('sup', [{ type: 'text', value: match[1] }]));
        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) out.push({ type: 'text', value: text.slice(lastIndex) });
      return out;
    };

    /** One text node → replacement nodes ([[#...]] links + ^...^ sups). */
    const transformText = (text: string): HastNode[] => {
      const out: HastNode[] = [];
      let lastIndex = 0;
      for (const match of text.matchAll(TOC_RE)) {
        const index = match.index ?? 0;
        if (index > lastIndex) out.push(...toSupNodes(text.slice(lastIndex, index)));

        const label = match[1].trim();
        const baseSlug = new GithubSlugger().slug(label);
        const id = slugToId.get(baseSlug) ?? baseSlug;
        out.push(element('a', [{ type: 'text', value: label }], '#' + id));

        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) out.push(...toSupNodes(text.slice(lastIndex)));
      return out;
    };

    // Pass 2 — rewrite text nodes.
    const processChildren = (node: HastNode): void => {
      if (!node.children) return;
      if (node.type === 'element' && node.tagName && SKIP_TAGS.has(node.tagName)) return;

      const out: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === 'element') {
          processChildren(child);
          out.push(child);
        } else if (child.type === 'text') {
          out.push(...transformText(child.value ?? ''));
        } else {
          out.push(child);
        }
      }
      node.children = out;
    };

    processChildren(tree);
  };
}
