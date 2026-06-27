import { z } from "zod";

export const InputSchema = z.object({
  filter_port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .describe("Only show processes listening on this port"),
  filter_name: z
    .string()
    .min(1)
    .optional()
    .describe("Filter by process name or command (case-insensitive substring match)"),
});

export type Input = z.infer<typeof InputSchema>;
