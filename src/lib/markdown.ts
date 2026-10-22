import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { BundledLanguage } from 'shiki';

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

function createProcessor(highlight: boolean) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema);

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
  highlight: createProcessor(true),
  plain: createProcessor(false),
};

export async function processMarkdown(content: string): Promise<string> {
  const processor = HAS_FENCE.test(content)
    ? processors.highlight
    : processors.plain;

  const file = await processor.process(content);

  return String(file);
}
