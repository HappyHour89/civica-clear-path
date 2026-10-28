"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";

function navItems(t: Dictionary) {
  return [
    { href: "/", label: t.navAsk },
    { href: "/document", label: t.navDocument },
    { href: "/representatives", label: t.navRepresentatives },
    { href: "/briefing", label: t.navBriefing },
    { href: "/about", label: t.navAbout },
  ];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, result, asking } = useCivica();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItems(t);

  const links = (onNavigate?: () => void) =>
    items.map((item) => {
      const active = isActive(pathname, item.href);
      const showBadge = item.href === "/briefing" && (asking || result) && !active;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
            active ? "bg-accent-soft text-accent" : "text-muted hover:bg-accent-soft/60 hover:text-ink"
          }`}
        >
          {item.label}
          {showBadge && (
            <span
              className={`inline-block size-2 rounded-full bg-accent ${asking ? "animate-pulse" : ""}`}
              aria-hidden
            />
          )}
        </Link>
      );
    });

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-left">
            <span className="block text-2xl font-bold tracking-tight">Civica</span>
            <span className="block text-sm text-muted">{t.tagline}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Language" className="flex rounded-full border border-line p-1">
              {(Object.keys(LANGUAGES) as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  className={`rounded-full px-3 py-1 text-sm ${
                    language === code ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {LANGUAGES[code].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium md:hidden"
            >
              {t.menu}
            </button>
          </div>
        </div>
        <nav aria-label={t.mainMenu} className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 sm:px-6 md:flex">
          {links()}
        </nav>
        {menuOpen && (
          <nav id="mobile-menu" aria-label={t.mainMenu} className="flex flex-col gap-1 px-4 pb-3 md:hidden">
            {links(() => setMenuOpen(false))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
        {t.disclaimer}
      </footer>
    </div>
  );
}
