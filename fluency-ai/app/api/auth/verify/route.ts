import { z } from "zod";
import { normalizeEmail, verifyLoginCode } from "@/lib/server/auth";

const Body = z.object({ email: z.string().email().max(200), code: z.string().regex(/^\s*\d{6}\s*$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Código inválido." }, { status: 400 });
  const user = await verifyLoginCode(normalizeEmail(parsed.data.email), parsed.data.code);
  if (!user) return Response.json({ error: "Código incorreto ou expirado." }, { status: 401 });
  return Response.json({ ok: true });
}
