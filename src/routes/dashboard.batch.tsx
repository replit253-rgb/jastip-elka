import { createFileRoute } from "@tanstack/react-router";

import { BatchUploadPage } from "@/components/batch-upload-page";

export const Route = createFileRoute("/dashboard/batch")({
  component: BatchUploadPage,
});
