import type { Metadata } from "next";
import Link from "next/link";
import { DICTIONARIES } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = { title: "Page not found · Civica" };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-2xl space-y-8 px-4 py-24 sm:px-6">
          <p className="font-serif text-2xl font-semibold">Civica</p>
          {(["en", "ko"] as const).map((lang) => {
            const t = DICTIONARIES[lang].notFound;
            return (
              <div key={lang} lang={lang} className="space-y-3">
                <h1 className="font-serif text-3xl font-semibold">{t.title}</h1>
                <p className="text-muted">{t.body}</p>
                <Link href={`/${lang}`} className="font-medium text-brand underline underline-offset-4">
                  {t.home}
                </Link>
              </div>
            );
          })}
        </main>
      </body>
    </html>
  );
}
