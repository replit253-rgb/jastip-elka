import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeading } from "@/components/operations-dashboard";
import { useStaff } from "@/components/operations-dashboard-context";
import { apiRequest } from "@/lib/operations-api";
import {
  parseBatchWorkbook,
  type BatchDestination,
  type BatchItem,
} from "@/lib/batch-excel";

type BatchSummary = {
  id: string;
  title: string;
  destination: string;
  item_count: number;
  created_at: string;
};

export function BatchUploadPage() {
  const { user } = useStaff();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [destination, setDestination] = useState<BatchDestination>("Bajawa");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBatches() {
    setLoading(true);
    try {
      const result = await apiRequest<{ batches: BatchSummary[] }>("/api/batches");
      setBatches(result.batches);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daftar batch gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBatches();
  }, []);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!(reader.result instanceof ArrayBuffer)) {
          throw new Error("Isi file Excel tidak dapat dibaca.");
        }
        const parsed = parseBatchWorkbook(reader.result, destination);
        setTitle(parsed.title);
        setItems(parsed.items);
        setMessage(`${parsed.items.length} penerima ditemukan di sheet ${parsed.sheetName}.`);
      } catch (cause) {
        setItems([]);
        setError(cause instanceof Error ? cause.message : "File Excel tidak dapat dibaca.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || !title.trim()) {
      setError("Pilih file Excel dan pastikan terdapat batch serta nama penerima.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          destination,
          items,
        }),
      });
      setMessage(`Daftar ${title} untuk ${destination} berhasil dipublikasikan.`);
      await loadBatches();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daftar batch gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (user.role !== "owner" && user.role !== "admin") return null;

  return (
    <main className="ops-content">
      <PageHeading
        eyebrow="DAFTAR PAKET"
        title="Unggah daftar batch Excel"
        description="Upload workbook batch untuk menampilkan daftar penerima pada halaman beranda."
      />
      <div className="ops-grid ops-grid--two">
        <section className="ops-card">
          <form className="ops-form" onSubmit={handleSubmit}>
            <div className="ops-form-grid">
              <label>
                Tujuan
                <select value={destination} onChange={(event) => setDestination(event.target.value as typeof destination)}>
                  <option>Bajawa</option>
                  <option>Malanuza</option>
                  <option>Aimere</option>
                </select>
              </label>
              <label>
                Judul batch
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: BATCH 34" />
              </label>
            </div>
            <label>
              File Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
            </label>
            {fileName && <p className="ops-muted">File: {fileName}</p>}
            {items.length > 0 && <p className="ops-message ops-message--success">{items.length} penerima siap dipublikasikan.</p>}
            {error && <p className="ops-message ops-message--error">{error}</p>}
            {message && <p className="ops-message ops-message--success">{message}</p>}
            <button className="ops-button ops-button--primary" type="submit" disabled={saving || !items.length}>
              {saving ? "Memublikasikan..." : "Publikasikan daftar batch"}
            </button>
          </form>
        </section>

        <section className="ops-card">
          <h2>Batch terpublikasi</h2>
          {loading ? (
            <p className="ops-empty">Memuat batch...</p>
          ) : batches.length ? (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Tujuan</th>
                    <th>Penerima</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td><strong>{batch.title}</strong></td>
                      <td>{batch.destination}</td>
                      <td>{batch.item_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ops-empty">Belum ada batch yang dipublikasikan.</p>
          )}
        </section>
      </div>
    </main>
  );
}
