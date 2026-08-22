import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const EXPIRY_OPTIONS = [
  { label: "1 Day", value: 1 * 24 * 60 * 60 },
  { label: "7 Days", value: 7 * 24 * 60 * 60 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 },
  { label: "Never", value: 0 },
] as const;

export type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];

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

export async function getLatestPastes(limit: number): Promise<PasteData[]> {
  const ids = await redis.zrange<string[]>("pastes:index", 0, limit - 1, {
    rev: true,
  });

  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.hgetall(`paste:${id}`);
  }
  const results = await pipeline.exec<PasteData[]>();

  return results.filter(
    (p): p is PasteData => p !== null && Object.keys(p).length > 0
  );
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
