import { ImageResponse } from "next/og";
import { getProduct, products } from "@/lib/data";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgLockup,
  OgPackshot,
  productImageTightDataUri,
} from "@/lib/og";

/**
 * Per-product social preview card. Sharing a product link shows that product's
 * packshot, name, strength and form rather than a generic site image.
 *
 * `generateStaticParams` mirrors the page's, so all 29 cards are prerendered to
 * static PNGs at build time — no runtime image generation when a crawler asks.
 */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateImageMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProduct(params.slug);
  return [
    {
      id: "card",
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
      alt: product ? `${product.name} — ${product.form}, ${product.doses}` : "Product",
    },
  ];
}

export default async function ProductOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProduct(params.slug);
  const vial = productImageTightDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG_COLORS.white,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
          }}
        >
          <OgLockup />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: OG_COLORS.brand,
              }}
            >
              {product?.category ?? "Compounded therapy"}
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 54,
                fontWeight: 600,
                lineHeight: 1.07,
                letterSpacing: -1.4,
                color: OG_COLORS.ink,
              }}
            >
              {product?.name ?? "Product"}
            </div>

            {product && (
              <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 18px",
                    borderRadius: 999,
                    background: OG_COLORS.brand,
                    color: OG_COLORS.white,
                    fontSize: 22,
                  }}
                >
                  {product.form}
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: `1px solid ${OG_COLORS.brandLight}`,
                    color: OG_COLORS.ink,
                    fontSize: 22,
                  }}
                >
                  {product.doses}
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: `1px solid ${OG_COLORS.brandLight}`,
                    color: OG_COLORS.ink,
                    fontSize: 22,
                  }}
                >
                  {product.detail.size}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", fontSize: 20, color: OG_COLORS.inkMuted }}>
            Rx only · Compounded to order
          </div>
        </div>

        <OgPackshot src={vial} />
      </div>
    ),
    { ...OG_SIZE }
  );
}
