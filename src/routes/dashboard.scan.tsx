import { createFileRoute } from "@tanstack/react-router";

import { BarcodePage } from "@/components/operations-pages";

export const Route = createFileRoute("/dashboard/scan")({
  component: BarcodePage,
});
