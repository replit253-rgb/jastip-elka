import { createFileRoute } from "@tanstack/react-router";

import { BatchUploadPage } from "@/components/batch-upload-page";

export const Route = createFileRoute("/dashboard/batch")({
  head: () => ({
    meta: [
      { title: "Daftar Batch | Dashboard ELKANA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BatchUploadPage,
});
