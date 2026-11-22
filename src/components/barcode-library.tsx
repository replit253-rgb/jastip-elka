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

type BatchSummary = {
  id: string;
  title: string;
  destination: string;
  package_count: number;
  archived_package_count: number;
};

export function BarcodeLibraryPage() {
  const { role } = useStaff();
  const isOwner = role === "owner";
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchError, setBatchError] = useState("");
  const [archived, setArchived] = useState(false);
  const [packages, setPackages] = useState<BarcodePackage[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printWhenReady, setPrintWhenReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printOnlyIds, setPrintOnlyIds] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  useEffect(() => {
    let active = true;
    apiRequest<{ batches: BatchSummary[] }>("/api/batches")
      .then((result) => {
        if (active) setBatches(result.batches);
      })
      .catch((cause: unknown) => {
        if (active)
          setBatchError(cause instanceof Error ? cause.message : "Daftar batch gagal dimuat.");
      })
      .finally(() => {
        if (active) setBatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setPackages([]);
    setOffset(0);
    setHasMore(false);
    if (!selectedBatchId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    async function loadBatchPackages() {
      const allPackages: BarcodePackage[] = [];
      let nextOffset = 0;
      let hasMorePackages = true;
      while (hasMorePackages) {
        const query = new URLSearchParams({
          limit: "100",
          offset: String(nextOffset),
          archived: String(archived),
          batchId: selectedBatchId,
        });
        const result = await apiRequest<BarcodePageResult>(`/api/packages?${query}`);
        if (!result.packages.length && result.hasMore) {
          throw new Error("Daftar barcode batch tidak dapat dimuat seluruhnya.");
        }
        allPackages.push(...result.packages);
        nextOffset = result.nextOffset;
        hasMorePackages = result.hasMore;
      }
      if (!active) return;
      setPackages(allPackages);
      setOffset(nextOffset);
      setHasMore(false);
    }
    void loadBatchPackages()
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
  }, [archived, reloadKey, selectedBatchId]);

  useEffect(() => {
    if (
      !printWhenReady ||
      loading ||
      loadingMore ||
      printing ||
      (hasMore && printOnlyIds === null)
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      window.print();
      setPrintWhenReady(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasMore, loading, loadingMore, packages, printOnlyIds, printWhenReady, printing]);

  useEffect(() => {
    const resetPrintSelection = () => setPrintOnlyIds(null);
    window.addEventListener("afterprint", resetPrintSelection);
    return () => window.removeEventListener("afterprint", resetPrintSelection);
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const query = new URLSearchParams({
        limit: "30",
        offset: String(offset),
        archived: String(archived),
      });
      if (selectedBatchId) query.set("batchId", selectedBatchId);
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
    setPrintOnlyIds(null);
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
        if (selectedBatchId) query.set("batchId", selectedBatchId);
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

  function printPackages(ids: string[]) {
    if (ids.length === 0) return;
    setPrintOnlyIds(ids);
    setPrintWhenReady(true);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
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
          {selectedBatchId && (
            <>
              <button
                className="ops-button ops-button--primary"
                type="button"
                onClick={() => void printAll()}
                disabled={loading || loadingMore || printing || packages.length === 0}
              >
                <Printer size={16} aria-hidden="true" />{" "}
                {printing ? "Menyiapkan..." : "Cetak semua"}
              </button>
              <button
                className="ops-button ops-button--outline"
                type="button"
                onClick={() => printPackages(selectedIds)}
                disabled={loading || printing || selectedIds.length === 0}
              >
                <Printer size={16} aria-hidden="true" /> Cetak pilihan ({selectedIds.length})
              </button>
            </>
          )}
        </div>
      </PageHeading>

      {isOwner && (
        <div className="ops-filter-tabs" role="group" aria-label="Filter barcode">
          <button
            type="button"
            className={!archived ? "is-active" : ""}
            onClick={() => {
              setArchived(false);
              setSelectedIds([]);
            }}
          >
            Aktif
          </button>
          <button
            type="button"
            className={archived ? "is-active" : ""}
            onClick={() => {
              setArchived(true);
              setSelectedIds([]);
            }}
          >
            Arsip
          </button>
        </div>
      )}

      {(batchError || error) && (
        <p className="ops-message ops-message--error" role="alert">
          {batchError || error}
        </p>
      )}
      {!selectedBatchId ? (
        batchesLoading ? (
          <p className="ops-empty" aria-live="polite">
            Memuat batch...
          </p>
        ) : batches.length === 0 ? (
          <p className="ops-empty">Belum ada batch pengiriman.</p>
        ) : (
          <div className="ops-barcode-batches">
            {batches.map((batch) => {
              const packageCount = archived ? batch.archived_package_count : batch.package_count;
              return (
                <button
                  className="ops-barcode-batch-card"
                  key={batch.id}
                  type="button"
                  onClick={() => {
                    setSelectedIds([]);
                    setPrintOnlyIds(null);
                    setError("");
                    setSelectedBatchId(batch.id);
                  }}
                >
                  <span className="ops-eyebrow">{batch.destination}</span>
                  <strong>{batch.title}</strong>
                  <span>
                    {packageCount} {archived ? "barcode diarsipkan" : "barcode aktif"}
                  </span>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <>
          <section className="ops-barcode-batch-detail">
            <div>
              <p className="ops-eyebrow">{selectedBatch?.destination ?? "BATCH"}</p>
              <h2>{selectedBatch?.title ?? "Batch tidak ditemukan"}</h2>
            </div>
            <button
              className="ops-button ops-button--outline"
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setPrintOnlyIds(null);
                setError("");
                setSelectedBatchId("");
              }}
            >
              Kembali ke daftar batch
            </button>
          </section>
          {loading ? (
            <p className="ops-empty" aria-live="polite">
              Memuat barcode...
            </p>
          ) : packages.length === 0 ? (
            <p className="ops-empty">
              {archived
                ? "Batch ini belum memiliki barcode dalam arsip."
                : "Batch ini belum memiliki barcode aktif."}
            </p>
          ) : (
            <div
              className={`ops-barcode-grid${printOnlyIds ? " ops-barcode-grid--print-selection" : ""}`}
            >
              {packages.map((item) => (
                <article
                  className={[
                    "ops-barcode-card",
                    item.archived_at ? "ops-barcode-card--archived" : "",
                    printOnlyIds === null || printOnlyIds.includes(item.id)
                      ? "ops-barcode-card--print-target"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.id}
                >
                  <div className="ops-barcode-card__heading">
                    <div>
                      <p className="ops-eyebrow">{item.tracking_code}</p>
                      <h2>{item.recipient_name}</h2>
                    </div>
                    <div className="ops-barcode-card__selection">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Pilih barcode ${item.tracking_code} untuk dicetak`}
                        />
                        <span>Pilih</span>
                      </label>
                      {item.archived_at ? (
                        <span className="ops-content-status">Diarsipkan</span>
                      ) : (
                        <PackageStatus item={item} />
                      )}
                    </div>
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
                      <dt>PCS</dt>
                      <dd>{item.pcs}</dd>
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
                      onClick={() => printPackages([item.id])}
                    >
                      <Printer size={15} aria-hidden="true" /> Cetak barcode ini
                    </button>
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
        </>
      )}
    </div>
  );
}
