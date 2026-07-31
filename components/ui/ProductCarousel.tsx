"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Apple-style horizontal product shelf.
 *
 * The slides are passed in as `children`, so they render on the server and
 * arrive in the initial HTML — this component only hydrates the arrow
 * controls around them. Scrolling itself is native CSS scroll-snap, so the
 * shelf is fully usable with no JavaScript at all: touch, trackpad, keyboard,
 * and screen-reader navigation all work before (and without) hydration.
 *
 * The heading row is owned here so the arrows can sit in normal flow beside
 * the optional action link instead of overlapping it.
 */
export function ProductCarousel({
  label,
  heading,
  action,
  children,
}: {
  /** Accessible name for the scroll region. */
  label: string;
  heading?: ReactNode;
  /** Optional link rendered to the left of the arrows. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // 1px of slack absorbs sub-pixel scroll positions at the extremes.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    setOverflows(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <div>
      {(heading || action) && (
        <div className="flex flex-wrap items-end justify-between gap-4 pb-10">
          {heading}
          <div className="flex items-center gap-6">
            {action}
            {/* Arrows are an enhancement on top of native scrolling — hidden on
                touch layouts, where swiping is the expected gesture, and when
                everything already fits. */}
            {overflows && (
              <div className="hidden gap-2 md:flex">
                <ArrowButton
                  direction="left"
                  disabled={atStart}
                  onClick={() => scrollBy(-1)}
                />
                <ArrowButton
                  direction="right"
                  disabled={atEnd}
                  onClick={() => scrollBy(1)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <ul
        ref={trackRef}
        onScroll={sync}
        role="region"
        aria-label={label}
        tabIndex={0}
        /*
         * The negative margin lets slides bleed to the container edge while
         * the matching padding keeps the first and last slide aligned with the
         * grid. `scroll-pl-*` must mirror that padding: without it, mandatory
         * snapping rests the track at scrollLeft = padding rather than 0, and
         * the "at start" check never fires.
         */
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-6 scroll-pl-6 overflow-x-auto px-6 pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4 lg:-mx-10 lg:scroll-pl-10 lg:px-10"
      >
        {children}
      </ul>
    </div>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.06] text-ink transition-colors duration-200 hover:bg-ink/[0.12] disabled:opacity-25 disabled:hover:bg-ink/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

/** Fixed-width slide. Keeps the shelf's snap geometry in one place. */
export function CarouselItem({ children }: { children: ReactNode }) {
  return <li className="w-[268px] shrink-0 snap-start sm:w-[300px]">{children}</li>;
}
