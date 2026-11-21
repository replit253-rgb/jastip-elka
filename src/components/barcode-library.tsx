import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Printer, RotateCcw, ScanLine } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { PageHeading, PackageStatus } from "@/components/operations-dashboard";
import { useStaff } from "@/components/operations-dashboard-context";
import { downloadBarcodePng } from "@/lib/barcode";
import { apiRequest, formatDate, formatRupiah, type PackageRecord } from "@/lib/operations-api";

type BarcodePackage = PackageRecord & { barcodeToken: string };
type BarcodePageResult = {
  packages: BarcodePackage[];
  hasMore: boolean;
  nextOffset: number;
};

export function BarcodeLibraryPage() {
  const { role } = useStaff();
  const isOwner = role === "owner";
  const [archived, setArchived] = useState(false);
  const [packages, setPackages] = useState<BarcodePackage[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printWhenReady, setPrintWhenReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setPackages([]);
    setOffset(0);
    setHasMore(false);
    const query = new URLSearchParams({ limit: "30", offset: "0", archived: String(archived) });
    apiRequest<BarcodePageResult>(`/api/packages?${query}`)
      .then((result) => {
        if (!active) return;
        setPackages(result.packages);
        setOffset(result.nextOffset);
        setHasMore(result.hasMore);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Daftar barcode gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [archived, reloadKey]);

  useEffect(() => {
    if (!printWhenReady || loading || loadingMore || printing || hasMore) return;
    const frame = window.requestAnimationFrame(() => {
      window.print();
      setPrintWhenReady(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasMore, loading, loadingMore, packages, printWhenReady, printing]);

  async function loadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const query = new URLSearchParams({
        limit: "30",
        offset: String(offset),
        archived: String(archived),
      });
      const result = await apiRequest<BarcodePageResult>(`/api/packages?${query}`);
      setPackages((current) => [...current, ...result.packages]);
      setOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Barcode berikutnya gagal dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function printAll() {
    if (printing || loading || packages.length === 0) return;
    setError("");
    setPrinting(true);
    setPrintWhenReady(true);
    setLoadingMore(true);
    const allPackages = [...packages];
    let nextOffset = offset;
    let more = hasMore;
    try {
      while (more) {
        const query = new URLSearchParams({
          limit: "100",
          offset: String(nextOffset),
          archived: String(archived),
        });
        const result = await apiRequest<BarcodePageResult>(`/api/packages?${query}`);
        allPackages.push(...result.packages);
        nextOffset = result.nextOffset;
        more = result.hasMore;
      }
      setPackages(allPackages);
      setOffset(nextOffset);
      setHasMore(false);
    } catch (cause) {
      setPrintWhenReady(false);
      setError(
        cause instanceof Error ? cause.message : "Semua barcode gagal dimuat untuk dicetak.",
      );
    } finally {
      setLoadingMore(false);
      setPrinting(false);
    }
  }

  function downloadBarcode(item: BarcodePackage) {
    try {
      downloadBarcodePng(`barcode-canvas-${item.id}`, item.tracking_code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Barcode gagal diunduh.");
    }
  }

  async function restorePackage(item: BarcodePackage) {
    setError("");
    try {
      await apiRequest<void>(`/api/packages/${item.id}/restore`, { method: "PATCH" });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paket gagal dipulihkan.");
    }
  }

  return (
    <div className="ops-barcode-library">
      <PageHeading
        eyebrow="LABEL PAKET"
        title="Daftar barcode"
        description="Unduh barcode sebagai PNG atau cetak label paket. Barcode hanya aktif untuk paket yang tidak diarsipkan."
      >
        <div className="ops-barcode-library__heading-actions">
          <Link className="ops-button ops-button--quiet" to="/dashboard/scan">
            <ScanLine size={16} aria-hidden="true" /> Buka pemindai
          </Link>
          <button
            className="ops-button ops-button--primary"
            type="button"
            onClick={() => void printAll()}
            disabled={loading || loadingMore || printing || packages.length === 0}
          >
            <Printer size={16} aria-hidden="true" /> {printing ? "Menyiapkan..." : "Cetak semua"}
          </button>
        </div>
      </PageHeading>

      {isOwner && (
        <div className="ops-filter-tabs" role="group" aria-label="Filter barcode">
          <button
            type="button"
            className={!archived ? "is-active" : ""}
            onClick={() => setArchived(false)}
          >
            Aktif
          </button>
          <button
            type="button"
            className={archived ? "is-active" : ""}
            onClick={() => setArchived(true)}
          >
            Arsip
          </button>
        </div>
      )}

      {error && (
        <p className="ops-message ops-message--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="ops-empty" aria-live="polite">
          Memuat barcode...
        </p>
      ) : packages.length === 0 ? (
        <p className="ops-empty">
          {archived ? "Belum ada barcode dalam arsip." : "Belum ada barcode yang dibuat."}
        </p>
      ) : (
        <div className="ops-barcode-grid">
          {packages.map((item) => (
            <article
              className={`ops-barcode-card${item.archived_at ? " ops-barcode-card--archived" : ""}`}
              key={item.id}
            >
              <div className="ops-barcode-card__heading">
                <div>
                  <p className="ops-eyebrow">{item.tracking_code}</p>
                  <h2>{item.recipient_name}</h2>
                </div>
                {item.archived_at ? (
                  <span className="ops-content-status">Diarsipkan</span>
                ) : (
                  <PackageStatus item={item} />
                )}
              </div>
              <div className="ops-barcode-card__qr">
                <QRCodeCanvas
                  id={`barcode-canvas-${item.id}`}
                  value={item.barcodeToken}
                  size={512}
                  level="M"
                  title={`Barcode ${item.tracking_code}`}
                />
              </div>
              <dl className="ops-barcode-card__details">
                <div>
                  <dt>Tujuan</dt>
                  <dd>{item.destination}</dd>
                </div>
                <div>
                  <dt>Berat</dt>
                  <dd>{Number(item.weight_kg).toLocaleString("id-ID")} kg</dd>
                </div>
                <div>
                  <dt>Tagihan</dt>
                  <dd>{formatRupiah(item.total_price)}</dd>
                </div>
                <div>
                  <dt>Dibuat</dt>
                  <dd>{formatDate(item.created_at)}</dd>
                </div>
              </dl>
              <div className="ops-barcode-card__actions">
                <button
                  className="ops-button ops-button--quiet"
                  type="button"
                  onClick={() => downloadBarcode(item)}
                >
                  <Download size={15} aria-hidden="true" /> Unduh PNG
                </button>
                {item.archived_at && isOwner && (
                  <button
                    className="ops-button ops-button--quiet"
                    type="button"
                    onClick={() => void restorePackage(item)}
                  >
                    <RotateCcw size={15} aria-hidden="true" /> Pulihkan paket
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="ops-barcode-library__more">
          <button
            className="ops-button ops-button--outline"
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? "Memuat..." : "Muat barcode berikutnya"}
          </button>
        </div>
      )}
    </div>
  );
}
