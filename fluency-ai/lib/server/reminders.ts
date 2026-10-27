import "server-only";
import { sign } from "./auth";
import { db } from "./db";
import { appUrl, emailButton, emailLayout, sendEmail } from "./email";
import { streak } from "./learning";
import { today } from "./plan";

const DAY_MS = 86_400_000;
const EXPIRY_WARNING_DAYS = 3;

interface Recipient {
  id: string;
  email: string;
}

function unsubscribeUrl(userId: string): string {
  return `${appUrl()}/api/email/cancelar?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

// Registra o envio antes de mandar: se a rotina rodar duas vezes no mesmo dia, ninguém recebe repetido.
async function claim(userId: string, kind: string, ref: string): Promise<boolean> {
  const client = await db();
  const result = await client.execute({
    sql: "INSERT INTO reminders_sent (user_id, kind, ref, sent_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
    args: [userId, kind, ref, Date.now()],
  });
  return result.rowsAffected > 0;
}

async function streakAtRisk(now: number): Promise<Recipient[]> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: `SELECT u.id, u.email FROM users u
            JOIN daily_usage y ON y.user_id = u.id AND y.day = ?
            WHERE u.email_opt_out = 0
              AND NOT EXISTS (SELECT 1 FROM daily_usage t WHERE t.user_id = u.id AND t.day = ?)`,
      args: [today(now - DAY_MS), today(now)],
    })
  ).rows;
  return rows.map((r) => ({ id: r.id as string, email: r.email as string }));
}

async function planExpiring(now: number): Promise<(Recipient & { proUntil: number })[]> {
  const client = await db();
  const rows = (
    await client.execute({
      sql: "SELECT id, email, pro_until FROM users WHERE email_opt_out = 0 AND pro_until > ? AND pro_until <= ?",
      args: [now, now + EXPIRY_WARNING_DAYS * DAY_MS],
    })
  ).rows;
  return rows.map((r) => ({ id: r.id as string, email: r.email as string, proUntil: Number(r.pro_until) }));
}

export async function sendReminders(now = Date.now()) {
  let sent = 0;
  let failed = 0;

  for (const user of await streakAtRisk(now)) {
    const days = await streak(user.id);
    if (days < 2 || !(await claim(user.id, "streak", today(now)))) continue;
    try {
      await sendEmail(
        user.email,
        `🔥 Sua sequência de ${days} dias termina hoje`,
        emailLayout(
          `<h2>Não perca sua sequência de ${days} dias!</h2>
           <p>Uma conversa de 5 minutos hoje mantém o seu ritmo — e é o ritmo que faz você falar de verdade.</p>
           ${emailButton("Praticar agora", `${appUrl()}/app`)}`,
          unsubscribeUrl(user.id),
        ),
      );
      sent++;
    } catch (error) {
      console.error(error);
      failed++;
    }
  }

  for (const user of await planExpiring(now)) {
    // ref = data de vencimento: um aviso por período, e um novo se o plano for renovado.
    if (!(await claim(user.id, "plan_expiring", String(user.proUntil)))) continue;
    const date = new Date(user.proUntil).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    try {
      await sendEmail(
        user.email,
        `Seu Fluency Pro vence em ${date}`,
        emailLayout(
          `<h2>Seu Pro vence em ${date}</h2>
           <p>Renove por Pix em menos de um minuto e continue praticando sem limites. Os dias pagos agora somam ao seu plano atual.</p>
           ${emailButton("Renovar com Pix", `${appUrl()}/assinar`)}`,
          unsubscribeUrl(user.id),
        ),
      );
      sent++;
    } catch (error) {
      console.error(error);
      failed++;
    }
  }

  return { sent, failed };
}

export async function optOut(userId: string) {
  const client = await db();
  await client.execute({ sql: "UPDATE users SET email_opt_out = 1 WHERE id = ?", args: [userId] });
}
