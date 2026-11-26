import { createFileRoute } from "@tanstack/react-router";

import { ShippingSchedulePage } from "@/components/shipping-schedule-page";

export const Route = createFileRoute("/dashboard/jadwal")({
  component: ShippingSchedulePage,
});
