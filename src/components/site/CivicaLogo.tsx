"use client";

import { motion, useReducedMotion } from "motion/react";

// Two arcs facing each other (viewpoints in dialogue) around a point (you, deciding).
const OUTER_ARC = "M29.64 31.49 A15 15 0 1 1 29.64 8.51";
const INNER_ARC = "M15.18 14.25 A7.5 7.5 0 1 1 15.18 25.75";

export function CivicaMark(props: { size?: number; animate?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const draw = props.animate !== false && !reduce;
  const size = props.size ?? 36;
  return (
    <motion.svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={props.className}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <motion.path
        d={OUTER_ARC}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={4.5}
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: draw ? 0 : 1 },
          visible: { pathLength: 1, transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } },
        }}
      />
      {/* The invisible circle centers the group's bounding box, so it spins around (20, 20). */}
      <motion.g
        variants={{
          hidden: { rotate: 0 },
          visible: { rotate: 0 },
          hover: { rotate: reduce ? 0 : 180, transition: { type: "spring", stiffness: 120, damping: 14 } },
        }}
      >
        <circle cx={20} cy={20} r={7.5} fill="none" />
        <motion.path
          d={INNER_ARC}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: draw ? 0 : 1 },
            visible: { pathLength: 1, transition: { duration: 0.7, delay: draw ? 0.35 : 0, ease: "easeOut" } },
          }}
        />
      </motion.g>
      <motion.circle
        cx={20}
        cy={20}
        r={2.6}
        fill="var(--ink)"
        variants={{
          hidden: { scale: draw ? 0 : 1 },
          visible: { scale: 1, transition: { delay: draw ? 0.85 : 0, type: "spring", stiffness: 300, damping: 15 } },
        }}
      />
    </motion.svg>
  );
}

export function CivicaWordmark(props: { tagline?: string; animate?: boolean; size?: "md" | "lg" }) {
  const large = props.size === "lg";
  return (
    <span className="flex items-center gap-2.5">
      <CivicaMark size={large ? 48 : 36} animate={props.animate} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif font-semibold tracking-tight text-ink ${large ? "text-3xl" : "text-[1.6rem]"}`}>
          Civica
        </span>
        {props.tagline && <span className="mt-1 hidden text-xs text-muted sm:block">{props.tagline}</span>}
      </span>
    </span>
  );
}
