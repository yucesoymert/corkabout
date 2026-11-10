export const locales = ["tr", "en"] as const;
export const defaultLocale = "tr";
export type Locale = (typeof locales)[number];
export const hasLocale = (l: string | undefined): l is Locale => (locales as readonly (string | undefined)[]).includes(l);
