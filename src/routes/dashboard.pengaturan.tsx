import { createFileRoute } from "@tanstack/react-router";

import { PriceSettingsPage } from "@/components/operations-pages";

export const Route = createFileRoute("/dashboard/pengaturan")({
  component: PriceSettingsPage,
});
