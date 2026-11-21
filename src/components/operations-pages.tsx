import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { Html5Qrcode as Html5QrcodeInstance } from "html5-qrcode";
import {
  ArrowRight,
  Archive,
  Check,
  CircleAlert,
  ClipboardCheck,
  PackageCheck,
  Pencil,
  RefreshCw,
  Save,
  ScanLine,
  X,
} from "lucide-react";

import { PackageStatus, PageHeading } from "@/components/operations-dashboard";
import { useStaff } from "@/components/operations-dashboard-context";
import { apiRequest, formatDate, formatRupiah, type PackageRecord } from "@/lib/operations-api";

type DashboardData = {
  summary: {
    total: number;
    awaiting_verification: number;
    awaiting_payment: number;
    awaiting_pickup: number;
    paid_total: number;
  };
  packages: PackageRecord[];
  pricePerKg: number;
};

function ErrorMessage({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className="ops-message ops-message--error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      {children}
    </p>
  );
}

function LoadingLine() {
  return (
    <p className="ops-empty" aria-live="polite">
      Memuat data...
    </p>
  );
}

function PackageTable({
  packages,
  emptyMessage = "Belum ada paket.",
}: {
  packages: PackageRecord[];
  emptyMessage?: string;
}) {
  if (!packages.length) return <p className="ops-empty">{emptyMessage}</p>;
  return (
    <div className="ops-table-wrap">
      <table className="ops-table">
        <thead>
          <tr>
            <th>Nomor paket</th>
            <th>Penerima</th>
            <th>Tujuan</th>
            <th>Berat</th>
            <th>Tagihan</th>
            <th>Status</th>
            <th>Masuk</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((item) => (
            <tr key={item.id}>
              <td>
                <strong className="ops-code">{item.tracking_code}</strong>
              </td>
              <td>{item.recipient_name}</td>
              <td>{item.destination}</td>
              <td>{Number(item.weight_kg).toLocaleString("id-ID")} kg</td>
              <td>{formatRupiah(item.total_price)}</td>
              <td>
                <PackageStatus item={item} />
              </td>
              <td>{formatDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PackageMonitorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const { role } = useStaff();

  async function loadDashboard() {
    setError("");
    try {
      setData(await apiRequest<DashboardData>("/api/dashboard"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data dashboard gagal dimuat.");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="RINGKASAN HARI INI"
        title="Monitor paket"
        description="Pantau paket masuk, pembayaran, dan pengambilan dari satu tempat."
      >
        <button className="ops-button ops-button--quiet" type="button" onClick={loadDashboard}>
          <RefreshCw size={16} aria-hidden="true" /> Perbarui
        </button>
      </PageHeading>
      <ErrorMessage>{error}</ErrorMessage>
      {!data ? (
        <LoadingLine />
      ) : (
        <>
          <div className="ops-stats">
            <article className="ops-stat">
              <span className="ops-stat__label">Total paket</span>
              <strong>{data.summary.total}</strong>
              <small>Semua paket terdaftar</small>
            </article>
            <article className="ops-stat">
              <span className="ops-stat__label">Belum diverifikasi</span>
              <strong>{data.summary.awaiting_verification}</strong>
              <small>Perlu scan verifikasi</small>
            </article>
            <article className="ops-stat">
              <span className="ops-stat__label">Menunggu pembayaran</span>
              <strong>{data.summary.awaiting_payment}</strong>
              <small>Sudah diverifikasi</small>
            </article>
            <article className="ops-stat">
              <span className="ops-stat__label">Siap diambil</span>
              <strong>{data.summary.awaiting_pickup}</strong>
              <small>Sudah lunas</small>
            </article>
            <article className="ops-stat ops-stat--highlight">
              <span className="ops-stat__label">Pembayaran diterima</span>
              <strong>{formatRupiah(data.summary.paid_total)}</strong>
              <small>Akumulasi seluruh pembayaran</small>
            </article>
          </div>

          <section className="ops-section">
            <div className="ops-section__heading">
              <div>
                <p className="ops-eyebrow">TERBARU</p>
                <h2>Paket masuk</h2>
              </div>
              <Link className="ops-text-link" to="/dashboard/paket-baru">
                Input paket <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <PackageTable packages={data.packages} />
          </section>

          <div className="ops-quick-actions">
            <Link to="/dashboard/scan">
              <ScanLine size={18} aria-hidden="true" />
              <span>
                <strong>Proses scan barcode</strong>
                <small>Verifikasi, pembayaran, atau pengambilan</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/dashboard/pembayaran">
              <ClipboardCheck size={18} aria-hidden="true" />
              <span>
                <strong>Lihat catatan pembayaran</strong>
                <small>Total tercatat {formatRupiah(data.summary.paid_total)}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="ops-rate-note">
            Tarif aktif: <strong>{formatRupiah(data.pricePerKg)} / kg</strong>
          </p>
          {role === "owner" && <OwnerPackageManager onChanged={() => void loadDashboard()} />}
        </>
      )}
    </>
  );
}

function OwnerPackageManager({ onChanged }: { onChanged: () => void }) {
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editing, setEditing] = useState<PackageRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ limit: "50", offset: "0" });
    apiRequest<{ packages: PackageRecord[]; hasMore: boolean; nextOffset: number }>(
      `/api/packages?${query}`,
    )
      .then((result) => {
        if (!active) return;
        setPackages(result.packages);
        setOffset(result.nextOffset);
        setHasMore(result.hasMore);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Daftar paket gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "50", offset: String(offset) });
      const result = await apiRequest<{
        packages: PackageRecord[];
        hasMore: boolean;
        nextOffset: number;
      }>(`/api/packages?${query}`);
      setPackages((current) => [...current, ...result.packages]);
      setOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paket berikutnya gagal dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function archivePackage(item: PackageRecord) {
    if (
      !window.confirm(
        `Arsipkan paket ${item.tracking_code}? Riwayat dan pembayaran tetap disimpan.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    setError("");
    try {
      await apiRequest<void>(`/api/packages/${item.id}`, { method: "DELETE" });
      setPackages((current) => current.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paket gagal diarsipkan.");
    } finally {
      setBusyId("");
    }
  }

  function updatePackage(updated: PackageRecord) {
    setPackages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setEditing(null);
    onChanged();
  }

  return (
    <section
      className="ops-section ops-package-management"
      aria-labelledby="package-management-title"
    >
      <div className="ops-section__heading">
        <div>
          <p className="ops-eyebrow">KELOLA DATA</p>
          <h2 id="package-management-title">Semua paket</h2>
        </div>
        <span className="ops-content-count">{packages.length} paket dimuat</span>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {loading ? (
        <LoadingLine />
      ) : packages.length === 0 ? (
        <p className="ops-empty">Belum ada paket aktif.</p>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Nomor paket</th>
                <th>Penerima</th>
                <th>Tujuan</th>
                <th>Berat</th>
                <th>Tagihan</th>
                <th>Status</th>
                <th>Aksi owner</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((item) => {
                const canEdit = !item.verified_at && !item.paid_at && !item.collected_at;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong className="ops-code">{item.tracking_code}</strong>
                    </td>
                    <td>{item.recipient_name}</td>
                    <td>{item.destination}</td>
                    <td>{Number(item.weight_kg).toLocaleString("id-ID")} kg</td>
                    <td>{formatRupiah(item.total_price)}</td>
                    <td>
                      {item.archived_at ? (
                        <span className="ops-content-status">Diarsipkan</span>
                      ) : (
                        <PackageStatus item={item} />
                      )}
                    </td>
                    <td>
                      <div className="ops-table-actions">
                        <button
                          type="button"
                          className="ops-icon-button"
                          aria-label={`Edit ${item.tracking_code}`}
                          title={
                            canEdit ? "Edit paket" : "Paket yang sudah diproses tidak dapat diedit"
                          }
                          disabled={!canEdit || Boolean(busyId)}
                          onClick={() => setEditing(item)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ops-icon-button ops-icon-button--danger"
                          aria-label={`Arsipkan ${item.tracking_code}`}
                          title="Arsipkan paket"
                          disabled={Boolean(busyId)}
                          onClick={() => void archivePackage(item)}
                        >
                          <Archive size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <PackageEditor
          key={editing.id}
          item={editing}
          onCancel={() => setEditing(null)}
          onSaved={updatePackage}
        />
      )}
      {hasMore && !loading && (
        <div className="ops-package-management__more">
          <button
            type="button"
            className="ops-button ops-button--outline"
            onClick={() => void loadMore()}
            disabled={loadingMore || Boolean(busyId)}
          >
            {loadingMore ? "Memuat..." : "Muat paket berikutnya"}
          </button>
        </div>
      )}
    </section>
  );
}

function PackageEditor({
  item,
  onCancel,
  onSaved,
}: {
  item: PackageRecord;
  onCancel: () => void;
  onSaved: (item: PackageRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ package: PackageRecord }>(`/api/packages/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          recipientName: formData.get("recipientName"),
          recipientPhone: formData.get("recipientPhone"),
          senderName: formData.get("senderName"),
          destination: formData.get("destination"),
          description: formData.get("description"),
          weightKg: Number(formData.get("weightKg")),
        }),
      });
      onSaved(result.package);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan paket gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ops-form ops-package-editor" onSubmit={submit}>
      <div className="ops-form__intro">
        <h2>Edit paket {item.tracking_code}</h2>
        <p>Tarif per kilogram tetap mengikuti tarif saat paket dibuat.</p>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="ops-form__grid">
        <label>
          Nama penerima
          <input
            name="recipientName"
            defaultValue={item.recipient_name}
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Nomor telepon penerima
          <input
            name="recipientPhone"
            type="tel"
            defaultValue={item.recipient_phone ?? ""}
            required
            minLength={5}
            maxLength={32}
          />
        </label>
        <label>
          Nama pengirim
          <input
            name="senderName"
            defaultValue={item.sender_name ?? ""}
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Tujuan pengambilan
          <select name="destination" defaultValue={item.destination}>
            <option value="Bajawa">Bajawa</option>
            <option value="Malanuza">Malanuza</option>
            <option value="Aimere">Aimere</option>
          </select>
        </label>
        <label>
          Berat paket (kg)
          <input
            name="weightKg"
            type="number"
            step="0.01"
            min="0.01"
            max="500"
            defaultValue={item.weight_kg}
            required
          />
        </label>
        <label>
          Keterangan barang
          <input name="description" defaultValue={item.description ?? ""} maxLength={250} />
        </label>
      </div>
      <div className="ops-package-editor__actions">
        <button
          className="ops-button ops-button--quiet"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Batal
        </button>
        <button className="ops-button ops-button--primary" type="submit" disabled={saving}>
          <Save size={16} aria-hidden="true" /> {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}

type PackageDraft = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  senderName: string;
  destination: "Bajawa" | "Malanuza" | "Aimere";
  description: string;
  weightKg: number;
};

export function NewPackagePage() {
  const [pricePerKg, setPricePerKg] = useState(8000);
  const [drafts, setDrafts] = useState<PackageDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const recipientRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest<{ pricePerKg: number }>("/api/settings/price")
      .then(({ pricePerKg: price }) => setPricePerKg(price))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Tarif aktif gagal dimuat."),
      );
  }, []);

  function addToQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError("");
    setSuccess("");
    if (drafts.length >= 50) {
      setError("Satu kali penyimpanan maksimal 50 paket.");
      return;
    }
    setDrafts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        recipientName: String(formData.get("recipientName")),
        recipientPhone: String(formData.get("recipientPhone")),
        senderName: String(formData.get("senderName")),
        destination: String(formData.get("destination")) as PackageDraft["destination"],
        description: String(formData.get("description") ?? ""),
        weightKg: Number(formData.get("weightKg")),
      },
    ]);
    form.reset();
    recipientRef.current?.focus();
  }

  async function saveAll() {
    if (drafts.length === 0) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await apiRequest<{
        packages: Array<{ package: PackageRecord; barcodeToken: string }>;
      }>("/api/packages/bulk", {
        method: "POST",
        body: JSON.stringify({
          packages: drafts.map(({ id: _id, ...item }) => item),
        }),
      });
      setSuccess(`${result.packages.length} paket tersimpan dan barcode berhasil dibuat.`);
      setDrafts([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paket gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="REGISTRASI PAKET"
        title="Input paket"
        description="Tambahkan beberapa paket ke antrean, lalu simpan semuanya sekaligus dengan barcode unik."
      />
      <ErrorMessage>{error}</ErrorMessage>
      {success && (
        <p className="ops-message ops-message--success" role="status">
          <Check size={17} aria-hidden="true" />
          {success}{" "}
          <Link className="ops-text-link" to="/dashboard/barcode">
            Buka daftar barcode <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      )}
      <form className="ops-form ops-batch-form" onSubmit={addToQueue}>
        <div className="ops-form__intro">
          <h2>Data pengiriman</h2>
          <p>Tarif aktif {formatRupiah(pricePerKg)} per kilogram.</p>
        </div>
        <div className="ops-form__grid">
          <label>
            Nama penerima
            <input
              ref={recipientRef}
              name="recipientName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Nomor telepon penerima
            <input
              name="recipientPhone"
              type="tel"
              autoComplete="tel"
              required
              minLength={5}
              maxLength={32}
            />
          </label>
          <label>
            Nama pengirim
            <input name="senderName" required minLength={2} maxLength={120} />
          </label>
          <label>
            Tujuan pengambilan
            <select name="destination" defaultValue="Bajawa">
              <option value="Bajawa">Bajawa</option>
              <option value="Malanuza">Malanuza</option>
              <option value="Aimere">Aimere</option>
            </select>
          </label>
          <label>
            Berat paket (kg)
            <input name="weightKg" type="number" step="0.01" min="0.01" max="500" required />
          </label>
          <label>
            Keterangan barang <span className="ops-optional">opsional</span>
            <input name="description" maxLength={250} placeholder="Contoh: kardus pakaian" />
          </label>
        </div>
        <div className="ops-form__note">
          <PackageCheck size={17} aria-hidden="true" />
          <span>
            Tagihan dihitung otomatis dan tarif paket tetap mengikuti tarif saat didaftarkan.
          </span>
        </div>
        <button
          className="ops-button ops-button--primary"
          type="submit"
          disabled={saving || drafts.length >= 50}
        >
          Tambahkan paket berikutnya
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>

      <section className="ops-section ops-batch-queue" aria-labelledby="package-queue-title">
        <div className="ops-section__heading">
          <div>
            <p className="ops-eyebrow">ANTREAN SIMPAN</p>
            <h2 id="package-queue-title">Paket berikutnya</h2>
          </div>
          <span className="ops-content-count">{drafts.length} / 50 paket</span>
        </div>
        {drafts.length === 0 ? (
          <p className="ops-empty">
            Belum ada paket di antrean. Isi formulir lalu tambahkan paket.
          </p>
        ) : (
          <>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Penerima</th>
                    <th>Tujuan</th>
                    <th>Berat</th>
                    <th>Estimasi tagihan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft, index) => (
                    <tr key={draft.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{draft.recipientName}</strong>
                      </td>
                      <td>{draft.destination}</td>
                      <td>{draft.weightKg.toLocaleString("id-ID")} kg</td>
                      <td>{formatRupiah(Math.round(draft.weightKg * pricePerKg))}</td>
                      <td>
                        <button
                          type="button"
                          className="ops-icon-button"
                          onClick={() =>
                            setDrafts((current) => current.filter((item) => item.id !== draft.id))
                          }
                          aria-label={`Hapus ${draft.recipientName} dari antrean`}
                          disabled={saving}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ops-batch-queue__footer">
              <p>
                Total estimasi{" "}
                <strong>
                  {formatRupiah(
                    drafts.reduce((sum, draft) => sum + Math.round(draft.weightKg * pricePerKg), 0),
                  )}
                </strong>
              </p>
              <button
                className="ops-button ops-button--primary"
                type="button"
                onClick={() => void saveAll()}
                disabled={saving}
              >
                {saving ? "Menyimpan semua..." : `Simpan ${drafts.length} paket & buat barcode`}
                {!saving && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>
            <p className="ops-form__note">
              Semua paket disimpan dalam satu transaksi. Jika ada data yang tidak valid, tidak ada
              paket dari antrean ini yang tersimpan.
            </p>
          </>
        )}
      </section>
    </>
  );
}

type ScanAction = "verify" | "payment" | "collect";

export function BarcodePage() {
  const [action, setAction] = useState<ScanAction>("verify");
  const [barcode, setBarcode] = useState("");
  const [scanned, setScanned] = useState<PackageRecord | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanner = useRef<Html5QrcodeInstance | null>(null);

  useEffect(
    () => () => {
      const current = scanner.current;
      scanner.current = null;
      if (current?.isScanning) {
        void current
          .stop()
          .catch((cause: unknown) => console.error("Failed to stop the barcode camera.", cause));
      }
    },
    [],
  );

  async function stopCamera() {
    const current = scanner.current;
    scanner.current = null;
    setScanning(false);
    if (current?.isScanning) {
      try {
        await current.stop();
        current.clear();
      } catch {
        setError("Kamera tidak dapat dihentikan dengan benar. Muat ulang halaman jika diperlukan.");
      }
    }
  }

  async function processBarcode(value = barcode) {
    const token = value.trim();
    if (!token) {
      setError("Scan barcode atau masukkan data barcode terlebih dahulu.");
      return;
    }
    setError("");
    setScanned(null);
    try {
      const result = await apiRequest<{ package: PackageRecord; action: ScanAction }>(
        "/api/packages/scan",
        {
          method: "POST",
          body: JSON.stringify({ barcodeToken: token, action }),
        },
      );
      setScanned(result.package);
      setBarcode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Barcode gagal diproses.");
    }
  }

  async function startCamera() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode("ops-barcode-reader");
      scanner.current = reader;
      await reader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void stopCamera();
          void processBarcode(decodedText);
        },
        () => undefined,
      );
      setScanning(true);
    } catch (cause) {
      scanner.current = null;
      setScanning(false);
      setError(
        cause instanceof Error
          ? `Kamera tidak dapat dibuka: ${cause.message}`
          : "Kamera tidak dapat dibuka. Periksa izin kamera browser.",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PEMINDAIAN PAKET"
        title="Scan barcode"
        description="Barcode unik pada setiap paket dapat digunakan untuk seluruh proses operasional."
      />
      <ErrorMessage>{error}</ErrorMessage>
      <div className="ops-scan-layout">
        <section className="ops-scan-panel">
          <label className="ops-scan-panel__label" htmlFor="scan-action">
            Pilih fungsi scan
          </label>
          <select
            id="scan-action"
            className="ops-select"
            value={action}
            onChange={(event) => {
              setAction(event.target.value as ScanAction);
              setScanned(null);
              setError("");
            }}
          >
            <option value="verify">Verifikasi paket masuk</option>
            <option value="payment">Konfirmasi pembayaran</option>
            <option value="collect">Konfirmasi pengambilan paket</option>
          </select>
          <div id="ops-barcode-reader" className="ops-camera-reader" />
          <button
            type="button"
            className="ops-button ops-button--primary ops-button--wide"
            onClick={scanning ? () => void stopCamera() : () => void startCamera()}
          >
            <ScanLine size={17} aria-hidden="true" />
            {scanning ? "Matikan kamera" : "Aktifkan kamera"}
          </button>
          <div className="ops-scan-divider">
            <span>ATAU MASUKKAN HASIL SCAN</span>
          </div>
          <label className="ops-scan-panel__label" htmlFor="barcode-input">
            Data barcode
          </label>
          <input
            id="barcode-input"
            className="ops-input"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Tempelkan data barcode di sini"
          />
          <button
            type="button"
            className="ops-button ops-button--outline ops-button--wide"
            onClick={() => void processBarcode()}
          >
            Proses barcode
          </button>
        </section>

        <section className="ops-scan-result" aria-live="polite">
          <p className="ops-eyebrow">HASIL PEMINDAIAN</p>
          {scanned ? (
            <div className="ops-scan-result__success">
              <span className="ops-scan-result__check">
                <Check size={20} aria-hidden="true" />
              </span>
              <h2>{scanned.tracking_code}</h2>
              <p>
                {action === "verify"
                  ? "Paket berhasil diverifikasi."
                  : action === "payment"
                    ? "Pembayaran berhasil dicatat."
                    : "Pengambilan paket berhasil dicatat."}
              </p>
              <dl className="ops-scan-details">
                <div>
                  <dt>Penerima</dt>
                  <dd>{scanned.recipient_name}</dd>
                </div>
                <div>
                  <dt>Tujuan</dt>
                  <dd>{scanned.destination}</dd>
                </div>
                <div>
                  <dt>Berat</dt>
                  <dd>{Number(scanned.weight_kg).toLocaleString("id-ID")} kg</dd>
                </div>
                <div>
                  <dt>Total tagihan</dt>
                  <dd>{formatRupiah(scanned.total_price)}</dd>
                </div>
              </dl>
              <PackageStatus item={scanned} />
            </div>
          ) : (
            <div className="ops-scan-result__empty">
              <QrCodeIllustration />
              <h2>Belum ada barcode</h2>
              <p>
                Pilih fungsi scan lalu arahkan kamera ke barcode paket. Sistem akan memperbarui
                status setelah proses berhasil.
              </p>
              <Link to="/dashboard/paket-baru">
                Buat paket baru <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function QrCodeIllustration() {
  return (
    <div className="ops-qr-illustration" aria-hidden="true">
      <QrCodeMark />
    </div>
  );
}

function QrCodeMark() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <path
        d="M5 23V5h18M41 5h18v18M59 41v18H41M23 59H5V41"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M15 15h9v9h-9zM40 15h9v9h-9zM15 40h9v9h-9zM31 31h5v5h-5z" fill="currentColor" />
      <path d="M42 34v-4h8v8h-4M30 43v6h6v-6h-6ZM43 43h8v8h-8z" fill="currentColor" />
    </svg>
  );
}

export function PaymentsPage() {
  const [packages, setPackages] = useState<PackageRecord[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ packages: PackageRecord[] }>("/api/payments")
      .then(({ packages: result }) => setPackages(result))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Data pembayaran gagal dimuat."),
      );
  }, []);

  const filtered = (packages ?? []).filter((item) => {
    if (filter === "paid") return Boolean(item.paid_at);
    if (filter === "unpaid") return !item.paid_at;
    return true;
  });
  const paidTotal = (packages ?? []).reduce(
    (sum, item) => sum + (item.paid_at ? item.total_price : 0),
    0,
  );

  return (
    <>
      <PageHeading
        eyebrow="CATATAN PEMBAYARAN"
        title="Pembayaran"
        description="Pembayaran tunai atau transfer dicatat setelah admin memeriksa bukti/penerimaan."
      >
        <Link className="ops-button ops-button--primary" to="/dashboard/scan">
          <ScanLine size={16} aria-hidden="true" /> Scan pembayaran
        </Link>
      </PageHeading>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="ops-payment-total">
        <div>
          <span>Total pembayaran tercatat</span>
          <strong>{formatRupiah(paidTotal)}</strong>
        </div>
        <span className="ops-payment-total__note">Konfirmasi dilakukan dengan barcode paket</span>
      </div>
      <section className="ops-section">
        <div className="ops-section__heading ops-section__heading--filters">
          <div>
            <p className="ops-eyebrow">TRANSAKSI PAKET</p>
            <h2>Riwayat pembayaran</h2>
          </div>
          <div className="ops-filter-tabs" role="group" aria-label="Filter pembayaran">
            {(["unpaid", "paid", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "is-active" : ""}
                onClick={() => setFilter(value)}
              >
                {value === "unpaid" ? "Belum lunas" : value === "paid" ? "Lunas" : "Semua"}
              </button>
            ))}
          </div>
        </div>
        {!packages ? (
          <LoadingLine />
        ) : (
          <PackageTable packages={filtered} emptyMessage="Tidak ada data untuk filter ini." />
        )}
      </section>
    </>
  );
}

export function PriceSettingsPage() {
  const [pricePerKg, setPricePerKg] = useState(8000);
  const [inputPrice, setInputPrice] = useState("8000");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    apiRequest<{ pricePerKg: number; updatedAt: string | null }>("/api/settings/price")
      .then((result) => {
        setPricePerKg(result.pricePerKg);
        setInputPrice(String(result.pricePerKg));
        setUpdatedAt(result.updatedAt);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Tarif gagal dimuat."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    setSaving(true);
    try {
      const result = await apiRequest<{ pricePerKg: number }>("/api/settings/price", {
        method: "PUT",
        body: JSON.stringify({ pricePerKg: Number(inputPrice) }),
      });
      setPricePerKg(result.pricePerKg);
      setInputPrice(String(result.pricePerKg));
      setUpdatedAt(new Date().toISOString());
      setSaved("Tarif berhasil diperbarui. Paket yang sudah terdaftar tidak berubah.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tarif gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="TARIF PENGIRIMAN"
        title="Pengaturan harga"
        description="Atur harga per kilogram untuk pendaftaran paket berikutnya."
      />
      <ErrorMessage>{error}</ErrorMessage>
      {saved && (
        <p className="ops-message ops-message--success" role="status">
          <Check size={17} aria-hidden="true" /> {saved}
        </p>
      )}
      {loading ? (
        <LoadingLine />
      ) : (
        <div className="ops-price-layout">
          <section className="ops-price-card">
            <p className="ops-eyebrow">TARIF SAAT INI</p>
            <strong className="ops-price-card__current">{formatRupiah(pricePerKg)}</strong>
            <span className="ops-price-card__unit">per kilogram</span>
            <div className="ops-price-card__rule" />
            <p>Tarif ini digunakan saat owner atau admin mendaftarkan paket baru.</p>
            {updatedAt && <small>Diperbarui {formatDate(updatedAt)}</small>}
          </section>
          <form className="ops-form ops-price-form" onSubmit={savePrice}>
            <h2>Ubah tarif</h2>
            <p>Harga paket dihitung dari berat × tarif per kilogram dan dibulatkan ke rupiah.</p>
            <label>
              Tarif baru (rupiah / kg)
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="100000000"
                step="1"
                value={inputPrice}
                onChange={(event) => setInputPrice(event.target.value)}
                required
              />
            </label>
            <div className="ops-price-example">
              <span>Contoh tagihan untuk paket 1,5 kg</span>
              <strong>{formatRupiah((Number(inputPrice) || 0) * 1.5)}</strong>
            </div>
            <button type="submit" className="ops-button ops-button--primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan tarif"}
              {!saving && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
