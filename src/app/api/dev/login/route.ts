import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const TEST_EMAIL = "test@corkspace.test";

// Dev-only sign-in as the seeded test user, so screens can be checked without a real Google account.
// Hard 404 unless `next dev` on localhost. Setup: pnpm seed --email test@corkspace.test --create-user
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
    return new Response(null, { status: 404 });
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAIL) });
  if (!user) return new Response(`No ${TEST_EMAIL} user. Run the seed with --create-user first.`, { status: 404 });

  const sessionToken = crypto.randomUUID();
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires: new Date(Date.now() + 864e5) });
  const res = NextResponse.redirect(new URL(url.searchParams.get("to") ?? "/", url.origin));
  res.cookies.set("authjs.session-token", sessionToken, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
