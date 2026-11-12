import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemedToaster } from "@/components/theme";
import { getDictionary, getLocale, locales } from "@/i18n";
import "../globals.css";

// Runs in <head> before paint: the saved choice (ThemeToggle), else the system setting. No flash of the wrong theme.
const THEME_SCRIPT = `try{var t=localStorage.theme;document.documentElement.classList.toggle("dark",t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}`;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata(): Promise<Metadata> {
  const [meta, locale] = [(await getDictionary()).meta, await getLocale()];
  return {
    ...meta,
    metadataBase: new URL("https://corkabout.mertyucesoy.dev"),
    icons: { icon: "/icon.svg" },
    openGraph: { ...meta, siteName: "Corkabout", type: "website", locale: locale === "tr" ? "tr_TR" : "en_US" },
    twitter: { card: "summary", ...meta },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT adds the dark class before React hydrates
    <html lang={(await params).lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper font-sans text-neutral-900">
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
