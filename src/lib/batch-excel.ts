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
    Aimere: ["AIMERE"],
  };
  const sheetName =
    workbook.SheetNames.find((name) => {
      const upperName = name.toUpperCase();
      return aliases[destination].some((alias) => upperName.includes(alias));
    }) ?? workbook.SheetNames[0];

  if (!sheetName) throw new Error("File Excel tidak memiliki sheet.");
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
