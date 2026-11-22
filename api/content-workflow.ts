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
