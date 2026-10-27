import "server-only";
import type { TutorReply } from "@/lib/tutor";
import { db } from "./db";
import { today } from "./plan";

const DAY_MS = 86_400_000;

export async function recordTurn(userId: string, language: string, reply: TutorReply) {
  const client = await db();
  const now = Date.now();
  const statements = [
    {
      sql: `INSERT INTO daily_usage (user_id, day, messages) VALUES (?, ?, 1)
            ON CONFLICT (user_id, day) DO UPDATE SET messages = messages + 1`,
      args: [userId, today()],
    },
    ...(reply.feedback.has_errors ? reply.feedback.errors : []).map((e) => ({
      sql: "INSERT INTO mistakes (user_id, language, original, fix, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [userId, language, e.original, e.fix, e.explanation_pt, now],
    })),
    ...reply.new_words.map((w) => ({
      sql: `INSERT INTO cards (user_id, language, word, translation, example, due_at)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (user_id, language, word) DO NOTHING`,
      args: [userId, language, w.word.trim().toLowerCase(), w.translation_pt, w.example, now],
    })),
  ];
  await client.batch(statements, "write");
}

// Erros recentes viram foco da próxima conversa: o professor cria chances de praticá-los.
export async function recentMistakes(userId: string, language: string, limit = 5): Promise<string[]> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: `SELECT original, fix FROM mistakes WHERE user_id = ? AND language = ?
            ORDER BY created_at DESC LIMIT ?`,
      args: [userId, language, limit],
    })
  ).rows;
  return rows.map((r) => `"${r.original}" → "${r.fix}"`);
}

export interface Mistake {
  original: string;
  fix: string;
  explanation: string;
  createdAt: number;
}

export async function listMistakes(userId: string, language: string): Promise<Mistake[]> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: `SELECT original, fix, explanation, created_at FROM mistakes
            WHERE user_id = ? AND language = ? ORDER BY created_at DESC LIMIT 100`,
      args: [userId, language],
    })
  ).rows;
  return rows.map((r) => ({
    original: r.original as string,
    fix: r.fix as string,
    explanation: r.explanation as string,
    createdAt: r.created_at as number,
  }));
}

export interface Card {
  id: number;
  word: string;
  translation: string;
  example: string;
}

export async function dueCards(userId: string, language: string, limit = 20): Promise<Card[]> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: `SELECT id, word, translation, example FROM cards
            WHERE user_id = ? AND language = ? AND due_at <= ? ORDER BY due_at LIMIT ?`,
      args: [userId, language, Date.now(), limit],
    })
  ).rows;
  return rows.map((r) => ({
    id: r.id as number,
    word: r.word as string,
    translation: r.translation as string,
    example: r.example as string,
  }));
}

export async function countDueCards(userId: string): Promise<Record<string, number>> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: "SELECT language, COUNT(*) AS n FROM cards WHERE user_id = ? AND due_at <= ? GROUP BY language",
      args: [userId, Date.now()],
    })
  ).rows;
  return Object.fromEntries(rows.map((r) => [r.language as string, Number(r.n)]));
}

export type Grade = "again" | "good" | "easy";

// Revisão espaçada simplificada (estilo SM-2).
export async function reviewCard(userId: string, cardId: number, grade: Grade): Promise<boolean> {
  const client = await db();
  const row = (
    await client.execute({
      sql: "SELECT interval_days, ease, reps FROM cards WHERE id = ? AND user_id = ?",
      args: [cardId, userId],
    })
  ).rows[0];
  if (!row) return false;
  let interval = Number(row.interval_days);
  let ease = Number(row.ease);
  let reps = Number(row.reps);

  if (grade === "again") {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = grade === "easy" ? 3 : 1;
    else if (reps === 2) interval = grade === "easy" ? 6 : 3;
    else interval = interval * ease * (grade === "easy" ? 1.3 : 1);
    if (grade === "easy") ease += 0.15;
  }
  // "again" volta em 10 minutos, na mesma sessão de revisão
  const dueAt = Date.now() + (interval === 0 ? 10 * 60_000 : interval * DAY_MS);
  await client.execute({
    sql: "UPDATE cards SET interval_days = ?, ease = ?, reps = ?, due_at = ? WHERE id = ?",
    args: [interval, ease, reps, dueAt, cardId],
  });
  return true;
}

// Dias seguidos com pelo menos uma mensagem enviada (hoje ou até ontem).
export async function streak(userId: string): Promise<number> {
  const client = await db();
  const days = new Set(
    (
      await client.execute({
        sql: "SELECT day FROM daily_usage WHERE user_id = ? ORDER BY day DESC LIMIT 400",
        args: [userId],
      })
    ).rows.map((r) => r.day as string),
  );
  let count = 0;
  let cursor = Date.now();
  if (!days.has(today(cursor))) cursor -= DAY_MS; // ainda dá tempo de manter a sequência hoje
  while (days.has(today(cursor))) {
    count++;
    cursor -= DAY_MS;
  }
  return count;
}

export async function getLevels(userId: string): Promise<Record<string, { level: string; summary: string | null }>> {
  const client = await db();
  const rows = (
    await client.execute({ sql: "SELECT language, level, summary FROM user_languages WHERE user_id = ?", args: [userId] })
  ).rows;
  return Object.fromEntries(
    rows.map((r) => [r.language as string, { level: r.level as string, summary: (r.summary as string | null) ?? null }]),
  );
}

export async function saveLevel(userId: string, language: string, level: string, summary: string) {
  const client = await db();
  await client.execute({
    sql: `INSERT INTO user_languages (user_id, language, level, summary) VALUES (?, ?, ?, ?)
          ON CONFLICT (user_id, language) DO UPDATE SET level = excluded.level, summary = excluded.summary`,
    args: [userId, language, level, summary],
  });
}
