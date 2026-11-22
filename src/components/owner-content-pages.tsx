import { useEffect, useState, type FormEvent } from "react";
import { Check, CircleAlert, Eye, EyeOff, Pencil, Send, Star, Trash2, X } from "lucide-react";

import { useStaff } from "@/components/operations-dashboard-context";
import { apiRequest, formatDate } from "@/lib/operations-api";
import { PageHeading } from "@/components/operations-dashboard";

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type ReviewStatus = "pending" | "approved" | "rejected";
type Review = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  moderated_at: string | null;
  created_at: string;
};

function ContentError({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className="ops-message ops-message--error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      {children}
    </p>
  );
}

function ContentSuccess({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className="ops-message ops-message--success" role="status">
      <Check size={17} aria-hidden="true" />
      {children}
    </p>
  );
}

export function AnnouncementsPage() {
  const user = useStaff();
  const isOwner = user.role === "owner";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ announcements: Announcement[] }>("/api/announcements")
      .then(({ announcements: items }) => {
        if (active) setAnnouncements(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Informasi gagal dimuat.");
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
    setTitle("");
    setBody("");
    setIsPublished(true);
  }

  function editAnnouncement(announcement: Announcement) {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setBody(announcement.body);
    setIsPublished(announcement.is_published);
    setError("");
    setSuccess("");
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = JSON.stringify({ title, body, isPublished });
      if (editingId) {
        await apiRequest(`/api/announcements/${editingId}`, { method: "PUT", body: payload });
        setSuccess("Informasi berhasil diperbarui.");
      } else {
        await apiRequest("/api/announcements", { method: "POST", body: payload });
        setSuccess(
          isPublished ? "Informasi berhasil diterbitkan." : "Draft informasi berhasil disimpan.",
        );
      }
      resetForm();
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Informasi gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnnouncement(announcement: Announcement) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !announcement.is_published }),
      });
      setSuccess(
        announcement.is_published ? "Informasi ditarik dari website." : "Informasi diterbitkan.",
      );
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status informasi gagal diperbarui.");
    }
  }

  async function deleteAnnouncement(announcement: Announcement) {
    if (!window.confirm(`Hapus permanen informasi "${announcement.title}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest<void>(`/api/announcements/${announcement.id}`, { method: "DELETE" });
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
      if (editingId === announcement.id) resetForm();
      setSuccess("Informasi berhasil dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Informasi gagal dihapus.");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="KOMUNIKASI ELKANA"
        title="Informasi owner"
        description="Pemberitahuan yang diterbitkan owner akan tampil pada beranda website."
      />
      <ContentError>{error}</ContentError>
      <ContentSuccess>{success}</ContentSuccess>
      {isOwner ? (
        <form className="ops-form ops-content-editor" onSubmit={saveAnnouncement}>
          <div className="ops-form__intro">
            <h2>{editingId ? "Ubah informasi" : "Tulis informasi baru"}</h2>
            <p>Gunakan informasi singkat dan jelas untuk pelanggan ELKANA.</p>
          </div>
          <label>
            Judul informasi
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={4}
              maxLength={120}
              required
            />
          </label>
          <label>
            Isi informasi
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={5}
              required
            />
          </label>
          <label className="ops-checkbox">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
            />
            Terbitkan pada website setelah disimpan
          </label>
          <div className="ops-content-editor__actions">
            <button type="submit" className="ops-button ops-button--primary" disabled={saving}>
              <Send size={16} aria-hidden="true" />
              {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan informasi"}
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
          Hanya owner yang dapat membuat dan menerbitkan informasi. Anda dapat melihat seluruh
          riwayat pengumuman di bawah.
        </p>
      )}

      <section className="ops-section">
        <div className="ops-section__heading">
          <div>
            <p className="ops-eyebrow">ARSIP PEMBERITAHUAN</p>
            <h2>Informasi yang tersimpan</h2>
          </div>
          <span className="ops-content-count">{announcements.length} informasi</span>
        </div>
        {loading ? (
          <p className="ops-empty">Memuat informasi...</p>
        ) : announcements.length === 0 ? (
          <p className="ops-empty">Belum ada informasi yang dibuat.</p>
        ) : (
          <div className="ops-announcement-list">
            {announcements.map((announcement) => (
              <article className="ops-announcement" key={announcement.id}>
                <div className="ops-announcement__body">
                  <div className="ops-announcement__meta">
                    <span
                      className={
                        announcement.is_published
                          ? "ops-content-status ops-content-status--published"
                          : "ops-content-status"
                      }
                    >
                      {announcement.is_published ? "Tayang di website" : "Draft / disembunyikan"}
                    </span>
                    <time dateTime={announcement.updated_at}>
                      {formatDate(announcement.updated_at)}
                    </time>
                  </div>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.body}</p>
                </div>
                {isOwner && (
                  <div className="ops-announcement__actions">
                    <button
                      type="button"
                      className="ops-button ops-button--quiet"
                      onClick={() => editAnnouncement(announcement)}
                    >
                      <Pencil size={15} aria-hidden="true" /> Ubah
                    </button>
                    <button
                      type="button"
                      className="ops-button ops-button--quiet"
                      onClick={() => void toggleAnnouncement(announcement)}
                    >
                      {announcement.is_published ? (
                        <EyeOff size={15} aria-hidden="true" />
                      ) : (
                        <Eye size={15} aria-hidden="true" />
                      )}
                      {announcement.is_published ? "Tarik" : "Terbitkan"}
                    </button>
                    <button
                      type="button"
                      className="ops-button ops-button--quiet ops-button--danger"
                      onClick={() => void deleteAnnouncement(announcement)}
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
    </>
  );
}

export function ReviewModerationPage() {
  const user = useStaff();
  const isOwner = user.role === "owner";
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<{ reviews: Review[] }>(`/api/reviews?status=${status}`)
      .then(({ reviews: items }) => {
        if (active) setReviews(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Ulasan gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, status]);

  async function moderateReview(reviewId: string, nextStatus: "approved" | "rejected") {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/reviews/${reviewId}/moderation`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setSuccess(
        nextStatus === "approved" ? "Ulasan diterbitkan pada website." : "Ulasan ditolak.",
      );
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status ulasan gagal diperbarui.");
    }
  }

  function resetReviewForm() {
    setEditingReview(null);
    setReviewAuthor("");
    setReviewRating(5);
    setReviewBody("");
    setReviewStatus("pending");
  }

  function editReview(review: Review) {
    setEditingReview(review);
    setReviewAuthor(review.author_name);
    setReviewRating(review.rating);
    setReviewBody(review.body);
    setReviewStatus(review.status);
    setError("");
    setSuccess("");
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = JSON.stringify({
        authorName: reviewAuthor,
        rating: reviewRating,
        body: reviewBody,
        status: reviewStatus,
      });
      await apiRequest<{ review: Review }>(
        editingReview ? `/api/reviews/${editingReview.id}` : "/api/reviews",
        {
          method: editingReview ? "PUT" : "POST",
          body: payload,
        },
      );
      setSuccess(editingReview ? "Ulasan berhasil diperbarui." : "Ulasan berhasil ditambahkan.");
      setStatus(reviewStatus);
      resetReviewForm();
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(review: Review) {
    if (!window.confirm(`Hapus permanen ulasan dari ${review.author_name}?`)) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest<void>(`/api/reviews/${review.id}`, { method: "DELETE" });
      setReviews((current) => current.filter((item) => item.id !== review.id));
      if (editingReview?.id === review.id) resetReviewForm();
      setSuccess("Ulasan berhasil dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal dihapus.");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SUARA PELANGGAN"
        title="Moderasi ulasan"
        description="Ulasan pelanggan baru tidak tampil sampai disetujui owner."
      />
      <ContentError>{error}</ContentError>
      <ContentSuccess>{success}</ContentSuccess>
      {isOwner && (
        <form className="ops-form ops-content-editor" onSubmit={saveReview}>
          <div className="ops-form__intro">
            <h2>{editingReview ? "Ubah ulasan" : "Tambah ulasan"}</h2>
            <p>Owner dapat mengelola ulasan pelanggan dan status tampilnya.</p>
          </div>
          <label>
            Nama pelanggan
            <input
              value={reviewAuthor}
              onChange={(event) => setReviewAuthor(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Rating
            <select
              value={reviewRating}
              onChange={(event) => setReviewRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} dari 5 bintang
                </option>
              ))}
            </select>
          </label>
          <label>
            Isi ulasan
            <textarea
              value={reviewBody}
              onChange={(event) => setReviewBody(event.target.value)}
              minLength={10}
              maxLength={1000}
              rows={4}
              required
            />
          </label>
          <label>
            Status ulasan
            <select
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}
            >
              <option value="pending">Menunggu persetujuan</option>
              <option value="approved">Tayang di website</option>
              <option value="rejected">Ditolak</option>
            </select>
          </label>
          <div className="ops-content-editor__actions">
            <button type="submit" className="ops-button ops-button--primary" disabled={saving}>
              <Send size={16} aria-hidden="true" />
              {saving ? "Menyimpan..." : editingReview ? "Simpan perubahan" : "Tambah ulasan"}
            </button>
            {editingReview && (
              <button
                type="button"
                className="ops-button ops-button--quiet"
                onClick={resetReviewForm}
                disabled={saving}
              >
                <X size={15} aria-hidden="true" /> Batal mengubah
              </button>
            )}
          </div>
        </form>
      )}
      {!isOwner && (
        <p className="ops-content-notice">
          Anda dapat melihat ulasan, tetapi persetujuan dan penolakan hanya dapat dilakukan owner.
        </p>
      )}
      <div className="ops-filter-tabs" role="group" aria-label="Filter status ulasan">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={status === value ? "is-active" : ""}
            onClick={() => setStatus(value)}
          >
            {value === "pending" ? "Menunggu" : value === "approved" ? "Tayang" : "Ditolak"}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="ops-empty">Memuat ulasan...</p>
      ) : reviews.length === 0 ? (
        <p className="ops-empty">
          {status === "pending"
            ? "Belum ada ulasan yang menunggu persetujuan."
            : "Belum ada ulasan."}
        </p>
      ) : (
        <div className="ops-review-list">
          {reviews.map((review) => (
            <article className="ops-review" key={review.id}>
              <div className="ops-review__top">
                <div>
                  <h2>{review.author_name}</h2>
                  <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
                </div>
                <span className="ops-review__rating" aria-label={`${review.rating} dari 5 bintang`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={16}
                      fill={index < review.rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
              <p>{review.body}</p>
              {isOwner && (
                <div className="ops-review__actions">
                  {status !== "approved" && (
                    <button
                      type="button"
                      className="ops-button ops-button--primary"
                      onClick={() => void moderateReview(review.id, "approved")}
                    >
                      <Check size={15} aria-hidden="true" /> Setujui & tampilkan
                    </button>
                  )}
                  {status !== "rejected" && (
                    <button
                      type="button"
                      className="ops-button ops-button--quiet"
                      onClick={() => void moderateReview(review.id, "rejected")}
                    >
                      Tolak ulasan
                    </button>
                  )}
                  <button
                    type="button"
                    className="ops-button ops-button--quiet"
                    onClick={() => editReview(review)}
                  >
                    <Pencil size={15} aria-hidden="true" /> Ubah
                  </button>
                  <button
                    type="button"
                    className="ops-button ops-button--quiet ops-button--danger"
                    onClick={() => void deleteReview(review)}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Hapus
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
