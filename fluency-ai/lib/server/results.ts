import "server-only";
import { randomBytes } from "node:crypto";
import type { PlacementResult } from "@/lib/tutor";
import { db } from "./db";

export interface SharedResult extends PlacementResult {
  id: string;
  language: string;
}

export async function saveResult(userId: string, language: string, result: PlacementResult): Promise<string> {
  // id curto e impossível de adivinhar: o link é público, mas não lista os resultados de ninguém.
  const id = randomBytes(9).toString("base64url");
  const client = await db();
  await client.execute({
    sql: `INSERT INTO placement_results (id, user_id, language, level, summary, strengths, focus, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      language,
      result.level,
      result.summary_pt,
      JSON.stringify(result.strengths_pt),
      JSON.stringify(result.focus_pt),
      Date.now(),
    ],
  });
  return id;
}

export async function getResult(id: string): Promise<SharedResult | null> {
  const client = await db();
  const row = (
    await client.execute({
      sql: "SELECT id, language, level, summary, strengths, focus FROM placement_results WHERE id = ?",
      args: [id],
    })
  ).rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    language: row.language as string,
    level: row.level as PlacementResult["level"],
    summary_pt: row.summary as string,
    strengths_pt: JSON.parse(row.strengths as string),
    focus_pt: JSON.parse(row.focus as string),
  };
}
