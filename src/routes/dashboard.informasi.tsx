import { createFileRoute } from "@tanstack/react-router";

import { AnnouncementsPage } from "@/components/owner-content-pages";

export const Route = createFileRoute("/dashboard/informasi")({
  component: AnnouncementsPage,
});
