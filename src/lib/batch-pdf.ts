import { jsPDF } from "jspdf";

export type BatchPdfInfo = {
  id: string;
  title: string;
  destination: string;
};

export type BatchPdfItem = {
  row_number: number;
  name: string;
  pcs: number;
  weight_kg: string | number;
  price: number;
  tracking_code: string | null;
  status: string;
};

const columnWidths = [10, 39, 82, 15, 25, 34, 55];
const pageMargin = 15;

function drawTableHeading(doc: jsPDF, batch: BatchPdfInfo, itemCount: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(93, 29, 48);
  doc.text("ELKANA JASTIP", pageMargin, 15);
  doc.setFontSize(11);
  doc.setTextColor(32, 34, 38);
  doc.text(`DAFTAR PAKET | ${batch.title}`, pageMargin, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(95, 98, 103);
  doc.text(
    `Tujuan: ${batch.destination}   |   ${itemCount} paket   |   Dibuat: ${now}`,
    pageMargin,
    28,
  );

  const headers = ["NO.", "NO. PAKET", "NAMA PENERIMA", "PCS", "BERAT", "TAGIHAN", "STATUS"];
  let x = pageMargin;
  const y = 33;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setFillColor(93, 29, 48);
  doc.setTextColor(255, 255, 255);
  for (const [index, header] of headers.entries()) {
    const width = columnWidths[index] ?? 0;
    doc.rect(x, y, width, 8, "F");
    doc.text(header, x + 2, y + 5.2);
    x += width;
  }
  doc.setTextColor(32, 34, 38);
  return y + 8;
}

export function createBatchPdf(batch: BatchPdfInfo, items: BatchPdfItem[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({
    title: `Daftar paket ${batch.title} - ${batch.destination}`,
    subject: "Daftar paket ELKANA JASTIP",
    author: "ELKANA JASTIP",
  });

  let y = drawTableHeading(doc, batch, items.length);
  const rowBottom = doc.internal.pageSize.getHeight() - pageMargin;

  items.forEach((item, index) => {
    const cells = [
      String(item.row_number),
      item.tracking_code ?? "-",
      item.name,
      String(item.pcs),
      `${Number(item.weight_kg).toLocaleString("id-ID")} kg`,
      `Rp ${new Intl.NumberFormat("id-ID").format(item.price)}`,
      item.status,
    ];
    const wrapped = cells.map((value, cellIndex) =>
      doc.splitTextToSize(value, (columnWidths[cellIndex] ?? 0) - 4),
    );
    const rowHeight = Math.max(8, ...wrapped.map((lines) => lines.length * 3.7 + 4));
    if (y + rowHeight > rowBottom) {
      doc.addPage();
      y = drawTableHeading(doc, batch, items.length);
    }

    let x = pageMargin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(32, 34, 38);
    doc.setFillColor(index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 248 : 255, 246);
    doc.setDrawColor(222, 222, 222);
    for (const [cellIndex, lines] of wrapped.entries()) {
      const width = columnWidths[cellIndex] ?? 0;
      doc.rect(x, y, width, rowHeight, "FD");
      doc.text(lines, x + 2, y + 4.5);
      x += width;
    }
    y += rowHeight;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text(
      `ELKANA JASTIP  |  Halaman ${page} dari ${pageCount}`,
      pageMargin,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  return doc;
}

export function batchPdfFilename(batch: BatchPdfInfo) {
  const slug = `${batch.title}-${batch.destination}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "batch"}-daftar-paket.pdf`;
}
