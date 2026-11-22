import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, MapPin, Send } from "lucide-react";

import { PageHeading } from "@/components/operations-dashboard";
import { useStaff } from "@/components/operations-dashboard-context";
import { apiRequest } from "@/lib/operations-api";

type TrackingBatch = {
  id: string;
  title: string;
  destination: string;
  package_count: number;
};

export function TrackingManagementPage() {
  const { role } = useStaff();
  const isOwner = role === "owner";
  const [batches, setBatches] = useState<TrackingBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [information, setInformation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  useEffect(() => {
    let active = true;
    apiRequest<{ batches: TrackingBatch[] }>("/api/batches")
      .then(({ batches: result }) => {
        if (active) {
          setBatches(result);
          setSelectedBatchId(result[0]?.id ?? "");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Daftar batch gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveTrackingUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBatch) {
      setError("Pilih batch yang memiliki paket aktif.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<{ updatedPackages: number }>(
        `/api/batches/${selectedBatch.id}/tracking`,
        {
          method: "POST",
          body: JSON.stringify({ status, location, information }),
        },
      );
      setSuccess(
        `Pembaruan "${status}" berhasil dikirim ke ${result.updatedPackages} paket dalam ${selectedBatch.title}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pembaruan tracking gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PEMBARUAN PERJALANAN"
        title="Tracking paket"
        description="Berikan status dan informasi perjalanan untuk semua paket aktif di batch pilihan. Pelanggan dapat melihat pembaruan menggunakan nomor tracking."
      />
      {error && (
        <p className="ops-message ops-message--error" role="alert">
          <CircleAlert size={17} aria-hidden="true" />
          {error}
        </p>
      )}
      {success && (
        <p className="ops-message ops-message--success" role="status">
          <MapPin size={17} aria-hidden="true" />
          {success}
        </p>
      )}
      {!isOwner ? (
        <p className="ops-content-notice">Halaman ini hanya dapat digunakan oleh owner.</p>
      ) : loading ? (
        <p className="ops-empty" aria-live="polite">
          Memuat batch...
        </p>
      ) : batches.length === 0 ? (
        <p className="ops-empty">Belum ada batch pengiriman.</p>
      ) : (
        <form className="ops-form ops-content-editor" onSubmit={saveTrackingUpdate}>
          <div className="ops-form__intro">
            <h2>Tambahkan pembaruan ke batch</h2>
            <p>
              Status ini akan masuk ke riwayat publik setiap paket aktif dalam batch, bersama lokasi
              dan informasi yang Anda tulis.
            </p>
          </div>
          <label>
            Batch pengiriman
            <select
              value={selectedBatchId}
              onChange={(event) => {
                setSelectedBatchId(event.target.value);
                setSuccess("");
              }}
              required
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.title} — {batch.destination} ({batch.package_count} paket aktif)
                </option>
              ))}
            </select>
          </label>
          <label>
            Status perjalanan
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Contoh: Paket berangkat dari Surabaya"
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Lokasi terakhir
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Contoh: Surabaya"
              minLength={2}
              maxLength={120}
              required
            />
          </label>
          <label>
            Informasi untuk pelanggan
            <textarea
              value={information}
              onChange={(event) => setInformation(event.target.value)}
              placeholder="Jelaskan kondisi atau perkiraan perjalanan paket."
              minLength={2}
              maxLength={500}
              rows={4}
              required
            />
          </label>
          <button
            className="ops-button ops-button--primary"
            type="submit"
            disabled={saving || !selectedBatch?.package_count}
          >
            <Send size={16} aria-hidden="true" />
            {saving ? "Menyimpan pembaruan..." : "Kirim ke semua paket di batch"}
          </button>
        </form>
      )}
    </>
  );
}
