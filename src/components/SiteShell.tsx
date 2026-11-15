"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { Intro } from "./Intro";
import { softSpring, spring } from "./motion";

type NavLink = { href: string; label: string; description: string };
type NavEntry = NavLink | { group: string; links: NavLink[] };

// Grouped so the top bar stays short: everything that explains something
// together, everything you keep following together.
function navEntries(t: Dictionary, showBriefing: boolean): NavEntry[] {
  return [
    { href: "/", label: t.navAsk, description: t.navAskDesc },
    {
      group: t.navGroupExplain,
      links: [
        { href: "/document", label: t.navDocument, description: t.navDocumentDesc },
        { href: "/charges", label: t.navCharges, description: t.navChargesDesc },
        { href: "/compare", label: t.navCompare, description: t.navCompareDesc },
      ],
    },
    {
      group: t.navGroupFollow,
      links: [
        { href: "/newspaper", label: t.navNewspaper, description: t.navNewspaperDesc },
        { href: "/bills", label: t.navBills, description: t.navBillsDesc },
        { href: "/representatives", label: t.navRepresentatives, description: t.navRepresentativesDesc },
      ],
    },
    { href: "/library", label: t.navLibrary, description: t.navLibraryDesc },
    ...(showBriefing ? [{ href: "/briefing", label: t.navBriefing, description: t.navBriefingDesc }] : []),
    { href: "/about", label: t.navAbout, description: t.navAboutDesc },
    { href: "/support", label: t.navSupport, description: t.navSupportDesc },
  ];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const isGroup = (entry: NavEntry): entry is { group: string; links: NavLink[] } => "group" in entry;

// The opening animation plays when a visit starts on the home page, not every
// time someone navigates back to it. (Reads the URL, so it sits in Suspense.)
function IntroGate() {
  const pathname = usePathname();
  const [active, setActive] = useState(pathname === "/");
  if (active && pathname !== "/") setActive(false);
  return active ? <Intro /> : null;
}

// A native menu: it works the same with a mouse, a keyboard, a screen reader,
// and on phones, and scales to any number of languages.
export function LanguageSelect({ className = "" }: { className?: string }) {
  const { t, language, setLanguage } = useCivica();
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t.languageLabel}</span>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-2.5 size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="10" cy="10" r="7" />
        <path d="M3 10h14M10 3c2 2.2 2.8 4.5 2.8 7s-.8 4.8-2.8 7c-2-2.2-2.8-4.5-2.8-7S8 5.2 10 3z" />
      </svg>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="h-9 appearance-none rounded-full border border-line bg-surface pr-8 pl-8 text-sm font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {(Object.keys(LANGUAGES) as Language[]).map((code) => (
          <option key={code} value={code} lang={code}>
            {LANGUAGES[code].label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function Underline() {
  return <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" transition={spring} />;
}

// A dropdown that fades and drops a few pixels into place: opens on hover
// (with a short grace period so it doesn't flicker) or on click/Enter, and
// closes on Escape, on leaving, or on choosing a link.
function NavGroup({ group, links, pathname }: { group: string; links: NavLink[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const active = links.some((link) => isActive(pathname, link.href));
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-1 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
          active ? "text-ink" : "text-muted hover:text-ink"
        }`}
      >
        {group}
        <motion.svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" animate={{ rotate: open ? 180 : 0 }} transition={spring} aria-hidden>
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        {active && <Underline />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-0 z-30 mt-1 w-80 rounded-xl border border-line bg-surface p-2 shadow-xl"
          >
            <ul>
              {links.map((link) => {
                const current = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={current ? "page" : undefined}
                      className={`group block rounded-lg px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        current ? "bg-accent-soft" : "hover:bg-canvas"
                      }`}
                    >
                      <span className={`flex items-center justify-between font-medium ${current ? "text-accent" : "text-ink"}`}>
                        {link.label}
                        <span aria-hidden className="text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                          →
                        </span>
                      </span>
                      <span className="block text-sm text-muted">{link.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopNav({ entries }: { entries: NavEntry[] }) {
  const { t, asking } = useCivica();
  const pathname = usePathname();
  return (
    <nav aria-label={t.mainMenu} className="hidden md:block">
      <LayoutGroup id="desktop-nav">
        <ul className="-ml-3 flex flex-wrap items-center">
          {entries.map((entry) =>
            isGroup(entry) ? (
              <li key={entry.group}>
                <NavGroup group={entry.group} links={entry.links} pathname={pathname} />
              </li>
            ) : (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={isActive(pathname, entry.href) ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    isActive(pathname, entry.href) ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {entry.label}
                  {entry.href === "/briefing" && asking && !isActive(pathname, "/briefing") && (
                    <motion.span
                      className="inline-block size-1.5 rounded-full bg-accent"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      aria-hidden
                    />
                  )}
                  {isActive(pathname, entry.href) && <Underline />}
                </Link>
              </li>
            ),
          )}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

// Phones and small tablets: the menu slides open beneath the header, grouped
// the same way as the desktop bar, and closes when you choose a page.
function MobileNav({ entries, open, onClose }: { entries: NavEntry[]; open: boolean; onClose: () => void }) {
  const { t } = useCivica();
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const link = (item: NavLink) => {
    const current = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onClose}
          aria-current={current ? "page" : undefined}
          className={`block rounded-lg px-3 py-2.5 ${current ? "bg-accent-soft text-accent" : "active:bg-canvas"}`}
        >
          <span className="block font-medium">{item.label}</span>
          <span className="block text-sm text-muted">{item.description}</span>
        </Link>
      </li>
    );
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.nav
          id="mobile-menu"
          aria-label={t.mainMenu}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-t border-line md:hidden"
        >
          <div className="max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto px-4 py-4">
            <ul className="space-y-0.5">{entries.filter((e): e is NavLink => !isGroup(e) && e.href === "/").map(link)}</ul>
            {entries.filter(isGroup).map((group) => (
              <section key={group.group} className="space-y-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{group.group}</p>
                <ul className="space-y-0.5">{group.links.map(link)}</ul>
              </section>
            ))}
            <ul className="space-y-0.5 border-t border-line pt-3">{entries.filter((e): e is NavLink => !isGroup(e) && e.href !== "/").map(link)}</ul>
            <LanguageSelect />
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

// A newspaper-style masthead with the navigation along its bottom edge. The
// tagline folds away once the reader scrolls, so the sticky bar takes less room.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t, result, asking } = useCivica();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  // Two thresholds, so the height change itself can't make it flicker.
  useMotionValueEvent(scrollY, "change", (y) => setCompact((was) => (was ? y > 8 : y > 80)));
  const entries = navEntries(t, Boolean(asking || result));

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-1 flex-col">
        <Suspense fallback={null}>
          <IntroGate />
        </Suspense>
        <header className="sticky top-0 z-20 border-t-4 print:hidden border-b border-t-accent border-b-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-x-6 pt-3 pb-3 md:pb-0">
              <Link href="/" className="min-w-0 text-left">
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
              <div className="flex shrink-0 items-center gap-3">
                <LanguageSelect className="max-md:hidden" />
                <button
                  type="button"
                  onClick={() => setMobileOpen((o) => !o)}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-menu"
                  className="flex items-center gap-2 rounded-full border border-line bg-surface py-2 pr-4 pl-3.5 text-sm font-medium shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
                >
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <motion.path animate={{ d: mobileOpen ? "M5 5l10 10" : "M3 6h14" }} transition={spring} />
                    <motion.path animate={{ opacity: mobileOpen ? 0 : 1 }} d="M3 10h14" />
                    <motion.path animate={{ d: mobileOpen ? "M5 15L15 5" : "M9 14h8" }} transition={spring} />
                  </svg>
                  {mobileOpen ? t.closeMenu : t.menu}
                  {asking && !mobileOpen && (
                    <motion.span
                      className="inline-block size-1.5 rounded-full bg-accent"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      aria-hidden
                    />
                  )}
                </button>
              </div>
            </div>
            <Suspense fallback={<div className="hidden h-11 md:block" />}>
              <DesktopNav entries={entries} />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <MobileNav entries={entries} open={mobileOpen} onClose={() => setMobileOpen(false)} />
          </Suspense>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>

        <footer className="border-t border-line print:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
            <span className="font-serif text-sm font-semibold text-ink">Civica</span>
            <span className="max-w-xl sm:text-right">{t.disclaimer}</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
