import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { en } from "./en";
import { hasLocale, type Locale } from "./locales";
import { tr } from "./tr";

export * from "./locales";

const dictionaries = { tr, en };

/** Locale from the URL's /[lang] segment. Server Components only (not Server Actions / Route Handlers). */
export async function getLocale(): Promise<Locale> {
  const l = await lang();
  if (!hasLocale(l)) notFound();
  return l;
}

export const getDictionary = async () => dictionaries[await getLocale()];
