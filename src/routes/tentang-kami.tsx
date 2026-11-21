import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/elkana-site";

export const Route = createFileRoute("/tentang-kami")({
  head: () => ({
    meta: [
      { title: "Tentang Kami | ELKANA JASTIP" },
      {
        name: "description",
        content:
          "Kenali layanan ELKANA JASTIP yang menghubungkan Surabaya dengan Bajawa, Malanuza, dan Aimere.",
      },
      { property: "og:title", content: "Tentang ELKANA JASTIP" },
      {
        property: "og:description",
        content: "Layanan pengumpulan dan pengiriman paket dari Surabaya ke Flores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});
