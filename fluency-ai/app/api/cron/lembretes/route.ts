import { sendReminders } from "@/lib/server/reminders";

// Chamada uma vez por dia pelo agendador da Vercel (vercel.json), que envia
// "Authorization: Bearer CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await sendReminders());
}
