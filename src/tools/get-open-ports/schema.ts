import { z } from "zod";

export const InputSchema = z.object({
  filter_process: z
    .string()
    .optional()
    .describe("Filter by process name (case-insensitive substring match)"),
});

export type Input = z.infer<typeof InputSchema>;
