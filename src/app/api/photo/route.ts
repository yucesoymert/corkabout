import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { photoQuota } from "@/lib/auth-guard";

// Client uploads (the browser sends the file straight to Vercel Blob): this route only hands out a short-lived token,
// after checking the session and the photo limit. The card itself is saved by createCardsAction, which checks again.
/** Why an upload failed: @vercel/blob's client throws the same "Failed to retrieve the client token" for every refusal
 * (status and body are dropped), so the board asks here whether the photo limit is full. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ full: false }, { status: 401 });
  const { used, limit } = await photoQuota(session.user.id);
  return NextResponse.json({ full: limit !== null && used >= limit });
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.id) throw new Error("signed out");
        const { used, limit } = await photoQuota(session.user.id);
        if (limit !== null && used >= limit) throw new Error("limit");
        return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"], maximumSizeInBytes: 5 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: message === "limit" ? 403 : 400 });
  }
}
