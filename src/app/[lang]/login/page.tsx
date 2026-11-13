import { GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import { DM_Sans } from "next/font/google";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { type CSSProperties, Suspense } from "react";
import { signIn } from "@/auth";
import { getDictionary, getLocale, locales } from "@/i18n";
import { getSession } from "@/lib/auth-guard";
import coralRiver from "@/assets/login/coral-river.jpg";
import mistyMeadow from "@/assets/login/misty-meadow.jpg";
import moonlitValley from "@/assets/login/moonlit-valley.jpg";
import sunsetBay from "@/assets/login/sunset-bay.jpg";

const BACKDROPS = [coralRiver, mistyMeadow, moonlitValley, sunsetBay];
const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], weight: "700" }); // welcome title and wordmark; latin-ext has ş

/** Glass over the painting (card and wordmark): blurred backdrop, a milky white tint brighter at the top, a 1px light
 * rim and a lit top edge. Literal colours on purpose: the theme remaps `white`/`neutral-*` in dark mode (globals.css),
 * which turned the tint dark. The painting is the same in both themes, so the glass is too. */
const glass = (top: number, bottom: number, shadow: string): CSSProperties => ({
  background: `linear-gradient(rgb(255 255 255 / ${top}), rgb(255 255 255 / ${bottom}))`,
  boxShadow: `inset 0 1px 0 rgb(255 255 255 / .6), inset 0 0 0 1px rgb(255 255 255 / .3), ${shadow}`,
});
const pickBackdrop = () => BACKDROPS[Math.floor(Math.random() * BACKDROPS.length)];

/** A different painting behind the card on every visit. The page is prerendered, so the pick waits for the request
 * (connection) and streams in; until then the plain paper background shows. */
async function Backdrop() {
  await connection();
  return <Image src={pickBackdrop()} alt="" fill priority placeholder="blur" sizes="100vw" className="-z-10 object-cover" />;
}

async function RedirectIfSignedIn({ locale }: { locale: string }) {
  if ((await getSession())?.user) redirect(`/${locale}`);
  return null;
}

export default async function LoginPage() {
  const [t, locale] = [await getDictionary(), await getLocale()];

  return (
    <main className="relative isolate flex flex-1 items-center justify-center p-6">
      <Suspense>
        <Backdrop />
      </Suspense>
      {/* Dark ink, not white: behind the card the paintings are light (white text measured 1.3-3.1:1), and with this
          tint stone-800 stays above 4.8:1 on the darkest one too */}
      <div className="w-full max-w-xs rounded-3xl px-7 py-10 text-center text-[#0c0a09] backdrop-blur-xs" style={glass(0.38, 0.24, "0 12px 40px rgb(0 0 0 / .18)")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/icon.svg" alt="" className="mx-auto mb-6 block size-14" />
        <h1 className={`${dmSans.className} text-3xl font-bold tracking-tight text-balance`}>{t.login.title}</h1>
        <p className="mt-2 text-sm text-pretty text-[#292524]">{t.login.body}</p>
        <form
          className="mt-7"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" }); // proxy picks the language from the cookie
          }}
        >
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c1917] px-3 py-2 text-base font-semibold text-[#fff] transition hover:bg-[#44403c] focus-visible:ring-2 focus-visible:ring-[#1c1917] focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]">
            <GoogleLogo weight="bold" className="size-5" aria-hidden />
            {t.login.google}
          </button>
        </form>
        <nav className="mt-6 flex justify-center gap-4 text-sm text-[#292524]">
          {locales.map((l) => (
            // <a>, not <Link>: another language is another root layout. A full load keeps React from re-creating the theme <script> in <head>.
            <a key={l} href={`/${l}/login`} aria-current={l === locale ? "page" : undefined} className="hover:text-[#0c0a09] aria-[current=page]:font-semibold aria-[current=page]:text-[#0c0a09]">
              {t.language[l]}
            </a>
          ))}
        </nav>
      </div>
      <span
        aria-hidden
        className={`${dmSans.className} absolute right-5 bottom-5 rounded-full px-3.5 py-1.5 text-sm font-bold tracking-tight text-[#fff] backdrop-blur-[1px]`}
        style={{ ...glass(0.26, 0.08, "0 4px 16px rgb(0 0 0 / .12)"), textShadow: "0 1px 2px rgb(0 0 0 / .3)" }}
      >
        corkabout
      </span>
      <Suspense>
        <RedirectIfSignedIn locale={locale} />
      </Suspense>
    </main>
  );
}
