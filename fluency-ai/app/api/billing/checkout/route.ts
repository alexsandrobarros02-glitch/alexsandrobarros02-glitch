import { z } from "zod";
import { isPlanId } from "@/lib/plans";
import { currentUser } from "@/lib/server/auth";
import { createPixCharge, isValidCpf } from "@/lib/server/billing";
import { unauthorized } from "@/lib/server/claude";

const Body = z.object({ plan: z.string(), name: z.string().trim().min(3).max(120), cpf: z.string().max(20) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPlanId(parsed.data.plan)) {
    return Response.json({ error: "Preencha seu nome completo." }, { status: 400 });
  }
  if (!isValidCpf(parsed.data.cpf)) return Response.json({ error: "CPF inválido." }, { status: 400 });
  try {
    return Response.json(await createPixCharge(user, parsed.data.plan, parsed.data.name, parsed.data.cpf));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível gerar o Pix agora. Tente de novo." }, { status: 502 });
  }
}
