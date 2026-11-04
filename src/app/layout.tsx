import type { Metadata } from "next";
import { CivicaProvider } from "@/components/CivicaProvider";
import { SiteShell } from "@/components/SiteShell";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/public-sans";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/700.css";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute URLs for the Open Graph image; Vercel sets this per deployment.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: {
    default: "Civica — Know what it says. Decide what you think.",
    template: "%s · Civica",
  },
  description:
    "Civica turns bills, ballot measures, court letters, and political news into plain language. Key facts link to their sources, and the main viewpoints sit side by side. In English and Korean.",
  openGraph: {
    title: "Civica — Know what it says. Decide what you think.",
    description:
      "Bills, ballot measures, court letters, and political news in plain language, with sources and every major viewpoint side by side.",
    siteName: "Civica",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CivicaProvider>
          <SiteShell>{children}</SiteShell>
        </CivicaProvider>
      </body>
    </html>
  );
}
