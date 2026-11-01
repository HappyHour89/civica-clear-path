"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";

// Shared animation building blocks (motion.dev). MotionConfig in SiteShell
// sets reducedMotion="user", so all of these calm down for visitors who ask
// their system for less motion.

export const spring = { type: "spring", stiffness: 420, damping: 30 } as const;
export const softSpring = { type: "spring", stiffness: 260, damping: 28 } as const;

const press = { whileHover: { y: -1.5 }, whileTap: { y: 0, scale: 0.97 }, transition: spring };

type ButtonProps = HTMLMotionProps<"button"> & { variant?: "primary" | "soft" | "chip" | "ghost" };

const variants = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink shadow-[0_6px_20px_-8px_var(--accent)] hover:shadow-[0_10px_28px_-10px_var(--accent)] disabled:opacity-60 disabled:shadow-none",
  soft: "inline-flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 font-medium text-accent disabled:opacity-60",
  chip: "rounded-full border border-line bg-surface px-3 py-1 text-left text-sm hover:border-accent hover:text-accent disabled:opacity-60",
  ghost: "rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-ink",
};

export function Button({ variant = "primary", className = "", disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      {...(disabled ? {} : press)}
      disabled={disabled}
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}

// Fades and lifts content in when it first appears.
export function Reveal({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Lists whose items rise in one after another.
export function Stagger({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "ul" | "ol" | "dl" }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }}
    >
      {children}
    </Component>
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: softSpring },
};

export function StaggerItem({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "li" }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}

// Errors and notices that slide open rather than popping in.
export function Collapse({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={softSpring}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Three bouncing dots for "working on it".
export function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block size-1.5 rounded-full bg-current"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

// An indeterminate progress bar for long research requests.
export function ProgressBar() {
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-accent-soft" aria-hidden>
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// Used by app/template.tsx (whole pages) and app/briefing/template.tsx
// (briefing tabs); Next.js remounts templates on navigation, which replays this.
export function PageTransition({
  children,
  subtle = false,
  className,
}: {
  children: React.ReactNode;
  subtle?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: subtle ? 6 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      {children}
    </motion.div>
  );
}
