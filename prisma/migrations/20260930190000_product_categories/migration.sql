-- Categories become data, and products gain the columns the 2026 formulary
-- actually has.
--
-- The therapeutic areas were a hardcoded array in lib/data.ts, so the one thing
-- the pharmacy most wanted to change needed a deploy. They are rows now.
--
-- `isPublished` is new on both tables and defaults to FALSE, so the backfill at
-- the bottom is not optional: without it every existing product and category
-- would vanish from the public site the moment this migration ran.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bud" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "coldChain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deaSchedule" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageSize" TEXT,
ADD COLUMN     "productClass" TEXT,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "rxStatus" TEXT;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_isPublished_sortOrder_idx" ON "ProductCategory"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_isPublished_categorySlug_idx" ON "Product"("isPublished", "categorySlug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Everything that exists today was, by definition, published — the public site
-- read it from a static file with no visibility flag at all.
UPDATE "Product" SET "isPublished" = true;

-- Carry the marketing taxonomy across from lib/data.ts, preserving slugs so no
-- /products/<slug> URL changes. Ordered as the formulary page orders them.
INSERT INTO "ProductCategory" ("id", "slug", "name", "blurb", "icon", "sortOrder", "isPublished", "isActive", "createdAt", "updatedAt")
VALUES
  ('cat_weight_management',  'weight-management',   'Weight Management',    'GLP-1 receptor agonists, metabolic support, and lipotropic compounds', 'scale',       10, true, true, NOW(), NOW()),
  ('cat_hormone_therapy',    'hormone-therapy',     'Hormone Therapy',      'Bioidentical hormone replacement — testosterone, estradiol, progesterone, thyroid', 'dna', 20, true, true, NOW(), NOW()),
  ('cat_peptide_therapy',    'peptide-therapy',     'Peptide Therapy',      'Anti-aging, recovery, immune function, and performance peptides', 'vial',        30, true, true, NOW(), NOW()),
  ('cat_dermatology',        'dermatology',         'Dermatology',          'Custom topicals for acne, hyperpigmentation, rosacea, and anti-aging', 'leaf',   40, true, true, NOW(), NOW()),
  ('cat_sexual_wellness',    'sexual-wellness',     'Sexual Wellness',      'Customized formulations for sexual health and function', 'tablet',              50, true, true, NOW(), NOW()),
  ('cat_vitality_longevity', 'vitality-longevity',  'Vitality & Longevity', 'NAD+, glutathione, IV formulations, and functional wellness compounds', 'heart', 60, true, true, NOW(), NOW()),
  ('cat_pain_management',    'pain-management',     'Pain Management',      'Topical analgesics, nerve agents, and custom pain formulations', 'stethoscope', 70, true, true, NOW(), NOW()),
  ('cat_womens_health',      'womens-health',       'Women''s Health',      'Hormonal, reproductive, and wellness compounds for women', 'flower',            80, true, true, NOW(), NOW()),
  ('cat_mens_health',        'mens-health',         'Men''s Health',        'TRT, performance, and wellness compounds for men', 'dumbbell',                  90, true, true, NOW(), NOW()),
  ('cat_iv_therapy',         'iv-therapy',          'IV Therapy',           'NAD+, glutathione, vitamin blends, and custom IV formulations', 'droplet',     100, true, true, NOW(), NOW()),
  ('cat_custom',             'custom-formulations', 'Custom Formulations',  'Sterile and non-sterile preparations built to a prescriber''s exact specification', 'mortar', 110, true, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- The ten operational areas from the 2026 formulary spreadsheet. Weight
-- Management and Pain Management already exist above under the same slug, so
-- the conflict clause merges rather than duplicating them. Unpublished: these
-- organise the partner formulary, and an admin decides if any belongs on the
-- public site.
INSERT INTO "ProductCategory" ("id", "slug", "name", "blurb", "icon", "sortOrder", "isPublished", "isActive", "createdAt", "updatedAt")
VALUES
  ('cat_hrt',                'hrt',                 'HRT',                  'Hormone replacement formulations for individualized therapy', 'dna',          200, false, true, NOW(), NOW()),
  ('cat_trt',                'trt',                 'TRT',                  'Testosterone replacement and related men''s health formulations', 'dumbbell', 210, false, true, NOW(), NOW()),
  ('cat_sexual_health',      'sexual-health',       'Sexual Health',        'Customized formulations supporting sexual wellness', 'tablet',               220, false, true, NOW(), NOW()),
  ('cat_hair_loss',          'hair-loss',           'Hair Loss',            'Targeted compounded formulations for hair and scalp health', 'leaf',          230, false, true, NOW(), NOW()),
  ('cat_skin_care',          'skin-care',           'Skin Care',            'Dermatology and aesthetic formulations', 'leaf',                             240, false, true, NOW(), NOW()),
  ('cat_wellness_vitality',  'wellness-vitality',   'Wellness · Vitality',  'Injectable and oral wellness formulations supporting vitality', 'heart',      250, false, true, NOW(), NOW()),
  ('cat_wellness_longevity', 'wellness-longevity',  'Wellness · Longevity', 'Longevity-focused and general wellness products', 'heart',                   260, false, true, NOW(), NOW()),
  ('cat_supplies',           'supplies',            'Supplies',             'Administration, injection, and pharmacy-support supplies', 'mortar',          270, false, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Attach existing products to the category they already named by slug.
UPDATE "Product" p
SET "categoryId" = c.id
FROM "ProductCategory" c
WHERE p."categorySlug" = c.slug AND p."categoryId" IS NULL;
