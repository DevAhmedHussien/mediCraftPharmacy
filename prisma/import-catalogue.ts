import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

/* ===========================================================================
   Load the 2026 catalogue into the database.

       npm run import:catalogue

   Reads prisma/data/catalogue-2026.json, which scripts/extract-catalogue.py
   produces from the spreadsheet. Idempotent: keyed on the product slug, so
   re-running after a catalogue reissue updates prices in place rather than
   creating a second copy of everything.

   WHAT THIS DOES NOT TOUCH
   ------------------------
   The twenty-nine curated marketing products already on the site. They are a
   different naming scheme — "Semaglutide Flex-Dose 3 mL" against the
   formulary's clinical entries — and none of them matches a formulary row by
   name. Guessing a mapping would put a wrong price on a public page, so the
   two sets sit side by side until someone who knows the answer says which
   formulary line each marketing SKU actually is.

   Imported items are `isPublished: false`: they are orderable by partners and
   priced in their price lists, without 692 clinical entries appearing on a
   public catalogue that has photography and copy for twenty-nine.
   ========================================================================= */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Row = {
  categorySlug: string;
  categoryName: string;
  productClass: string;
  name: string;
  form: string;
  route: string;
  strength: string;
  packageSize: string;
  rxStatus: string;
  deaSchedule: string;
  bud: string;
  coldChain: boolean;
  providerPrice: number | null;
  isQuoteOnly: boolean;
  slug: string;
};

const nullable = (value: string) => (value.trim() ? value.trim() : null);

async function main() {
  const file = path.resolve(process.cwd(), "prisma/data/catalogue-2026.json");
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];

  const categories = await prisma.productCategory.findMany({
    select: { id: true, slug: true },
  });
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  const missing = [...new Set(rows.map((r) => r.categorySlug))].filter(
    (slug) => !categoryId.has(slug)
  );
  if (missing.length > 0) {
    throw new Error(
      `No category row for: ${missing.join(", ")}. Run \`npx prisma migrate deploy\` first.`
    );
  }

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const data = {
      name: row.name,
      strength: nullable(row.strength),
      form: nullable(row.form),
      categoryId: categoryId.get(row.categorySlug)!,
      categorySlug: row.categorySlug,
      productClass: nullable(row.productClass),
      route: nullable(row.route),
      packageSize: nullable(row.packageSize),
      rxStatus: nullable(row.rxStatus),
      deaSchedule: nullable(row.deaSchedule),
      bud: nullable(row.bud),
      coldChain: row.coldChain,
      isQuoteOnly: row.isQuoteOnly,
      // A quote-only item has no list price. Zero is the only value a NOT NULL
      // decimal column will take, and `isQuoteOnly` is what stops anything
      // treating it as one — see lib/services/pricing.ts.
      listPrice: new Prisma.Decimal(row.providerPrice ?? 0),
      unit: nullable(row.packageSize) ?? "each",
      isActive: true,
    };

    const existing = await prisma.product.findUnique({
      where: { slug: row.slug },
      select: { id: true },
    });

    if (existing) {
      // `isPublished` is deliberately absent from the update: if an admin has
      // promoted an item to the public site, a re-import must not demote it.
      await prisma.product.update({ where: { slug: row.slug }, data });
      updated += 1;
    } else {
      await prisma.product.create({
        data: { ...data, slug: row.slug, isPublished: false },
      });
      created += 1;
    }
  }

  const total = await prisma.product.count();
  const published = await prisma.product.count({ where: { isPublished: true } });

  console.log(`\n  imported ${rows.length} catalogue items`);
  console.log(`    ${created} created, ${updated} updated`);
  console.log(`\n  products now: ${total} (${published} on the public site)`);

  const byCategory = await prisma.productCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      isPublished: true,
      _count: { select: { products: true } },
    },
  });
  console.log("\n  by category:");
  for (const c of byCategory) {
    const site = c.isPublished ? "public" : "      ";
    console.log(`    ${String(c._count.products).padStart(5)}  ${site}  ${c.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
