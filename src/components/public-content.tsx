import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Clock3, MapPin, Megaphone, Ship, Star } from "lucide-react";

import { apiRequest, formatDate } from "@/lib/operations-api";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

type ShippingSchedule = {
  id: string;
  title: string;
  destination: string;
  closing_date: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  status: "collecting" | "closing_soon" | "closed" | "in_transit" | "arrived";
  description: string;
};

const shippingScheduleStatusLabels: Record<ShippingSchedule["status"], string> = {
  collecting: "Penerimaan dibuka",
  closing_soon: "Segera closing",
  closed: "Penerimaan ditutup",
  in_transit: "Dalam perjalanan",
  arrived: "Sudah tiba",
};

function formatShippingScheduleDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function PublicShippingScheduleSection({ compact = false }: { compact?: boolean }) {
  const [schedules, setSchedules] = useState<ShippingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ schedules: ShippingSchedule[] }>("/api/public/shipping-schedules")
      .then(({ schedules: items }) => {
        if (active) setSchedules(items);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? `Jadwal pengiriman gagal dimuat: ${cause.message}`
              : "Jadwal pengiriman gagal dimuat.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className={`public-shipping-schedule${compact ? " public-shipping-schedule--compact" : ""}`}
      aria-labelledby="public-shipping-schedule-title"
    >
      <div className="public-shipping-schedule__heading">
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          JADWAL & CLOSING
        </span>
        <h2 id="public-shipping-schedule-title">Batch pengiriman</h2>
      </div>
      {loading ? (
        <p className="public-shipping-schedule__state" aria-live="polite">
          Memuat jadwal pengiriman...
        </p>
      ) : error ? (
        <p className="public-shipping-schedule__state" role="alert">
          {error}
        </p>
      ) : schedules.length === 0 ? (
        <p className="public-shipping-schedule__state">
          Belum ada jadwal yang diterbitkan. Hubungi admin untuk memastikan jadwal terdekat.
        </p>
      ) : (
        <div className="public-shipping-schedule__list">
          {schedules.slice(0, compact ? 2 : 3).map((schedule) => (
            <article className="public-shipping-schedule__item" key={schedule.id}>
              <div className="public-shipping-schedule__item-heading">
                <div>
                  <span className="public-shipping-schedule__status">
                    {shippingScheduleStatusLabels[schedule.status]}
                  </span>
                  <h3>{schedule.title}</h3>
                </div>
                <span className="public-shipping-schedule__destination">
                  <MapPin size={13} aria-hidden="true" /> {schedule.destination}
                </span>
              </div>
              <dl className="public-shipping-schedule__dates">
                <div>
                  <dt>
                    <Clock3 size={13} aria-hidden="true" /> Closing titip
                  </dt>
                  <dd>{formatShippingScheduleDate(schedule.closing_date)}</dd>
                </div>
                <div>
                  <dt>
                    <Ship size={13} aria-hidden="true" /> Berangkat
                  </dt>
                  <dd>{formatShippingScheduleDate(schedule.departure_date)}</dd>
                </div>
                {schedule.estimated_arrival_date && (
                  <div>
                    <dt>
                      <MapPin size={13} aria-hidden="true" /> Estimasi tiba
                    </dt>
                    <dd>{formatShippingScheduleDate(schedule.estimated_arrival_date)}</dd>
                  </div>
                )}
              </dl>
              {schedule.description && (
                <p className="public-shipping-schedule__description">{schedule.description}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ announcements: Announcement[] }>("/api/public/announcements")
      .then(({ announcements: latest }) => {
        if (active) setAnnouncements(latest);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? `Informasi owner gagal dimuat: ${cause.message}`
              : "Informasi owner gagal dimuat.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="public-announcement" aria-labelledby="public-announcement-title">
      <div className="container public-announcement__inner">
        <div className="public-announcement__label">
          <span>
            <Megaphone size={17} aria-hidden="true" />
            INFO DARI OWNER
          </span>
          <h2 id="public-announcement-title">Informasi terbaru</h2>
        </div>
        <div className="public-announcement__content" aria-live="polite">
          {loading && <p>Memuat informasi terbaru...</p>}
          {error && <p role="status">{error}</p>}
          {!loading && !error && announcements.length === 0 && (
            <p>Belum ada pemberitahuan baru. Informasi terbaru akan muncul di sini.</p>
          )}
          {announcements.map((announcement) => (
            <article className="public-announcement__item" key={announcement.id}>
              <div>
                <h3>{announcement.title}</h3>
                <p>{announcement.body}</p>
              </div>
              <time dateTime={announcement.created_at}>{formatDate(announcement.created_at)}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection({ whatsappLink }: { whatsappLink: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ reviews: PublicReview[] }>("/api/public/reviews")
      .then(({ reviews: published }) => {
        if (active) setReviews(published);
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? `Ulasan gagal dimuat: ${cause.message}`
              : "Ulasan gagal dimuat.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>("/api/public/reviews", {
        method: "POST",
        body: JSON.stringify({
          authorName: formData.get("authorName"),
          rating,
          body: formData.get("reviewBody"),
        }),
      });
      form.reset();
      setRating(5);
      setSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section reviews-section" aria-labelledby="reviews-title">
      <div className="container">
        <div className="reviews-heading">
          <div>
            <p className="eyebrow">CERITA PELANGGAN</p>
            <h2 className="section-title" id="reviews-title">
              Ulasan yang berarti.
            </h2>
            <p className="section-description">
              Pernah menggunakan layanan ELKANA? Ceritakan pengalamanmu untuk membantu pelanggan
              lainnya.
            </p>
          </div>
          <div
            className="reviews-heading__rating"
            aria-label="Sistem penilaian satu sampai lima bintang"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <Star key={value} size={19} fill="currentColor" aria-hidden="true" />
            ))}
            <span>Rating 1–5 bintang</span>
          </div>
        </div>

        <div className="reviews-layout">
          <section className="reviews-list" aria-label="Ulasan pelanggan yang disetujui">
            <div className="reviews-list__heading">
              <h3>Ulasan pelanggan</h3>
              {!loading && <span>{reviews.length} ulasan</span>}
            </div>
            {loading && <p className="reviews-empty">Memuat ulasan...</p>}
            {loadError && (
              <p className="reviews-empty" role="alert">
                {loadError}
              </p>
            )}
            {!loading && reviews.length === 0 && (
              <p className="reviews-empty">
                Belum ada ulasan yang dipublikasikan. Ulasan akan tampil setelah ditinjau owner.
              </p>
            )}
            {reviews.map((review) => (
              <article className="review-item" key={review.id}>
                <div className="review-item__top">
                  <strong>{review.author_name}</strong>
                  <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
                </div>
                <span
                  className="review-item__stars"
                  role="img"
                  aria-label={`${review.rating} dari 5 bintang`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={15}
                      fill={value <= review.rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <p>{review.body}</p>
              </article>
            ))}
          </section>

          <form className="review-form" onSubmit={submitReview}>
            <p className="eyebrow">BAGIKAN PENGALAMAN</p>
            <h3>Tulis ulasan</h3>
            <fieldset className="review-form__rating">
              <legend>Penilaian</legend>
              <div className="review-form__stars" role="group" aria-label="Pilih rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} bintang`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                  >
                    <Star
                      size={25}
                      fill={value <= rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                ))}
                <span>{rating} / 5</span>
              </div>
            </fieldset>
            <label>
              Nama
              <input name="authorName" autoComplete="name" required minLength={2} maxLength={80} />
            </label>
            <label>
              Ceritakan pengalamanmu
              <textarea name="reviewBody" required minLength={10} maxLength={1000} rows={4} />
            </label>
            {error && (
              <p className="review-form__message review-form__message--error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="review-form__message review-form__message--success" role="status">
                {success}
              </p>
            )}
            <button type="submit" className="review-form__submit" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim ulasan"}
              {!submitting && <ArrowRight size={16} aria-hidden="true" />}
            </button>
            <p className="review-form__note">
              Ulasan diperiksa owner sebelum ditampilkan. Satu alamat jaringan dapat mengirim
              maksimal tiga ulasan per jam.
            </p>
            <a
              className="review-form__whatsapp"
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
            >
              Ada pertanyaan? Hubungi owner via WhatsApp
            </a>
          </form>
        </div>
      </div>
    </section>
  );
}
