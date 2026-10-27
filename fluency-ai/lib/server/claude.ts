import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic();
export const TUTOR_MODEL = process.env.TUTOR_MODEL || "claude-haiku-5-5";

export function claudeErrorResponse(error: unknown): Response {
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

export function unauthorized(): Response {
  return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
}
