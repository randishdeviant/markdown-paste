import { Redis } from "@upstash/redis";
import {
  DEFAULT_TTL_SECONDS,
  EXPIRY_OPTIONS,
  type ExpiryValue,
} from "./constants";

export const redis = Redis.fromEnv();

export { EXPIRY_OPTIONS, type ExpiryValue };

export interface PasteData {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  [key: string]: unknown;
}

export async function createPaste(
  id: string,
  content: string,
  ttlSeconds?: number
): Promise<PasteData> {
  const created_at = new Date().toISOString();
  const timestamp = Date.now();

  const effectiveTtl =
    ttlSeconds !== undefined ? ttlSeconds : DEFAULT_TTL_SECONDS;

  const expires_at =
    effectiveTtl > 0
      ? new Date(timestamp + effectiveTtl * 1000).toISOString()
      : null;

  const paste: PasteData = { id, content, created_at, expires_at };

  const pipeline = redis.pipeline();
  pipeline.hset(`paste:${id}`, paste);
  pipeline.zadd("pastes:index", { score: timestamp, member: id });

  if (effectiveTtl > 0) {
    pipeline.expire(`paste:${id}`, effectiveTtl);
    pipeline.expire("pastes:index", effectiveTtl);
  }

  await pipeline.exec();

  return paste;
}

export async function getPaste(id: string): Promise<PasteData | null> {
  const data = await redis.hgetall<PasteData>(`paste:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

export async function deletePaste(id: string): Promise<boolean> {
  const pipeline = redis.pipeline();
  pipeline.del(`paste:${id}`);
  pipeline.zrem("pastes:index", id);
  const results = await pipeline.exec<number[]>();

  return results[0] === 1;
}

export async function getLatestPasteIds(limit: number): Promise<string[]> {
  return redis.zrange<string[]>("pastes:index", 0, limit - 1, {
    rev: true,
  });
}
