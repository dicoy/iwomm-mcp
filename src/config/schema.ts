import { z } from "zod";

const ServiceConfigSchema = z.object({
  logs: z.string().optional(),
  port: z.number().int().positive().optional(),
  health_endpoint: z.string().optional(),
});

export const McpContextConfigSchema = z.object({
  services: z.record(z.string(), ServiceConfigSchema).default({}),
  env_files: z.array(z.string()).default([".env"]),
  reveal_env_patterns: z.array(z.string()).default([]),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
export type McpContextConfig = z.infer<typeof McpContextConfigSchema>;
