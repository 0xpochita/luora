"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** App-wide motion settings: every animation follows the user's reduced-motion setting. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
