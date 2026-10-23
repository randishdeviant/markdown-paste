export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * Merges the shared CORS headers with per-response headers such as the
 * rate limit values. Per-response values win on conflicts.
 */
export function withCors(
  headers: Record<string, string> = {}
): Record<string, string> {
  return { ...CORS_HEADERS, ...headers };
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
