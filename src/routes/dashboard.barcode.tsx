import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { BarcodeLibraryPage } from "@/components/barcode-library";

export const Route = createFileRoute("/dashboard/barcode")({
  validateSearch: z.object({ batchId: z.string().optional(), id: z.string().optional() }),
  component: BarcodeRoutePage,
});

function BarcodeRoutePage() {
  const { batchId, id } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/barcode" });

  return (
    <BarcodeLibraryPage
      selectedBatchId={batchId ?? ""}
      {...(id ? { selectedPackageId: id } : {})}
      onSelectBatch={(selectedId) => {
        void navigate({ search: { batchId: selectedId } });
      }}
      onEditPackage={(packageId) => {
        void navigate({ search: { ...(batchId ? { batchId } : {}), id: packageId } });
      }}
      onBackToBatches={() => {
        void navigate({ search: {} });
      }}
      onClosePackageEditor={() => {
        void navigate({ search: batchId ? { batchId } : {} });
      }}
    />
  );
}
