import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPaste, EXPIRY_OPTIONS, type ExpiryValue } from "@/lib/redis";
import { createPasteLimiter, getClientIp } from "@/lib/ratelimit";
import { isBase64Spam } from "@/lib/validation";

const MAX_CONTENT_LENGTH = 100 * 1024; // 100 KB
// Allow a little room for the JSON envelope around the content field.
const MAX_REQUEST_BYTES = MAX_CONTENT_LENGTH + 1024;
const VALID_EXPIRY_VALUES = EXPIRY_OPTIONS.map((o) => o.value);

type RateLimitHeaders = Record<string, string>;

export async function POST(request: Request) {
  let rateLimitHeaders: RateLimitHeaders = {};

  try {
    const ip = getClientIp(request);

    if (ip) {
      try {
        const { success, limit, remaining, reset } =
          await createPasteLimiter.limit(ip);

        rateLimitHeaders = {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
        };

        if (!success) {
          const retryAfter = Math.max(
            1,
            Math.ceil((reset - Date.now()) / 1000)
          );
          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: {
                ...rateLimitHeaders,
                "Retry-After": String(retryAfter),
              },
            }
          );
        }
      } catch (rateLimitError) {
        // Fail open: a Redis hiccup should not take the whole endpoint down.
        console.error(
          "Rate limit check failed; allowing request:",
          rateLimitError
        );
      }
    } else {
      console.warn("Rate limit skipped: client IP could not be determined.");
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          error: `Request body exceeds maximum size of ${MAX_CONTENT_LENGTH} bytes.`,
        },
        { status: 413, headers: rateLimitHeaders }
      );
    }

    let payload: { content?: unknown; expires_in?: unknown };
    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { content, expires_in } = payload;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (new TextEncoder().encode(content).length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} bytes.`,
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (isBase64Spam(content)) {
      return NextResponse.json(
        { error: "Content appears to be encoded data, not Markdown." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    let ttl: ExpiryValue = 7 * 24 * 60 * 60; // default 7 days
    if (expires_in !== undefined) {
      if (
        typeof expires_in !== "number" ||
        !VALID_EXPIRY_VALUES.includes(expires_in as ExpiryValue)
      ) {
        return NextResponse.json(
          {
            error: `Invalid expires_in value. Must be one of: ${VALID_EXPIRY_VALUES.join(", ")}`,
          },
          { status: 400, headers: rateLimitHeaders }
        );
      }
      ttl = expires_in as ExpiryValue;
    }

    const id = nanoid(8);
    const paste = await createPaste(id, content, ttl);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const finalUrl = appUrl
      ? `${appUrl}/p/${paste.id}`
      : `${new URL(request.url).origin}/p/${paste.id}`;

    return NextResponse.json(
      {
        id: paste.id,
        url: finalUrl,
        created_at: paste.created_at,
        expires_at: paste.expires_at,
      },
      { headers: rateLimitHeaders }
    );
  } catch (e) {
    console.error("Unhandled error in POST /api/paste:", e);
    return NextResponse.json(
      { error: "Server error." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
