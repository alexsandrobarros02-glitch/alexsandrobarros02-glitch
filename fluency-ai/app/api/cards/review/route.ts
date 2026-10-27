import { z } from "zod";
import { currentUser } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/claude";
import { reviewCard } from "@/lib/server/learning";

const Body = z.object({ id: z.number().int(), grade: z.enum(["again", "good", "easy"]) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requisição inválida." }, { status: 400 });
  const ok = await reviewCard(user.id, parsed.data.id, parsed.data.grade);
  if (!ok) return Response.json({ error: "Cartão não encontrado." }, { status: 404 });
  return Response.json({ ok: true });
}
