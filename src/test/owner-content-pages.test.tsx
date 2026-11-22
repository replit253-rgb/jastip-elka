import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReviewModerationPage } from "@/components/owner-content-pages";
import { DashboardContext } from "@/components/operations-dashboard-context";

type ReviewFixture = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  moderated_at: string | null;
  created_at: string;
};

describe("owner review management", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates, edits, publishes, and deletes a review", async () => {
    let review: ReviewFixture | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.startsWith("/api/reviews?status=")) {
        const requestedStatus = new URL(path, "http://localhost").searchParams.get("status");
        return new Response(
          JSON.stringify({
            reviews: review?.status === requestedStatus ? [review] : [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const body = JSON.parse(String(init?.body)) as {
        authorName: string;
        rating: number;
        body: string;
        status: ReviewFixture["status"];
      };
      if (path === "/api/reviews" && init?.method === "POST") {
        review = {
          id: "review-1",
          author_name: body.authorName,
          rating: body.rating,
          body: body.body,
          status: body.status,
          moderated_at: null,
          created_at: "2026-11-22T00:00:00.000Z",
        };
        return new Response(JSON.stringify({ review }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/api/reviews/review-1" && init?.method === "PUT") {
        review = {
          ...review!,
          author_name: body.authorName,
          rating: body.rating,
          body: body.body,
          status: body.status,
        };
        return new Response(JSON.stringify({ review }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/api/reviews/review-1" && init?.method === "DELETE") {
        review = null;
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
        <ReviewModerationPage />
      </DashboardContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText("Nama pelanggan"), {
      target: { value: "Dina" },
    });
    fireEvent.change(screen.getByLabelText("Isi ulasan"), {
      target: { value: "Paket datang dengan aman dan tepat waktu." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah ulasan" }));

    expect(await screen.findByText("Dina")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ubah" }));
    fireEvent.change(screen.getByLabelText("Isi ulasan"), {
      target: { value: "Paket diterima dengan aman dan tepat waktu." },
    });
    fireEvent.change(screen.getByLabelText("Status ulasan"), {
      target: { value: "approved" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() => {
      expect(screen.getByText("Paket diterima dengan aman dan tepat waktu.")).toBeInTheDocument();
      expect(review?.status).toBe("approved");
    });
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    await waitFor(() => {
      expect(screen.queryByText("Dina")).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), init?.method])).toContainEqual([
      "/api/reviews/review-1",
      "DELETE",
    ]);
  });
});
