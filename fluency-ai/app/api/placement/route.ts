import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getLanguage } from "@/lib/languages";
import { PLACEMENT_SCENARIO } from "@/lib/scenarios";
import { currentUser } from "@/lib/server/auth";
import { TUTOR_MODEL, claude, claudeErrorResponse, unauthorized } from "@/lib/server/claude";
import { db } from "@/lib/server/db";
import { saveLevel } from "@/lib/server/learning";
import { buildPlacementPrompt, PlacementResultSchema } from "@/lib/tutor";

const MIN_TURNS = 3;

const Body = z.object({
  conversationId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(1000) }))
    .max(40),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requisição inválida." }, { status: 400 });

  const client = await db();
  const conversation = (
    await client.execute({
      sql: "SELECT language, scenario, user_messages FROM conversations WHERE id = ? AND user_id = ?",
      args: [parsed.data.conversationId, user.id],
    })
  ).rows[0];
  const language = conversation ? getLanguage(conversation.language as string) : undefined;
  if (!conversation || !language || conversation.scenario !== PLACEMENT_SCENARIO.id) {
    return Response.json({ error: "Teste de nível não encontrado." }, { status: 404 });
  }
  if (Number(conversation.user_messages) < MIN_TURNS) {
    return Response.json({ error: "Responda mais algumas perguntas antes do resultado." }, { status: 400 });
  }

  const transcript = parsed.data.messages
    .filter((m) => m.text !== "[START]")
    .map((m) => `${m.role === "user" ? "LEARNER" : "EXAMINER"}: ${m.text}`)
    .join("\n");

  try {
    const response = await claude.messages.parse({
      model: TUTOR_MODEL,
      max_tokens: 4000,
      system: buildPlacementPrompt(language),
      messages: [{ role: "user", content: `<transcript>\n${transcript}\n</transcript>` }],
      output_config: { effort: "medium", format: zodOutputFormat(PlacementResultSchema) },
    });
    const result = response.parsed_output;
    if (response.stop_reason === "refusal" || !result) {
      return Response.json({ error: "Não foi possível avaliar agora. Tente de novo." }, { status: 502 });
    }
    await saveLevel(user.id, language.code, result.level, result.summary_pt);
    return Response.json(result);
  } catch (error) {
    return claudeErrorResponse(error);
  }
}
