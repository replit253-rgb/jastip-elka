import { createFileRoute } from "@tanstack/react-router";

import { OperationsDashboard } from "@/components/operations-dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | ELKANA JASTIP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OperationsDashboard,
});
