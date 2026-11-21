import { createFileRoute } from "@tanstack/react-router";

import { NewPackagePage } from "@/components/operations-pages";

export const Route = createFileRoute("/dashboard/paket-baru")({
  component: NewPackagePage,
});
