const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

const HTML_BLOCK_TAGS =
  /<(?:div|span|p|script|iframe|form|table|tr|td|th|thead|tbody|ul|ol|li|h[1-6]|a|img|input|button|select|option|textarea|label|nav|header|footer|section|article|aside|main|figure|details|summary|dialog|canvas|video|audio|source|embed|object|style|meta|base|title)[\s>]/i;

export function hasMarkdownStructure(content: string): boolean {
  return (
    /^#{1,6}\s/m.test(content) ||
    /^[\s]*[-*+]\s/m.test(content) ||
    /^[\s]*\d+\.\s/m.test(content) ||
    /^```/m.test(content) ||
    /\n\n/.test(content)
  );
}

export function isBase64Spam(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 20) return false;
  if (!BASE64_PATTERN.test(trimmed)) return false;
  return !hasMarkdownStructure(content);
}

export function wrapHtmlInCodeBlocks(content: string): string {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part) => {
      if (part.startsWith("```")) return part;
      if (!HTML_BLOCK_TAGS.test(part)) return part;
      const leading = part.match(/^(\s*)/)?.[1] || "";
      const trimmed = part.trim();
      if (!trimmed) return part;
      return leading + "```html\n" + trimmed + "\n```";
    })
    .join("");
}
