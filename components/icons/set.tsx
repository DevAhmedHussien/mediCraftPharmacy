import {
  BarChart3,
  Building2,
  Candy,
  ClipboardCheck,
  Cog,
  Compass,
  Container,
  Dna,
  Droplet,
  Dumbbell,
  Eye,
  Factory,
  FileText,
  FlaskConical,
  Flower2,
  FolderOpen,
  GraduationCap,
  HeartPulse,
  Hourglass,
  Landmark,
  Leaf,
  Link2,
  Mail,
  MapPin,
  Microscope,
  PackageCheck,
  Phone,
  Pill,
  RadioTower,
  RefreshCw,
  Ruler,
  Scale,
  ShieldCheck,
  SprayCan,
  Stethoscope,
  Syringe,
  Tablets,
  Target,
  Terminal,
  TestTube,
  Truck,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The MediCraft icon set.

   Built on lucide-react, which gives the whole site one professionally drawn,
   optically consistent family instead of emoji that render differently on every
   operating system.

   This matches the spec in the art-direction brief §5: a 2px uniform stroke on
   a 24x24 grid, rounded caps and joins, `currentColor` so CSS controls colour,
   stroke-only with no fill. The brief suggests commissioning a bespoke set of
   ~28 icons; lucide covers every subject it lists (cleanroom, hood, vial, crimp,
   balance, EM sensor, camera, shield, SOP, microscope, cold-chain, shipping,
   map pin, dashboard, syringe, jar, capsule, spray, troche, IV, turnaround,
   consult, checklist, flask, barcode, lock, certificate, inspection, package)
   at the same stroke weight and grid, so a commission would buy consistency the
   site already has.

   Two icons are drawn locally because lucide has no equivalent and both are
   specific to this business rather than generic UI:

     · mortar — the pharmacy's own instrument and the subject of its logo
     · rx     — the prescription symbol, a regulatory mark

   Everything is addressed through one `Icon` component keyed by a semantic
   name ("camera", "sensor") rather than a library name ("Video",
   "RadioTower"). That way the vocabulary describes what the icon *means* here,
   and swapping the underlying glyph never touches a call site.
   ========================================================================= */

export type IconName =
  // Compounding instruments
  | "mortar"
  | "vial"
  | "syringe"
  | "flask"
  | "microscope"
  // Dosage forms
  | "capsule"
  | "tablet"
  | "jar"
  | "spray"
  | "troche"
  | "droplet"
  // Quality, documentation, custody
  | "camera"
  | "clipboard"
  | "document"
  | "folder"
  | "chart"
  | "shield"
  | "hourglass"
  | "cycle"
  | "gear"
  | "sensor"
  // People and places
  | "institution"
  | "building"
  | "ruler"
  | "factory"
  | "graduation"
  | "terminal"
  // Logistics
  | "truck"
  | "box"
  | "bolt"
  // Principles
  | "target"
  | "eye"
  | "compass"
  // Therapeutic areas
  | "scale"
  | "dna"
  | "leaf"
  | "heart"
  | "stethoscope"
  | "flower"
  | "dumbbell"
  // Contact and regulatory
  | "phone"
  | "mail"
  | "pin"
  | "link"
  | "rx";

/* --- The two locally drawn marks --------------------------------------- */

/** Props lucide passes its own components; the two local marks accept the same. */
type GlyphProps = React.ComponentProps<"svg">;

/** Mortar and pestle — the mark's own subject: bowl, rim, pestle resting in it. */
function Mortar(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3.5 9.5h17" />
      <path d="M5.8 9.5a6.2 6.2 0 0 0 12.4 0" />
      <path d="M15.5 3.5 11.2 9.5" />
      <path d="M9.5 20.5h5" />
      <path d="M12 15.7v4.8" />
    </svg>
  );
}

/** The prescription symbol — an R with its leg struck through. */
function Rx(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M7.5 20.5V6.5h4a3.6 3.6 0 0 1 0 7.2h-4" />
      <path d="m11.5 13.7 6 6.8" />
      <path d="m13.2 17.6 4.1-4" />
    </svg>
  );
}

/**
 * Semantic name → glyph.
 *
 * A few choices worth noting, because the obvious lucide name is not always
 * the right one here:
 *   · "camera" is `Video`, not `Camera` — every order is *filmed*, not photographed
 *   · "sensor" is `RadioTower` — continuous environmental monitoring, i.e. a signal
 *   · "box" is `PackageCheck` — fulfilment is verified, which is the whole claim
 *   · "heart" is `HeartPulse` — vitality and longevity, not affection
 */
const GLYPHS: Record<IconName, LucideIcon | ((p: GlyphProps) => JSX.Element)> = {
  // Compounding instruments
  mortar: Mortar,
  vial: TestTube,
  syringe: Syringe,
  flask: FlaskConical,
  microscope: Microscope,

  // Dosage forms
  capsule: Pill,
  tablet: Tablets,
  jar: Container,
  spray: SprayCan,
  troche: Candy,
  droplet: Droplet,

  // Quality, documentation, custody
  camera: Video,
  clipboard: ClipboardCheck,
  document: FileText,
  folder: FolderOpen,
  chart: BarChart3,
  shield: ShieldCheck,
  hourglass: Hourglass,
  cycle: RefreshCw,
  gear: Cog,
  sensor: RadioTower,

  // People and places
  institution: Landmark,
  building: Building2,
  ruler: Ruler,
  factory: Factory,
  graduation: GraduationCap,
  terminal: Terminal,

  // Logistics
  truck: Truck,
  box: PackageCheck,
  bolt: Zap,

  // Principles
  target: Target,
  eye: Eye,
  compass: Compass,

  // Therapeutic areas
  scale: Scale,
  dna: Dna,
  leaf: Leaf,
  heart: HeartPulse,
  stethoscope: Stethoscope,
  flower: Flower2,
  dumbbell: Dumbbell,

  // Contact and regulatory
  phone: Phone,
  mail: Mail,
  pin: MapPin,
  link: Link2,
  rx: Rx,
};

/**
 * Renders one icon from the set.
 *
 * Sized by class (`h-* w-*`) and coloured by `currentColor`, so an icon
 * inherits whatever its container establishes. Decorative by default; pass
 * `title` only where the icon is the sole carrier of meaning, which on this
 * site it never is.
 */
export function Icon({
  name,
  className,
  strokeWidth = 2,
  title,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  title?: string;
}) {
  const Glyph = GLYPHS[name];

  return (
    <Glyph
      className={cn("h-6 w-6 shrink-0", className)}
      strokeWidth={strokeWidth}
      // The two local marks are plain <svg> and need the stroke setup lucide
      // applies to its own components.
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    />
  );
}
