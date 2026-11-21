import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  BadgeDollarSign,
  Boxes,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Megaphone,
  PackagePlus,
  QrCode,
  ScanLine,
  Settings2,
  Star,
} from "lucide-react";

import { DashboardContext, type StaffUser } from "@/components/operations-dashboard-context";
import { apiRequest, type PackageRecord } from "@/lib/operations-api";

export function PackageStatus({ item }: { item: PackageRecord }) {
  const status = item.collected_at
    ? { label: "Diambil", color: "done" }
    : item.paid_at
      ? { label: "Siap diambil", color: "ready" }
      : item.verified_at
        ? { label: "Menunggu pembayaran", color: "waiting" }
        : { label: "Belum diverifikasi", color: "waiting" };
  return <span className={`ops-status ops-status--${status.color}`}>{status.label}</span>;
}

const navigation = [
  { to: "/dashboard", label: "Monitor paket", icon: Boxes },
  { to: "/dashboard/paket-baru", label: "Input paket", icon: PackagePlus },
  { to: "/dashboard/barcode", label: "Daftar barcode", icon: QrCode },
  { to: "/dashboard/scan", label: "Scan barcode", icon: ScanLine },
  { to: "/dashboard/pembayaran", label: "Pembayaran", icon: BadgeDollarSign },
  { to: "/dashboard/informasi", label: "Informasi owner", icon: Megaphone },
  { to: "/dashboard/ulasan", label: "Moderasi ulasan", icon: Star },
  { to: "/dashboard/pengaturan", label: "Pengaturan harga", icon: Settings2 },
] as const;

export function OperationsDashboard() {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ user: StaffUser }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Sesi login tidak tersedia.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setError("");
    try {
      await apiRequest<void>("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal keluar dari akun.");
    }
  }

  if (loading) {
    return (
      <main className="ops-loading" aria-live="polite">
        Memeriksa sesi...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="ops-login-required">
        <img src="/logo.png" alt="" />
        <p className="ops-eyebrow">RUANG OPERASIONAL</p>
        <h1>Masuk untuk membuka dashboard</h1>
        <p>{error || "Sesi Anda sudah berakhir. Silakan masuk dengan akun owner atau admin."}</p>
        <Link className="ops-button ops-button--primary" to="/login">
          Ke halaman masuk <ChevronRight size={17} />
        </Link>
      </main>
    );
  }

  return (
    <DashboardContext.Provider value={{ user }}>
      <div className="ops-shell">
        <aside className="ops-sidebar">
          <Link to="/" className="ops-brand" aria-label="ELKANA JASTIP, kembali ke beranda">
            <img src="/logo.png" alt="" />
            <span>
              <strong>ELKANA</strong>
              <small>RUANG OPERASIONAL</small>
            </span>
          </Link>

          <p className="ops-nav-label">OPERASIONAL</p>
          <nav className="ops-nav" aria-label="Navigasi dashboard">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                {...(to === "/dashboard" ? { activeOptions: { exact: true } } : {})}
                className="ops-nav__link"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                <ChevronRight className="ops-nav__arrow" size={14} aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <div className="ops-sidebar__bottom">
            <Link to="/" className="ops-back-link">
              <ArrowLeftRight size={16} aria-hidden="true" />
              Kembali ke website
            </Link>
          </div>
        </aside>

        <div className="ops-main">
          <header className="ops-topbar">
            <div className="ops-topbar__label">
              <span className="ops-live-dot" />
              Sistem operasional
            </div>
            <div className="ops-user">
              <span className="ops-user__avatar">
                <CircleUserRound size={19} aria-hidden="true" />
              </span>
              <span className="ops-user__details">
                <strong>{user.email}</strong>
                <small>{user.role === "owner" ? "Owner" : "Admin"}</small>
              </span>
              <button type="button" className="ops-logout" onClick={logout} aria-label="Keluar">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          </header>
          {error && (
            <p className="ops-banner ops-banner--error" role="alert">
              {error}
            </p>
          )}
          <main className="ops-content">
            <Outlet />
          </main>
          <footer className="ops-footer">
            <span>ELKANA JASTIP · INTERNAL</span>
            <span>
              <ArrowDownToLine size={13} aria-hidden="true" /> Tarif dihitung saat paket didaftarkan
            </span>
          </footer>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="ops-page-heading">
      <div>
        <p className="ops-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="ops-page-heading__description">{description}</p>
      </div>
      {children}
    </div>
  );
}
