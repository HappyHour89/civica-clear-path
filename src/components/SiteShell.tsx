"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { softSpring, spring } from "./motion";

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

// A newspaper-style masthead: a brand rule, a serif wordmark, and plain-text
// navigation with a sliding underline.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, result, asking } = useCivica();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // "Your briefing" appears once there is one, or one is being researched.
  const items = navItems(t).filter((item) => item.href !== "/briefing" || asking || result);

  const links = (layoutGroup: string, vertical: boolean, onNavigate?: () => void) => (
    <LayoutGroup id={layoutGroup}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const showBadge = item.href === "/briefing" && asking && !active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
              vertical ? "px-1" : "px-3"
            } ${active ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {item.label}
            {showBadge && (
              <motion.span
                className="inline-block size-1.5 rounded-full bg-accent"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                aria-hidden
              />
            )}
            {active && (
              <motion.span
                layoutId="nav-underline"
                className={
                  vertical
                    ? "absolute inset-y-2 -left-3 w-0.5 bg-accent"
                    : "absolute inset-x-3 -bottom-px h-0.5 bg-accent"
                }
                transition={spring}
              />
            )}
          </Link>
        );
      })}
    </LayoutGroup>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-t-4 border-b border-t-accent border-b-line bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-2 sm:px-6">
            <Link href="/" className="text-left">
              <span className="block font-serif text-3xl font-semibold leading-none tracking-tight">Civica</span>
              <span className="mt-1.5 block text-sm text-muted">{t.tagline}</span>
            </Link>
            <div className="flex items-center gap-3">
              <div role="group" aria-label="Language" className="flex items-center gap-1 text-sm">
                {(Object.keys(LANGUAGES) as Language[]).map((code, i) => (
                  <span key={code} className="flex items-center gap-1">
                    {i > 0 && <span className="text-line" aria-hidden>|</span>}
                    <button
                      type="button"
                      onClick={() => setLanguage(code)}
                      aria-pressed={language === code}
                      className={`rounded-sm px-1.5 py-1 transition-colors ${
                        language === code ? "font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4" : "text-muted hover:text-ink"
                      }`}
                    >
                      {LANGUAGES[code].label}
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-sm font-medium md:hidden"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <motion.path animate={menuOpen ? { d: "M5 5l10 10" } : { d: "M3 6h14" }} transition={spring} strokeLinecap="round" />
                  <motion.path animate={{ opacity: menuOpen ? 0 : 1 }} d="M3 10h14" strokeLinecap="round" />
                  <motion.path animate={menuOpen ? { d: "M5 15L15 5" } : { d: "M3 14h14" }} transition={spring} strokeLinecap="round" />
                </svg>
                {t.menu}
              </button>
            </div>
          </div>
          <nav aria-label={t.mainMenu} className="mx-auto hidden max-w-5xl px-1 sm:px-3 md:flex">
            {links("desktop-nav", false)}
          </nav>
          <AnimatePresence initial={false}>
            {menuOpen && (
              <motion.nav
                id="mobile-menu"
                aria-label={t.mainMenu}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={softSpring}
                className="overflow-hidden border-t border-line px-7 md:hidden"
              >
                <div className="flex flex-col py-2">{links("mobile-nav", true, () => setMenuOpen(false))}</div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
            <span className="font-serif text-sm font-semibold text-ink">Civica</span>
            <span className="max-w-xl sm:text-right">{t.disclaimer}</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
