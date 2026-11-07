import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { BundledLanguage } from 'shiki';
import { rehypeFootnoteIds, rehypeHeadingToc } from './rehype-postprocess';
import { rehypeMermaid } from './rehype-mermaid';

/**
 * GitHub-style sanitization schema.
 *
 * The default schema already drops scripts, event handlers and dangerous
 * URL protocols. We additionally strip the contents of elements that are not
 * rendered but would otherwise leak their text (for example CSS from <style>).
 */
const sanitizeSchema = {
  ...defaultSchema,
  strip: [
    ...(defaultSchema.strip ?? []),
    'style',
    'title',
    'textarea',
    'xmp',
    'plaintext',
    'noscript',
  ],
};

/**
 * Languages loaded up front. Anything else is loaded on demand by Shiki
 * (`lazy: true`). Loading every bundled language costs several seconds on a
 * cold start, so this list is intentionally small.
 */
const SHIKI_LANGS: BundledLanguage[] = [
  'js',
  'ts',
  'jsx',
  'tsx',
  'json',
  'bash',
  'python',
  'html',
  'css',
  'md',
  'yaml',
  'diff',
];

const HAS_FENCE = /(?:^|\n)\s*(?:>\s*)*(?:```|~~~)/;
const HAS_MERMAID = /(?:^|\n)\s*(?:>\s*)*```\s*mermaid\b/;

function createProcessor(highlight: boolean, mermaid: boolean) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    // After sanitize: generated heading ids and [[#...]] links must not be
    // stripped, and footnote ids need their doubled clobber prefix repaired.
    .use(rehypeFootnoteIds)
    .use(rehypeHeadingToc);

  if (mermaid) {
    processor.use(rehypeMermaid);
  }

  if (highlight) {
    processor.use(rehypeShiki, {
      theme: 'kanagawa-wave',
      langs: SHIKI_LANGS,
      lazy: true,
      fallbackLanguage: 'text',
    });
  }

  return processor.use(rehypeStringify);
}

// Processors are stateless between runs, so they can be reused across requests.
const processors = {
  highlight: createProcessor(true, false),
  highlightMermaid: createProcessor(true, true),
  plain: createProcessor(false, false),
  plainMermaid: createProcessor(false, true),
};

export async function processMarkdown(content: string): Promise<string> {
  const hasFence = HAS_FENCE.test(content);
  const hasMermaid = HAS_MERMAID.test(content);

  let processor;
  if (hasFence) {
    processor = hasMermaid ? processors.highlightMermaid : processors.highlight;
  } else {
    processor = hasMermaid ? processors.plainMermaid : processors.plain;
  }

  const file = await processor.process(content);

  return String(file);
}
