import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Eye, EyeOff, Pencil, Send, Trash2 } from "lucide-react";

import { useStaff } from "@/components/operations-dashboard-context";
import { PageHeading } from "@/components/operations-dashboard";
import { apiRequest } from "@/lib/operations-api";

type ScheduleStatus = "collecting" | "closing_soon" | "closed" | "in_transit" | "arrived";

type ShippingSchedule = {
  id: string;
  title: string;
  destination: string;
  closing_date: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  status: ScheduleStatus;
  description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type ScheduleForm = {
  title: string;
  destination: string;
  closingDate: string;
  departureDate: string;
  estimatedArrivalDate: string;
  status: ScheduleStatus;
  description: string;
  isPublished: boolean;
};

const emptyForm: ScheduleForm = {
  title: "",
  destination: "Bajawa",
  closingDate: "",
  departureDate: "",
  estimatedArrivalDate: "",
  status: "collecting",
  description: "",
  isPublished: true,
};

const statusLabels: Record<ScheduleStatus, string> = {
  collecting: "Penerimaan paket dibuka",
  closing_soon: "Segera closing",
  closed: "Penerimaan ditutup",
  in_transit: "Dalam perjalanan",
  arrived: "Sudah tiba",
};

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function ShippingSchedulePage() {
  const { role } = useStaff();
  const isOwner = role === "owner";
  const [schedules, setSchedules] = useState<ShippingSchedule[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ schedules: ShippingSchedule[] }>("/api/shipping-schedules")
      .then(({ schedules: items }) => {
        if (active) setSchedules(items);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Jadwal pengiriman gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function editSchedule(schedule: ShippingSchedule) {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title,
      destination: schedule.destination,
      closingDate: schedule.closing_date.slice(0, 10),
      departureDate: schedule.departure_date.slice(0, 10),
      estimatedArrivalDate: schedule.estimated_arrival_date?.slice(0, 10) ?? "",
      status: schedule.status,
      description: schedule.description,
      isPublished: schedule.is_published,
    });
    setError("");
    setSuccess("");
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const payload = JSON.stringify({
      ...form,
      estimatedArrivalDate: form.estimatedArrivalDate || null,
    });
    try {
      if (editingId) {
        await apiRequest(`/api/shipping-schedules/${editingId}`, {
          method: "PUT",
          body: payload,
        });
        setSuccess("Jadwal pengiriman berhasil diperbarui.");
      } else {
        await apiRequest("/api/shipping-schedules", { method: "POST", body: payload });
        setSuccess(
          form.isPublished ? "Jadwal berhasil diterbitkan." : "Draft jadwal berhasil disimpan.",
        );
      }
      resetForm();
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Jadwal pengiriman gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication(schedule: ShippingSchedule) {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(`/api/shipping-schedules/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: schedule.title,
          destination: schedule.destination,
          closingDate: schedule.closing_date.slice(0, 10),
          departureDate: schedule.departure_date.slice(0, 10),
          estimatedArrivalDate: schedule.estimated_arrival_date?.slice(0, 10) ?? null,
          status: schedule.status,
          description: schedule.description,
          isPublished: !schedule.is_published,
        }),
      });
      setSuccess(
        schedule.is_published ? "Jadwal disembunyikan dari website." : "Jadwal diterbitkan.",
      );
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status publikasi jadwal gagal diubah.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(schedule: ShippingSchedule) {
    if (!window.confirm(`Hapus permanen jadwal "${schedule.title}"?`)) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest<void>(`/api/shipping-schedules/${schedule.id}`, { method: "DELETE" });
      setSchedules((current) => current.filter((item) => item.id !== schedule.id));
      if (editingId === schedule.id) resetForm();
      setSuccess("Jadwal pengiriman berhasil dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Jadwal pengiriman gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="JADWAL PENGIRIMAN"
        title="Batch & jadwal pengiriman"
        description="Atur batas closing, tanggal keberangkatan, estimasi tiba, dan informasi yang tampil untuk pelanggan."
      />
      {error && (
        <p className="ops-message ops-message--error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="ops-message ops-message--success" role="status">
          {success}
        </p>
      )}

      {isOwner ? (
        <form className="ops-form ops-content-editor ops-schedule-editor" onSubmit={saveSchedule}>
          <div className="ops-form__intro">
            <h2>{editingId ? "Ubah jadwal" : "Buat jadwal pengiriman"}</h2>
            <p>
              Jadwal yang diterbitkan akan tampil di beranda dekat foto kapal. Gunakan tanggal
              closing dan keberangkatan yang sudah dikonfirmasi.
            </p>
          </div>
          <label>
            Nama batch / jadwal
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Contoh: Pengiriman Minggu ke-4"
              minLength={4}
              maxLength={120}
              required
            />
          </label>
          <label>
            Tujuan
            <select
              value={form.destination}
              onChange={(event) => setForm({ ...form, destination: event.target.value })}
            >
              <option value="Semua tujuan">Semua tujuan</option>
              <option value="Bajawa">Bajawa</option>
              <option value="Malanuza">Malanuza</option>
              <option value="Aimere">Aimere</option>
            </select>
          </label>
          <div className="ops-schedule-editor__dates">
            <label>
              Batas closing / titip
              <input
                type="date"
                value={form.closingDate}
                max={form.departureDate || undefined}
                onChange={(event) => setForm({ ...form, closingDate: event.target.value })}
                required
              />
            </label>
            <label>
              Tanggal keberangkatan
              <input
                type="date"
                value={form.departureDate}
                min={form.closingDate || undefined}
                onChange={(event) => setForm({ ...form, departureDate: event.target.value })}
                required
              />
            </label>
            <label>
              Estimasi tiba (opsional)
              <input
                type="date"
                value={form.estimatedArrivalDate}
                min={form.departureDate || undefined}
                onChange={(event) => setForm({ ...form, estimatedArrivalDate: event.target.value })}
              />
            </label>
          </div>
          <label>
            Status jadwal
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as ScheduleStatus })
              }
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Keterangan untuk pelanggan (opsional)
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={500}
              rows={3}
              placeholder="Contoh: Paket yang masuk setelah closing akan ikut keberangkatan berikutnya."
            />
          </label>
          <label className="ops-checkbox">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
            />
            Tampilkan jadwal ini di website publik
          </label>
          <div className="ops-content-editor__actions">
            <button type="submit" className="ops-button ops-button--primary" disabled={saving}>
              <Send size={16} aria-hidden="true" />
              {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan jadwal"}
            </button>
            {editingId && (
              <button type="button" className="ops-button ops-button--quiet" onClick={resetForm}>
                Batal mengubah
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="ops-content-notice">
          Hanya owner yang dapat membuat dan menerbitkan jadwal pengiriman.
        </p>
      )}

      <section className="ops-section">
        <div className="ops-section__heading">
          <div>
            <p className="ops-eyebrow">JADWAL TERSIMPAN</p>
            <h2>Batch & jadwal</h2>
          </div>
          <span className="ops-content-count">{schedules.length} jadwal</span>
        </div>
        {loading ? (
          <p className="ops-empty">Memuat jadwal...</p>
        ) : schedules.length === 0 ? (
          <p className="ops-empty">Belum ada jadwal pengiriman. Buat jadwal untuk ditampilkan.</p>
        ) : (
          <div className="ops-schedule-list">
            {schedules.map((schedule) => (
              <article className="ops-schedule-item" key={schedule.id}>
                <div className="ops-schedule-item__content">
                  <div className="ops-schedule-item__meta">
                    <span
                      className={
                        schedule.is_published
                          ? "ops-content-status ops-content-status--published"
                          : "ops-content-status"
                      }
                    >
                      {schedule.is_published ? "Tayang di website" : "Draft / disembunyikan"}
                    </span>
                    <span>{statusLabels[schedule.status]}</span>
                  </div>
                  <h3>{schedule.title}</h3>
                  <p>{schedule.destination}</p>
                  <dl className="ops-schedule-item__dates">
                    <div>
                      <dt>Closing</dt>
                      <dd>{formatScheduleDate(schedule.closing_date)}</dd>
                    </div>
                    <div>
                      <dt>Berangkat</dt>
                      <dd>{formatScheduleDate(schedule.departure_date)}</dd>
                    </div>
                    {schedule.estimated_arrival_date && (
                      <div>
                        <dt>Estimasi tiba</dt>
                        <dd>{formatScheduleDate(schedule.estimated_arrival_date)}</dd>
                      </div>
                    )}
                  </dl>
                  {schedule.description && <p>{schedule.description}</p>}
                </div>
                {isOwner && (
                  <div className="ops-schedule-item__actions">
                    <button
                      type="button"
                      className="ops-button ops-button--quiet"
                      onClick={() => editSchedule(schedule)}
                    >
                      <Pencil size={15} aria-hidden="true" /> Ubah
                    </button>
                    <button
                      type="button"
                      className="ops-button ops-button--quiet"
                      onClick={() => void togglePublication(schedule)}
                      disabled={saving}
                    >
                      {schedule.is_published ? (
                        <EyeOff size={15} aria-hidden="true" />
                      ) : (
                        <Eye size={15} aria-hidden="true" />
                      )}
                      {schedule.is_published ? "Tarik" : "Terbitkan"}
                    </button>
                    <button
                      type="button"
                      className="ops-button ops-button--quiet ops-button--danger"
                      onClick={() => void deleteSchedule(schedule)}
                      disabled={saving}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Hapus
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="ops-schedule-footer">
        <CalendarDays size={15} aria-hidden="true" /> Jadwal publik otomatis tidak ditampilkan lagi
        setelah tanggal keberangkatan terlewati.
      </p>
    </>
  );
}
