import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BatchUploadPage } from "@/components/batch-upload-page";
import { BarcodeLibraryPage } from "@/components/barcode-library";
import { DashboardContext } from "@/components/operations-dashboard-context";
import { BatchListSection } from "@/components/elkana-site";
import { createBatchPdf } from "@/lib/batch-pdf";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, ...props }: { to: string } & ComponentProps<"a">) => <a href={to} {...props} />,
  };
});

vi.mock("@/lib/batch-pdf", () => ({
  batchPdfFilename: vi.fn(() => "batch.pdf"),
  createBatchPdf: vi.fn(() => ({ save: vi.fn() })),
}));

vi.mock("qrcode.react", () => ({
  QRCodeCanvas: ({ id, title }: { id: string; title: string }) => (
    <canvas id={id} aria-label={title} />
  ),
}));

describe("public batch list", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads featured batch recipients, searches, and switches destination", async () => {
    const fetchMock = vi.fn((request: RequestInfo | URL) => {
      const url = String(request);
      const search = new URL(url, "http://localhost").searchParams.get("search");
      const payload = url.includes("/items?")
        ? {
            items: [
              {
                row_number: 1,
                name: url.includes("batch-mlz") ? "Jeyn" : search ? "Santi Endu" : "Penerima lain",
                pcs: 12,
              },
            ],
            total: 1,
            offset: 0,
            limit: 10,
            hasPrevious: false,
            hasNext: false,
          }
        : {
            batches: [
              {
                id: "batch-bjw",
                title: "BATCH 34",
                destination: "Bajawa",
                created_at: "2026-11-22T00:00:00Z",
              },
              {
                id: "batch-mlz",
                title: "BATCH 33",
                destination: "Malanuza",
                created_at: "2026-11-21T00:00:00Z",
              },
            ],
          };
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BatchListSection />);

    await waitFor(() => {
      expect(screen.getByText("LIST PAKET BAJAWA BATCH 34")).toBeInTheDocument();
    });
    expect(await screen.findByText("Penerima lain")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Cari nama penerima" })).toBeVisible();
    expect(screen.queryByText("HARGA")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari nama penerima" }), {
      target: { value: "Santi" },
    });
    expect(await screen.findByText("Santi Endu")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/items?search=Santi"),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Malanuza" }));

    expect(await screen.findByText("LIST PAKET MALANUZA BATCH 33")).toBeInTheDocument();
    expect(await screen.findByText("Jeyn")).toBeInTheDocument();
  });

  it("shows an empty state when no batch exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ batches: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<BatchListSection />);

    await waitFor(() => {
      expect(screen.getByText("Belum ada daftar paket untuk tujuan Bajawa.")).toBeInTheDocument();
    });
  });

  it("shows ten recipients per page and advances to the next page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((request: RequestInfo | URL) => {
        const url = String(request);
        const query = new URL(url, "http://localhost").searchParams;
        const offset = Number(query.get("offset") ?? 0);
        const payload = url.includes("/items?")
          ? {
              items: Array.from({ length: Math.min(10, 11 - offset) }, (_, index) => ({
                row_number: offset + index + 1,
                name: `Penerima ${offset + index + 1}`,
                pcs: 1,
              })),
              total: 11,
              offset,
              limit: 10,
              hasPrevious: offset > 0,
              hasNext: offset + 10 < 11,
            }
          : {
              batches: [
                {
                  id: "batch-bjw",
                  title: "BATCH 34",
                  destination: "Bajawa",
                  created_at: "2026-11-22T00:00:00Z",
                },
              ],
            };
        return Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    render(<BatchListSection />);

    expect(await screen.findByText("Penerima 1")).toBeInTheDocument();
    expect(screen.getByText("1–10 dari 11")).toBeInTheDocument();
    expect(screen.queryByText("Penerima 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    expect(await screen.findByText("Penerima 11")).toBeInTheDocument();
    expect(screen.getByText("11–11 dari 11")).toBeInTheDocument();
    expect(screen.queryByText("Penerima 1")).not.toBeInTheDocument();
  });

  describe("dashboard batch page", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("renders for a signed-in owner and loads the published batches", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ batches: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      render(
        <DashboardContext.Provider
          value={{ user: { id: "owner-id", email: "owner@example.com", role: "owner" } }}
        >
          <BatchUploadPage />
        </DashboardContext.Provider>,
      );

      expect(await screen.findByRole("heading", { name: "Kelola batch" })).toBeVisible();
      expect(
        screen.getByText("Buat batch terlebih dahulu sebelum mengimpor daftar Excel."),
      ).toBeVisible();
    });

    it("lets owners download a batch PDF and delete a batch", async () => {
      const batchId = "00000000-0000-4000-8000-000000000001";
      const batch = {
        id: batchId,
        title: "BATCH 34",
        destination: "Bajawa",
        item_count: 1,
        package_count: 1,
        archived_package_count: 0,
        has_excel_import: true,
        is_featured: false,
        created_at: "2026-11-22T00:00:00Z",
      };
      let exists = true;
      const fetchMock = vi.fn((request: RequestInfo | URL, init?: RequestInit) => {
        const url = String(request);
        if (url === "/api/batches") {
          return Promise.resolve(
            new Response(JSON.stringify({ batches: exists ? [batch] : [] }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.startsWith(`/api/batches/${batchId}/items?`)) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                batch,
                items: [
                  {
                    row_number: 1,
                    name: "Santi Endu",
                    pcs: 2,
                    weight_kg: "1.5",
                    price: 24000,
                    tracking_code: "ELK-123",
                    status: "Belum diverifikasi",
                  },
                ],
                hasMore: false,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        if (url === `/api/batches/${batchId}` && init?.method === "DELETE") {
          exists = false;
          return Promise.resolve(
            new Response(JSON.stringify({ deletedPackages: 1 }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(
        <DashboardContext.Provider
          value={{ user: { id: "owner-id", email: "owner@example.com", role: "owner" } }}
        >
          <BatchUploadPage />
        </DashboardContext.Provider>,
      );

      fireEvent.click(await screen.findByRole("button", { name: "Unduh PDF" }));
      await waitFor(() => {
        expect(createBatchPdf).toHaveBeenCalledWith(
          expect.objectContaining({ id: batchId }),
          expect.arrayContaining([expect.objectContaining({ tracking_code: "ELK-123" })]),
        );
      });

      fireEvent.click(screen.getByRole("button", { name: "Hapus batch" }));
      expect(await screen.findByText("Belum ada batch pengiriman.")).toBeVisible();
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/batches/${batchId}`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("opens a batch and loads its barcode packages for download or printing", async () => {
    const batchId = "00000000-0000-4000-8000-000000000001";
    const fetchMock = vi.fn((request: RequestInfo | URL) => {
      const url = String(request);
      const payload =
        url === "/api/batches"
          ? {
              batches: [
                {
                  id: batchId,
                  title: "BATCH 34",
                  destination: "Bajawa",
                  package_count: 2,
                  archived_package_count: 0,
                },
              ],
            }
          : {
              packages: [
                {
                  id: `package-${new URL(url, "http://localhost").searchParams.get("offset")}`,
                  batch_id: batchId,
                  tracking_code:
                    new URL(url, "http://localhost").searchParams.get("offset") === "0"
                      ? "ELK-123"
                      : "ELK-456",
                  recipient_name:
                    new URL(url, "http://localhost").searchParams.get("offset") === "0"
                      ? "Santi Endu"
                      : "Penerima kedua",
                  destination: "Bajawa",
                  pcs: 2,
                  weight_kg: "1.5",
                  total_price: 24000,
                  verified_at: null,
                  paid_at: null,
                  collected_at: null,
                  created_at: "2026-11-22T00:00:00Z",
                  barcodeToken: "barcode-token",
                },
              ],
              hasMore: new URL(url, "http://localhost").searchParams.get("offset") === "0",
              nextOffset: Number(new URL(url, "http://localhost").searchParams.get("offset")) + 1,
            };
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardContext.Provider
        value={{ user: { id: "owner-id", email: "owner@example.com", role: "owner" } }}
      >
        <BarcodeLibraryPage />
      </DashboardContext.Provider>,
    );

    const batchCard = await screen.findByRole("button", { name: /BATCH 34/ });
    expect(screen.queryByText("Santi Endu")).not.toBeInTheDocument();
    fireEvent.click(batchCard);

    expect(await screen.findByText("Santi Endu")).toBeVisible();
    expect(await screen.findByText("Penerima kedua")).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Unduh PNG/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Cetak barcode ini/ })).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`batchId=${batchId}`),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("offset=1"), expect.any(Object));
  });
});
