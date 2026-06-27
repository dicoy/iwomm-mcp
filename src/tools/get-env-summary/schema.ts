import { z } from "zod";

export const InputSchema = z.object({
  path: z
    .string()
    .default(".env")
    .describe("Path to the .env file (defaults to .env in current directory)"),
  reveal_patterns: z
    .array(z.string())
    .default([])
    .describe("Key patterns to reveal even if they look like secrets (e.g. ['NODE_ENV', 'APP_*'])"),
});

export type Input = z.infer<typeof InputSchema>;
