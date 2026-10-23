type LogLevel = "info" | "warn" | "error";

/**
 * Emits a single structured JSON log line so production logs can be
 * filtered by level, message, and context without parsing free text.
 */
export function log(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {}
): void {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}
