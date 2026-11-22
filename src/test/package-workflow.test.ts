import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertCanEditPackage,
  assertCanApplyAction,
  assertCanDeletePaymentHistory,
  batchTrackingUpdateSchema,
  calculateCharge,
  packageBatchSchema,
  packageInputSchema,
  packageUpdateSchema,
  WorkflowError,
  type PackageWorkflowState,
} from "../../api/package-workflow";
import {
  announcementUpdateSchema,
  assertOwnerRole,
  reviewModerationSchema,
  reviewOwnerCreateSchema,
  reviewOwnerUpdateSchema,
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

  it("validates owner review creation and updates with an explicit publication status", () => {
    const review = {
      authorName: "Dina",
      rating: 5,
      body: "Paket datang dengan aman dan tepat waktu.",
    };

    expect(reviewOwnerCreateSchema.parse(review).status).toBe("pending");
    expect(reviewOwnerCreateSchema.parse({ ...review, status: "approved" }).status).toBe(
      "approved",
    );
    expect(reviewOwnerUpdateSchema.safeParse({ ...review, status: "rejected" }).success).toBe(true);
    expect(reviewOwnerUpdateSchema.safeParse({ ...review, status: "published" }).success).toBe(
      false,
    );
  });

  it("restricts content management to owners", () => {
    expect(() => assertOwnerRole("owner")).not.toThrow();
    expect(() => assertOwnerRole("admin")).toThrow(WorkflowError);
  });

  it("calculates package charges using the saved per-kilogram rate", () => {
    expect(calculateCharge(1, 8000)).toBe(8000);
    expect(calculateCharge(1.25, 8000)).toBe(10000);
    expect(calculateCharge(3, 8000)).toBe(24000);
  });

  it("stores PCS independently from the Excel weight-based price calculation", () => {
    const parsed = packageInputSchema.parse({
      recipientName: "Santi Endu",
      destination: "Bajawa",
      pcs: 12,
      weightKg: 3,
    });

    expect(parsed.pcs).toBe(12);
    expect(calculateCharge(parsed.weightKg, 8000)).toBe(24000);
    expect(packageInputSchema.parse({ ...parsed, pcs: undefined }).pcs).toBe(1);
    expect(packageInputSchema.safeParse({ ...parsed, pcs: 0 }).success).toBe(false);
  });

  it("accepts package batches up to 50 entries and rejects larger batches", () => {
    const packageInput = {
      recipientName: "Dina",
      destination: "Bajawa",
      pcs: 3,
      weightKg: 1.25,
    };

    expect(packageBatchSchema.safeParse({ packages: Array(50).fill(packageInput) }).success).toBe(
      true,
    );
    expect(packageBatchSchema.safeParse({ packages: Array(51).fill(packageInput) }).success).toBe(
      false,
    );
    expect(packageBatchSchema.safeParse({ packages: [] }).success).toBe(false);
  });

  it("allows edits only for active, unprocessed packages", () => {
    expect(() =>
      assertCanEditPackage({
        verifiedAt: null,
        paidAt: null,
        collectedAt: null,
        archivedAt: null,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanEditPackage({
        verifiedAt: "2026-01-01T00:00:00Z",
        paidAt: null,
        collectedAt: null,
        archivedAt: null,
      }),
    ).toThrow(WorkflowError);
    expect(() =>
      assertCanEditPackage({
        verifiedAt: null,
        paidAt: null,
        collectedAt: null,
        archivedAt: "2026-01-01T00:00:00Z",
      }),
    ).toThrow(WorkflowError);
  });

  it("validates batch tracking updates and prevents deleting payment history after pickup", () => {
    expect(
      batchTrackingUpdateSchema.parse({
        status: "Paket berangkat",
        location: "Surabaya",
        information: "Paket dalam perjalanan menuju tujuan.",
      }).status,
    ).toBe("Paket berangkat");
    expect(
      batchTrackingUpdateSchema.safeParse({
        status: " ",
        location: "Surabaya",
        information: "Paket dalam perjalanan menuju tujuan.",
      }).success,
    ).toBe(false);

    expect(() =>
      assertCanDeletePaymentHistory({
        verifiedAt: null,
        paidAt: "2026-01-01T00:00:00Z",
        collectedAt: null,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanDeletePaymentHistory({
        verifiedAt: null,
        paidAt: "2026-01-01T00:00:00Z",
        collectedAt: "2026-01-02T00:00:00Z",
      }),
    ).toThrow(WorkflowError);
  });

  it("allows package edits to update or clear optional sender and recipient contact details", () => {
    const packageInput = {
      recipientName: "Santi Endu",
      destination: "Bajawa",
      pcs: 1,
      weightKg: 1.5,
    };

    expect(
      packageUpdateSchema.parse({
        ...packageInput,
        recipientPhone: "08123456789",
        senderName: "Dina",
      }),
    ).toMatchObject({ recipientPhone: "08123456789", senderName: "Dina" });
    expect(
      packageUpdateSchema.parse({
        ...packageInput,
        recipientPhone: null,
        senderName: null,
      }),
    ).toMatchObject({ recipientPhone: null, senderName: null });
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
