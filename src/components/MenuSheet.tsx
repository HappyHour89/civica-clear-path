"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { useCivica } from "./CivicaProvider";
import { softSpring } from "./motion";

export type MenuItem = { href: string; label: string; description: string; active: boolean; badge: boolean };

const panel = {
  hidden: { x: "100%" },
  shown: { x: 0, transition: { type: "spring", stiffness: 320, damping: 34, staggerChildren: 0.045, delayChildren: 0.08 } },
  exit: { x: "100%", transition: { type: "spring", stiffness: 400, damping: 40 } },
} as const;

const row = {
  hidden: { opacity: 0, x: 24 },
  shown: { opacity: 1, x: 0, transition: softSpring },
} as const;

// A panel that slides in from the right: numbered sections with a line on
// what each does, the language switch, and a calm backdrop. Esc, the
// backdrop, the close button, or choosing a page closes it.
export function MenuSheet(props: { open: boolean; onClose: () => void; items: MenuItem[]; returnFocusTo: React.RefObject<HTMLElement | null> }) {
  const { t, language, setLanguage } = useCivica();
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { open, onClose, returnFocusTo } = props;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const returnTo = returnFocusTo.current;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") return onClose();
      // Keep Tab inside the panel while it is open.
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
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
            className="absolute inset-y-0 right-0 flex w-[min(24rem,90vw)] flex-col border-l border-line bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-t-4 border-b border-t-accent border-b-line px-6 py-4">
              <span className="font-serif text-2xl font-semibold">Civica</span>
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                aria-label={t.closeMenu}
                className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink"
              >
                <motion.svg
                  viewBox="0 0 20 20"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  transition={softSpring}
                  aria-hidden
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </motion.svg>
              </button>
            </div>

            <nav aria-label={t.mainMenu} className="flex-1 overflow-y-auto px-3 py-4">
              <ol>
                {props.items.map((item, i) => (
                  <motion.li key={item.href} variants={row}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={item.active ? "page" : undefined}
                      className={`group grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-2 rounded-lg px-3 py-3 transition-colors ${
                        item.active ? "bg-accent-soft" : "hover:bg-canvas"
                      }`}
                    >
                      <span className={`font-serif text-sm font-semibold ${item.active ? "text-accent" : "text-muted"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-serif text-xl font-semibold leading-tight">
                          {item.label}
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
                      <span
                        aria-hidden
                        className={`text-lg transition-transform duration-200 group-hover:translate-x-1 ${
                          item.active ? "text-accent" : "text-muted"
                        }`}
                      >
                        →
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </nav>

            <motion.div variants={row} className="space-y-3 border-t border-line px-6 py-5">
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
                    className="relative rounded-md py-2 text-sm font-medium"
                  >
                    {language === code && (
                      <motion.span layoutId="menu-language" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={softSpring} />
                    )}
                    <span className={`relative ${language === code ? "text-ink" : "text-muted"}`}>{LANGUAGES[code].label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{t.tagline}</p>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
