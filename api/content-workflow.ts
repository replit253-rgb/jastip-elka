import { z } from "zod";

import { WorkflowError } from "./package-workflow.ts";

export const announcementInputSchema = z.object({
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(10).max(2000),
});

export const announcementCreateSchema = announcementInputSchema.extend({
  isPublished: z.boolean().default(true),
});

export const announcementUpdateSchema = announcementInputSchema.extend({
  isPublished: z.boolean(),
});

export const announcementStatusSchema = z.object({
  isPublished: z.boolean(),
});

const shippingScheduleFields = z.object({
  title: z.string().trim().min(4).max(120),
  destination: z.enum(["Semua tujuan", "Bajawa", "Malanuza", "Aimere"]),
  closingDate: z.string().date(),
  departureDate: z.string().date(),
  estimatedArrivalDate: z.string().date().nullable(),
  status: z.enum(["collecting", "closing_soon", "closed", "in_transit", "arrived"]),
  description: z.string().trim().max(500),
});

function validateShippingScheduleDates(
  input: z.infer<typeof shippingScheduleFields>,
  context: z.RefinementCtx,
) {
  if (input.closingDate > input.departureDate) {
    context.addIssue({
      code: "custom",
      path: ["closingDate"],
      message: "Tanggal closing tidak boleh setelah tanggal keberangkatan.",
    });
  }
  if (input.estimatedArrivalDate && input.estimatedArrivalDate < input.departureDate) {
    context.addIssue({
      code: "custom",
      path: ["estimatedArrivalDate"],
      message: "Estimasi tiba tidak boleh sebelum tanggal keberangkatan.",
    });
  }
}

export const shippingScheduleCreateSchema = shippingScheduleFields
  .extend({ isPublished: z.boolean().default(true) })
  .superRefine(validateShippingScheduleDates);

export const shippingScheduleUpdateSchema = shippingScheduleFields
  .extend({ isPublished: z.boolean() })
  .superRefine(validateShippingScheduleDates);

export const reviewSubmissionSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});

export const reviewOwnerCreateSchema = reviewSubmissionSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export const reviewOwnerUpdateSchema = reviewSubmissionSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]),
});

export const reviewModerationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export function assertOwnerRole(role: "owner" | "admin") {
  if (role !== "owner") {
    throw new WorkflowError("Fitur ini hanya dapat dikelola oleh owner.", 403);
  }
}
