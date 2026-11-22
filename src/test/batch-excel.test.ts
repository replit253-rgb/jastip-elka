import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { createBatchWorkbookTemplate, parseBatchWorkbook } from "@/lib/batch-excel";

function workbookBuffer(sheetName: string, rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

describe("batch Excel parser", () => {
  it("creates a template with the destination sheets and matching column headers", () => {
    const workbook = XLSX.read(createBatchWorkbookTemplate(), { type: "array" });

    expect(workbook.SheetNames).toEqual(["BJW", "MLZ", "AIM"]);
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new Error(`Missing worksheet ${sheetName}`);
      expect(XLSX.utils.sheet_to_json(worksheet, { header: 1 })[3]).toEqual([
        "NO.",
        "NAMA",
        "PCS",
        "BERAT",
        "HARGA",
        "KET.",
      ]);
    }
  });

  it("parses BATCH 34 from the BJW sheet and ignores the total row", () => {
    const data = workbookBuffer("BJW", [
      ["ELKANA JASTIP BAJAWA"],
      ["BATCH 34"],
      [],
      ["NO.", "NAMA", "PCS", "BERAT", "HARGA", "KET."],
      [1, "Santi Endu", 12, 3, 24000, ""],
      [2, "Adriana Bude", 3, 2, 16000, ""],
      [170, "Fastpay", 3, 94, 752000, ""],
      ["", "TOTAL PENERIMAAN BATCH INI", "", "", 3412000, ""],
    ]);

    const parsed = parseBatchWorkbook(data, "Bajawa");

    expect(parsed.title).toBe("BATCH 34");
    expect(parsed.sheetName).toBe("BJW");
    expect(parsed.items).toHaveLength(3);
    expect(parsed.items[0]).toEqual({
      rowNumber: 1,
      name: "Santi Endu",
      pcs: 12,
      weightKg: 3,
      price: 24000,
      note: "",
    });
  });

  it("parses the Malanuza sheet and keeps decimal weight values", () => {
    const data = workbookBuffer("MLZ", [
      ["ELKANA JASTIP MALANUZA"],
      ["BATCH 33"],
      ["NO.", "NAMA", "PCS", "BERAT", "HARGA", "KET."],
      [1, "Jeyn", 3, 1.5, 12000, "Siap"],
    ]);

    const parsed = parseBatchWorkbook(data, "Malanuza");

    expect(parsed.title).toBe("BATCH 33");
    expect(parsed.items[0]?.weightKg).toBe(1.5);
    expect(parsed.items[0]?.name).toBe("Jeyn");
  });

  it("rejects a sheet that has no NAMA column", () => {
    const data = workbookBuffer("BJW", [
      ["BATCH 34"],
      ["NO.", "PENERIMA", "PCS"],
      [1, "Santi Endu", 12],
    ]);

    expect(() => parseBatchWorkbook(data, "Bajawa")).toThrow("Kolom NAMA tidak ditemukan");
  });

  it("rejects a sheet that has no recipients", () => {
    const data = workbookBuffer("BJW", [
      ["BATCH 34"],
      ["NO.", "NAMA", "PCS", "BERAT", "HARGA", "KET."],
      [1, "", "", "", "", ""],
    ]);

    expect(() => parseBatchWorkbook(data, "Bajawa")).toThrow("Tidak ada data penerima");
  });

  it("does not import the first sheet when the selected destination sheet is missing", () => {
    const workbook = XLSX.read(
      workbookBuffer("BJW", [
        ["ELKANA JASTIP BAJAWA"],
        ["BATCH 34"],
        ["NO.", "NAMA", "PCS", "BERAT", "HARGA", "KET."],
        [1, "Santi Endu", 12, 3, 24000, ""],
      ]),
      { type: "array" },
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "MLZ");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

    expect(() => parseBatchWorkbook(data, "Aimere")).toThrow("Sheet tujuan Aimere tidak ditemukan");
  });
});
