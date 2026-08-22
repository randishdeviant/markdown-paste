import { NextResponse } from "next/server";
import { getPaste, deletePaste } from "@/lib/redis";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID parameter is missing in the URL." },
        { status: 400 }
      );
    }

    const paste = await getPaste(id);

    if (!paste) {
      return NextResponse.json({ error: "Paste not found." }, { status: 404 });
    }

    return NextResponse.json(paste);
  } catch (e) {
    console.error(`Unhandled error in GET /api/paste/[id]:`, e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID parameter is missing in the URL." },
        { status: 400 }
      );
    }

    const deleted = await deletePaste(id);

    if (!deleted) {
      return NextResponse.json({ error: "Paste not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(`Unhandled error in DELETE /api/paste/[id]:`, e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
