import { Hero } from "@/components/sections/Hero";
import { Pursuit } from "@/components/sections/Pursuit";
import { Partners } from "@/components/sections/Partners";
import { Highlights } from "@/components/sections/Highlights";
import { Products } from "@/components/sections/Products";
import { Stats } from "@/components/sections/Stats";
import { Quality } from "@/components/sections/Quality";
import { Testimonials } from "@/components/sections/Testimonials";
import { Providers } from "@/components/sections/Providers";
import { Contact } from "@/components/sections/Contact";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Pursuit />
      <Products />
      <Partners />
      <Highlights />
      <Stats />
      <Quality />
      <Testimonials />
      <Providers />
      <Contact />
    </>
  );
}
