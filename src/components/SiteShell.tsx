"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { Intro } from "./Intro";
import { MenuSheet } from "./MenuSheet";
import { softSpring, spring } from "./motion";

function navItems(t: Dictionary) {
  return [
    { href: "/", label: t.navAsk, description: t.navAskDesc },
    { href: "/document", label: t.navDocument, description: t.navDocumentDesc },
    { href: "/representatives", label: t.navRepresentatives, description: t.navRepresentativesDesc },
    { href: "/briefing", label: t.navBriefing, description: t.navBriefingDesc },
    { href: "/about", label: t.navAbout, description: t.navAboutDesc },
    { href: "/support", label: t.navSupport, description: t.navSupportDesc },
  ];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// A newspaper-style masthead: a brand rule, a serif wordmark, and plain-text
// navigation with a sliding underline on wide screens; on phones and tablets
// a Menu button opens a panel from the right. The tagline folds away once
// the reader scrolls, so the sticky bar takes less room.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, result, asking } = useCivica();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  // Two thresholds, so the height change itself can't make it flicker.
  useMotionValueEvent(scrollY, "change", (y) => setCompact((was) => (was ? y > 8 : y > 80)));
  // The opening animation plays when a visit starts on the home page, not
  // every time someone navigates back to it.
  const [introActive, setIntroActive] = useState(pathname === "/");
  if (introActive && pathname !== "/") setIntroActive(false);
  // "Your briefing" appears once there is one, or one is being researched.
  const items = navItems(t).filter((item) => item.href !== "/briefing" || asking || result);

  const desktopLinks = (
    <LayoutGroup id="desktop-nav">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const showBadge = item.href === "/briefing" && asking && !active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
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
              <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" transition={spring} />
            )}
          </Link>
        );
      })}
    </LayoutGroup>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-1 flex-col">
        {introActive && <Intro />}
        <header className="sticky top-0 z-20 border-t-4 border-b border-t-accent border-b-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-x-6 px-4 pt-3.5 pb-2 sm:px-6 md:items-end">
            <Link href="/" className="text-left">
              <span className="block font-serif text-3xl font-semibold leading-none tracking-tight">Civica</span>
              <AnimatePresence initial={false}>
                {!compact && (
                  <motion.span
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={softSpring}
                    className="block overflow-hidden"
                  >
                    <span className="block pt-1.5 text-sm text-muted">{t.tagline}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <div className="flex items-center gap-3">
              <div role="group" aria-label={t.languageLabel} className="hidden items-center gap-1 text-sm md:flex">
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
              <motion.button
                ref={menuButton}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                aria-haspopup="dialog"
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-3 text-sm font-medium shadow-sm transition-colors hover:border-ink md:hidden"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M3 6h14M3 10h14M9 14h8" />
                </svg>
                {t.menu}
                {asking && !isActive(pathname, "/briefing") && (
                  <motion.span
                    className="inline-block size-1.5 rounded-full bg-accent"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    aria-hidden
                  />
                )}
              </motion.button>
            </div>
          </div>
          <nav aria-label={t.mainMenu} className="mx-auto hidden max-w-5xl px-1 sm:px-3 md:flex">
            {desktopLinks}
          </nav>
        </header>
        <MenuSheet
          open={menuOpen}
          onClose={closeMenu}
          returnFocusTo={menuButton}
          items={items.map((item) => ({
            ...item,
            active: isActive(pathname, item.href),
            badge: item.href === "/briefing" && asking && !isActive(pathname, item.href),
          }))}
        />

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
