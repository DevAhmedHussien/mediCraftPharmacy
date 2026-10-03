import "dotenv/config";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { sealField, toKey } from "../lib/encryption";
import { agreementText, hashAgreement } from "../lib/signature-text";
import { products as catalog } from "../lib/data";

/* ===========================================================================
   Development seed.

   Idempotent: every write is an upsert keyed on a natural key, so running it
   twice does not duplicate a catalog or a blog. That matters because
   `prisma migrate reset` runs it automatically and a seed that only works
   once is a seed nobody trusts.

   PRICES ARE PLACEHOLDERS. lib/data.ts carries no prices — the catalog on the
   marketing site never showed any — so the figures below are derived
   deterministically from the dosage form purely so the admin screens have
   something to sort and total. Replace them with the real price book before
   this reaches anyone outside the team. They are marked in the console output
   for the same reason.
   ========================================================================= */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// The seed is a script, not a server module, so it binds the key itself
// rather than importing the `server-only` wrapper in lib/crypto.ts.
const ENCRYPTION_KEY = toKey(process.env.FIELD_ENCRYPTION_KEY!);

/** Deterministic placeholder pricing, so a reseed does not reshuffle figures. */
function placeholderPrice(name: string, form: string): number {
  const base: Record<string, number> = {
    Injectable: 180,
    "Topical Cream": 72,
    Capsule: 48,
    Troche: 64,
    "IV Infusion": 240,
    "Sterile Ophthalmic": 96,
  };
  const anchor = base[form] ?? 85;
  // Stable per-product jitter from the name, so the list is not uniform.
  const jitter = [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 41, 7);
  return Number((anchor + jitter - 20).toFixed(2));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedUsers() {
  // Cost 12: ~250ms per hash on current hardware. High enough that an offline
  // attack on a leaked table is expensive, low enough that a login is not.
  const passwordHash = await bcrypt.hash("MediCraft!2026", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@medicraftpharmacy.com" },
    update: {},
    create: {
      email: "super@medicraftpharmacy.com",
      name: "Amer Hussien",
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@medicraftpharmacy.com" },
    update: {},
    create: {
      email: "admin@medicraftpharmacy.com",
      name: "Dana Whitfield",
      role: "ADMIN",
      passwordHash,
    },
  });

  // A deliberately partial grant: this admin can work applications and
  // pricing but cannot send an MSA. It makes the permission guards visible
  // the first time anyone clicks around, instead of everything being allowed.
  const grants = [
    "APPLICATIONS_VIEW",
    "APPLICATIONS_REVIEW",
    "PRODUCTS_SEND",
    "PRICING_REVIEW",
    "PARTNERS_VIEW",
  ] as const;

  for (const permission of grants) {
    await prisma.adminPermission.upsert({
      where: { userId_permission: { userId: admin.id, permission } },
      update: {},
      create: { userId: admin.id, permission, grantedById: superAdmin.id },
    });
  }

  return { superAdmin, admin, passwordHash };
}

/**
 * Partner accounts, one per stage worth clicking through.
 *
 * The pipeline has seventeen statuses; seeding all of them would be noise.
 * These three are the ones where the UI actually differs: freshly applied,
 * mid-negotiation, and fully verified. Each carries a real application and a
 * prescriber so the admin detail screens have something to render — including
 * an encrypted DEA number, so the "last four only" display path is exercised
 * rather than assumed.
 */
/**
 * One applicant parked at every stage, so every screen can be opened and
 * reviewed without walking the whole pipeline by hand.
 *
 * `stage` drives the extra rows each one needs — a meeting request, a sent
 * price list, a signed envelope. Without those the status alone renders an
 * empty screen: `MEETING_REQUESTED` with no Meeting row shows a scheduler
 * with nothing to schedule.
 */

/* ===========================================================================
   Seeded uploads.

   Written straight to the local upload directory with `fs` rather than through
   lib/services/storage, which is marked `server-only` and throws when imported
   from a script. The seeded rows have to point at bytes that actually exist,
   or every "View" button in the portal and the admin panel 404s.
   ========================================================================= */

/** The smallest thing a PDF reader will still open. */
const SEED_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
  "utf8"
);

async function writeSeedUpload(key: string) {
  const full = path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR ?? ".uploads", key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, SEED_PDF);
}

const PARTNERS = [
  {
    email: "applied@medicraftpharmacy.com",
    practice: "Harbor Family Medicine",
    contact: "Dr. Elena Ruiz",
    prescriber: "Dr. Elena Ruiz",
    dea: "AB1234563",
    npi: "1234567893",
    status: "APPLICATION_SUBMITTED" as const,
    note: "Application submitted.",
  },
  {
    email: "identity@medicraftpharmacy.com",
    practice: "Safety Harbor Family Practice",
    contact: "Dr. Imani Osei",
    prescriber: "Dr. Imani Osei",
    dea: "BO1234563",
    npi: "1326063900",
    status: "IDENTITY_SUBMITTED" as const,
    note: "Identity submitted by Dr. Imani Osei.",
    identity: true,
  },
  {
    email: "priced@medicraftpharmacy.com",
    practice: "Coastal Primary Care",
    contact: "Nadia Whitlock",
    prescriber: "Dr. Nadia Whitlock",
    dea: "BW1234563",
    npi: "1245319599",
    status: "PRODUCT_LIST_SENT" as const,
    note: "Approved; formulary released.",
  },
  {
    email: "meeting@medicraftpharmacy.com",
    practice: "Gulfview Wellness Group",
    contact: "Marcus Hale",
    prescriber: "Dr. Priya Raman",
    dea: "BR1234563",
    npi: "1811954762",
    status: "MEETING_REQUESTED" as const,
    note: "Asked for a pricing call.",
    meetingNotes:
      "We dispense around 40 GLP-1 vials a month across two locations and would like to discuss tiered pricing at that volume.",
  },
  {
    email: "scheduled@medicraftpharmacy.com",
    practice: "Pinellas Men's Health",
    contact: "Dr. Tomas Iverson",
    prescriber: "Dr. Tomas Iverson",
    dea: "BI1234563",
    npi: "1477591888",
    status: "PRICING_MEETING" as const,
    note: "Pricing call booked.",
    meetingNotes: "Mainly testosterone and peptide lines. Looking for a volume tier.",
    meetingInDays: 3,
  },
  {
    email: "negotiated@medicraftpharmacy.com",
    practice: "Sunrise Longevity Clinic",
    contact: "Dr. Hannah Beckett",
    prescriber: "Dr. Hannah Beckett",
    dea: "BB1234563",
    npi: "1609868831",
    status: "NEGOTIATED_PRICING_SENT" as const,
    note: "Negotiated pricing sent.",
    meetingNotes: "High NAD+ and glutathione volume.",
    meetingInDays: -2,
    priceList: { discount: "15", status: "SENT" as const },
  },
  {
    email: "onboarding@medicraftpharmacy.com",
    practice: "Tampa Bay Hormone Health",
    contact: "Dr. Owen Fairbanks",
    prescriber: "Dr. Owen Fairbanks",
    dea: "BF1234563",
    npi: "1932102084",
    status: "PRICING_PARTNER_ACCEPTED" as const,
    note: "Pricing accepted.",
    meetingNotes: "Wanted parity with their current compounder.",
    meetingInDays: -9,
    priceList: { discount: "12", status: "ACCEPTED" as const },
  },
  {
    email: "documents@medicraftpharmacy.com",
    practice: "Anclote River Medical",
    contact: "Dr. Priya Raman",
    prescriber: "Dr. Priya Raman",
    dea: "BR1234563",
    npi: "1063505863",
    status: "DOCUMENTS_PENDING" as const,
    note: "Account details completed.",
    meetingNotes: "Peptides and weight management, two locations.",
    meetingInDays: -11,
    priceList: { discount: "14", status: "ACCEPTED" as const },
    onboarding: true,
  },
  {
    email: "review@medicraftpharmacy.com",
    practice: "Dunedin Integrative Health",
    contact: "Dr. Yusuf Karim",
    prescriber: "Dr. Yusuf Karim",
    dea: "BK1234563",
    npi: "1194738458",
    status: "ONBOARDING_SUBMITTED" as const,
    note: "Documents submitted for review.",
    meetingNotes: "Asked for parity on the semaglutide lines.",
    meetingInDays: -14,
    priceList: { discount: "16", status: "ACCEPTED" as const },
    onboarding: true,
    documents: ["GOVERNMENT_ID", "DEA_REGISTRATION", "STATE_LICENSE", "W9"] as const,
  },
  {
    email: "agreement@medicraftpharmacy.com",
    practice: "Clearwater Wellness Partners",
    contact: "Dr. Lucia Moreno",
    prescriber: "Dr. Lucia Moreno",
    dea: "BM1234563",
    npi: "1568406891",
    status: "MSA_SENT" as const,
    note: "Agreement issued.",
    meetingNotes: "Straightforward — accepted our second offer.",
    meetingInDays: -16,
    priceList: { discount: "10", status: "ACCEPTED" as const },
    onboarding: true,
    documents: ["GOVERNMENT_ID", "DEA_REGISTRATION", "STATE_LICENSE", "W9"] as const,
    envelope: "SENT" as const,
  },
  {
    email: "verified@medicraftpharmacy.com",
    practice: "Bayside Endocrinology",
    contact: "Dr. Samuel Otieno",
    prescriber: "Dr. Samuel Otieno",
    dea: "FO1234563",
    npi: "1740588476",
    status: "VERIFIED" as const,
    note: "Agreement signed; account activated.",
    meetingNotes: "Volume across three sites.",
    meetingInDays: -30,
    priceList: { discount: "18", status: "ACCEPTED" as const },
    onboarding: true,
    documents: ["GOVERNMENT_ID", "DEA_REGISTRATION", "STATE_LICENSE", "W9"] as const,
    envelope: "COMPLETED" as const,
  },
  {
    email: "rejected@medicraftpharmacy.com",
    practice: "Northside Aesthetics",
    contact: "Kara Lindqvist",
    prescriber: "Dr. Kara Lindqvist",
    dea: "BL1234563",
    npi: "1093895763",
    status: "REJECTED" as const,
    note: "Rejected.",
    rejectedReason:
      "We were not able to verify an active pharmacy licence in the state of practice. Please reapply once it is current.",
  },
];

async function seedPartners(passwordHash: string, superAdminId: string) {
  for (const entry of PARTNERS) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {},
      create: { email: entry.email, name: entry.contact, role: "PARTNER", passwordHash },
    });

    const partner = await prisma.partner.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyName: entry.practice,
        businessType: "SMALL_PHARMACY",
        contactName: entry.contact,
        phone: "+17275550142",
        status: entry.status,
        verifiedAt: entry.status === "VERIFIED" ? new Date() : null,
      },
    });

    const application = await prisma.partnerApplication.upsert({
      where: { partnerId: partner.id },
      update: {},
      create: {
        partnerId: partner.id,
        accountType: "NEW",
        howDidYouHearAboutUs: "Referral",
        practiceName: entry.practice,
        isPrimaryLocation: true,
        practiceAddress: "4190 Corporate Ct",
        practiceCity: "Palm Harbor",
        practiceState: "Florida",
        practiceZip: "34683",
        practicePhone: "+17275550142",
        officeContactName: entry.contact,
        officeContactEmail: entry.email,
        rxQuestionsEmail: entry.email,
      },
    });

    /* Who asked for the price list. Everything past APPLICATION_SUBMITTED has
       been through the identity check, so the seeded data says so rather than
       leaving every screen that reads it blank. */
    const needsIdentity = entry.status === "APPLICATION_SUBMITTED";
    if (!needsIdentity) {
      await prisma.partnerApplication.update({
        where: { id: application.id },
        data: {
          requesterName: entry.contact,
          requesterTitle: "Practice Owner",
          requesterPhone: "+17275550142",
          requesterEmail: entry.email,
          identitySubmittedAt: new Date(),
          ...(entry.status === "IDENTITY_SUBMITTED"
            ? {}
            : { identityVerifiedAt: new Date(), identityVerifiedById: superAdminId }),
        },
      });

      const hasId = await prisma.partnerDocument.count({
        where: { partnerId: partner.id, type: "GOVERNMENT_ID" },
      });
      if (hasId === 0) {
        const key = `partners/${partner.id}/documents/government_id.pdf`;
        await writeSeedUpload(key);
        await prisma.partnerDocument.create({
          data: {
            partnerId: partner.id,
            type: "GOVERNMENT_ID",
            driver: "LOCAL",
            s3Key: key,
            filename: "government_id.pdf",
            mime: "application/pdf",
            size: SEED_PDF.byteLength,
            status: entry.status === "IDENTITY_SUBMITTED" ? "PENDING_REVIEW" : "ACCEPTED",
          },
        });
      }
    }

    const dea = sealField(entry.dea, ENCRYPTION_KEY);
    const npi = sealField(entry.npi, ENCRYPTION_KEY);

    await prisma.prescriber.upsert({
      where: { applicationId_position: { applicationId: application.id, position: 0 } },
      update: {},
      create: {
        applicationId: application.id,
        position: 0,
        name: entry.prescriber,
        signatureText: entry.prescriber.replace(/^Dr\.\s*/, ""),
        signedAt: new Date(),
        deaCiphertext: dea.ciphertext,
        deaLast4: dea.last4,
        deaExpiration: new Date("2028-06-30"),
        npiCiphertext: npi.ciphertext,
        npiLast4: npi.last4,
      },
    });

    // One history row so the timeline is not empty on the admin detail view.
    const existingHistory = await prisma.statusHistory.count({ where: { partnerId: partner.id } });
    if (existingHistory === 0) {
      await prisma.statusHistory.create({
        data: {
          partnerId: partner.id,
          fromStatus: null,
          toStatus: entry.status,
          actorId: user.id,
          actorEmail: entry.email,
          actorRole: "PARTNER",
          note: entry.note,
        },
      });
    }

    // --- The rows each stage needs to render ------------------------------
    //
    // A status on its own is not enough: MEETING_REQUESTED with no Meeting
    // row draws a scheduler with nothing to schedule, and
    // NEGOTIATED_PRICING_SENT with no PriceListVersion draws an empty table.

    if (entry.meetingNotes) {
      const existingMeeting = await prisma.meeting.findFirst({
        where: { partnerId: partner.id },
      });

      if (!existingMeeting) {
        await prisma.meeting.create({
          data: {
            partnerId: partner.id,
            requestNotes: entry.meetingNotes,
            ...(entry.meetingInDays !== undefined
              ? {
                  scheduledAt: new Date(Date.now() + entry.meetingInDays * 864e5),
                  durationMinutes: 30,
                  location: "Google Meet — link sent separately",
                  scheduledById: superAdminId,
                }
              : {}),
          },
        });
      }
    }

    if (entry.priceList) {
      const existingList = await prisma.priceListVersion.findFirst({
        where: { partnerId: partner.id },
      });

      if (!existingList) {
        const products = await prisma.product.findMany({
          where: { isActive: true },
          select: { id: true, listPrice: true },
        });
        const discount = new Prisma.Decimal(entry.priceList.discount);

        const version = await prisma.priceListVersion.create({
          data: {
            partnerId: partner.id,
            version: 1,
            status: entry.priceList.status,
            submittedById: superAdminId,
            submittedAt: new Date(),
            adminComment: `Held for twelve months at ${entry.priceList.discount}% off list.`,
            ...(entry.priceList.status === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
            items: {
              create: products.map((product) => ({
                productId: product.id,
                listPrice: product.listPrice,
                discountPercent: discount,
                // Same arithmetic the service uses — exact, not float.
                finalPrice: product.listPrice
                  .times(new Prisma.Decimal(100).minus(discount).dividedBy(100))
                  .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
              })),
            },
          },
          select: { id: true, items: { select: { productId: true, finalPrice: true } } },
        });

        if (entry.priceList.status === "ACCEPTED") {
          await prisma.partnerPricing.createMany({
            data: version.items.map((item) => ({
              partnerId: partner.id,
              productId: item.productId,
              price: item.finalPrice,
              sourceVersionId: version.id,
              effectiveFrom: new Date(),
              // Only a verified partner's prices are live.
              isActive: entry.status === "VERIFIED",
            })),
          });
        }
      }
    }

    /* The account-details record. Everything past ONBOARDING_IN_PROGRESS has
       one, and without it the portal's own pages render empty and the admin
       reviews a file with no legal entity in it. */
    if (entry.onboarding) {
      const ein = sealField("47" + String(1000000 + PARTNERS.indexOf(entry)), ENCRYPTION_KEY);

      await prisma.partnerOnboarding.upsert({
        where: { partnerId: partner.id },
        update: {},
        create: {
          partnerId: partner.id,
          legalBusinessName: `${entry.practice} LLC`,
          einCiphertext: ein.ciphertext,
          einLast4: ein.last4,
          businessStreet: "4190 Corporate Ct",
          businessCity: "Palm Harbor",
          businessState: "Florida",
          businessZip: "34683",
          billingStreet: "4190 Corporate Ct",
          billingCity: "Palm Harbor",
          billingState: "Florida",
          billingZip: "34683",
          statesOfOperation: ["Florida"],
          signerName: entry.contact,
          signerTitle: "Practice Owner",
          signerEmail: entry.email,
          submittedAt: new Date(),
        },
      });

      await prisma.partnerApplication.update({
        where: { id: application.id },
        data: { completedAt: new Date() },
      });
    }

    if (entry.documents) {
      const existingDocuments = await prisma.partnerDocument.count({
        where: { partnerId: partner.id },
      });

      if (existingDocuments === 0) {
        for (const type of entry.documents) {
          const key = `partners/${partner.id}/documents/${type.toLowerCase()}.pdf`;
          await writeSeedUpload(key);

          await prisma.partnerDocument.create({
            data: {
              partnerId: partner.id,
              type,
              driver: "LOCAL",
              s3Key: key,
              filename: `${type.toLowerCase()}.pdf`,
              mime: "application/pdf",
              size: SEED_PDF.byteLength,
              // Already cleared for anyone past review, so those screens show
              // the accepted state rather than a queue that never drains.
              status:
                entry.status === "ONBOARDING_SUBMITTED" ? "PENDING_REVIEW" : "ACCEPTED",
            },
          });
        }
      }
    }

    if (entry.envelope) {
      const existingEnvelope = await prisma.msaEnvelope.findFirst({
        where: { partnerId: partner.id },
      });

      if (!existingEnvelope) {
        const text = agreementText(entry.practice);
        await prisma.msaEnvelope.create({
          data: {
            partnerId: partner.id,
            driver: "INTERNAL",
            envelopeId: `int_seed_${partner.id}`,
            status: entry.envelope,
            signerName: entry.prescriber,
            signerEmail: entry.email,
            agreementHash: hashAgreement(text),
            sentAt: new Date(),
            ...(entry.envelope === "COMPLETED"
              ? {
                  completedAt: new Date(),
                  signedName: entry.prescriber.replace(/^Dr\.\s*/, ""),
                  signedIp: "127.0.0.1",
                  signedUserAgent: "seed",
                }
              : {}),
          },
        });
      }
    }

    if (entry.rejectedReason) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: { rejectedReason: entry.rejectedReason },
      });
    }
  }

  return PARTNERS.length;
}

async function seedProducts() {
  let created = 0;

  for (const [index, p] of catalog.entries()) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        strength: p.doses,
        form: p.form,
        categorySlug: p.categorySlug,
        blurb: p.blurb,
        description: p.detail.description,
        listPrice: placeholderPrice(p.name, p.form),
        unit: p.form === "Injectable" ? "vial" : "each",
        sortOrder: index,
        isActive: true,
      },
    });
    created += 1;
  }

  return created;
}

const POSTS = [
  {
    slug: "what-usp-797-actually-requires",
    title: "What USP <797> Actually Requires",
    excerpt:
      "Beyond-use dating, air classification and the documentation an inspector asks for first — what the chapter says, in the order it matters to a prescriber.",
    categories: ["compliance"],
    body: `## The chapter is about time, air and evidence

USP General Chapter <797> governs compounded sterile preparations. Most summaries of it reach for the cleanroom photographs. The chapter itself is far more interested in three things a photograph cannot show: how long a preparation remains good for, what the air around it was doing while it was made, and whether you can prove either.

### Beyond-use dating is not an expiry date

An expiry date comes from stability data generated by a manufacturer over months. A beyond-use date is assigned from the compounding category and the storage conditions, and it is almost always shorter. Category 1 CSPs prepared in a segregated compounding area carry a BUD measured in hours. Category 2 preparations made in an ISO Class 5 primary engineering control inside a classified buffer room earn substantially longer — but only when the supporting environmental monitoring exists.

### Air classification is continuous, not a certificate

An ISO Class 5 hood is a claim about particle counts while work is happening, not a plaque on the wall. The certification is annual; the monitoring is ongoing. Viable air sampling, surface sampling and pressure differentials between the anteroom and the buffer room are what turn the classification into something an inspector can accept.

### The documentation is the deliverable

A preparation that was compounded correctly and documented incompletely is, from a regulatory standpoint, a preparation of unknown provenance. Master formulation records, compounding records, personnel competency files and the environmental monitoring log are the artifacts. Everything else is process.

If you are evaluating a compounding pharmacy, ask for the environmental monitoring trend data rather than the cleanroom photographs. The first is difficult to produce and impossible to fake. The second is a lighting decision.`,
  },
  {
    slug: "why-flex-dose-vials-change-titration",
    title: "Why Flex-Dose Vials Change Titration",
    excerpt:
      "A fixed-dose pen commits a patient to the manufacturer's ladder. A flex-dose vial lets the prescriber set the rungs.",
    categories: ["formulation"],
    body: `## The ladder is the problem, not the molecule

GLP-1 therapy fails for a meaningful share of patients not because the drug does not work but because the titration schedule does not fit them. Commercial pens ship a fixed ladder: each step is a device, and the step sizes were chosen for a trial population.

### What a flex-dose vial changes

A multiple-dose vial at a known concentration turns the dose into an instruction rather than a purchase. A prescriber who wants to hold a patient at an intermediate dose for three extra weeks writes that. A patient who tolerates 0.35 mg but not 0.5 mg gets 0.35 mg.

### What it demands in return

Flexibility moves responsibility onto the label. A vial that can be drawn to any volume has to carry its concentration unambiguously, its beyond-use date, and a lot number that ties it to a specific compounding record. Every vial we dispense carries all three, and the syringe is supplied with the graduation the prescribed dose actually falls on.

### The part that is genuinely harder

Patient education. A pen counts clicks; a syringe requires the patient to read a volume. That is a real burden and it is the reason flex-dose is a clinical decision rather than a default. For the patients it fits, it is the difference between a therapy they stay on and one they abandon at week six.`,
  },
  {
    slug: "reading-a-certificate-of-analysis",
    title: "How to Read a Certificate of Analysis",
    excerpt:
      "A COA is a test report, not a guarantee. Here is which lines carry weight and which are boilerplate.",
    categories: ["quality"],
    body: `## Most of a COA is header

A certificate of analysis for an active pharmaceutical ingredient is a test report from a specific lot. It is evidence about that lot and nothing else, which is the first thing to hold onto: a COA for lot A tells you nothing about lot B from the same supplier.

### The lines that matter

**Identity.** Usually by IR or HPLC against a reference standard. This is the line that says the powder is what the label claims. If identity was confirmed "per supplier documentation" rather than by test, the COA is passing the question along rather than answering it.

**Assay.** Potency as a percentage of label claim, with a specification range. A result inside range is unremarkable; a result at the edge of range is worth a conversation about the calculation used in compounding.

**Impurities and residual solvents.** Specified limits and found values. Empty cells here are not clean results — they are untested parameters.

**Microbial limits and endotoxin.** Required for anything sterile. An API destined for an injectable with no endotoxin figure is not an injectable-grade API yet.

### What a COA does not tell you

It does not tell you the material in your hand is the material tested. That link is the receiving process: quarantine on arrival, identity confirmation in-house, and a record tying the container to the certificate. Any pharmacy can file a supplier's COA. Fewer can show you what they did with it.`,
  },
];

async function seedBlog(authorId: string) {
  const categories = [
    { slug: "compliance", name: "Compliance", description: "USP standards, inspections, and regulatory practice." },
    { slug: "formulation", name: "Formulation", description: "Dosage forms, delivery and clinical decisions." },
    { slug: "quality", name: "Quality", description: "Testing, sourcing and the documentation behind a preparation." },
  ];

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  for (const [index, p] of POSTS.entries()) {
    // ~220 words per minute is the usual reading-speed constant; round up so
    // nothing ever reads "0 min read".
    const readingMinutes = Math.max(1, Math.round(p.body.split(/\s+/).length / 220));

    const post = await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        status: index === POSTS.length - 1 ? "DRAFT" : "PUBLISHED",
        publishedAt:
          index === POSTS.length - 1 ? null : new Date(Date.now() - (index + 1) * 9 * 864e5),
        authorId,
        readingMinutes,
        seoTitle: p.title,
        seoDescription: p.excerpt,
      },
    });

    for (const slug of p.categories) {
      const category = await prisma.category.findUnique({ where: { slug } });
      if (!category) continue;
      await prisma.postCategory.upsert({
        where: { postId_categoryId: { postId: post.id, categoryId: category.id } },
        update: {},
        create: { postId: post.id, categoryId: category.id },
      });
    }
  }

  return POSTS.length;
}

/**
 * Sixty days of traffic, so the analytics dashboard renders a real trend
 * rather than an empty state. Shaped rather than uniform: weekdays outweigh
 * weekends and a slow upward drift gives the period-over-period comparison
 * something to actually compare.
 */
async function seedAnalytics() {
  const paths = [
    "/", "/products", "/compounding", "/quality", "/providers",
    "/about", "/contact", "/blog", "/blog/what-usp-797-actually-requires",
  ];
  const devices = ["desktop", "mobile", "mobile", "tablet"];
  const rows: {
    path: string; visitorHash: string; sessionId: string;
    device: string; browser: string; referrerHost: string | null;
    durationMs: number; createdAt: Date;
  }[] = [];

  for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - daysAgo);
    day.setUTCHours(0, 0, 0, 0);

    const weekend = [0, 6].includes(day.getUTCDay());
    const drift = 1 + (59 - daysAgo) / 90;
    const visits = Math.round((weekend ? 18 : 46) * drift);

    // A session is a visit, not a hit. Roughly a third of sessions are a
    // single page (a real bounce) and the rest read two to four — without
    // that, every session has one view, bounce rate computes as 100%, and
    // the metric is silently meaningless.
    for (let visit = 0; visit < visits; visit++) {
      const sessionId = randomUUID();
      const visitor = `seed-${daysAgo}-${visit % Math.max(1, Math.round(visits * 0.7))}`;
      const depth = visit % 3 === 0 ? 1 : 2 + (visit % 3);
      const start = new Date(day.getTime() + (8 + (visit % 11)) * 3600e3 + (visit % 59) * 60e3);

      for (let hit = 0; hit < depth; hit++) {
        rows.push({
          path: paths[(visit * 7 + daysAgo + hit * 3) % paths.length],
          visitorHash: visitor,
          sessionId,
          device: devices[visit % devices.length],
          browser: visit % 3 === 0 ? "Safari" : "Chrome",
          referrerHost:
            hit > 0 ? null : visit % 4 === 0 ? "google.com" : visit % 9 === 0 ? "linkedin.com" : null,
          durationMs: 12_000 + ((visit * 3137 + hit * 911) % 180_000),
          createdAt: new Date(start.getTime() + hit * 95_000),
        });
      }
    }
  }

  await prisma.pageView.deleteMany({ where: { visitorHash: { startsWith: "seed-" } } });
  // One statement rather than 3,000 round trips.
  await prisma.pageView.createMany({ data: rows });

  return rows.length;
}

async function main() {
  const { superAdmin, admin, passwordHash } = await seedUsers();
  const partnerCount = await seedPartners(passwordHash, superAdmin.id);
  const productCount = await seedProducts();
  const postCount = await seedBlog(superAdmin.id);
  const viewCount = await seedAnalytics();

  console.log(`
  Seed complete
  ─────────────────────────────────────────────
  STAFF
    super@medicraftpharmacy.com      Super admin — full access
    admin@medicraftpharmacy.com      Admin — no msa.send / onboarding.review

  ONE APPLICANT PER STAGE
    applied@medicraftpharmacy.com       Needs to confirm who they are
    identity@medicraftpharmacy.com      Identity submitted, awaiting a check
    priced@medicraftpharmacy.com        Looking at the formulary
    meeting@medicraftpharmacy.com       Asked for a call (admin must schedule)
    scheduled@medicraftpharmacy.com     Call booked (admin builds pricing)
    negotiated@medicraftpharmacy.com    Negotiated prices sent, awaiting them
    onboarding@medicraftpharmacy.com    Prices accepted, on account details
    documents@medicraftpharmacy.com     Details done, uploading documents
    review@medicraftpharmacy.com        Documents in, waiting on a reviewer
    agreement@medicraftpharmacy.com     MSA issued, awaiting signature
    verified@medicraftpharmacy.com      Verified partner
    rejected@medicraftpharmacy.com      Rejected, with a reason

  Password      MediCraft!2026           all of them — development only

  Partners      ${partnerCount}
  Products      ${productCount}   (29 curated, the rest from the 2026 formulary)
  Blog posts    ${postCount}   (${postCount - 1} published, 1 draft)
  Page views    ${viewCount}   across 60 days
  `);

  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
