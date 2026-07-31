import { ProductBrowser } from "@/components/sections/ProductBrowser";
import { categories, products } from "@/lib/data";

/**
 * "Our Products" section. Data is loaded on the server and handed to the
 * ProductBrowser, whose category sidebar filters the carousel in place — the
 * default category is server-rendered (SSR) for the initial paint.
 */
export function Products() {
  return (
    <section id="products" className="bg-white py-20 md:py-28">
      <div className="container-x">
        <ProductBrowser categories={categories} products={products} />
      </div>
    </section>
  );
}
