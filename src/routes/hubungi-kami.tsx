import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/elkana-site";

export const Route = createFileRoute("/hubungi-kami")({
  head: () => ({
    meta: [
      { title: "Hubungi Kami | ELKANA JASTIP" },
      {
        name: "description",
        content:
          "Hubungi admin ELKANA JASTIP melalui WhatsApp untuk bertanya tentang jadwal, tujuan, dan pengambilan paket.",
      },
      { property: "og:title", content: "Hubungi ELKANA JASTIP" },
      {
        property: "og:description",
        content: "Tanyakan layanan jastip Surabaya menuju Bajawa, Malanuza, dan Aimere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});
