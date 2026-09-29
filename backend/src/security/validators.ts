import { z } from "zod";

export const refundRequestSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  orderId: z.string().min(1, "orderId is required"),
  reason: z
    .string()
    .min(3, "reason must be at least 3 characters")
    .max(2000, "reason is too long"),
});

export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
