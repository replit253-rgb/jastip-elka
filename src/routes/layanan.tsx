import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/elkana-site";

export const Route = createFileRoute("/layanan")({
  head: () => ({
    meta: [
      { title: "Layanan Jastip | ELKANA JASTIP" },
      {
        name: "description",
        content:
          "Alur jastip paket online dari Surabaya, pengiriman laut mingguan via Ende, dan pengambilan di Flores.",
      },
      { property: "og:title", content: "Layanan ELKANA JASTIP" },
      {
        property: "og:description",
        content: "Belanja online dari Surabaya, paket menuju Bajawa, Malanuza, dan Aimere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});
