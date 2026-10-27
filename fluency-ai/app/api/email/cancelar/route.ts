import { verifySignature } from "@/lib/server/auth";
import { optOut } from "@/lib/server/reminders";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const userId = params.get("u") ?? "";
  const ok = userId !== "" && verifySignature(userId, params.get("t") ?? "");
  if (ok) await optOut(userId);
  const message = ok ? "Pronto! Você não vai mais receber lembretes por e-mail." : "Link inválido.";
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fluency</title><body style="font-family:system-ui;max-width:480px;margin:48px auto;padding:0 16px"><h1>Fluency</h1><p>${message}</p><p><a href="/app">Voltar ao app</a></p></body>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
