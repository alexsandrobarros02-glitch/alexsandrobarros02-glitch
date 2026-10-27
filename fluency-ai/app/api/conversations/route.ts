import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getLanguage, isLevel } from "@/lib/languages";
import { PLACEMENT_SCENARIO, getScenario } from "@/lib/scenarios";
import { currentUser, isPro } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/claude";
import { db } from "@/lib/server/db";
import { recentMistakes } from "@/lib/server/learning";
import { PRO_MESSAGES_PER_DAY, freeConversationsLeft, messagesToday } from "@/lib/server/plan";

const Body = z.object({ language: z.string(), level: z.string(), scenario: z.string() });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const language = parsed.success ? getLanguage(parsed.data.language) : undefined;
  const scenario = parsed.success ? getScenario(parsed.data.scenario) : undefined;
  if (!parsed.success || !language || !scenario || !isLevel(parsed.data.level)) {
    return Response.json({ error: "Idioma, nível ou cenário inválido." }, { status: 400 });
  }

  const placement = scenario.id === PLACEMENT_SCENARIO.id;
  if (!placement) {
    const left = await freeConversationsLeft(user);
    if (left === 0) {
      return Response.json({ error: "Você usou as conversas grátis desta semana.", upgrade: true }, { status: 402 });
    }
  }
  if (isPro(user) && (await messagesToday(user)) >= PRO_MESSAGES_PER_DAY) {
    return Response.json({ error: "Você atingiu o limite de prática de hoje. Volte amanhã!" }, { status: 429 });
  }

  // O nivelamento começa sempre do básico; as outras conversas focam nos erros recentes.
  const level = placement ? "A2" : parsed.data.level;
  const focus = placement ? "" : (await recentMistakes(user.id, language.code)).join("\n");
  const id = randomUUID();
  const client = await db();
  await client.execute({
    sql: `INSERT INTO conversations (id, user_id, language, level, scenario, focus, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, user.id, language.code, level, scenario.id, focus, Date.now()],
  });
  return Response.json({ id });
}
