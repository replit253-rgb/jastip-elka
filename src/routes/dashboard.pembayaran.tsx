import { createFileRoute } from "@tanstack/react-router";

import { PaymentsPage } from "@/components/operations-pages";

export const Route = createFileRoute("/dashboard/pembayaran")({
  component: PaymentsPage,
});
