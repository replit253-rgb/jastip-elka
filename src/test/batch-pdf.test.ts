import { describe, expect, it } from "vitest";

import { createBatchPdf } from "@/lib/batch-pdf";

describe("batch PDF export", () => {
  it("includes package names and tracking numbers in the generated PDF", () => {
    const pdf = createBatchPdf({ id: "batch-id", title: "BATCH 34", destination: "Bajawa" }, [
      {
        row_number: 1,
        name: "Santi Endu",
        pcs: 2,
        weight_kg: "1.5",
        price: 24000,
        tracking_code: "ELK-123456789ABC",
        status: "Belum diverifikasi",
      },
    ]);
    const output = pdf.output();

    expect(typeof output).toBe("string");
    expect(output).toContain("Santi Endu");
    expect(output).toContain("ELK-123456789ABC");
    expect(output).toContain("Rp 24.000");
  });
});
