import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/operations-api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk | ELKANA JASTIP" },
      {
        name: "description",
        content: "Masuk ke akun ELKANA JASTIP.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      await apiRequest<{ user: { id: string; email: string; role: "owner" | "admin" } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        },
      );
      await navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-screen__brand">
        <Link to="/" className="login-screen__brand-lockup" aria-label="ELKANA JASTIP — Beranda">
          <img src="/logo.png" alt="" />
          <span>
            <strong>ELKANA JASTIP</strong>
            <small>CEPAT · AMAN · MURAH</small>
          </span>
        </Link>
        <div className="login-screen__intro">
          <p className="login-screen__eyebrow">AKUN ELKANA</p>
          <h1>Setiap paket, satu langkah lebih dekat.</h1>
          <p>Kelola penerimaan, pembayaran, dan pengambilan paket ELKANA dalam satu ruang kerja.</p>
        </div>
        <div className="login-screen__promise">
          <span>
            <PackageCheck aria-hidden="true" />
          </span>
          <p>Pengiriman mingguan dari Surabaya menuju Flores.</p>
        </div>
        <div className="login-screen__decoration" aria-hidden="true" />
      </section>

      <section className="login-screen__form-panel">
        <div className="login-screen__form-content">
          <p className="login-screen__eyebrow">RUANG OPERASIONAL</p>
          <h2>Masuk ke dashboard</h2>
          <p className="login-screen__description">Gunakan akun owner atau admin ELKANA.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Kata sandi
              </label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                required
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/hubungi-kami"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Hubungi owner
              </Link>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting ? "Memeriksa akun..." : "Masuk ke dashboard"}
            </Button>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </form>

          <p className="login-screen__signup">
            Akses hanya untuk tim operasional. <Link to="/hubungi-kami">Hubungi owner</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
