import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BatchListSection } from "@/components/elkana-site";

describe("public batch list", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads Bajawa batches and switches to the Malanuza tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            batches: [
              {
                id: "batch-bjw",
                title: "BATCH 34",
                destination: "Bajawa",
                created_at: "2026-11-22T00:00:00Z",
                items: [
                  { row_number: 1, name: "Santi Endu", pcs: 12 },
                  { row_number: 2, name: "Adriana Bude", pcs: 3 },
                ],
              },
              {
                id: "batch-mlz",
                title: "BATCH 33",
                destination: "Malanuza",
                created_at: "2026-11-21T00:00:00Z",
                items: [{ row_number: 1, name: "Jeyn", pcs: 3 }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(<BatchListSection />);

    await waitFor(() => {
      expect(screen.getByText("LIST PAKET BAJAWA BATCH 34")).toBeInTheDocument();
    });
    expect(screen.getByText("Santi Endu")).toBeInTheDocument();
    expect(screen.queryByText("HARGA")).not.toBeInTheDocument();
    expect(screen.queryByText("BERAT")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Malanuza" }));

    expect(screen.getByText("LIST PAKET MALANUZA BATCH 33")).toBeInTheDocument();
    expect(screen.getByText("Jeyn")).toBeInTheDocument();
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
      expect(
        screen.getByText("Belum ada daftar paket untuk tujuan Bajawa."),
      ).toBeInTheDocument();
    });
  });
});
