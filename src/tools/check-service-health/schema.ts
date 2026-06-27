import { z } from "zod";

export const InputSchema = z.object({
  url: z.string().url().describe("URL to check (e.g. http://localhost:3000/health)"),
  timeout_ms: z
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(5000)
    .describe("Request timeout in milliseconds"),
  expected_status: z
    .number()
    .int()
    .min(100)
    .max(599)
    .default(200)
    .describe("Expected HTTP status code"),
});

export type Input = z.infer<typeof InputSchema>;
