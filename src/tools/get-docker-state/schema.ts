import { z } from "zod";

export const InputSchema = z.object({
  include_logs: z
    .boolean()
    .default(false)
    .describe("Include the last 20 log lines for each running container"),
  filter_name: z
    .string()
    .optional()
    .describe("Filter containers by name (case-insensitive substring match)"),
});

export type Input = z.infer<typeof InputSchema>;
