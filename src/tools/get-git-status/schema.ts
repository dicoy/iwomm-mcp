import { z } from "zod";

export const InputSchema = z.object({
  path: z
    .string()
    .default(".")
    .describe("Path to the git repository (defaults to current working directory)"),
  include_recent_commits: z.boolean().default(true).describe("Include the last 5 commits"),
});

export type Input = z.infer<typeof InputSchema>;
