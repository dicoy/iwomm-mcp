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
    .describe("Filter by process name (case-insensitive substring match on name and full command)"),
  filter_args: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Filter by command-line arguments (case-insensitive substring match). Combine with filter_name to narrow JVM processes: filter_name='java', filter_args='myapp.jar'",
    ),
});

export type Input = z.infer<typeof InputSchema>;
