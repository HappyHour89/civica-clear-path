"use client";

import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { Intro } from "./Intro";
import { MenuSheet, type MenuOrigin } from "./MenuSheet";
import { softSpring, spring } from "./motion";

function navItems(t: Dictionary) {
  return [
    { href: "/", label: t.navAsk, description: t.navAskDesc },
    { href: "/document", label: t.navDocument, description: t.navDocumentDesc },
    { href: "/compare", label: t.navCompare, description: t.navCompareDesc },
    { href: "/representatives", label: t.navRepresentatives, description: t.navRepresentativesDesc },
    { href: "/briefing", label: t.navBriefing, description: t.navBriefingDesc },
    { href: "/about", label: t.navAbout, description: t.navAboutDesc },
    { href: "/support", label: t.navSupport, description: t.navSupportDesc },
  ];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// A newspaper-style masthead with the section you're in, and a pop-up menu
// opened from the Menu button, the tab on the right edge, or the M key. The
// tagline folds away once the reader scrolls, so the sticky bar takes less room.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, result, asking } = useCivica();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState<MenuOrigin | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Focus returns to whichever button opened the menu.
  const menuButton = useRef<HTMLElement | null>(null);
  const openMenuFrom = useCallback((button: HTMLElement | null) => {
    menuButton.current = button;
    const box = button?.getBoundingClientRect();
    setMenuOrigin(box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null);
    setMenuOpen(true);
  }, []);

  // "M" opens the menu from anywhere, unless the reader is typing.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "m" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      openMenuFrom(document.getElementById("menu-button"));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenuFrom]);
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

  const current = items.find((item) => isActive(pathname, item.href));

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-1 flex-col">
        {introActive && <Intro />}
        <header className="sticky top-0 z-20 border-t-4 border-b border-t-accent border-b-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-x-6 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-baseline gap-3">
            <Link href="/" className="shrink-0 text-left">
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
            {/* Which section you're in, sliding in as you move between them. */}
            <AnimatePresence mode="wait" initial={false}>
              {current && current.href !== "/" && (
                <motion.span
                  key={current.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={softSpring}
                  className="hidden truncate font-serif text-lg text-muted sm:block"
                >
                  <span aria-hidden className="mr-3 text-line">/</span>
                  {current.label}
                </motion.span>
              )}
            </AnimatePresence>
            </div>
            <div className="flex shrink-0 items-center gap-3">
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
                id="menu-button"
                type="button"
                onClick={(event) => openMenuFrom(event.currentTarget)}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                aria-haspopup="dialog"
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 rounded-full border border-line bg-surface py-2 pr-4 pl-3.5 text-sm font-medium shadow-sm transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
        </header>
        {/* The tab on the right edge: the menu is always one click away. */}
        <motion.button
          type="button"
          onClick={(event) => openMenuFrom(event.currentTarget)}
          aria-label={t.menu}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-haspopup="dialog"
          style={{ y: "-50%" }}
          initial={{ x: 64 }}
          animate={{ x: menuOpen ? 64 : 0 }}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.96 }}
          transition={spring}
          className="fixed top-1/2 right-0 z-30 hidden flex-col items-center gap-3 rounded-l-2xl bg-accent py-5 pr-3 pl-3.5 text-accent-ink shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:flex"
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M3 6h14M3 10h14M9 14h8" />
          </svg>
          <span aria-hidden className="text-xs font-semibold tracking-[0.2em] uppercase [writing-mode:vertical-rl] [:lang(ko)_&]:tracking-normal">
            {t.menu}
          </span>
        </motion.button>
        <MenuSheet
          open={menuOpen}
          origin={menuOrigin}
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
