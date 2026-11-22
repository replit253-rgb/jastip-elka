import { createFileRoute } from "@tanstack/react-router";

import { TrackingManagementPage } from "@/components/tracking-management-page";

export const Route = createFileRoute("/dashboard/tracking")({
  head: () => ({
    meta: [
      { title: "Tracking Paket | Dashboard ELKANA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TrackingManagementPage,
});
