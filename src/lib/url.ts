/**
 * Removes trailing slashes from the configured app URL.
 * Returns null when the env var is missing or empty.
 */
export function normalizeAppUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || null;
}

/**
 * Returns the public application URL without a trailing slash.
 * Falls back to the supplied request origin when NEXT_PUBLIC_APP_URL is unset.
 */
export function getAppUrl(fallbackOrigin = ""): string {
  return (
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    fallbackOrigin.replace(/\/+$/, "")
  );
}
