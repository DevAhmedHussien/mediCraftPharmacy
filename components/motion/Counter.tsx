"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up to itself, once, when it is scrolled into view.
 *
 * THE VALUE IS IN THE SERVER HTML. `useState(value)` — not `useState(0)` —
 * so the first paint, the view-source, and every crawler see "49", not "0"
 * that becomes 49 if JavaScript runs. A statistic that reads as zero to
 * anything without JS is worse than a statistic that does not animate.
 *
 * NO ANIMATION LIBRARY. This is one number interpolated over 900ms; it needs
 * a requestAnimationFrame loop, not an engine. The home page's First Load JS
 * budget for this entire piece of work is 8 kB, and framer-motion is ~47 —
 * paying that so a figure can tick would be the whole budget for the one
 * effect nobody asked for.
 *
 * `suffix` rather than parsing the label: the values on this site are "10+",
 * "49" and "503A". Only the leading integer counts; everything else is
 * rendered as written.
 */
export function Counter({
  value,
  suffix = "",
  duration = 900,
  className,
}: {
  /** The final number. Rendered as-is on the server. */
  value: number;
  /** Anything that trails it — "+", "%", " states". */
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || done.current) return;

    // Asked at effect time rather than captured in a hook, so a preference
    // changed after load is respected on the next page without a reload.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        observer.disconnect();

        const start = performance.now();
        setDisplay(0);

        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // Same curve as the CSS reveal, so a figure and the card it sits
          // in do not arrive on two different eases.
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(eased * value));
          if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {/* `tabular-nums` on the caller keeps the box from reflowing as digits
          change — a counter that nudges its neighbours is a layout shift. */}
      {display}
      {suffix}
    </span>
  );
}
