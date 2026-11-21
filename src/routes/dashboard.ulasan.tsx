import { createFileRoute } from "@tanstack/react-router";

import { ReviewModerationPage } from "@/components/owner-content-pages";

export const Route = createFileRoute("/dashboard/ulasan")({
  component: ReviewModerationPage,
});
