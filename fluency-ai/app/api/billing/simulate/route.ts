import { currentUser } from "@/lib/server/auth";
import { applyPaidPayment, simulationMode } from "@/lib/server/billing";
import { unauthorized } from "@/lib/server/claude";
import { db } from "@/lib/server/db";

// Só existe em desenvolvimento sem chave do Asaas: confirma um Pix simulado.
export async function POST(req: Request) {
  if (!simulationMode()) return Response.json({ error: "not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await req.json().catch(() => ({ id: "" }));
  const client = await db();
  const owned = await client.execute({ sql: "SELECT 1 FROM payments WHERE id = ? AND user_id = ?", args: [String(id), user.id] });
  if (!owned.rows.length) return Response.json({ error: "Pagamento não encontrado." }, { status: 404 });
  await applyPaidPayment(String(id));
  return Response.json({ ok: true });
}
