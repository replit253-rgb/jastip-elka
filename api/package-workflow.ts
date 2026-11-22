import { z } from "zod";

export type PackageAction = "verify" | "payment" | "collect";

export type PackageWorkflowState = {
  verifiedAt: Date | string | null;
  paidAt: Date | string | null;
  collectedAt: Date | string | null;
};

export const packageInputSchema = z.object({
  recipientName: z.string().trim().min(2).max(120),
  recipientPhone: z.string().trim().min(5).max(32).optional(),
  senderName: z.string().trim().min(2).max(120).optional(),
  destination: z.enum(["Bajawa", "Malanuza", "Aimere"]),
  description: z.string().trim().max(250).default(""),
  pcs: z.number().int().min(1).max(10000).default(1),
  weightKg: z.number().min(0.01).max(500).multipleOf(0.01),
});

export const packageBatchSchema = z.object({
  packages: z.array(packageInputSchema).min(1).max(50),
});

export const packageUpdateSchema = packageInputSchema.extend({
  recipientPhone: z.string().trim().min(5).max(32).nullable().optional(),
  senderName: z.string().trim().min(2).max(120).nullable().optional(),
});

export const batchTrackingUpdateSchema = z.object({
  status: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  information: z.string().trim().min(2).max(500),
});

export type PackageInput = z.infer<typeof packageInputSchema>;

export class WorkflowError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function assertCanEditPackage(
  state: PackageWorkflowState & { archivedAt: Date | string | null },
) {
  if (state.archivedAt) {
    throw new WorkflowError("Paket yang sudah diarsipkan tidak dapat diubah.", 409);
  }
  if (state.verifiedAt || state.paidAt || state.collectedAt) {
    throw new WorkflowError("Paket yang sudah diproses tidak dapat diubah.", 409);
  }
}

export function calculateCharge(weightKg: number, pricePerKg: number) {
  return Math.round(weightKg * pricePerKg);
}

export function assertCanDeletePaymentHistory(state: PackageWorkflowState) {
  if (!state.paidAt) {
    throw new WorkflowError("Riwayat pembayaran paket ini tidak ditemukan.", 404);
  }
  if (state.collectedAt) {
    throw new WorkflowError("Riwayat pembayaran tidak dapat dihapus setelah paket diambil.", 409);
  }
}

export function assertCanApplyAction(state: PackageWorkflowState, action: PackageAction) {
  if (action === "verify" && state.verifiedAt) {
    throw new WorkflowError("Paket ini sudah diverifikasi.", 409);
  }

  if (action === "payment") {
    if (!state.verifiedAt) {
      throw new WorkflowError("Verifikasi paket sebelum mencatat pembayaran.", 409);
    }
    if (state.paidAt) {
      throw new WorkflowError("Pembayaran paket ini sudah tercatat.", 409);
    }
  }

  if (action === "collect") {
    if (!state.verifiedAt) {
      throw new WorkflowError("Verifikasi paket sebelum pengambilan.", 409);
    }
    if (!state.paidAt) {
      throw new WorkflowError("Pembayaran harus lunas sebelum paket diambil.", 409);
    }
    if (state.collectedAt) {
      throw new WorkflowError("Paket ini sudah diambil.", 409);
    }
  }
}
