"use client";

import { MotionConfig, motion, type HTMLMotionProps, type Variants } from "motion/react";
import type { ReactNode } from "react";

export const motionTiming = {
  fast: 0.12,
  base: 0.2,
  emphasis: 0.32,
  slow: 0.6,
  ease: [0.2, 0, 0, 1] as const,
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: motionTiming.base, ease: motionTiming.ease } },
};

export function PatchworkMotionConfig({ children }: Readonly<{ children: ReactNode }>) {
  return <MotionConfig reducedMotion="user" transition={{ duration: motionTiming.base, ease: motionTiming.ease }}>{children}</MotionConfig>;
}

export function FadeUp(props: HTMLMotionProps<"div">) {
  return <motion.div initial="hidden" animate="show" variants={fadeUpVariants} {...props} />;
}

export function SharedElement({ layoutId, children, ...props }: HTMLMotionProps<"div">) {
  return <motion.div layoutId={layoutId} transition={motionTiming.spring} {...props}>{children}</motion.div>;
}
