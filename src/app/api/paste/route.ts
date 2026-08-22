import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPaste, EXPIRY_OPTIONS, type ExpiryValue } from "@/lib/redis";

const MAX_CONTENT_LENGTH = 100 * 1024; // 100 KB
const VALID_EXPIRY_VALUES = EXPIRY_OPTIONS.map((o) => o.value);

export async function POST(request: Request) {
  try {
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    let finalUrl: string;

    if (appUrl) {
      finalUrl = `${appUrl}/p/${paste.id}`;
      fetch(finalUrl).catch((err) => {
        console.error(
          `Failed to warm cache for new paste ${paste.id}:`,
          err.message
        );
      });
    } else {
      console.warn("Cache warming skipped: NEXT_PUBLIC_APP_URL is not set.");
      finalUrl = `https://${request.headers.get("host")}/p/${paste.id}`;
    }

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
