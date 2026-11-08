"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useCivica } from "./CivicaProvider";
import { softSpring } from "./motion";

// The opening screen on the home page. The logo builds itself, a line of
// legalese is struck out and replaced by plain words, and scrolling closes
// the white screen up into the masthead to reveal the page underneath.
// Hidden for visitors who ask their system for reduced motion.

const ease = [0.22, 1, 0.36, 1] as const;

function Emblem() {
  const draw = (delay: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { pathLength: { delay, duration: 0.6, ease }, opacity: { delay, duration: 0.01 } },
  });
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className="size-24 sm:size-28"
      initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 16 }}
      aria-hidden
    >
      <rect width="64" height="64" rx="10" className="fill-accent" />
      <g className="stroke-accent-ink" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M14 26 32 15l18 11" {...draw(0.35)} />
        {[20, 28, 36, 44].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 44V29`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7 + i * 0.09, duration: 0.35, ease }}
          />
        ))}
        <motion.path d="M14 49h36" {...draw(1.05)} />
      </g>
    </motion.svg>
  );
}

export function Intro() {
  const { t } = useCivica();
  const spacer = useRef<HTMLDivElement>(null);
  // 0 at the top of the page, 1 once the spacer has scrolled out of view.
  const { scrollYProgress: p } = useScroll({ target: spacer, offset: ["start start", "end start"] });

  // The white screen closes up from the bottom and the sides into a card
  // that rises away, while the logo shrinks toward the masthead.
  const clipPath = useTransform(p, (v) => {
    const side = v * 10;
    const bottom = Math.min(100, v * 110);
    return `inset(${v * 3}% ${side}% ${bottom}% ${side}% round 0 0 ${v * 48}px ${v * 48}px)`;
  });
  const logoScale = useTransform(p, [0, 0.8], [1, 0.45]);
  const logoY = useTransform(p, [0, 0.8], ["0vh", "-32vh"]);
  const logoOpacity = useTransform(p, [0.55, 0.85], [1, 0]);
  const hintOpacity = useTransform(p, [0, 0.15], [1, 0]);
  const display = useTransform(p, (v) => (v >= 0.995 ? "none" : "flex"));

  const skip = () => {
    window.scrollTo({ top: spacer.current?.offsetHeight ?? window.innerHeight, behavior: "smooth" });
  };

  const wordmark = "Civica".split("");
  const taglineWords = t.tagline.split(" ");

  return (
    <>
      <div ref={spacer} aria-hidden className="h-[100svh] motion-reduce:hidden" />
      <motion.div
        style={{ clipPath, display }}
        className="fixed inset-0 z-50 flex-col items-center justify-center overflow-hidden bg-surface px-6 motion-reduce:hidden"
      >
        {/* Faint ruled lines, like a page of a document, drift into place. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 9 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute left-0 h-px w-full bg-line/70"
              style={{ top: `${10 + i * 10}%` }}
              initial={{ scaleX: 0, originX: i % 2 ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 1.1, ease }}
            />
          ))}
        </div>

        <motion.div aria-hidden style={{ scale: logoScale, y: logoY, opacity: logoOpacity }} className="relative flex flex-col items-center text-center">
          <Emblem />
          <div className="mt-6 flex font-serif text-7xl font-semibold tracking-tight text-ink sm:text-8xl">
            {wordmark.map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: 48, opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: 1.1 + i * 0.06, duration: 0.7, ease }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Legalese, struck through, gives way to plain words. */}
          <div className="relative mt-6 grid min-h-16 max-w-xl place-items-center">
            <motion.p
              className="relative col-start-1 row-start-1 font-serif text-sm italic text-muted decoration-cite decoration-2 max-sm:line-through sm:whitespace-nowrap sm:text-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -14], filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(6px)"] }}
              transition={{ delay: 1.6, duration: 2.2, times: [0, 0.2, 0.75, 1], ease: "easeInOut" }}
            >
              {t.introLegalese}
              <motion.span
                className="absolute inset-x-0 top-1/2 hidden h-0.5 origin-left bg-cite sm:block"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.3, duration: 0.6, ease }}
              />
            </motion.p>
            <p className="col-start-1 row-start-1 text-lg font-medium text-balance text-accent sm:text-2xl">
              {taglineWords.map((word, i) => (
                <motion.span
                  key={i}
                  className="mr-[0.28em] inline-block last:mr-0"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...softSpring, delay: 3.4 + i * 0.08 }}
                >
                  {word}
                </motion.span>
              ))}
            </p>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
        >
          <motion.button
            type="button"
            onClick={skip}
            className="flex flex-col items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4, duration: 0.6 }}
          >
            {t.introScroll}
            <span aria-hidden className="relative block h-10 w-px overflow-hidden bg-line">
              <motion.span
                className="absolute inset-x-0 top-0 h-4 bg-accent"
                animate={{ y: [-16, 40] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 4.2 }}
              />
            </span>
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}
