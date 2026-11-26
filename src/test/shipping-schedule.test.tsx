import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicShippingScheduleSection } from "@/components/public-content";
import { ShippingSchedulePage } from "@/components/shipping-schedule-page";
import { DashboardContext } from "@/components/operations-dashboard-context";
import {
  shippingScheduleCreateSchema,
  shippingScheduleUpdateSchema,
} from "../../api/content-workflow.ts";

const scheduleId = "00000000-0000-4000-8000-000000000101";

const validInput = {
  title: "Pengiriman Minggu ke-4",
  destination: "Bajawa",
  closingDate: "2026-12-01",
  departureDate: "2026-12-02",
  estimatedArrivalDate: "2026-12-05",
  status: "collecting",
  description: "Paket setelah closing ikut jadwal berikutnya.",
  isPublished: true,
};

function scheduleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: scheduleId,
    title: validInput.title,
    destination: validInput.destination,
    closing_date: validInput.closingDate,
    departure_date: validInput.departureDate,
    estimated_arrival_date: validInput.estimatedArrivalDate,
    status: validInput.status,
    description: validInput.description,
    is_published: true,
    created_at: "2026-11-22T00:00:00.000Z",
    updated_at: "2026-11-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("shipping schedule management", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects closing and arrival dates that conflict with departure", () => {
    expect(
      shippingScheduleCreateSchema.safeParse({
        ...validInput,
        closingDate: "2026-12-03",
      }).success,
    ).toBe(false);
    expect(
      shippingScheduleUpdateSchema.safeParse({
        ...validInput,
        estimatedArrivalDate: "2026-12-01",
      }).success,
    ).toBe(false);
  });

  it("creates, edits, unpublishes, and deletes an owner schedule", async () => {
    let schedule: ReturnType<typeof scheduleRecord> | null = null;
    const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      const path = String(request);
      if (path === "/api/shipping-schedules" && !init?.method) {
        return new Response(JSON.stringify({ schedules: schedule ? [schedule] : [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/api/shipping-schedules" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as typeof validInput;
        schedule = scheduleRecord({
          title: body.title,
          is_published: body.isPublished,
        });
        return new Response(JSON.stringify({ schedule }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === `/api/shipping-schedules/${scheduleId}` && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as typeof validInput;
        schedule = scheduleRecord({
          title: body.title,
          is_published: body.isPublished,
        });
        return new Response(JSON.stringify({ schedule }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === `/api/shipping-schedules/${scheduleId}` && init?.method === "DELETE") {
        schedule = null;
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DashboardContext.Provider
        value={{ user: { id: "owner-id", email: "owner@example.com", role: "owner" } }}
      >
        <ShippingSchedulePage />
      </DashboardContext.Provider>,
    );

    fireEvent.change(await screen.findByLabelText("Nama batch / jadwal"), {
      target: { value: validInput.title },
    });
    fireEvent.change(screen.getByLabelText("Batas closing / titip"), {
      target: { value: validInput.closingDate },
    });
    fireEvent.change(screen.getByLabelText("Tanggal keberangkatan"), {
      target: { value: validInput.departureDate },
    });
    fireEvent.change(screen.getByLabelText("Estimasi tiba (opsional)"), {
      target: { value: validInput.estimatedArrivalDate },
    });
    fireEvent.change(screen.getByLabelText("Keterangan untuk pelanggan (opsional)"), {
      target: { value: validInput.description },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan jadwal" }));

    expect(await screen.findByRole("heading", { name: validInput.title })).toBeVisible();
    expect(await screen.findByRole("status")).toHaveTextContent("Jadwal berhasil diterbitkan.");

    fireEvent.click(screen.getByRole("button", { name: "Ubah" }));
    fireEvent.change(screen.getByLabelText("Nama batch / jadwal"), {
      target: { value: "Pengiriman Minggu ke-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    expect(await screen.findByRole("heading", { name: "Pengiriman Minggu ke-5" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Tarik" }));
    expect(await screen.findByText("Draft / disembunyikan")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));
    await waitFor(() => {
      expect(
        screen.getByText("Belum ada jadwal pengiriman. Buat jadwal untuk ditampilkan."),
      ).toBeVisible();
    });
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), init?.method])).toContainEqual([
      `/api/shipping-schedules/${scheduleId}`,
      "DELETE",
    ]);
  });

  it("shows a published schedule on the public homepage component", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ schedules: [scheduleRecord()] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<PublicShippingScheduleSection compact />);

    expect(await screen.findByRole("heading", { name: validInput.title })).toBeVisible();
    expect(screen.getByText("Penerimaan dibuka")).toBeVisible();
    expect(screen.getByText("Closing titip")).toBeVisible();
    expect(screen.getByText("2 Des 2026")).toBeVisible();
  });
});
