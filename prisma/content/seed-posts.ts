import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/* ===========================================================================
   Four opening articles for Compounding Notes.

   WHAT THESE ARE, AND WHAT THEY ARE NOT
   -------------------------------------
   The blog's own standfirst promises "what the standards actually require,
   why a formulation decision was made, and what to ask a compounding
   pharmacy before you send it a prescription". These are written to that,
   not to a keyword list: each one answers a question a prescriber actually
   has, and the answer is the same whether or not they ever use MediCraft.

   NOTHING HERE ASSERTS A CLAIM ABOUT THIS PHARMACY THAT THE BUSINESS HAS NOT
   ALREADY PUT IN WRITING. They describe USP chapters, the 503A/503B
   distinction and beyond-use dating — all public, verifiable standards. Where
   a sentence would need a fact about MediCraft's own operation to be true,
   it is phrased as what to ask rather than what we do. An article that
   quietly invents a certification is worse than no article.

   Idempotent: keyed on slug, so re-running updates rather than duplicating.
   ========================================================================= */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COVERS = [
  { key: "blog/2026/10/vial-clear-glass-shelf.webp", w: 1086, h: 1448, size: 115230,
    alt: "A clear compounded preparation vial on a glass shelf" },
  { key: "blog/2026/10/vial-blue-ice.webp", w: 1082, h: 1454, size: 198392,
    alt: "A MediCraft vial chilled on ice, illustrating cold-chain handling" },
  { key: "blog/2026/10/stationery-letterhead.webp", w: 1600, h: 900, size: 98352,
    alt: "MediCraft letterhead and documentation" },
  { key: "blog/2026/10/vial-clear-pair-glass.webp", w: 1086, h: 1448, size: 129878,
    alt: "Two compounded preparation vials beside a glass of water" },
];

const POSTS = [
  {
    slug: "what-usp-797-actually-requires",
    title: "What USP <797> actually requires",
    excerpt:
      "Sterile compounding is governed by a chapter most prescribers have never read. Here is what it obliges a pharmacy to do, in plain terms.",
    cover: 0,
    body: `USP General Chapter <797> governs the compounding of sterile preparations. It is not a marketing badge and it is not optional: it is the standard that state boards of pharmacy inspect against, and it sets out in detail how a sterile preparation must be made, where, by whom, and how long it may be used for.

Most prescribers never read it. That is reasonable — it is a technical document written for pharmacists. But a few of its requirements directly affect the prescription you write, and they are worth knowing.

## The air the preparation is made in

Sterile compounding happens inside an ISO Class 5 primary engineering control — a laminar airflow hood or an isolator. That device sits inside a cleaner-than-ordinary room, and the chapter specifies the classification of that room too, along with how often the air is tested and what the particle counts have to be.

This is why a compounded sterile preparation cannot simply be mixed at a bench. The equipment is the control.

## Who is allowed to make it

Personnel must pass initial and ongoing competency assessment: gloved fingertip sampling, media-fill testing that simulates the actual compounding process, and garbing observation. The frequency depends on the risk level of what is being compounded.

The practical consequence is that a pharmacy cannot surge capacity by putting an untrained person on the hood.

## How long it lasts

<797> assigns beyond-use dates based on the risk level of the preparation and how it is stored — not on the stability of the drug in isolation. That distinction surprises people, and it is covered in its own article.

## What to ask

If you want to know whether a pharmacy meets the chapter, three questions get you most of the way:

- How often is the primary engineering control certified, and may I see the most recent report?
- What is your media-fill failure rate, and what happens when one fails?
- Who performs your environmental monitoring, and is it an outside party?

A pharmacy that compounds sterile preparations should be able to answer all three without hesitation.`,
  },
  {
    slug: "beyond-use-dating-explained",
    title: "Beyond-use dating: why your prescription expires when it does",
    excerpt:
      "A compounded preparation's date is not the drug's expiry. It is a statement about risk, storage and how the preparation was made.",
    cover: 1,
    body: `A manufactured drug carries an expiration date derived from stability studies on that exact formulation in that exact container. A compounded preparation carries a beyond-use date, and it is a different thing entirely.

The beyond-use date is the point after which the preparation should not be used. It is assigned from the compounding standard, and for sterile preparations it is driven primarily by the risk of microbial contamination rather than by chemical degradation.

## Why it is often shorter than you expect

A prescriber who knows a molecule is stable for two years can be surprised to receive a preparation dated in weeks. The date is not a claim about the molecule. It is a claim about the preparation: this container, filled this way, in this environment, stored at this temperature.

Where a pharmacy has performed sterility testing on the batch, longer dating may be supportable. Where it has not, the standard's default limits apply, and they are conservative on purpose.

## What changes it

- **Storage temperature.** Refrigerated and frozen preparations are dated differently from those at controlled room temperature.
- **Container closure.** A single-dose vial and a multiple-dose vial do not behave the same once punctured.
- **Whether the batch was tested.** Sterility and endotoxin testing on the batch itself is what supports extended dating.

## What this means for your prescription

If a patient needs a ninety-day supply and the preparation dates at thirty, that is not an obstacle to be negotiated — it is the standard doing its job. The usual answers are a different formulation, a different concentration that allows a smaller volume, or scheduled refills.

Ask the pharmacy what drives the date on a preparation you prescribe often. If the answer is specific, you are dealing with somebody who knows their own process.`,
  },
  {
    slug: "503a-or-503b-which-one",
    title: "503A or 503B: which one should be filling your prescription",
    excerpt:
      "Two kinds of compounding pharmacy, two different regulatory regimes. The distinction decides what a pharmacy may legally make for you.",
    cover: 2,
    body: `Compounding pharmacies in the United States fall into two categories under the Federal Food, Drug, and Cosmetic Act. The difference is not size or sophistication. It is what they are permitted to do.

## 503A: patient-specific

A 503A pharmacy compounds against a prescription for an identified individual patient. It is licensed and inspected by its state board of pharmacy, and it compounds to the USP chapters.

What it may not do is compound in advance for general distribution. Each preparation traces to a prescription for a named patient.

## 503B: outsourcing facilities

A 503B outsourcing facility registers with the FDA, complies with current Good Manufacturing Practice, and may compound in batches without patient-specific prescriptions — supplying office stock to clinics, for instance.

That capability comes with a heavier regulatory burden: FDA inspection, cGMP, and adverse event reporting obligations.

## Which you need

If you are writing for a named patient, a 503A pharmacy is the correct route and the simpler one.

If you want preparations held in your office and administered to whoever presents, that is office stock, and it must come from a 503B facility. A 503A pharmacy cannot lawfully supply it, and a pharmacy that offers to is telling you something important about how it reads its own licence.

## The question worth asking

"Which are you, and what is your licence number?" A straight answer takes ten seconds and tells you what a pharmacy may legally make for you. Both answers are good answers; the wrong one for your use case is the problem.`,
  },
  {
    slug: "questions-to-ask-a-compounding-pharmacy",
    title: "Five questions to ask before you send a prescription",
    excerpt:
      "Choosing a compounding pharmacy is a clinical decision. These five questions separate the ones that will answer from the ones that will not.",
    cover: 3,
    body: `You are responsible for the prescription you write. When it is compounded, you are also, in practice, relying on a facility you have probably never visited.

These five questions are answerable in a short phone call. The answers matter less than whether they arrive readily.

## 1. Who tests your finished preparations, and may I see a certificate of analysis?

Third-party potency and sterility testing is the single most useful signal. Ask for a recent certificate of analysis on a preparation you actually prescribe. A pharmacy that tests will send one; a pharmacy that does not will explain why not, and that explanation is informative too.

## 2. What is your beyond-use dating, and what supports it?

Covered at length in [its own article](/blog/beyond-use-dating-explained). The answer you want is specific: a date, a basis, and whether batch testing supports extended dating.

## 3. Are you 503A or 503B, and what is your licence number?

This decides what they may legally compound for you. The number should be verifiable with the state board.

## 4. What happens when something is wrong?

A wrong strength, a damaged shipment, a patient reaction. Ask who you call, how fast they respond, and whether they can trace a specific vial back to the batch it came from and the person who made it.

## 5. Can you tell me why this formulation?

If you ask why a preparation uses a particular vehicle, preservative or concentration, somebody should be able to tell you. A pharmacy that compounds thoughtfully has a reason for each choice. One that cannot explain is following a recipe.

---

None of these require specialist knowledge to ask, and none should take long to answer. The pharmacies worth using tend to enjoy the conversation.`,
  },
];

function readingMinutes(body: string): number {
  // 200 words a minute, rounded up, floored at one.
  return Math.max(1, Math.ceil(body.split(/\s+/).length / 200));
}

async function main() {
  const author = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });
  if (!author) throw new Error("No SUPER_ADMIN to attribute posts to.");
  console.log("author:", author.email);

  const media = [];
  for (const c of COVERS) {
    const row = await prisma.media.upsert({
      where: { driver_key: { driver: "S3", key: c.key } },
      update: { alt: c.alt, width: c.w, height: c.h },
      create: {
        driver: "S3",
        key: c.key,
        bucket: process.env.S3_BUCKET ?? "medicraft-uploads-production",
        filename: c.key.split("/").pop()!,
        mime: "image/webp",
        size: c.size,
        width: c.w,
        height: c.h,
        alt: c.alt,
      },
    });
    media.push(row);
  }
  console.log("media rows:", media.length);

  for (const p of POSTS) {
    const post = await prisma.post.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        status: "PUBLISHED",
        coverMediaId: media[p.cover].id,
        readingMinutes: readingMinutes(p.body),
        seoTitle: p.title,
        seoDescription: p.excerpt,
      },
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: author.id,
        coverMediaId: media[p.cover].id,
        readingMinutes: readingMinutes(p.body),
        seoTitle: p.title,
        seoDescription: p.excerpt,
      },
    });
    console.log(`  ${post.status}  ${post.slug}  (${post.readingMinutes} min)`);
  }

  const published = await prisma.post.count({ where: { status: "PUBLISHED" } });
  console.log("published posts:", published);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
