export type PackageAction = "verify" | "payment" | "collect";

export type PackageWorkflowState = {
  verifiedAt: Date | string | null;
  paidAt: Date | string | null;
  collectedAt: Date | string | null;
};

export class WorkflowError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function calculateCharge(weightKg: number, pricePerKg: number) {
  return Math.round(weightKg * pricePerKg);
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
