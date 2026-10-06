import Image from "next/image";
import { quality } from "@/lib/content";
import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Chain of custody — the recorded frame, and the sequence it belongs to.

   Brief §4.10 calls this the site's highest-differentiation claim and its most
   under-illustrated, and it is specific about the frame: a packing station
   from a slightly elevated three-quarter angle WITH THE OVERHEAD CAMERA
   VISIBLY IN FRAME, because "the entire claim is 'we filmed it'. If the viewer
   cannot see the camera, the claim is just text."

   That frame now exists as a rendering (lib/media.ts `custody`) and it has
   both halves of the claim in it: the camera on its mount, and the recording
   monitor carrying the prescription number. So the section leads with the
   footage rather than with a schematic of it. What replaced four drawn cells
   is one screen plus the sequence beside it — the checkpoints read better as a
   tracked timeline than as four boxes competing with their own burn-in.

   The burn-in is still the point. A timecode, a camera ID and a prescription
   number are what make a recording evidential rather than decorative, so they
   are set over the frame in the mono this site reserves for regulatory data.
   The values are illustrative and the caption says so.
   ========================================================================= */

/** Checkpoint burn-in. Sequential, so the track reads as one order. */
const STAMPS = [
  { cam: "CAM-01", tc: "14:22:06" },
  { cam: "CAM-01", tc: "14:24:41" },
  { cam: "CAM-02", tc: "14:27:18" },
  { cam: "CAM-02", tc: "14:31:55" },
];

/** The prescription every stamp on this sheet is filed against. */
const RX = "RX# 4417-02";

export function CustodyFilm({
  className,
  /**
   * Set when the strip sits on a navy ground. Only the caption changes — the
   * strip itself is dark either way, but `ink-muted` caption text on navy
   * measures about 1.6:1 and is effectively invisible.
   */
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  const steps = quality.custody.recorded.steps;
  /* The render burns its own stamp into the monitor inside the picture —
     CAM 02, 14:32 — so the bar above it carries the matching checkpoint
     rather than contradicting the pixels. That is the last of the four. */
  const shown = STAMPS[3];

  return (
    <figure className={cn("not-prose", className)}>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
        {/* ---- The frame ---- */}
        <div className="custody-monitor">
          <div className="custody-monitor-bar">
            <span className="flex items-center gap-2">
              {/* Static dot. A blinking one on archived footage would imply a
                  live feed, which is not what is being claimed. */}
              {/* A recording indicator. Red is the universal convention for
                  "recording" and is not a status in this design system's sense,
                  so it stays a literal rather than becoming `danger`. */}
              <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
              REC
            </span>
            <span className="text-white/45">{shown.cam}</span>
            <span className="ml-auto text-white/45">{RX}</span>
          </div>

          <div className="custody-monitor-screen">
            <Image
              src={media.custody.src}
              alt={media.custody.alt}
              fill
              /* The monitor sits in a 1.3fr column of a 1280px container, so it
                 caps at ~700px however wide the viewport gets. */
              sizes="(min-width: 1024px) 700px, 100vw"
              /* Pushed in slightly: the render carries generous margin around
                 the station, and a monitor showing a subject floating in the
                 middle of the frame reads as a picture, not a feed. */
              className="scale-[1.12] object-cover"
            />
            {/* Scanlines and the framing reticle: the two cues that say
                "this is a recording" without altering what is depicted. */}
            <span aria-hidden className="custody-scan" />
            <span aria-hidden className="custody-reticle" />
            <span className="custody-monitor-tc">09/29/2026 {shown.tc}</span>
          </div>
        </div>

        {/* ---- The sequence ---- */}
        <ol className="custody-track">
          {steps.map((step, i) => (
            <li key={step.title} className="custody-node">
              <span aria-hidden className="custody-node-mark">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="custody-node-stamp">
                {STAMPS[i].cam} · {STAMPS[i].tc}
              </p>
              <h3 className="mt-1 text-meta font-bold text-white">
                {step.title}
              </h3>
              <p className="mt-1 text-caption leading-relaxed text-white/60 text-pretty">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <figcaption
        className={cn(
          "mt-4 text-caption text-pretty",
          invert ? "text-white/45" : "text-ink-muted"
        )}
      >
        Rendering; frame stamps are illustrative. Every order is recorded
        through all four checkpoints and the footage is filed against its
        prescription number.
      </figcaption>
    </figure>
  );
}
