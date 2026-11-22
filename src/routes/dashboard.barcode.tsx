import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { BarcodeLibraryPage } from "@/components/barcode-library";

export const Route = createFileRoute("/dashboard/barcode")({
  validateSearch: z.object({ batchId: z.string().optional() }),
  component: BarcodeRoutePage,
});

function BarcodeRoutePage() {
  const { batchId } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/barcode" });

  return (
    <BarcodeLibraryPage
      selectedBatchId={batchId ?? ""}
      onSelectBatch={(selectedId) => {
        void navigate({ search: { batchId: selectedId } });
      }}
      onBackToBatches={() => {
        void navigate({ search: {} });
      }}
    />
  );
}
