import { z } from "zod";

export const InputSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Path to the build file: pom.xml (Maven), build.gradle or build.gradle.kts (Gradle), go.mod (Go), package.json (npm)",
    ),
});

export type Input = z.infer<typeof InputSchema>;
