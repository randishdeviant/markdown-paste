const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

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
