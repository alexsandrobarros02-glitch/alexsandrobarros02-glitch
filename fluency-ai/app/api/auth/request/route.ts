import { z } from "zod";
import { normalizeEmail, requestLoginCode } from "@/lib/server/auth";

const Body = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  const result = await requestLoginCode(normalizeEmail(parsed.data.email));
  if (!result.ok) return Response.json({ error: result.error }, { status: 429 });
  return Response.json({ ok: true });
}
