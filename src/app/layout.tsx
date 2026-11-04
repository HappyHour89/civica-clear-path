import type { Metadata } from "next";
import { CivicaProvider } from "@/components/CivicaProvider";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Civica — Know what it says. Decide what you think.",
    template: "%s · Civica",
  },
  description:
    "Civica turns bills, ballot measures, court letters, and political news into plain language. Key facts link to their sources, and the main viewpoints sit side by side. In English and Korean.",
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
