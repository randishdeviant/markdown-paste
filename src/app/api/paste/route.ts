import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { createPaste, EXPIRY_OPTIONS, type ExpiryValue } from "@/lib/redis";
import { createPasteLimiter, getClientIp } from "@/lib/ratelimit";
import { isBase64Spam } from "@/lib/validation";

const MAX_CONTENT_LENGTH = 100 * 1024; // 100 KB
const VALID_EXPIRY_VALUES = EXPIRY_OPTIONS.map((o) => o.value);

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    try {
      const { success, reset } = await createPasteLimiter.limit(ip);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          }
        );
      }
    } catch (rateLimitError) {
      // Fail open: a Redis hiccup should not take the whole endpoint down.
      console.error("Rate limit check failed; allowing request:", rateLimitError);
    }

    const { content, expires_in } = (await request.json()) as {
      content?: string;
      expires_in?: number;
    };

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} bytes.`,
        },
        { status: 400 }
      );
    }

    if (isBase64Spam(content)) {
      return NextResponse.json(
        { error: "Content appears to be encoded data, not Markdown." },
        { status: 400 }
      );
    }

    try {
      unified().use(remarkParse).parse(content);
    } catch {
      return NextResponse.json(
        { error: "Content contains invalid Markdown syntax." },
        { status: 400 }
      );
    }

    let ttl: ExpiryValue = 7 * 24 * 60 * 60; // default 7 days
    if (expires_in !== undefined) {
      if (!VALID_EXPIRY_VALUES.includes(expires_in as ExpiryValue)) {
        return NextResponse.json(
          {
            error: `Invalid expires_in value. Must be one of: ${VALID_EXPIRY_VALUES.join(", ")}`,
          },
          { status: 400 }
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

    return NextResponse.json({
      id: paste.id,
      url: finalUrl,
      created_at: paste.created_at,
      expires_at: paste.expires_at,
    });
  } catch (e) {
    if (e instanceof Error) {
      console.error("API Error:", e.message);
    }
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
