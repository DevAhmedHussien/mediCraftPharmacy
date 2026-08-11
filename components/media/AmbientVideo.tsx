"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { heroVideo } from "@/lib/media";

/**
 * The hero's ambient lab footage.
 *
 * A client component for one reason: it has to be able to *not* play. Anyone
 * who has asked their system for reduced motion gets the poster frame as a
 * still image and no video element at all — not a paused video, not a video
 * with autoplay removed. Nothing downloads that will not be used.
 *
 * When it does play it is muted, looped, inline and `preload="none"`, so it
 * never blocks the hero's text and never competes with it for attention. The
 * clip sits under a scrim supplied by the hero itself, which is what keeps the
 * headline at full contrast over moving footage.
 */
export function AmbientVideo({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <Image
        src={heroVideo.poster}
        alt=""
        fill
        priority
        sizes="100vw"
        className={className}
      />
    );
  }

  return (
    <video
      className={className}
      poster={heroVideo.poster}
      autoPlay
      muted
      loop
      playsInline
      // "metadata", not "none": several browsers decline to autoplay a video
      // they have been told not to preload, and the file is only 1.2 MB.
      preload="metadata"
      // Decorative: the hero's headline carries the meaning, and the clip has
      // no audio track, so there is nothing here for a screen reader to miss.
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={heroVideo.src} type="video/mp4" />
    </video>
  );
}
