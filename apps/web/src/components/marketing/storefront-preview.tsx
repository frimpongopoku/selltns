import Image from "next/image";
import { BrowserFrame } from "./browser-frame";

const PREVIEW_PRODUCTS = [
  {
    title: "Adjoa Wax-Print Wrap Dress",
    price: "GH₵420",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600",
  },
  {
    title: "Nkuruma Woven Basket Bag",
    price: "GH₵260",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600",
  },
  {
    title: "Ama Beaded Statement Necklace",
    price: "GH₵145",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600",
  },
  {
    title: "Kofi Leather Slide Sandals",
    price: "GH₵190",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
  },
];

export function StorefrontPreview() {
  return (
    <BrowserFrame url="selltns.com/akosua">
      <div className="bg-[#FBFAF8] p-5 dark:bg-[#181818] sm:p-6">
        <p className="font-heading text-sm font-bold tracking-tight text-[#141414] dark:text-[#F2F1EE]">
          Akosua &amp; Co.
        </p>
        <p className="mt-0.5 text-[11px] text-[#66605A] dark:text-[#A8A29B]">
          Handmade, made-to-order pieces
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PREVIEW_PRODUCTS.map((product) => (
            <div
              key={product.title}
              className="overflow-hidden rounded-lg border border-[#141414]/10 bg-white dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C]"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover object-top"
                />
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-[11px] leading-snug font-medium text-[#141414] dark:text-[#F2F1EE]">
                  {product.title}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#0E9F6E] dark:text-[#34D399]">
                  {product.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
