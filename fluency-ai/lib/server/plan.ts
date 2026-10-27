import "server-only";
import { db } from "./db";
import { isPro, type User } from "./auth";

export const FREE_CONVERSATIONS_PER_WEEK = 3;
export const FREE_MESSAGES_PER_CONVERSATION = 30;
export const PRO_MESSAGES_PER_CONVERSATION = 60;
// Teto de uso justo do Pro (~20 min de conversa por dia), protege a margem do plano barato.
export const PRO_MESSAGES_PER_DAY = 150;

// Brasília não tem horário de verão desde 2019: UTC-3 fixo.
const BRT_OFFSET_MS = 3 * 3_600_000;

export function today(now = Date.now()): string {
  return new Date(now - BRT_OFFSET_MS).toISOString().slice(0, 10);
}

export function weekStart(now = Date.now()): number {
  const local = new Date(now - BRT_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return local.getTime() + BRT_OFFSET_MS;
}

export async function freeConversationsLeft(user: User): Promise<number | null> {
  if (isPro(user)) return null;
  const client = await db();
  const row = (
    await client.execute({
      // o nivelamento não conta no limite grátis
      sql: "SELECT COUNT(*) AS n FROM conversations WHERE user_id = ? AND created_at >= ? AND scenario != 'nivelamento'",
      args: [user.id, weekStart()],
    })
  ).rows[0];
  return Math.max(0, FREE_CONVERSATIONS_PER_WEEK - Number(row.n));
}

export async function messagesToday(user: User): Promise<number> {
  const client = await db();
  const row = (
    await client.execute({ sql: "SELECT messages FROM daily_usage WHERE user_id = ? AND day = ?", args: [user.id, today()] })
  ).rows[0];
  return row ? Number(row.messages) : 0;
}

export function messagesPerConversation(user: User): number {
  return isPro(user) ? PRO_MESSAGES_PER_CONVERSATION : FREE_MESSAGES_PER_CONVERSATION;
}
