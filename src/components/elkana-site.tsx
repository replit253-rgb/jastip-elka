import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Check,
  Clock3,
  Compass,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  Ship,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnnouncementSection, ReviewsSection } from "@/components/public-content";
import { apiRequest } from "@/lib/operations-api";

const ferryImage = "/1.jpeg";
const portImage = "/2.jpeg";
const nightLoadingImage = "/3.jpeg";
const cargoImage = "/4.jpeg";
const handoffImage = "/5.jpeg";

const whatsappNumber = "6281242613950";
const whatsappLink = `https://wa.me/${whatsappNumber}`;
const whatsappGroupLink = "https://chat.whatsapp.com/LdptOhLPpIdGNEH8LRJHjw?s=qt&p=a&iam=2";
const pickupPoints = [
  {
    name: "Bajawa",
    counter: "Loket MiniATM Elkana",
    address: "Depan IbeMart Bajawa",
  },
  {
    name: "Malanuza",
    counter: "Loket MiniATM Bujaita",
    address: "Pertigaan Malanuza – Maumbawa",
  },
  {
    name: "Aimere",
    counter: "Loket MiniATM Elkana",
    address: "Jembatan I Aimere",
  },
] as const;

const navigation = [
  { label: "Beranda", to: "/" },
  { label: "Tentang Kami", to: "/tentang-kami" },
  { label: "Layanan", to: "/layanan" },
  { label: "Galeri", to: "/galeri" },
  { label: "Tracking Paket", to: "/tracking-paket" },
  { label: "Masuk", to: "/login" },
  { label: "Hubungi Kami", to: "/hubungi-kami" },
] as const;

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand-lockup" aria-label="ELKANA JASTIP — Beranda">
      <img src="/logo.png" alt="Logo ELKANA JASTIP" className="brand-lockup__logo" />
      <span>
        <span className="brand-lockup__name">ELKANA JASTIP</span>
        {!compact && <span className="brand-lockup__tagline">CEPAT · AMAN · MURAH</span>}
      </span>
    </Link>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="site-notice">
        <span className="site-notice__mark">●</span>
        <span>Jadwal pengiriman mingguan</span>
        <span>·</span>
        <span>Surabaya — Ende — Flores</span>
      </div>
      <header className="site-header">
        <div className="site-header__inner">
          <BrandLockup />
          <nav className="primary-nav" aria-label="Navigasi utama">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="primary-nav__link"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button asChild className="header-contact" size="sm">
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              WhatsApp
            </a>
          </Button>
          <Button
            className="mobile-menu-button"
            variant="outline"
            size="icon"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Navigasi seluler">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="mobile-nav__link"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button asChild className="mt-2 w-full">
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden="true" />
                Hubungi via WhatsApp
              </a>
            </Button>
          </nav>
        )}
      </header>
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <BrandLockup />
            <p className="site-footer__copy">
              Belanja dari Surabaya, kirim dengan tenang menuju Bajawa, Malanuza, dan Aimere.
            </p>
          </div>
          <div>
            <h2 className="site-footer__heading">Jelajahi</h2>
            <div className="site-footer__links">
              {navigation.slice(0, 5).map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="site-footer__heading">Rute & Kontak</h2>
            <div className="site-footer__links">
              <span>Surabaya → Ende → Flores</span>
              <span>Bajawa · Malanuza · Aimere</span>
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                0812 4261 3950 <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} ELKANA JASTIP</span>
          <span>Perjalanan paket, lebih dekat ke rumah.</span>
        </div>
      </div>
    </footer>
  );
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="site-main">{children}</div>
      <SiteFooter />
    </>
  );
}

function PageIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro">
      <div className="container page-intro__inner">
        <div>
          <p className="eyebrow">{label}</p>
          <h1 className="page-intro__title">{title}</h1>
        </div>
        <p className="page-intro__description">{description}</p>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

type PublicBatch = {
  id: string;
  title: string;
  destination: string;
  created_at: string;
  items: { row_number: number; name: string; pcs: number }[];
};

export function BatchListSection() {
  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState("Bajawa");

  useEffect(() => {
    let active = true;
    apiRequest<{ batches: PublicBatch[] }>("/api/public/batches")
      .then((result) => {
        if (active) setBatches(result.batches);
      })
      .catch(() => {
        if (active) setBatches([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleBatches = batches.filter((batch) => batch.destination === destination);

  return (
    <section className="section batch-list-section" id="daftar-batch">
      <div className="container">
        <SectionHeading
          eyebrow="Daftar penerima paket"
          title="LIST PAKET PER BATCH"
          description="Cari nama penerima pada batch tujuanmu."
        />
        <div className="batch-list__tabs" role="tablist" aria-label="Lokasi tujuan batch">
          {["Bajawa", "Malanuza", "Aimere"].map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={destination === item}
              className={destination === item ? "is-active" : ""}
              onClick={() => setDestination(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="batch-list__state">Memuat daftar batch...</p>
        ) : visibleBatches.length ? (
          <div className="batch-list__groups">
            {visibleBatches.map((batch) => (
              <article className="batch-list__card" key={batch.id}>
                <h3>
                  LIST PAKET {batch.destination.toUpperCase()} {batch.title.toUpperCase()}
                </h3>
                <div className="batch-list__table-wrap">
                  <table className="batch-list__table">
                    <thead>
                      <tr>
                        <th>NO.</th>
                        <th>NAMA</th>
                        <th>PCS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.items.map((item) => (
                        <tr key={`${batch.id}-${item.row_number}`}>
                          <td>{item.row_number}</td>
                          <td>{item.name}</td>
                          <td>{item.pcs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="batch-list__state">Belum ada daftar paket untuk tujuan {destination}.</p>
        )}
      </div>
    </section>
  );
}

function PickupPointSection() {
  return (
    <section className="section section--paper pickup-points">
      <div className="container">
        <SectionHeading
          eyebrow="Pick up point"
          title="Titik pengambilan paket."
          description="Pilih lokasi pengambilan sesuai tujuan. Admin akan mengabari saat paket tiba dan siap diambil."
        />
        <div className="destination-grid">
          {pickupPoints.map((point) => (
            <article className="destination-card pickup-point" key={point.name}>
              <span className="step-card__number">LOKET {point.name.toUpperCase()}</span>
              <h3>{point.counter}</h3>
              <p>{point.address}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsappCommunitySection() {
  return (
    <section className="section section--paper community-section">
      <div className="container community-section__inner">
        <div className="community-section__qr">
          <img
            src="/grup-qr.png"
            alt="QR code untuk bergabung ke grup WhatsApp ELKANA JASTIP"
            loading="lazy"
          />
          <span>Scan di sini</span>
        </div>
        <div className="community-section__content">
          <p className="eyebrow">Terhubung dengan ELKANA</p>
          <h2 className="section-title">Gabung grup WhatsApp kami.</h2>
          <p className="section-description">
            Dapatkan informasi layanan dan terhubung dengan komunitas pelanggan ELKANA JASTIP.
          </p>
          <Button asChild size="lg" className="community-section__button">
            <a href={whatsappGroupLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              Gabung grup WhatsApp
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="eyebrow">Jastip Surabaya — Flores</p>
          <h1 className="display-title">
            Titip di Surabaya.
            <br />
            <em>Terima di Flores.</em>
          </h1>
          <p className="home-hero__description">
            Kirim belanjaan online ke tempat kumpul kami. Setiap pekan, paket berangkat menuju
            Bajawa, Malanuza, dan Aimere.
          </p>
          <div className="hero-actions">
            <Button asChild className="button-gold" size="lg">
              <Link to="/layanan">
                Kenali layanan <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="button-light-outline" size="lg">
              <Link to="/tracking-paket">
                <Search aria-hidden="true" /> Lacak paket
              </Link>
            </Button>
            <a className="hero-batch-link" href="#daftar-batch">
              <Box aria-hidden="true" /> Cek daftar batch
            </a>
          </div>
          <div className="hero-route-note">
            <span>RUTE</span>
            <strong>
              Surabaya <ArrowRight aria-hidden="true" /> Flores
            </strong>
            <span>Setiap minggu</span>
          </div>
        </div>
        <div className="home-hero__visual">
          <img
            src={ferryImage}
            alt="Kapal penumpang dan kargo melintasi laut"
            className="home-hero__image"
            fetchPriority="high"
          />
          <span className="hero-caption">Perjalanan laut · via Ende</span>
        </div>
      </section>

      <section className="container route-strip" aria-label="Rute pengiriman">
        <div>
          <p className="route-strip__label">Satu perjalanan, tiga tujuan</p>
          <p className="section-description">Kirim laut setiap pekan</p>
        </div>
        <div className="route-strip__flow">
          <span>Surabaya</span>
          <ArrowRight size={17} aria-hidden="true" />
          <span>Ende</span>
          <ArrowRight size={17} aria-hidden="true" />
          <span className="route-strip__destinations">Bajawa · Malanuza · Aimere</span>
        </div>
      </section>

      <AnnouncementSection />
      <BatchListSection />
      <PickupPointSection />
      <WhatsappCommunitySection />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Semudah itu"
            title="Dari keranjang belanja ke tanganmu."
            description="Pesan seperti biasa. Kami bantu mengumpulkan, mengirim, dan mengabari saat paket sudah siap diambil."
          />
          <div className="process-grid">
            {[
              {
                number: "01",
                title: "Belanja online",
                body: "Pilih toko online favoritmu dan kirim paket ke alamat kumpul admin di Surabaya.",
              },
              {
                number: "02",
                title: "Dikirim mingguan",
                body: "Paket yang terkumpul diberangkatkan bersama melalui laut, transit di Ende.",
              },
              {
                number: "03",
                title: "Ambil di tujuan",
                body: "Saat paket tiba, admin mengabari lokasi titik pengambilan yang sesuai tujuanmu.",
              },
            ].map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-card__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--burgundy">
        <div className="container">
          <SectionHeading
            eyebrow="Rute ELKANA"
            title="Dari Surabaya, menyapa Flores."
            description="Perjalanan laut menuju Ende menghubungkan paket dengan titik pengambilan di wilayah tujuan."
          />
          <div className="route-map">
            <div className="route-map__origin">
              <span>Tempat kumpul paket</span>
              <strong>Surabaya</strong>
            </div>
            <div className="route-map__arrow" aria-hidden="true">
              <Ship size={29} />
              <ArrowRight size={22} />
            </div>
            <div className="route-map__destinations">
              <span>Via Ende, menuju</span>
              <strong>Bajawa · Malanuza · Aimere</strong>
            </div>
          </div>
          <Link to="/tentang-kami" className="text-link mt-6">
            Kenali ELKANA <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container split-layout">
          <img
            src={handoffImage}
            alt="Petugas menyiapkan barang untuk dimuat ke kendaraan pengiriman"
            className="split-layout__image split-layout__image--handoff"
            loading="lazy"
          />
          <div>
            <SectionHeading
              eyebrow="Sampai di tujuan"
              title="Paketmu, tinggal selangkah lagi."
              description="Pantau contoh alur paket dan hubungi admin jika perlu bantuan untuk pengirimanmu."
            />
            <div className="hero-actions">
              <Button asChild>
                <Link to="/tracking-paket">
                  Cek tracking <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" /> Tanya admin
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <ReviewsSection whatsappLink={whatsappLink} />
    </main>
  );
}

export function AboutPage() {
  return (
    <main>
      <PageIntro
        label="Tentang ELKANA"
        title="Jarak boleh jauh. Urusan paket tetap dekat."
        description="ELKANA JASTIP membantu menghubungkan belanja online dari Surabaya dengan keluarga dan pelanggan di Bajawa, Malanuza, serta Aimere."
      />
      <section className="section">
        <div className="container split-layout">
          <div>
            <p className="eyebrow">Berangkat dari kebutuhan</p>
            <h2 className="section-title">Belanja dari kota, diterima dengan lebih mudah.</h2>
            <p className="section-description">
              Alur kami sederhana: paket dikirim ke tempat kumpul admin di Surabaya, disiapkan untuk
              keberangkatan mingguan, lalu diteruskan menuju Flores melalui Ende.
            </p>
            <div className="feature-list">
              <div className="feature-list__item">
                <BadgeCheck size={19} aria-hidden="true" />
                <span>Proses pengumpulan paket terpusat di Surabaya.</span>
              </div>
              <div className="feature-list__item">
                <Ship size={19} aria-hidden="true" />
                <span>Pengiriman antarpulau melalui laut dengan Kapal Dharma Rucitra 8.</span>
              </div>
              <div className="feature-list__item">
                <MapPin size={19} aria-hidden="true" />
                <span>Pengambilan diarahkan ke titik tujuan Bajawa, Malanuza, atau Aimere.</span>
              </div>
            </div>
          </div>
          <img
            src={portImage}
            alt="Kapal Dharma Rucitra bersandar di pelabuhan"
            className="split-layout__image split-layout__image--port"
            loading="lazy"
          />
        </div>
      </section>
      <section className="section section--paper">
        <div className="container">
          <SectionHeading
            eyebrow="Prinsip layanan"
            title="Cepat, aman, murah — seperti yang kami janjikan."
            description="Setiap paket mengikuti alur yang jelas dari tempat kumpul hingga siap diambil."
          />
          <div className="destination-grid">
            {[
              {
                title: "Teratur",
                body: "Paket dikumpulkan terlebih dahulu sebelum jadwal pengiriman mingguan.",
              },
              {
                title: "Terhubung",
                body: "Informasi kedatangan dan titik ambil disampaikan melalui admin.",
              },
              { title: "Dekat", body: "Tujuan pengiriman mencakup Bajawa, Malanuza, dan Aimere." },
            ].map((item) => (
              <article className="destination-card" key={item.title}>
                <Check size={19} className="text-primary" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ServicesPage() {
  return (
    <main>
      <PageIntro
        label="Layanan"
        title="Belanja online, kami bantu sampai Flores."
        description="Layanan pengumpulan dan pengiriman paket dari Surabaya untuk tujuan Bajawa, Malanuza, dan Aimere."
      />
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Cara kerja"
            title="Tiga langkah, satu perjalanan."
            description="Simpan informasi tujuan dengan benar saat memesan, lalu gunakan alamat kumpul admin untuk paketmu."
          />
          <div className="process-grid">
            {[
              {
                number: "01",
                title: "Kirim ke admin Surabaya",
                body: "Belanja paket online dan gunakan alamat tempat kumpul admin sebagai alamat penerima awal.",
              },
              {
                number: "02",
                title: "Paket berangkat via laut",
                body: "Paket dikonsolidasikan dan dikirim seminggu sekali menggunakan Kapal Dharma Rucitra 8 via Ende.",
              },
              {
                number: "03",
                title: "Ambil sesuai titik tujuan",
                body: "Paket yang tiba diteruskan ke titik pengambilan. Admin mengabari detail lokasinya.",
              },
            ].map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-card__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PickupPointSection />
      <WhatsappCommunitySection />
      <section className="section">
        <div className="container split-layout">
          <div>
            <p className="eyebrow">Jadwal rutin</p>
            <h2 className="section-title">Satu kali setiap minggu.</h2>
            <p className="section-description">
              Pengiriman dilakukan mingguan. Tanggal keberangkatan dan perkiraan tiba dapat berubah
              mengikuti perjalanan kapal serta kondisi pelabuhan.
            </p>
            <div className="feature-list">
              <div className="feature-list__item">
                <Clock3 size={19} aria-hidden="true" />
                <span>Hubungi admin untuk jadwal keberangkatan terdekat.</span>
              </div>
              <div className="feature-list__item">
                <PackageCheck size={19} aria-hidden="true" />
                <span>Pastikan nama penerima dan tujuan paket tertulis jelas.</span>
              </div>
            </div>
            <div className="hero-actions">
              <Button asChild>
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  Tanya jadwal <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
          <img
            src={cargoImage}
            alt="Muatan barang terikat di kendaraan di area pelabuhan"
            className="split-layout__image split-layout__image--loading"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}

export function GalleryPage() {
  return (
    <main>
      <PageIntro
        label="Galeri"
        title="Sebuah perjalanan, dari paket sampai tujuan."
        description="Gambaran perjalanan paket ELKANA dari tempat kumpul di Surabaya hingga titik pengambilan di Flores."
      />
      <section className="section">
        <div className="container">
          <div className="gallery-grid">
            <article className="gallery-card">
              <img
                src={portImage}
                alt="Kapal Dharma Rucitra bersandar di pelabuhan"
                className="gallery-card__image--port"
                loading="lazy"
              />
              <div className="gallery-card__caption">
                <span>Perjalanan laut</span>
                <h2>Kapal bersandar di pelabuhan</h2>
              </div>
            </article>
            <article className="gallery-card">
              <img
                src={nightLoadingImage}
                alt="Petugas memuat tumpukan paket ke kendaraan pada malam hari"
                className="gallery-card__image--night"
                loading="lazy"
              />
              <div className="gallery-card__caption">
                <span>Persiapan muatan</span>
                <h2>Paket dikumpulkan sebelum berangkat</h2>
              </div>
            </article>
            <article className="gallery-card">
              <img
                src={cargoImage}
                alt="Barang dan paket terikat di kendaraan pengiriman di pelabuhan"
                className="gallery-card__image--cargo"
                loading="lazy"
              />
              <div className="gallery-card__caption">
                <span>Menuju tujuan</span>
                <h2>Muatan siap melanjutkan perjalanan</h2>
              </div>
            </article>
          </div>
          <p className="demo-note mt-4">Foto ilustrasi untuk menggambarkan alur layanan.</p>
        </div>
      </section>
    </main>
  );
}

type TrackingRecord = {
  code: string;
  status: string;
  destination: string;
  location: string;
  events: { label: string; detail: string }[];
};

export function TrackingPage() {
  const [code, setCode] = useState("");
  const [searched, setSearched] = useState(false);
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    setCode(normalizedCode);
    setSearched(false);
    setRecord(null);
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<{ tracking: TrackingRecord | null }>(
        `/api/public/tracking/${encodeURIComponent(normalizedCode)}`,
      );
      setRecord(result.tracking);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status paket gagal dimuat.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <main>
      <PageIntro
        label="Tracking Paket"
        title="Cari tahu posisi paketmu."
        description="Masukkan nomor paket untuk melihat lokasi dan perjalanan paket tanpa informasi berat atau harga."
      />
      <section className="section">
        <div className="container tracking-layout">
          <div className="tracking-panel">
            <p className="eyebrow">Lacak paket</p>
            <h2>Nomor paketmu</h2>
            <p>Masukkan nomor tracking dari admin ELKANA untuk mencari status paket.</p>
            <form className="tracking-form" onSubmit={handleSubmit}>
              <Input
                className="tracking-input"
                aria-label="Nomor tracking paket"
                placeholder="Contoh: ELK-4E48D390F622"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                <Search aria-hidden="true" /> {loading ? "Mencari..." : "Lacak"}
              </Button>
            </form>
          </div>

          <div aria-live="polite">
            {loading ? (
              <section className="tracking-result">
                <p className="eyebrow">Sedang mencari</p>
                <h2 className="mt-4">Memeriksa status paket...</h2>
              </section>
            ) : error ? (
              <section className="tracking-result">
                <span className="tracking-result__status">Tracking tidak tersedia</span>
                <h2 className="mt-4">Status paket belum dapat dimuat.</h2>
                <p>{error}</p>
                <p>Silakan coba lagi atau hubungi admin ELKANA.</p>
              </section>
            ) : record ? (
              <section className="tracking-result">
                <span className="tracking-result__status">
                  <PackageCheck size={15} aria-hidden="true" /> {record.status}
                </span>
                <h2 className="mt-4">{record.code}</h2>
                <p>Tujuan: {record.destination}</p>
                <div className="tracking-result__meta">
                  <strong>Lokasi terakhir</strong>
                  <br />
                  {record.location}
                </div>
                <div className="timeline">
                  {record.events.map((item) => (
                    <div className="timeline__item" key={item.label}>
                      <span className="timeline__dot" />
                      <span>
                        <strong>{item.label}</strong>
                        <br />
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : searched ? (
              <section className="tracking-result">
                <span className="tracking-result__status">Nomor tidak ditemukan</span>
                <h2 className="mt-4">Belum ada hasil untuk {code.trim().toUpperCase()}.</h2>
                <p>Pastikan nomor benar atau tanyakan status paketmu kepada admin ELKANA.</p>
                <Button asChild className="mt-4">
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <MessageCircle aria-hidden="true" /> Hubungi admin
                  </a>
                </Button>
              </section>
            ) : (
              <section className="tracking-result">
                <p className="eyebrow">Perjalanan paket</p>
                <h2>Surabaya ke Flores, selangkah demi selangkah.</h2>
                <div className="feature-list">
                  <div className="feature-list__item">
                    <Box size={19} aria-hidden="true" />
                    <span>Paket diterima di tempat kumpul admin Surabaya.</span>
                  </div>
                  <div className="feature-list__item">
                    <Ship size={19} aria-hidden="true" />
                    <span>Dikirim mingguan via laut dan transit di Ende.</span>
                  </div>
                  <div className="feature-list__item">
                    <MapPin size={19} aria-hidden="true" />
                    <span>Diambil di titik Bajawa, Malanuza, atau Aimere.</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ContactPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const text = `Halo ELKANA JASTIP, saya ${name}. Tujuan paket: ${destination}. ${message}`;
    window.open(
      `${whatsappLink}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main>
      <PageIntro
        label="Hubungi Kami"
        title="Ada paket yang ingin ditanyakan?"
        description="Tanyakan jadwal, tujuan, atau detail pengambilan langsung kepada admin ELKANA."
      />
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-details">
            <div className="contact-detail">
              <MessageCircle size={19} aria-hidden="true" />
              <div>
                <strong>WhatsApp admin</strong>
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  0812 4261 3950 <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="contact-detail">
              <Compass size={19} aria-hidden="true" />
              <div>
                <strong>Rute layanan</strong>
                <span>Surabaya → Ende → Bajawa, Malanuza, Aimere</span>
              </div>
            </div>
            <div className="contact-detail">
              <Clock3 size={19} aria-hidden="true" />
              <div>
                <strong>Pengiriman</strong>
                <span>Seminggu sekali melalui jalur laut</span>
              </div>
            </div>
            <Button asChild className="w-fit">
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden="true" /> Chat langsung
              </a>
            </Button>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">Kirim pertanyaan</p>
              <h2 className="section-title">Mulai percakapan.</h2>
            </div>
            <div className="contact-form__row">
              <label htmlFor="contact-name">Nama</label>
              <input id="contact-name" name="name" placeholder="Nama kamu" required />
            </div>
            <div className="contact-form__row">
              <label htmlFor="contact-destination">Tujuan paket</label>
              <select id="contact-destination" name="destination" defaultValue="Bajawa" required>
                <option value="Bajawa">Bajawa</option>
                <option value="Malanuza">Malanuza</option>
                <option value="Aimere">Aimere</option>
              </select>
            </div>
            <div className="contact-form__row">
              <label htmlFor="contact-message">Pesan</label>
              <textarea
                id="contact-message"
                name="message"
                placeholder="Ceritakan yang ingin ditanyakan"
                required
              />
            </div>
            <Button type="submit" className="w-fit">
              Lanjutkan ke WhatsApp <ArrowUpRight aria-hidden="true" />
            </Button>
            <p className="form-note">Pesan akan dibuka di WhatsApp dan tidak disimpan di situs.</p>
          </form>
        </div>
      </section>
      <section className="section section--paper">
        <div className="container split-layout">
          <img
            src={handoffImage}
            alt="Petugas menyiapkan tumpukan barang untuk pengiriman"
            className="split-layout__image split-layout__image--handoff"
            loading="lazy"
          />
          <div>
            <p className="eyebrow">Titik pengambilan</p>
            <h2 className="section-title">Pilih tujuan, admin bantu arahkan.</h2>
            <p className="section-description">
              Paket yang tiba akan diambil di titik lokasi sesuai tujuan. Hubungi admin untuk
              memastikan lokasi dan informasi pengambilan paketmu.
            </p>
            <Link to="/tracking-paket" className="text-link mt-5">
              Lacak paket <ArrowDownRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
