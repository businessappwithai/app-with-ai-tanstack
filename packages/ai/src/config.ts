/**
 * Central AI model configuration.
 *
 * All agents and API routes must import from here — never hard-code model
 * strings or base URLs in individual files.
 *
 * Runtime env vars (set in .env):
 *   LOCAL_AI_BASE_URL   — OpenAI-compatible base URL (default: http://localhost:8000/v1)
 *   LOCAL_AI_MODEL      — model identifier          (default: qwen3.6:27b-mlx)
 *   LOCAL_AI_API_KEY    — API key for the endpoint  (default: local)
 */

export const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://localhost:8000/v1";

export const AI_MODEL = process.env.LOCAL_AI_MODEL ?? "qwen3.6:27b-mlx";

export const AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? "local";

/**
 * Mastra `OpenAICompatibleConfig` — pass directly as the `model` field of any Agent.
 */
export const mastraModelConfig = {
  id: `openai/${AI_MODEL}` as `${string}/${string}`,
  url: AI_BASE_URL,
  apiKey: AI_API_KEY,
} as const;
