"use client";

import { MotionConfig } from "motion/react";

// "user" turns off movement animations for visitors who ask their device for reduced motion.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
