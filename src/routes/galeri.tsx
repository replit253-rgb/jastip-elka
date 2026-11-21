import { createFileRoute } from "@tanstack/react-router";
import { GalleryPage } from "@/components/elkana-site";

export const Route = createFileRoute("/galeri")({
  head: () => ({
    meta: [
      { title: "Galeri Perjalanan Paket | ELKANA JASTIP" },
      {
        name: "description",
        content:
          "Lihat gambaran perjalanan paket ELKANA dari Surabaya hingga titik pengambilan di Flores.",
      },
      { property: "og:title", content: "Galeri ELKANA JASTIP" },
      {
        property: "og:description",
        content: "Dari tempat kumpul paket di Surabaya hingga tujuan di Flores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});
