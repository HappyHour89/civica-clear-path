"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { softSpring, spring } from "./motion";

export type MenuItem = { href: string; label: string; description: string; active: boolean; badge: boolean };

// Where the menu was opened from, in viewport pixels; the panel grows out of it.
export type MenuOrigin = { x: number; y: number };

const PANEL_MAX = 416;

function panelWidth() {
  return Math.min(PANEL_MAX, window.innerWidth * 0.92);
}

// The site's pop-up menu: a panel on the right that opens as a circle growing
// out of the button that was pressed, with numbered sections that rise in one
// by one and a highlight that glides to whatever is hovered or focused.
// Esc, the backdrop, the close button, or choosing a page closes it; focus
// stays inside while it is open. With reduced motion it simply fades.
export function MenuSheet(props: {
  open: boolean;
  origin: MenuOrigin | null;
  onClose: () => void;
  items: MenuItem[];
  returnFocusTo: React.RefObject<HTMLElement | null>;
}) {
  const { t, language, setLanguage } = useCivica();
  const reduce = useReducedMotion();
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const { open, onClose, returnFocusTo, origin } = props;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const returnTo = returnFocusTo.current;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab" || !sheet.current) return;
      const focusable = sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnTo?.focus();
    };
  }, [open, onClose, returnFocusTo]);

  // The circle's centre, relative to the panel's top-left corner.
  const reveal = (() => {
    if (typeof window === "undefined") return null;
    const width = panelWidth();
    const x = (origin?.x ?? window.innerWidth - 24) - (window.innerWidth - width);
    const y = origin?.y ?? 24;
    const radius = Math.hypot(Math.max(x, width - x), Math.max(y, window.innerHeight - y)) + 40;
    return { at: `${x}px ${y}px`, radius };
  })();

  const panel: Variants = reduce
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { clipPath: `circle(0px at ${reveal?.at})` },
        shown: {
          clipPath: `circle(${reveal?.radius}px at ${reveal?.at})`,
          transition: { type: "spring", stiffness: 70, damping: 16, staggerChildren: 0.05, delayChildren: 0.12 },
        },
        exit: { clipPath: `circle(0px at ${reveal?.at})`, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
      };

  const row: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, x: 40, filter: "blur(6px)" },
    shown: { opacity: 1, x: 0, filter: "blur(0px)", transition: softSpring },
  };

  const highlighted = hovered ?? props.items.find((item) => item.active)?.href ?? null;

  return (
    <AnimatePresence onExitComplete={() => setHovered(null)}>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={sheet}
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t.mainMenu}
            variants={panel}
            initial="hidden"
            animate="shown"
            exit="exit"
            style={{ width: `min(${PANEL_MAX}px, 92vw)` }}
            className="absolute inset-y-0 right-0 flex flex-col overflow-hidden border-l border-line bg-surface shadow-2xl"
          >
            {/* A soft wash of the brand colour drifting behind the links. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-soft blur-3xl"
              animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 40, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex items-center justify-between border-t-4 border-b border-t-accent border-b-line px-6 py-4">
              <motion.span variants={row} className="font-serif text-2xl font-semibold">
                Civica
              </motion.span>
              <motion.button
                ref={closeButton}
                type="button"
                onClick={onClose}
                aria-label={t.closeMenu}
                whileHover={reduce ? undefined : { rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={spring}
                className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </motion.button>
            </div>

            <nav aria-label={t.mainMenu} className="relative flex-1 overflow-y-auto px-3 py-4">
              <ol onMouseLeave={() => setHovered(null)}>
                {props.items.map((item, i) => {
                  const lit = highlighted === item.href;
                  return (
                    <motion.li key={item.href} variants={row} className="relative">
                      {lit && (
                        <motion.span
                          layoutId="menu-highlight"
                          className={`absolute inset-0 rounded-xl ${item.active ? "bg-accent-soft" : "bg-canvas"}`}
                          transition={spring}
                          aria-hidden
                        />
                      )}
                      <Link
                        href={item.href}
                        onClick={onClose}
                        onMouseEnter={() => setHovered(item.href)}
                        onFocus={() => setHovered(item.href)}
                        aria-current={item.active ? "page" : undefined}
                        className="relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-2 rounded-xl px-3 py-2.5 sm:py-3.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                      >
                        <span className={`font-serif text-sm font-semibold transition-colors ${lit ? "text-accent" : "text-muted"}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-serif text-xl font-semibold leading-tight sm:text-2xl">
                            {item.label}
                            {item.active && <span className="sr-only">({t.currentPage})</span>}
                            {item.badge && (
                              <motion.span
                                className="inline-block size-1.5 rounded-full bg-accent"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                aria-hidden
                              />
                            )}
                          </span>
                          <span className="block text-sm text-muted">{item.description}</span>
                        </span>
                        <motion.span
                          aria-hidden
                          animate={{ x: lit ? 0 : -6, opacity: lit ? 1 : 0.35 }}
                          transition={spring}
                          className={`text-xl ${lit ? "text-accent" : "text-muted"}`}
                        >
                          →
                        </motion.span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            </nav>

            <motion.div variants={row} className="relative space-y-3 border-t border-line px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted [:lang(ko)_&]:tracking-normal">
                {t.languageLabel}
              </p>
              <div role="group" aria-label={t.languageLabel} className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
                {(Object.keys(LANGUAGES) as Language[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className="relative rounded-md py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {language === code && (
                      <motion.span layoutId="menu-language" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={spring} />
                    )}
                    <span className={`relative ${language === code ? "text-ink" : "text-muted"}`}>{LANGUAGES[code].label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{t.menuShortcut}</p>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
