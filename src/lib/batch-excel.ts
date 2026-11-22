import * as XLSX from "xlsx";

export type BatchDestination = "Bajawa" | "Malanuza" | "Aimere";

export type BatchItem = {
  rowNumber: number;
  name: string;
  pcs: number;
  weightKg: number;
  price: number;
  note: string;
};

export type ParsedBatch = {
  title: string;
  sheetName: string;
  items: BatchItem[];
};

export function createBatchWorkbookTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheets: Array<{ name: string; destination: string }> = [
    { name: "BJW", destination: "BAJAWA" },
    { name: "MLZ", destination: "MALANUZA" },
    { name: "AIM", destination: "AIMERE" },
  ];

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      [`ELKANA JASTIP ${sheet.destination}`],
      ["BATCH 00"],
      [],
      ["NO.", "NAMA", "PCS", "BERAT", "HARGA", "KET."],
    ]);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
    ];
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(
    String(value ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseBatchWorkbook(data: ArrayBuffer, destination: BatchDestination): ParsedBatch {
  const workbook = XLSX.read(data, { type: "array" });
  const aliases: Record<BatchDestination, string[]> = {
    Bajawa: ["BJW", "BAJAWA"],
    Malanuza: ["MLZ", "MALANUZA"],
    Aimere: ["AIM", "AIMERE"],
  };
  const sheetName =
    workbook.SheetNames.find((name) => {
      const sheetTokens = name.toUpperCase().split(/[^A-Z0-9]+/);
      return aliases[destination].some((alias) => sheetTokens.includes(alias));
    }) ?? (workbook.SheetNames.length === 1 ? workbook.SheetNames[0] : undefined);

  if (!sheetName) throw new Error(`Sheet tujuan ${destination} tidak ditemukan pada file Excel.`);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error("Sheet tujuan tidak dapat dibaca.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
  });
  let title = "";
  for (const row of rows.slice(0, 10)) {
    if (!row) continue;
    const joined = row.map((value) => String(value ?? "").trim()).join(" ");
    const match = joined.match(/BATCH\s*\d+/i);
    if (match) {
      title = match[0].replace(/\s+/g, " ").toUpperCase();
      break;
    }
  }

  const headerIndex = rows.findIndex((row) =>
    row?.some(
      (value) =>
        String(value ?? "")
          .trim()
          .toUpperCase() === "NAMA",
    ),
  );
  if (headerIndex < 0) throw new Error("Kolom NAMA tidak ditemukan pada sheet Excel.");

  const items: BatchItem[] = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const name = String(row?.[1] ?? "").trim();
    if (!name || /^total/i.test(name) || /^[-—]+$/.test(name)) continue;
    items.push({
      rowNumber: items.length + 1,
      name,
      pcs: numberValue(row?.[2]),
      weightKg: numberValue(row?.[3]),
      price: numberValue(row?.[4]),
      note: String(row?.[5] ?? "").trim(),
    });
  }

  if (!title) throw new Error("Judul batch tidak ditemukan pada file Excel.");
  if (!items.length) throw new Error("Tidak ada data penerima yang dapat dibaca dari Excel.");

  return { title, sheetName, items };
}
