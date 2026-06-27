import { z } from "zod";

// Note: mutual-exclusion validation (file XOR service) is enforced in the handler
// because .refine() wraps the schema in ZodEffects which loses .shape, breaking MCP tool registration.
export const InputSchema = z.object({
  file: z.string().optional().describe("Absolute or relative path to a log file"),
  service: z.string().optional().describe("Service name as defined in .mcp-context.yml"),
  lines: z.number().int().min(1).max(1000).default(50).describe("Number of lines to return"),
});

export type Input = z.infer<typeof InputSchema>;
