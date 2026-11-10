import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getDictionary, locales } from "@/i18n";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { ...meta, icons: { icon: "/icon.svg" } };
}

export const viewport: Viewport = { themeColor: "#f4f3f0" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  return (
    <html lang={(await params).lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-neutral-900">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
