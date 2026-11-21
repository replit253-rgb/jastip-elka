import { createFileRoute } from "@tanstack/react-router";

import { BarcodeLibraryPage } from "@/components/barcode-library";

export const Route = createFileRoute("/dashboard/barcode")({
  component: BarcodeLibraryPage,
});
