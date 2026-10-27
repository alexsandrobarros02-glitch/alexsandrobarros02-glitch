import "server-only";

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Envia pelo Resend. Sem RESEND_API_KEY em desenvolvimento, só mostra no terminal.
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurado");
    console.log(`[dev] E-mail para ${to}: ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Fluency <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao enviar e-mail: ${res.status} ${await res.text()}`);
}

export function emailLayout(body: string, unsubscribeUrl?: string): string {
  const footer = unsubscribeUrl
    ? `<p style="color:#888;font-size:12px;margin-top:32px">Não quer mais receber lembretes? <a href="${unsubscribeUrl}" style="color:#888">Cancelar lembretes</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c1b29">${body}${footer}</div>`;
}

export function emailButton(label: string, url: string): string {
  return `<p><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">${label}</a></p>`;
}
