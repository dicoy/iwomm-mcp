import { z } from "zod";

export const InputSchema = z.object({
  path: z
    .string()
    .default(".")
    .describe("Root directory to scan (defaults to current working directory)"),
  max_depth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(4)
    .describe("Maximum directory depth to traverse"),
  respect_gitignore: z.boolean().default(true).describe("Exclude paths matched by .gitignore"),
});

export type Input = z.infer<typeof InputSchema>;
