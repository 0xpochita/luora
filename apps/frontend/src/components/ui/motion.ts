/**
 * Shared motion presets (motion/react). Content that swaps in (a view, a tab's body, a step)
 * enters with a short fade and rise and never waits for the old one to leave; things that open
 * and close (panels, menus, banners) animate both ways. MotionRoot turns all of it off for
 * prefers-reduced-motion.
 */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

export const ENTER = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: EASE },
} as const;

/** the sliding pill under the active tab */
export const SLIDE = { type: "spring", stiffness: 520, damping: 42 } as const;
