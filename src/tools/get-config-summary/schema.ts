import { z } from "zod";

export const InputSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Path to the config file. Supported formats: .yml / .yaml (Spring Boot), .properties (Spring Boot), .env (dotenv)",
    ),
});

export type Input = z.infer<typeof InputSchema>;
