import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getLanguage, isLevel } from "@/lib/languages";
import { getScenario } from "@/lib/scenarios";
import { buildSystemPrompt, TutorReplySchema } from "@/lib/tutor";

const client = new Anthropic();
const MODEL = process.env.TUTOR_MODEL || "claude-haiku-5-5";

// Mantém o custo por mensagem previsível: só as últimas trocas vão para a IA.
const MAX_HISTORY = 20;

const RequestSchema = z.object({
  language: z.string(),
  level: z.string(),
  scenario: z.string(),
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
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const { level, messages } = parsed.data;
  const language = getLanguage(parsed.data.language);
  const scenario = getScenario(parsed.data.scenario);
  if (!language || !scenario || !isLevel(level)) {
    return Response.json({ error: "Idioma, nível ou cenário inválido." }, { status: 400 });
  }

  // A conversa precisa começar com o aluno; descarta respostas soltas no início do recorte.
  let history = messages.slice(-MAX_HISTORY);
  while (history.length && history[0].role !== "user") history = history.slice(1);
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "A última mensagem deve ser do aluno." }, { status: 400 });
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      cache_control: { type: "ephemeral" },
      system: buildSystemPrompt(language, level, scenario),
      messages: history.map((m) => ({ role: m.role, content: m.text })),
      output_config: { effort: "low", format: zodOutputFormat(TutorReplySchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json(
        { error: "O professor não conseguiu responder a essa mensagem. Tente reformular." },
        { status: 502 },
      );
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Muitos alunos ao mesmo tempo. Tente de novo em instantes." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY ausente ou inválida");
      return Response.json({ error: "Serviço não configurado." }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Erro da API ${error.status}:`, error.message);
      return Response.json({ error: "Erro ao falar com o professor. Tente de novo." }, { status: 502 });
    }
    // Ex.: nenhuma credencial configurada no servidor.
    console.error(error);
    return Response.json({ error: "Serviço não configurado." }, { status: 500 });
  }
}
