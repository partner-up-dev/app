import { env } from "../lib/env";
import { withTimeout } from "../lib/with-timeout";
import { ConfigRepository } from "../repositories/ConfigRepository";

const repo = new ConfigRepository();

export class ConfigService {
  async getValue(key: string): Promise<string | null> {
    try {
      const value = await withTimeout(
        repo.findValueByKey(key),
        env.DB_OPERATION_TIMEOUT_MS,
        `Config lookup timed out for key: ${key}`,
      );

      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }

  async getValueOrFallback(key: string, fallback: string): Promise<string> {
    const value = await this.getValue(key);
    return value ?? fallback;
  }

  async getJsonArrayOrFallback(key: string, fallback: string[]): Promise<string[]> {
    try {
      const raw = await withTimeout(
        repo.findValueByKey(key),
        env.DB_OPERATION_TIMEOUT_MS,
        `Config lookup timed out for key: ${key}`,
      );

      if (!raw) return fallback;

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
          return parsed;
        }
        return fallback;
      } catch {
        return fallback;
      }
    } catch {
      return fallback;
    }
  }
}
