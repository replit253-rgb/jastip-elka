import { createFileRoute } from "@tanstack/react-router";

import { PackageMonitorPage } from "@/components/operations-pages";

export const Route = createFileRoute("/dashboard/")({
  component: PackageMonitorPage,
});
