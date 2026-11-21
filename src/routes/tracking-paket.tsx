import { createFileRoute } from "@tanstack/react-router";
import { TrackingPage } from "@/components/elkana-site";

export const Route = createFileRoute("/tracking-paket")({
  head: () => ({
    meta: [
      { title: "Tracking Paket | ELKANA JASTIP" },
      {
        name: "description",
        content:
          "Cari status paket jastip ELKANA dari Surabaya menuju Bajawa, Malanuza, atau Aimere.",
      },
      { property: "og:title", content: "Tracking Paket ELKANA JASTIP" },
      {
        property: "og:description",
        content: "Lacak perjalanan paket menuju titik pengambilan di Flores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackingPage,
});
