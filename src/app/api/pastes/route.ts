import { NextResponse, type NextRequest } from "next/server";
import { getLatestPastes } from "@/lib/redis";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limitParam = searchParams.get("limit");

  let limit = 10;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }

  try {
    const pastes = await getLatestPastes(limit);
    return NextResponse.json(pastes);
  } catch (e) {
    if (e instanceof Error) {
      console.error("API Error in /api/pastes:", e.message);
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
