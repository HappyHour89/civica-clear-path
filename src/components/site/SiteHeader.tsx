"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANGUAGE_COOKIE, LANGUAGES, type Dictionary, type Language } from "@/lib/i18n";
import { CivicaWordmark } from "./CivicaLogo";

import { NAV_ITEMS } from "@/lib/nav";

function rememberLanguage(lang: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function swapLanguage(pathname: string, lang: Language) {
  const parts = pathname.split("/");
  parts[1] = lang;
  return parts.join("/");
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ lang, nav, tagline }: { lang: Language; nav: Dictionary["nav"]; tagline: string }) {
  const pathname = usePathname();
  // Storing the path the menu was opened on closes it automatically after navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = NAV_ITEMS.map((item) => ({ item, href: `/${lang}/${item}`, label: nav[item] }));

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-paper/90 backdrop-blur-md transition-[border-color,box-shadow] duration-300 ${
        scrolled ? "border-line shadow-[0_6px_24px_-18px_rgba(28,33,31,0.5)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label={nav.homeLink} className="shrink-0 rounded-lg">
          <CivicaWordmark tagline={tagline} />
        </Link>

        <nav aria-label={nav.primary} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map(({ item, href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={item}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative block rounded-md px-3.5 py-2 text-[0.95rem] font-medium transition-colors ${
                      active ? "text-brand" : "text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitch lang={lang} pathname={pathname} label={nav.language} />
          <button
            type="button"
            className="relative flex size-10 items-center justify-center rounded-lg border border-line bg-surface lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? nav.closeMenu : nav.menu}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label={nav.primary}
            className="overflow-hidden border-t border-line bg-paper lg:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.ul
              className="mx-auto max-w-6xl px-4 py-3 sm:px-6"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
            >
              {[{ item: "home", href: `/${lang}`, label: nav.home }, ...links].map(({ item, href, label }) => {
                const active = item === "home" ? pathname === href : isActive(pathname, href);
                return (
                  <motion.li
                    key={item}
                    variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                  >
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpenOn(null)}
                      className={`flex items-center justify-between border-b border-line/70 py-3.5 font-serif text-xl ${
                        active ? "text-brand" : "text-ink"
                      }`}
                    >
                      {label}
                      <span aria-hidden className={active ? "text-brand" : "text-muted"}>
                        →
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function LanguageSwitch({ lang, pathname, label }: { lang: Language; pathname: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 rounded-full border border-line bg-surface p-0.5 text-sm whitespace-nowrap">
      {(Object.keys(LANGUAGES) as Language[]).map((code) => {
        const active = code === lang;
        return (
          <Link
            key={code}
            href={swapLanguage(pathname, code)}
            hrefLang={code}
            lang={code}
            aria-current={active ? "true" : undefined}
            onClick={() => rememberLanguage(code)}
            className={`relative rounded-full px-3 py-1 font-medium transition-colors ${
              active ? "text-brand-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="language-pill"
                className="absolute inset-0 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{LANGUAGES[code].short}</span>
          </Link>
        );
      })}
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  const bar = "absolute left-0 h-0.5 w-5 rounded-full bg-ink";
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <motion.span className={bar} style={{ top: 1 }} animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} />
      <motion.span className={bar} style={{ top: 7 }} animate={{ opacity: open ? 0 : 1, scaleX: open ? 0.4 : 1 }} />
      <motion.span className={bar} style={{ top: 13 }} animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} />
    </span>
  );
}
