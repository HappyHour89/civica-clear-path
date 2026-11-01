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

// A balanced pair of columns: civic, and deliberately not party-coded.
function LogoMark() {
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-[0_6px_18px_-8px_var(--accent)]">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 9.5 12 4l9 5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M4 20h16" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, result, asking } = useCivica();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItems(t);

  const links = (layoutGroup: string, onNavigate?: () => void) => (
    <LayoutGroup id={layoutGroup}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const showBadge = item.href === "/briefing" && (asking || result) && !active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-accent-soft"
                transition={spring}
              />
            )}
            {item.label}
            {showBadge && (
              <motion.span
                className="inline-block size-2 rounded-full bg-accent"
                animate={asking ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : { scale: 1 }}
                transition={asking ? { duration: 1.2, repeat: Infinity } : spring}
                aria-hidden
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
        <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-3 text-left">
              <motion.span whileHover={{ rotate: -6, scale: 1.05 }} transition={spring}>
                <LogoMark />
              </motion.span>
              <span>
                <span className="block text-xl font-bold tracking-tight">Civica</span>
                <span className="block text-xs text-muted">{t.tagline}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Language" className="relative isolate flex rounded-full border border-line bg-surface p-1">
                {(Object.keys(LANGUAGES) as Language[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={`relative rounded-full px-3 py-1 text-sm transition-colors ${
                      language === code ? "text-accent-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {language === code && (
                      <motion.span layoutId="lang-pill" className="absolute inset-0 -z-10 rounded-full bg-accent" transition={spring} />
                    )}
                    {LANGUAGES[code].label}
                  </button>
                ))}
              </div>
              <motion.button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium md:hidden"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <motion.path animate={menuOpen ? { d: "M5 5l10 10" } : { d: "M3 6h14" }} transition={spring} strokeLinecap="round" />
                  <motion.path animate={{ opacity: menuOpen ? 0 : 1 }} d="M3 10h14" strokeLinecap="round" />
                  <motion.path animate={menuOpen ? { d: "M5 15L15 5" } : { d: "M3 14h14" }} transition={spring} strokeLinecap="round" />
                </svg>
                {t.menu}
              </motion.button>
            </div>
          </div>
          <nav aria-label={t.mainMenu} className="isolate mx-auto hidden max-w-5xl gap-1 px-4 pb-2 sm:px-6 md:flex">
            {links("desktop-nav")}
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
                className="isolate flex flex-col gap-1 overflow-hidden px-4 md:hidden"
              >
                <div className="flex flex-col gap-1 pb-3">{links("mobile-nav", () => setMenuOpen(false))}</div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

        <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
          {t.disclaimer}
        </footer>
      </div>
    </MotionConfig>
  );
}
