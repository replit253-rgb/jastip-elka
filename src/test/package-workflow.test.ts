import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertCanApplyAction,
  calculateCharge,
  WorkflowError,
  type PackageWorkflowState,
} from "../../api/package-workflow";
import {
  announcementUpdateSchema,
  assertOwnerRole,
  reviewModerationSchema,
  reviewSubmissionSchema,
} from "../../api/content-workflow";
import { apiRequest } from "@/lib/operations-api";

describe("package workflow", () => {
  it("validates owner announcements and retains the chosen publication state when edited", () => {
    expect(
      announcementUpdateSchema.parse({
        title: "Jadwal pengiriman",
        body: "Pengiriman berikutnya berangkat hari Jumat.",
        isPublished: false,
      }).isPublished,
    ).toBe(false);
    expect(
      announcementUpdateSchema.safeParse({
        title: "Hoi",
        body: "Pemberitahuan yang terlalu singkat.",
        isPublished: true,
      }).success,
    ).toBe(false);
  });

  it("limits public reviews to one through five stars and moderation states", () => {
    expect(
      reviewSubmissionSchema.safeParse({
        authorName: "Dina",
        rating: 5,
        body: "Paket datang dengan aman dan tepat waktu.",
      }).success,
    ).toBe(true);
    expect(
      reviewSubmissionSchema.safeParse({
        authorName: "Dina",
        rating: 6,
        body: "Paket datang dengan aman dan tepat waktu.",
      }).success,
    ).toBe(false);
    expect(reviewModerationSchema.safeParse({ status: "approved" }).success).toBe(true);
    expect(reviewModerationSchema.safeParse({ status: "pending" }).success).toBe(false);
  });

  it("restricts content management to owners", () => {
    expect(() => assertOwnerRole("owner")).not.toThrow();
    expect(() => assertOwnerRole("admin")).toThrow(WorkflowError);
  });

  it("calculates package charges using the saved per-kilogram rate", () => {
    expect(calculateCharge(1, 8000)).toBe(8000);
    expect(calculateCharge(1.25, 8000)).toBe(10000);
  });

  describe("operations API helper", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("explains an unavailable API when the proxy returns an empty error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

      await expect(apiRequest("/api/auth/me")).rejects.toThrow(
        "Layanan API tidak tersedia (HTTP 502).",
      );
    });
  });

  it("requires verification and payment before collection", () => {
    const state: PackageWorkflowState = {
      verifiedAt: null,
      paidAt: null,
      collectedAt: null,
    };

    expect(() => assertCanApplyAction(state, "verify")).not.toThrow();
    expect(() => assertCanApplyAction(state, "payment")).toThrow(WorkflowError);
    expect(() => assertCanApplyAction(state, "collect")).toThrow(WorkflowError);
    expect(() =>
      assertCanApplyAction({ ...state, verifiedAt: "2026-01-01T00:00:00Z" }, "payment"),
    ).not.toThrow();
    expect(() =>
      assertCanApplyAction(
        {
          ...state,
          verifiedAt: "2026-01-01T00:00:00Z",
          paidAt: "2026-01-01T00:00:00Z",
        },
        "collect",
      ),
    ).not.toThrow();
  });

  it("rejects repeating a completed action", () => {
    const state: PackageWorkflowState = {
      verifiedAt: "2026-01-01T00:00:00Z",
      paidAt: "2026-01-01T00:00:00Z",
      collectedAt: "2026-01-01T00:00:00Z",
    };

    expect(() => assertCanApplyAction(state, "verify")).toThrow(WorkflowError);
    expect(() => assertCanApplyAction(state, "payment")).toThrow(WorkflowError);
    expect(() => assertCanApplyAction(state, "collect")).toThrow(WorkflowError);
  });
});
