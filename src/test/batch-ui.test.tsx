import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BatchUploadPage } from "@/components/batch-upload-page";
import { DashboardContext } from "@/components/operations-dashboard-context";
import { BatchListSection } from "@/components/elkana-site";

describe("public batch list", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
  });
});
