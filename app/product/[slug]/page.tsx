import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { CarouselItem, ProductCarousel } from "@/components/ui/ProductCarousel";
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
       * Apple's local product bar: sits under the global nav, keeps the product
       * name and the primary action within reach for the whole page. Pure CSS
       * sticky — no scroll listener.
       */}
      <div className="chrome sticky top-12 z-40 border-b border-line/60">
        <div className="container-x flex h-12 items-center justify-between gap-4">
          <p className="truncate text-meta font-semibold text-ink">{product.name}</p>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-caption text-ink-muted sm:inline">
              {product.form} · {product.doses}
            </span>
            <Link href="/providers" className="btn-primary btn-sm">
              Prescribe
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-12 md:pt-16">
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

        <div className="container-narrow mt-10 text-center">
          <Link href={`/products/${product.categorySlug}`} className="eyebrow">
            {product.category}
          </Link>
          <h1 className="mt-2 text-display-md font-semibold text-ink md:text-display-lg">
            {product.name}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-intro text-ink-soft">{product.blurb}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/providers" className="btn-primary">
              Prescribe this compound
            </Link>
            <Link href="/refill" className="link-blue text-body">
              Patient refill <span aria-hidden>›</span>
            </Link>
          </div>

          <p className="fine-print mx-auto mt-5 max-w-md">
            Available by prescription only. Compounded to order and confirmed with the
            prescriber before release.
          </p>
        </div>

        <div className="container-narrow mt-12">
          {/*
           * `object-contain` on a white plate, not `cover`: the render is a tall
           * packshot, so cropping it to a landscape frame would clip the vial.
           * The plate matches the render's own white background, so the letterbox
           * is invisible. `priority` because this is the page's hero image.
           */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-panel bg-white">
            <Image
              src={product.image}
              alt={`${product.name} — ${product.form}, ${product.doses}, ${product.detail.size} ${product.detail.packaging.toLowerCase()}`}
              fill
              priority
              sizes="(min-width: 980px) 980px, 100vw"
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="band mt-16 py-16 md:mt-24 md:py-24">
        <div className="container-narrow">
          <h2 className="section-title text-center">Specifications</h2>

          <dl className="mt-12 grid gap-x-16 sm:grid-cols-2">
            {specs.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-4"
              >
                <dt className="text-meta text-ink-soft">{s.label}</dt>
                <dd className="text-right text-meta font-semibold text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-14 grid gap-10 sm:grid-cols-2">
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

      {/* Copy */}
      <section className="py-16 md:py-24">
        <div className="container-narrow">
          <h2 className="section-title">Description</h2>
          <p className="mt-5 text-intro text-ink-soft">{product.detail.description}</p>

          <h2 className="section-title mt-16">Prescriber directions</h2>
          <p className="mt-5 text-intro text-ink-soft">{product.detail.directions}</p>
        </div>
      </section>

      {/* Related shelf */}
      {related.length > 0 && (
        <section className="band py-16 md:py-24">
          <div className="container-x">
            <ProductCarousel
              label={`Products related to ${product.name}`}
              heading={<h2 className="section-title">Related products</h2>}
              action={
                <Link
                  href={`/products/${product.categorySlug}`}
                  className="link-blue text-body"
                >
                  All {product.category} <span aria-hidden>›</span>
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

      <PartnershipCTA />
    </>
  );
}

function IngredientList({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-body font-semibold text-ink">{heading}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="text-meta text-ink-soft">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
