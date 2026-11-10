import { GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "@/auth";
import { getDictionary, getLocale, locales } from "@/i18n";
import { getSession } from "@/lib/auth-guard";

async function RedirectIfSignedIn({ locale }: { locale: string }) {
  if ((await getSession())?.user) redirect(`/${locale}`);
  return null;
}

export default async function LoginPage() {
  const [t, locale] = [await getDictionary(), await getLocale()];

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/icon.svg" alt="" className="mx-auto mb-8 block size-14" />
        <h1 className="text-2xl font-semibold text-balance">{t.login.title}</h1>
        <p className="mt-2 text-sm text-pretty text-neutral-500">{t.login.body}</p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" }); // proxy picks the language from the cookie
          }}
        >
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-base font-semibold text-white transition hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]">
            <GoogleLogo weight="bold" className="size-5" aria-hidden />
            {t.login.google}
          </button>
        </form>
        <nav className="mt-6 flex justify-center gap-4 text-sm text-neutral-500">
          {locales.map((l) => (
            <Link key={l} href={`/${l}/login`} aria-current={l === locale ? "page" : undefined} className="hover:text-neutral-900 aria-[current=page]:font-semibold aria-[current=page]:text-neutral-900">
              {t.language[l]}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense>
        <RedirectIfSignedIn locale={locale} />
      </Suspense>
    </main>
  );
}
