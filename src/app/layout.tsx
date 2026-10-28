import type { Metadata } from "next";
import { CivicaProvider } from "@/components/CivicaProvider";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Civica — Understand politics. Think for yourself.",
    template: "%s · Civica",
  },
  description:
    "Plain-language, nonpartisan explanations of political and legal issues, with competing perspectives and sources.",
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
