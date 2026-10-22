import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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

export async function processMarkdown(content: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShiki, {
      theme: 'kanagawa-wave',
    })
    .use(rehypeStringify)
    .process(content);

  return String(file);
}
