import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/elkana-site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beranda | ELKANA JASTIP Surabaya–Flores" },
      {
        name: "description",
        content:
          "Jastip paket online dari Surabaya menuju Bajawa, Malanuza, dan Aimere. Pengiriman mingguan via laut.",
      },
      { property: "og:title", content: "ELKANA JASTIP | Surabaya–Flores" },
      {
        property: "og:description",
        content: "Titip belanjaanmu dari Surabaya, kami antarkan sampai tujuan di Flores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});
