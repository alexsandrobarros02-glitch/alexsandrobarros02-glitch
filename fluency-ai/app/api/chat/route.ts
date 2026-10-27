import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getLanguage, isLevel } from "@/lib/languages";
import { PLACEMENT_SCENARIO, PLACEMENT_TURNS, getScenario } from "@/lib/scenarios";
import { currentUser, isPro } from "@/lib/server/auth";
import { TUTOR_MODEL, claude, claudeErrorResponse, unauthorized } from "@/lib/server/claude";
import { db } from "@/lib/server/db";
import { recordTurn } from "@/lib/server/learning";
import { PRO_MESSAGES_PER_DAY, messagesPerConversation, messagesToday } from "@/lib/server/plan";
import { buildSystemPrompt, TutorReplySchema } from "@/lib/tutor";

// Mantém o custo por mensagem previsível: só as últimas trocas vão para a IA.
const MAX_HISTORY = 20;
const START = "[START]";

const RequestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const { conversationId, messages } = parsed.data;

  const client = await db();
  const conversation = (
    await client.execute({
      sql: "SELECT language, level, scenario, focus, user_messages, opened FROM conversations WHERE id = ? AND user_id = ?",
      args: [conversationId, user.id],
    })
  ).rows[0];
  if (!conversation) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });

  const language = getLanguage(conversation.language as string);
  const scenario = getScenario(conversation.scenario as string);
  const level = conversation.level as string;
  if (!language || !scenario || !isLevel(level)) {
    return Response.json({ error: "Conversa inválida." }, { status: 400 });
  }

  const opening = messages.length === 1 && messages[0].text === START;
  if (opening && Number(conversation.opened)) {
    return Response.json({ error: "Esta conversa já começou." }, { status: 409 });
  }
  if (!opening) {
    const limit = scenario.id === PLACEMENT_SCENARIO.id ? PLACEMENT_TURNS : messagesPerConversation(user);
    if (Number(conversation.user_messages) >= limit) {
      return Response.json({ error: "Esta conversa chegou ao fim. Comece uma nova!", ended: true }, { status: 429 });
    }
    if (isPro(user) && (await messagesToday(user)) >= PRO_MESSAGES_PER_DAY) {
      return Response.json({ error: "Você atingiu o limite de prática de hoje. Volte amanhã!" }, { status: 429 });
    }
  }

  // A conversa precisa começar com o aluno; descarta respostas soltas no início do recorte.
  let history = messages.slice(-MAX_HISTORY);
  while (history.length && history[0].role !== "user") history = history.slice(1);
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "A última mensagem deve ser do aluno." }, { status: 400 });
  }

  try {
    const response = await claude.messages.parse({
      model: TUTOR_MODEL,
      max_tokens: 4000,
      cache_control: { type: "ephemeral" },
      system: buildSystemPrompt(language, level, scenario, conversation.focus as string),
      messages: history.map((m) => ({ role: m.role, content: m.text })),
      output_config: { effort: "low", format: zodOutputFormat(TutorReplySchema) },
    });

    const reply = response.parsed_output;
    if (response.stop_reason === "refusal" || !reply) {
      return Response.json(
        { error: "O professor não conseguiu responder a essa mensagem. Tente reformular." },
        { status: 502 },
      );
    }

    if (opening) {
      await client.execute({ sql: "UPDATE conversations SET opened = 1 WHERE id = ?", args: [conversationId] });
    } else {
      await client.execute({
        sql: "UPDATE conversations SET user_messages = user_messages + 1 WHERE id = ?",
        args: [conversationId],
      });
      await recordTurn(user.id, language.code, reply);
    }
    return Response.json(reply);
  } catch (error) {
    return claudeErrorResponse(error);
  }
}
