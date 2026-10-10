import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/* ===========================================================================
   Make the 2026 Partner Formulary the public catalogue.

       npm run catalogue:adopt          # apply
       npm run catalogue:adopt -- --dry # report only

   WHY THIS EXISTS
   ---------------
   The site shipped with eleven hand-written marketing categories holding
   twenty-nine demo products, while the real formulary — ten categories, 692
   items, Schedule A-1 of the MSA — sat imported but unpublished beside it.
   Every count on the site was therefore a count of the demo set, and nine of
   the eleven categories had nothing in them at all, which is where the
   "products coming soon" copy came from.

   The developer brief of 8 October 2026 makes the formulary the source of
   truth for every category and count, on the website and in both portals. So
   this publishes the ten and retires the eleven.

   WHAT HAPPENS TO THE DEMO PRODUCTS
   ---------------------------------
   They are unpublished, not deleted. Several are the same drug as a formulary
   line under a different naming scheme — "Semaglutide Flex-Dose 3 mL" against
   "Semaglutide 2.5mg/ml 2ml vial" — so leaving them published would show the
   same preparation twice and put the total past 692. Deleting them would throw
   away their descriptions and break any price list that references them, and a
   price list is a contractual document. Unpublished is the reversible answer.

   Their photography is not lost: it became the ten category images in
   lib/media.ts, which is where the brief asks for it.

   IDEMPOTENT. Keyed on slug throughout; running it twice changes nothing the
   first run did not already do.
   ========================================================================= */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** The ten, in the order Schedule A-1 lists them. */
const FORMULARY_CATEGORIES = [
  "weight-management",
  "hrt",
  "trt",
  "sexual-health",
  "hair-loss",
  "pain-management",
  "skin-care",
  "wellness-vitality",
  "wellness-longevity",
  "supplies",
] as const;

/**
 * The eleven that came before.
 *
 * `weight-management` and `pain-management` appear in both lists — same slug,
 * same meaning — so they are absent here: retiring them would retire a
 * formulary category.
 */
const LEGACY_CATEGORIES = [
  "hormone-therapy",
  "peptide-therapy",
  "dermatology",
  "sexual-wellness",
  "vitality-longevity",
  "womens-health",
  "mens-health",
  "iv-therapy",
  "custom-formulations",
] as const;

const dryRun = process.argv.includes("--dry");

async function main() {
  const label = dryRun ? "WOULD" : "DID";
  console.log(dryRun ? "DRY RUN — nothing will be written\n" : "Applying\n");

  /* ---- 1. The ten become the published set, in Schedule A-1's order ----- */
  for (const [index, slug] of FORMULARY_CATEGORIES.entries()) {
    const category = await prisma.productCategory.findUnique({
      where: { slug },
      select: { name: true, isPublished: true, sortOrder: true },
    });
    if (!category) throw new Error(`No category row for "${slug}". Run migrations first.`);

    const sortOrder = (index + 1) * 10;
    const already = category.isPublished && category.sortOrder === sortOrder;
    if (!already && !dryRun) {
      await prisma.productCategory.update({
        where: { slug },
        data: { isPublished: true, isActive: true, sortOrder },
      });
    }
    const count = await prisma.product.count({ where: { categorySlug: slug, isActive: true } });
    console.log(
      `  ${String(index + 1).padStart(2, "0")}  ${category.name.padEnd(22)} ${String(count).padStart(3)} items` +
        (already ? "  (already published)" : `  ${label} publish`)
    );
  }

  /* ---- 2. The nine marketing-only categories are retired --------------- */
  console.log("");
  for (const slug of LEGACY_CATEGORIES) {
    const category = await prisma.productCategory.findUnique({
      where: { slug },
      select: { name: true, isPublished: true, _count: { select: { products: true } } },
    });
    if (!category) continue;

    if (category.isPublished && !dryRun) {
      /* `isActive: false` as well as unpublished: a retired category must not
         appear in the admin's category picker either, or the next product
         added lands somewhere the website cannot show. The products already
         filed under it keep their categoryId — see the schema note on
         `isActive` — so nothing is orphaned and the change reverses. */
      await prisma.productCategory.update({
        where: { slug },
        data: { isPublished: false, isActive: false },
      });
    }
    console.log(
      `  retire  ${category.name.padEnd(22)} ${String(category._count.products).padStart(3)} items` +
        (category.isPublished ? `  ${label} retire` : "  (already retired)")
    );
  }

  /* ---- 3. The formulary becomes visible, the demo set stops being ------- */
  const toPublish = await prisma.product.count({
    where: { categorySlug: { in: [...FORMULARY_CATEGORIES] }, isPublished: false, isActive: true },
  });
  const toRetire = await prisma.product.count({
    where: { categorySlug: { in: [...LEGACY_CATEGORIES] }, isPublished: true },
  });

  /* The twenty-nine demo items live in legacy categories AND in
     weight-management, which is a formulary category — so they cannot be
     found by category alone. They are instead the products that predate the
     import, identified by having a description: the formulary carries none. */
  const demoInSharedCategories = await prisma.product.findMany({
    where: {
      categorySlug: { in: ["weight-management", "pain-management"] },
      isPublished: true,
      description: { not: null },
    },
    select: { slug: true, name: true },
  });

  if (!dryRun) {
    await prisma.product.updateMany({
      where: { categorySlug: { in: [...FORMULARY_CATEGORIES] }, isActive: true },
      data: { isPublished: true },
    });
    await prisma.product.updateMany({
      where: { categorySlug: { in: [...LEGACY_CATEGORIES] } },
      data: { isPublished: false },
    });
    if (demoInSharedCategories.length > 0) {
      await prisma.product.updateMany({
        where: { slug: { in: demoInSharedCategories.map((p) => p.slug) } },
        data: { isPublished: false },
      });
    }
  }

  console.log("");
  console.log(`  ${label} publish  ${toPublish} formulary products`);
  console.log(`  ${label} retire   ${toRetire} demo products in retired categories`);
  console.log(`  ${label} retire   ${demoInSharedCategories.length} demo products sharing a formulary category`);
  for (const p of demoInSharedCategories) console.log(`               · ${p.name}`);

  /* ---- 4. What the site now reports ------------------------------------
     On a dry run this is the state BEFORE any change, because nothing was
     written — said plainly rather than printed under a heading that implies
     otherwise. */
  console.log(dryRun ? "\n  CURRENT STATE (unchanged — this was a dry run)" : "\n  RESULT");
  const published = await prisma.product.count({ where: { isPublished: true, isActive: true } });
  const categories = await prisma.productCategory.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  for (const c of categories) {
    const n = await prisma.product.count({
      where: { categorySlug: c.slug, isPublished: true, isActive: true },
    });
    console.log(`    ${c.name.padEnd(22)} ${String(n).padStart(3)}`);
  }
  console.log(`    ${"TOTAL".padEnd(22)} ${String(published).padStart(3)}`);
  if (!dryRun && published !== 692) {
    throw new Error(`Expected 692 published products, got ${published}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
