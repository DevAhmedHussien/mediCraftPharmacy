import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta } from "@/components/blocks";
import { Icon } from "@/components/icons/set";
import { ProductCard } from "@/components/ProductCard";
import { CarouselItem, ProductCarousel } from "@/components/ui/ProductCarousel";
import { closingCta, formulary } from "@/lib/content";
import { site } from "@/lib/site";
import { getProduct, productSpecs, products, relatedProducts } from "@/lib/data";

type Params = { params: { slug: string } };

/** Every product is prerendered at build time — fully static, no runtime fetching. */
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const product = getProduct(params.slug);
  if (!product) return { title: "Product not found" };

  const title = `${product.name} — ${product.form} ${product.doses}`;
  const description = `${product.detail.description} Compounded to order by ${site.name} in ${product.detail.size} ${product.detail.packaging.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${site.url}/product/${product.slug}`,
      // No `images` here on purpose: the sibling opengraph-image.tsx supplies
      // a purpose-built 1200x630 card. Setting images here would override it
      // with the raw 1257x1600 packshot, which crops badly in link previews.
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ProductPage({ params }: Params) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const specs = productSpecs(product);
  const related = relatedProducts(product);
  const url = `${site.url}/product/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: product.detail.description,
        image: product.image,
        sku: product.detail.productId,
        category: product.category,
        brand: { "@type": "Brand", name: product.detail.brand },
        additionalProperty: specs.map((s) => ({
          "@type": "PropertyValue",
          name: s.label,
          value: s.value,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Home", item: site.url },
          { name: "Products", item: `${site.url}/products` },
          { name: product.category, item: `${site.url}/products/${product.categorySlug}` },
          { name: product.name, item: url },
        ].map((entry, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: entry.name,
          item: entry.item,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
       * Local product bar. Sits directly under the global chrome and keeps the
       * compound's identity and the prescribe action in reach for the whole
       * page. Pure CSS sticky — no scroll listener.
       */}
      <div className="chrome sticky top-[var(--chrome-h-condensed)] z-40 border-b border-line">
        <div className="container-x flex h-14 items-center justify-between gap-4">
          <p className="truncate text-meta font-bold text-ink">{product.name}</p>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden font-mono text-caption text-ink-muted sm:inline">
              {product.doses} · {product.form}
            </span>
            <Link href="/providers#apply" className="btn-primary btn-sm">
              Prescribe
            </Link>
          </div>
        </div>
      </div>

      {/* ---- Header ---- */}
      <section className="pt-10 md:pt-14">
        <div className="container-x">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
              <li>
                <Link href="/" className="hover:text-brand-600">
                  Home
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link href="/products" className="hover:text-brand-600">
                  Products
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link
                  href={`/products/${product.categorySlug}`}
                  className="hover:text-brand-600"
                >
                  {product.category}
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="text-ink-soft">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>

        <div className="container-x mt-10">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            {/*
             * `object-contain` on a plate rather than `cover`: the render is a
             * tall packshot, so cropping it to a landscape frame would clip the
             * vial. `priority` because this is the page's hero image.
             */}
            <div className="relative aspect-square overflow-hidden rounded-panel border border-line bg-white">
              <Image
                src={product.image}
                alt={`${product.name} — ${product.form}, ${product.doses}, ${product.detail.size} ${product.detail.packaging.toLowerCase()}`}
                fill
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-contain p-6"
              />
            </div>

            <div>
              <Link
                href={`/products/${product.categorySlug}`}
                className="eyebrow hover:text-cyan-600"
              >
                {product.category}
              </Link>

              <h1 className="mt-4 text-display-sm font-black text-ink text-balance md:text-display-md">
                {product.name}
              </h1>

              <p className="mt-4 text-intro text-ink-soft text-pretty">
                {product.blurb}
              </p>

              {/* The three facts a prescriber checks first, set as data. */}
              <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5">
                {[
                  { label: "Strength", value: product.doses },
                  { label: "Form", value: product.form },
                  { label: "Route", value: product.detail.route },
                ].map((f) => (
                  <div key={f.label}>
                    <dt className="text-label font-medium uppercase text-ink-muted">
                      {f.label}
                    </dt>
                    <dd className="mt-1.5 font-mono text-meta font-medium text-ink">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/providers#apply" className="btn-primary btn-lg">
                  Prescribe this compound
                </Link>
                <Link href="/refill" className="link-arrow">
                  Patient refill <span aria-hidden>→</span>
                </Link>
              </div>

              <p className="fine-print mt-5 max-w-md">
                Available by prescription only. Compounded to order and confirmed
                with the prescriber before release.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Specifications ---- */}
      <section className="band mt-16 py-16 md:mt-24 md:py-20">
        <div className="container-x">
          <h2 className="section-title-sm">Specifications</h2>

          <dl className="mt-8 grid gap-x-16 md:grid-cols-2">
            {specs.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-3.5"
              >
                <dt className="text-meta text-ink-soft">{s.label}</dt>
                <dd className="text-right font-mono text-meta font-medium text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <IngredientList
              heading="Active ingredients"
              items={product.detail.activeIngredients}
            />
            <IngredientList
              heading="Inactive ingredients"
              items={product.detail.inactiveIngredients}
            />
          </div>
        </div>
      </section>

      {/* ---- Description ---- */}
      <section className="section">
        <div className="container-narrow px-0 md:px-0">
          <h2 className="section-title-sm">Description</h2>
          <p className="mt-4 text-body text-ink-soft text-pretty">
            {product.detail.description}
          </p>

          <h2 className="section-title-sm mt-14">Prescriber directions</h2>
          <p className="mt-4 text-body text-ink-soft text-pretty">
            {product.detail.directions}
          </p>

          <aside className="mt-12 flex items-start gap-4 rounded-tile border border-line bg-sand px-6 py-5">
            <Icon name="rx" className="mt-0.5 h-5 w-5 text-cyan-700" />
            <p className="text-meta text-ink-soft text-pretty">
              <strong className="font-bold text-ink">
                {formulary.rxNotice.label}
              </strong>{" "}
              {formulary.rxNotice.body}
            </p>
          </aside>
        </div>
      </section>

      {/* ---- Related ---- */}
      {related.length > 0 && (
        <section className="band py-16 md:py-20">
          <div className="container-x">
            <ProductCarousel
              label={`Products related to ${product.name}`}
              heading={<h2 className="section-title-sm">Related compounds</h2>}
              action={
                <Link
                  href={`/products/${product.categorySlug}`}
                  className="link-arrow"
                >
                  All {product.category} <span aria-hidden>→</span>
                </Link>
              }
            >
              {related.map((p) => (
                <CarouselItem key={p.slug}>
                  <ProductCard product={p} />
                </CarouselItem>
              ))}
            </ProductCarousel>
          </div>
        </section>
      )}

      <ClosingCta {...closingCta} />
    </>
  );
}

function IngredientList({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-[1.0625rem] font-bold text-ink">{heading}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="font-mono text-caption text-ink-soft">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
