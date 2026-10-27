import { currentUser } from "@/lib/server/auth";
import { paymentStatus } from "@/lib/server/billing";
import { unauthorized } from "@/lib/server/claude";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    const status = await paymentStatus(id, user.id);
    if (!status) return Response.json({ error: "Pagamento não encontrado." }, { status: 404 });
    return Response.json({ status });
  } catch (error) {
    console.error(error);
    return Response.json({ status: "pending" });
  }
}
