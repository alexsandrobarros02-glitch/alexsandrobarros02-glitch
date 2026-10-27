import { timingSafeEqual } from "node:crypto";
import { handleWebhookEvent } from "@/lib/server/billing";

// Configure no painel do Asaas: URL https://SEU-DOMINIO/api/billing/webhook,
// eventos de cobrança e o mesmo token de ASAAS_WEBHOOK_TOKEN.
export async function POST(req: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const given = req.headers.get("asaas-access-token") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const event = await req.json().catch(() => null);
  if (!event) return Response.json({ error: "invalid body" }, { status: 400 });
  await handleWebhookEvent(event);
  return Response.json({ received: true });
}
