import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, Star } from "lucide-react";

import { PageHeading } from "@/components/operations-dashboard";
import { useStaff } from "@/components/operations-dashboard-context";
import { apiRequest } from "@/lib/operations-api";
import {
  createBatchWorkbookTemplate,
  parseBatchWorkbook,
  type BatchDestination,
  type BatchItem,
} from "@/lib/batch-excel";

type BatchSummary = {
  id: string;
  title: string;
  destination: BatchDestination;
  item_count: number;
  is_featured: boolean;
  created_at: string;
};

const spreadsheetMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function BatchUploadPage() {
  const user = useStaff();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [destination, setDestination] = useState<BatchDestination>("Bajawa");
  const [title, setTitle] = useState("");
  const [targetBatchId, setTargetBatchId] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isOwner = user.role === "owner";
  const selectedBatch = batches.find((batch) => batch.id === targetBatchId);

  async function loadBatches() {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ batches: BatchSummary[] }>("/api/batches");
      setBatches(result.batches);
      setTargetBatchId((current) =>
        result.batches.some((batch) => batch.id === current) ? current : "",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daftar batch gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBatches();
  }, []);

  function resetImport() {
    setItems([]);
    setFileName("");
    setSheetTitle("");
    setSheetName("");
    setFileInputKey((key) => key + 1);
  }

  async function handleCreateBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const result = await apiRequest<{ batch: { id: string } }>("/api/batches", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), destination }),
      });
      setTitle("");
      await loadBatches();
      setTargetBatchId(result.batch.id);
      setMessage("Batch berhasil dibuat. Pilih file Excel untuk mengisi daftar penerima.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Batch gagal dibuat.");
    } finally {
      setSaving(false);
    }
  }

  function handleBatchSelect(batchId: string) {
    setTargetBatchId(batchId);
    resetImport();
    setMessage("");
    setError("");
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selectedBatch) {
      setError("Buat dan pilih batch sebelum memilih file Excel.");
      event.target.value = "";
      return;
    }
    setError("");
    setMessage("");
    setFileName(file.name);
    setItems([]);
    setSheetTitle("");
    setSheetName("");
    setReading(true);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!(reader.result instanceof ArrayBuffer)) {
          throw new Error("Isi file Excel tidak dapat dibaca.");
        }
        const parsed = parseBatchWorkbook(reader.result, selectedBatch.destination);
        setItems(parsed.items);
        setSheetTitle(parsed.title);
        setSheetName(parsed.sheetName);
        setMessage(
          `${parsed.items.length} penerima ditemukan dari ${parsed.title}, sheet ${parsed.sheetName}. Target: ${selectedBatch.title} (${selectedBatch.destination}).`,
        );
      } catch (cause) {
        setItems([]);
        setError(cause instanceof Error ? cause.message : "File Excel tidak dapat dibaca.");
      } finally {
        setReading(false);
      }
    };
    reader.onerror = () => {
      setReading(false);
      setError("Gagal membaca file Excel dari perangkat.");
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBatch || !items.length) {
      setError("Pilih batch tujuan dan file Excel yang berisi nama penerima.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ imported: number }>(
        `/api/batches/${selectedBatch.id}/items`,
        {
          method: "PUT",
          body: JSON.stringify({ items }),
        },
      );
      setMessage(
        `${result.imported} penerima dari ${sheetTitle} berhasil diimpor ke ${selectedBatch.title}.`,
      );
      resetImport();
      await loadBatches();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daftar batch gagal diimpor.");
    } finally {
      setSaving(false);
    }
  }

  async function setFeatured(batch: BatchSummary, featured: boolean) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/batches/${batch.id}/featured`, {
        method: "PATCH",
        body: JSON.stringify({ featured }),
      });
      await loadBatches();
      setMessage(
        featured
          ? `${batch.title} (${batch.destination}) akan ditampilkan di halaman utama.`
          : `${batch.title} tidak lagi ditampilkan di halaman utama.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Pilihan batch halaman utama gagal diubah.",
      );
    }
  }

  function downloadTemplate() {
    const template = createBatchWorkbookTemplate();
    const url = URL.createObjectURL(new Blob([template], { type: spreadsheetMime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-batch-elkana.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ops-batch-page">
      <PageHeading
        eyebrow="BATCH PENGIRIMAN"
        title="Kelola batch"
        description="Buat batch pengiriman, pilih batch tujuan sebelum impor Excel, dan tentukan batch yang ditampilkan di halaman utama."
      >
        <button className="ops-button ops-button--outline" type="button" onClick={downloadTemplate}>
          <Download size={16} aria-hidden="true" /> Unduh template Excel
        </button>
      </PageHeading>

      {error && (
        <p className="ops-message ops-message--error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="ops-message ops-message--success" role="status">
          {message}
        </p>
      )}

      {isOwner && (
        <section className="ops-batch-card ops-batch-create">
          <h2>Buat batch pengiriman</h2>
          <form className="ops-form" onSubmit={(event) => void handleCreateBatch(event)}>
            <div className="ops-form__grid">
              <label>
                Tujuan pengambilan
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value as BatchDestination)}
                >
                  <option value="Bajawa">Bajawa</option>
                  <option value="Malanuza">Malanuza</option>
                  <option value="Aimere">Aimere</option>
                </select>
              </label>
              <label>
                Nama batch
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Contoh: BATCH 34"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            </div>
            <button className="ops-button ops-button--primary" type="submit" disabled={saving}>
              {saving ? "Membuat batch..." : "Buat batch"}
            </button>
          </form>
        </section>
      )}

      <div className="ops-batch-grid">
        <section className="ops-batch-card">
          <h2>Impor daftar Excel ke batch</h2>
          <p className="ops-form__note">
            Pilih batch tujuan terlebih dahulu. Workbook mengikuti contoh: kolom NO., NAMA, PCS,
            BERAT, HARGA, dan KET. Sheet yang digunakan otomatis mengikuti tujuan batch. Impor
            mengganti data Excel sebelumnya pada batch terpilih, tetapi mempertahankan paket yang
            telah dimasukkan lewat form input.
          </p>
          {loading ? (
            <p className="ops-empty">Memuat batch...</p>
          ) : batches.length === 0 ? (
            <p className="ops-empty">Buat batch terlebih dahulu sebelum mengimpor daftar Excel.</p>
          ) : (
            <form className="ops-form" onSubmit={(event) => void handleImport(event)}>
              <label>
                Batch tujuan impor
                <select
                  value={targetBatchId}
                  onChange={(event) => handleBatchSelect(event.target.value)}
                  disabled={!isOwner || saving || reading}
                  required
                >
                  <option value="" disabled>
                    Pilih batch tujuan
                  </option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.title} — {batch.destination}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                File workbook Excel
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  disabled={!isOwner || saving || reading || !targetBatchId}
                  required
                />
              </label>
              {fileName && <p className="ops-form__note">File: {fileName}</p>}
              {items.length > 0 && (
                <p className="ops-form__note">
                  {items.length} nama penerima siap diimpor ke {selectedBatch?.title}.
                </p>
              )}
              <button
                className="ops-button ops-button--primary"
                type="submit"
                disabled={!isOwner || saving || reading || !items.length}
              >
                {reading ? "Membaca file..." : saving ? "Mengimpor..." : "Impor ke batch terpilih"}
              </button>
            </form>
          )}
          {!isOwner && (
            <p className="ops-message ops-message--error" role="status">
              Hanya owner yang dapat membuat batch, mengimpor Excel, atau memilih batch halaman
              utama.
            </p>
          )}
        </section>

        <section className="ops-batch-card">
          <h2>Batch pengiriman</h2>
          {loading ? (
            <p className="ops-empty">Memuat batch...</p>
          ) : batches.length ? (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Tujuan</th>
                    <th>Daftar penerima</th>
                    <th>Halaman utama</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <strong>{batch.title}</strong>
                      </td>
                      <td>{batch.destination}</td>
                      <td>{batch.item_count}</td>
                      <td>
                        <button
                          className={`ops-batch-feature${batch.is_featured ? " is-active" : ""}`}
                          type="button"
                          aria-pressed={batch.is_featured}
                          disabled={!isOwner}
                          onClick={() => void setFeatured(batch, !batch.is_featured)}
                        >
                          <Star size={15} aria-hidden="true" />
                          {batch.is_featured ? "Ditampilkan" : "Tampilkan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ops-empty">Belum ada batch pengiriman.</p>
          )}
        </section>
      </div>
    </div>
  );
}
