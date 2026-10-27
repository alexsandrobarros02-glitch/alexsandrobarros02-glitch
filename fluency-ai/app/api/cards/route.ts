import { getLanguage } from "@/lib/languages";
import { currentUser } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/claude";
import { dueCards } from "@/lib/server/learning";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const language = getLanguage(new URL(req.url).searchParams.get("idioma") ?? "");
  if (!language) return Response.json({ error: "Idioma inválido." }, { status: 400 });
  return Response.json({ cards: await dueCards(user.id, language.code) });
}
