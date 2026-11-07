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

/** Obsidian callout names (and aliases) → canonical type. */
const CALLOUT_ALIASES: Record<string, string> = {
  note: 'note',
  abstract: 'abstract',
  summary: 'abstract',
  tldr: 'abstract',
  info: 'info',
  todo: 'todo',
  tip: 'tip',
  hint: 'tip',
  important: 'tip',
  success: 'success',
  check: 'success',
  done: 'success',
  question: 'question',
  help: 'question',
  faq: 'question',
  warning: 'warning',
  caution: 'warning',
  attention: 'warning',
  failure: 'failure',
  fail: 'failure',
  missing: 'failure',
  danger: 'danger',
  error: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  cite: 'quote',
};

/**
 * `[!type]`, optional `+`/`-` fold marker, optional inline title, then the
 * rest of the line. Only matches at the very start of the paragraph.
 */
const MARKER_RE = /^\[!([A-Za-z][\w-]*)\]([+-]?)([^\n]*)(?:\n|$)/;

function element(
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = []
): HastNode {
  return { type: 'element', tagName, properties, children };
}

/** "tldr" → "Tldr", "fail" → "Fail" (default title keeps the typed name). */
function defaultTitle(rawType: string): string {
  return rawType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** True when a node still contains something visible (a lone <br> does not). */
function hasContent(node: HastNode): boolean {
  if (!node.children) return false;
  return node.children.some((child) => {
    if (child.type === 'text') return (child.value ?? '').trim() !== '';
    return child.type === 'element' && child.tagName !== 'br';
  });
}

/**
 * Turn one blockquote whose first paragraph starts with `[!type]` into a
 * callout node. Returns null when the blockquote is not a callout, so the
 * caller can leave it untouched.
 */
function buildCallout(blockquote: HastNode): HastNode | null {
  const children = blockquote.children ?? [];

  // mdast-util-to-hast inserts literal newline text nodes around the
  // paragraph, so the first meaningful child is not always children[0].
  const firstIndex = children.findIndex(
    (child) =>
      child.type === 'element' ||
      (child.type === 'text' && (child.value ?? '').trim() !== '')
  );
  const first = firstIndex >= 0 ? children[firstIndex] : undefined;
  if (!first || first.type !== 'element' || first.tagName !== 'p') return null;

  const firstChild = first.children?.[0];
  if (!firstChild || firstChild.type !== 'text') return null;

  const match = MARKER_RE.exec(firstChild.value ?? '');
  if (!match) return null;

  const rawType = match[1].toLowerCase();
  const type = CALLOUT_ALIASES[rawType];
  if (!type) return null;

  const fold = match[2];
  const foldable = fold === '+' || fold === '-';
  const title = match[3].trim() || defaultTitle(rawType);

  // Drop the marker, keeping anything that followed it on the same line.
  firstChild.value = (firstChild.value ?? '').slice(match[0].length);
  if (firstChild.value === '') {
    first.children = first.children?.filter((child) => child !== firstChild);
  }

  const contentChildren = hasContent(first)
    ? [first, ...children.slice(firstIndex + 1)]
    : children.slice(firstIndex + 1);

  const titleChildren: HastNode[] = [
    element('span', { className: ['callout-icon'], 'aria-hidden': 'true' }),
    element('span', { className: ['callout-title-text'] }, [
      { type: 'text', value: title },
    ]),
  ];
  if (foldable) {
    titleChildren.push(
      element('span', { className: ['callout-fold-icon'], 'aria-hidden': 'true' })
    );
  }

  const titleNode = element(
    foldable ? 'summary' : 'div',
    { className: ['callout-title'] },
    titleChildren
  );

  const content: HastNode[] = contentChildren.length
    ? [element('div', { className: ['callout-content'] }, contentChildren)]
    : [];

  const properties: Record<string, unknown> = {
    className: ['callout'],
    'data-callout': type,
    'data-collapsible': foldable ? 'true' : 'false',
  };
  if (fold === '+') properties.open = true;

  return element(foldable ? 'details' : 'div', properties, [titleNode, ...content]);
}

/**
 * Recurse bottom-up so nested callouts are converted before their parent
 * blockquote is inspected.
 */
function transformChildren(node: HastNode): void {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    transformChildren(child);
    if (child.type === 'element' && child.tagName === 'blockquote') {
      const callout = buildCallout(child);
      if (callout) node.children[i] = callout;
    }
  }
}

/**
 * Rehype plugin (runs after sanitize): rewrites Obsidian-style blockquote
 * callouts (`> [!note] Title`) into `<div class="callout">` / `<details>`
 * nodes. Because it runs after sanitize, the generated class and data
 * attributes survive, and no attribute from the paste author is trusted.
 */
export function rehypeCallouts() {
  return (tree: HastNode): void => {
    transformChildren(tree);
  };
}
