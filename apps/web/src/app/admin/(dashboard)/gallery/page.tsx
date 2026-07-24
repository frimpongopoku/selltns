import { getGallery } from "@/lib/api";
import { GalleryGrid } from "@/components/admin/gallery-grid";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const assets = await getGallery();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Gallery</h1>
      <p className="text-sm text-muted-foreground">
        Every photo uploaded anywhere in the admin lands here — this is the picker used for products and collections.
      </p>
      <div className="mt-7">
        <GalleryGrid assets={assets} />
      </div>
    </div>
  );
}
