import Link from "next/link";
import type { Dictionary, Language } from "@/lib/i18n";
import { CivicaWordmark } from "./CivicaLogo";
import { NAV_ITEMS } from "@/lib/nav";

export function SiteFooter({ lang, t }: { lang: Language; t: Dictionary }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <CivicaWordmark tagline={t.tagline} animate={false} />
          <p className="max-w-md text-sm text-muted">{t.footer.disclaimer}</p>
          <p className="max-w-md text-sm text-muted">{t.footer.privacy}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t.footer.explore}</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item}>
                <Link href={`/${lang}/${item}`} className="text-ink underline-offset-4 hover:text-brand hover:underline">
                  {t.nav[item]}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${lang}/learn/glossary`} className="text-ink underline-offset-4 hover:text-brand hover:underline">
                {t.learn.glossaryTitle}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">{t.footer.credits}</p>
      </div>
    </footer>
  );
}
