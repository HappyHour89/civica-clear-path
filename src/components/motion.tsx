"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";

// Shared animation building blocks (motion.dev). MotionConfig in SiteShell
// sets reducedMotion="user", so all of these calm down for visitors who ask
// their system for less motion.

export const spring = { type: "spring", stiffness: 420, damping: 30 } as const;
export const softSpring = { type: "spring", stiffness: 260, damping: 28 } as const;

// A small press on click; no hover lift, which reads as "startup".
const press = { whileTap: { scale: 0.98 }, transition: spring };

type ButtonProps = HTMLMotionProps<"button"> & { variant?: "primary" | "soft" | "chip" | "ghost" };

const variants = {
  primary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60",
  soft: "inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-60",
  chip: "rounded-md border border-line bg-surface px-2.5 py-1 text-left text-sm text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60",
  ghost: "rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:text-ink",
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

// Sections that rise into place the first time they scroll into view.
export function InView({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "section";
  className?: string;
  children: React.ReactNode;
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={softSpring}
    >
      {children}
    </Component>
  );
}
