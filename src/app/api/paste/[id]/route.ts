import { NextResponse } from "next/server";
import { getPaste } from "@/lib/redis";
import { preflightResponse, withCors } from "@/lib/cors";
import { log } from "@/lib/logger";

export function OPTIONS() {
  return preflightResponse();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID parameter is missing in the URL." },
        { status: 400, headers: withCors() }
      );
    }

    const paste = await getPaste(id);

    if (!paste) {
      return NextResponse.json(
        { error: "Paste not found." },
        { status: 404, headers: withCors() }
      );
    }

    return NextResponse.json(paste, { headers: withCors() });
  } catch (e) {
    log("error", "Unhandled error in GET /api/paste/[id]", {
      endpoint: "GET /api/paste/[id]",
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Server error." },
      { status: 500, headers: withCors() }
    );
  }
}
