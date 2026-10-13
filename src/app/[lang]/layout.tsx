import type { Metadata } from "next";
import { Noto_Sans_KR, Public_Sans, Source_Serif_4 } from "next/font/google";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/site/MotionProvider";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DICTIONARIES, isLanguage, LANGUAGES } from "@/lib/i18n";
import "../globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });
// Korean glyphs are split into many small files that load only for characters on the page.
const notoKr = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-noto-kr", display: "swap", preload: false });

export function generateStaticParams() {
  return Object.keys(LANGUAGES).map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLanguage(lang)) return {};
  const t = DICTIONARIES[lang];
  return {
    title: { default: t.meta.title, template: "%s · Civica" },
    description: t.meta.description,
    alternates: { languages: { en: "/en", ko: "/ko" } },
  };
}

export default async function LanguageLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang];
  return (
    <html lang={lang} className={`${publicSans.variable} ${sourceSerif.variable} ${notoKr.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>
          <a href="#main" className="skip-link">
            {t.nav.skipToContent}
          </a>
          <SiteHeader lang={lang} nav={t.nav} tagline={t.tagline} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter lang={lang} t={t} />
        </MotionProvider>
      </body>
    </html>
  );
}
