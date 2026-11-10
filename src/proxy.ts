import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/locales";

const COOKIE = "NEXT_LOCALE";

// Only for language routing: /vehicles → /tr/vehicles. Authorization is in src/lib/auth-guard.ts, not here.
export function proxy(req: NextRequest) {
  const seg = req.nextUrl.pathname.split("/")[1];
  if (hasLocale(seg)) {
    // Remember the chosen language (the language switcher just links to the other prefix)
    const res = NextResponse.next();
    if (req.cookies.get(COOKIE)?.value !== seg) res.cookies.set(COOKIE, seg, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${pickLocale(req)}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
  return NextResponse.redirect(url);
}

function pickLocale(req: NextRequest): Locale {
  const saved = req.cookies.get(COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;
  // ponytail: picks the first supported language from Accept-Language and ignores q values; enough for two languages
  for (const part of (req.headers.get("accept-language") ?? "").split(",")) {
    const l = part.trim().slice(0, 2).toLowerCase();
    if (hasLocale(l)) return l;
  }
  return defaultLocale;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
