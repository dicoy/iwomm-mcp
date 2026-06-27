import type { Input } from "./schema.js";

interface HealthResult {
  url: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  body: string | null;
}

export async function checkServiceHealthHandler(input: Input): Promise<string> {
  const result = await probe(input.url, input.timeout_ms);
  return formatResult(result, input.expected_status);
}

async function probe(url: string, timeoutMs: number): Promise<HealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, { signal: controller.signal });
    const latencyMs = Date.now() - start;

    let body: string | null = null;
    try {
      const text = await response.text();
      body = text.length > 500 ? `${text.slice(0, 500)}…` : text;
    } catch {
      // body read failure is non-fatal
    }

    return {
      url,
      ok: response.ok,
      statusCode: response.status,
      latencyMs,
      error: null,
      body,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";

    return {
      url,
      ok: false,
      statusCode: null,
      latencyMs,
      error: isTimeout ? `Timed out after ${timeoutMs}ms` : String(err),
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function formatResult(result: HealthResult, expectedStatus: number): string {
  const statusLine =
    result.statusCode !== null
      ? `${result.statusCode} ${result.statusCode === expectedStatus ? "✓" : `✗ (expected ${expectedStatus})`}`
      : "no response";

  const lines = [
    `URL:     ${result.url}`,
    `Status:  ${statusLine}`,
    `Latency: ${result.latencyMs}ms`,
  ];

  if (result.error) {
    lines.push(`Error:   ${result.error}`);
  }

  if (result.body) {
    lines.push("", "Response body:", result.body);
  }

  return lines.join("\n");
}
