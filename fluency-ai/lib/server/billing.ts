import "server-only";
import { randomUUID } from "node:crypto";
import { PLANS, isPlanId, type PlanId } from "@/lib/plans";
import type { User } from "./auth";
import { db } from "./db";
import { today } from "./plan";

// Pagamentos via Pix pelo Asaas (https://docs.asaas.com).
// Sem ASAAS_API_KEY, fora de produção, roda em modo simulação para testar o fluxo.

const DAY_MS = 86_400_000;
const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export function simulationMode(): boolean {
  return !process.env.ASAAS_API_KEY && process.env.NODE_ENV !== "production";
}

async function asaas<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurado");
  const base = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";
  const res = await fetch(`${base}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
      "User-Agent": "fluency-ai",
    },
    // GETs precisam ir sem corpo, senão o Asaas responde 403
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Asaas ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export interface PixCharge {
  paymentId: string;
  plan: PlanId;
  value: number;
  qrCodeImage: string | null; // PNG em base64
  copyPaste: string;
  expiresAt: string | null;
  simulation: boolean;
}

export async function createPixCharge(user: User, plan: PlanId, name: string, cpf: string): Promise<PixCharge> {
  const client = await db();
  const { value } = PLANS[plan];

  if (simulationMode()) {
    const paymentId = `sim_${randomUUID()}`;
    await insertPayment(paymentId, user.id, plan, value);
    return {
      paymentId,
      plan,
      value,
      qrCodeImage: null,
      copyPaste: "00020126-SIMULACAO-PIX-FLUENCY",
      expiresAt: null,
      simulation: true,
    };
  }

  let customerId = user.asaasCustomerId;
  if (!customerId) {
    const customer = await asaas<{ id: string }>("/customers", {
      method: "POST",
      body: { name, cpfCnpj: cpf.replace(/\D/g, ""), email: user.email, externalReference: user.id },
    });
    customerId = customer.id;
    await client.execute({ sql: "UPDATE users SET asaas_customer_id = ?, name = ? WHERE id = ?", args: [customerId, name, user.id] });
  }

  const payment = await asaas<{ id: string }>("/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "PIX",
      value,
      dueDate: today(),
      description: `Fluency ${PLANS[plan].name}`,
      externalReference: `${user.id}:${plan}`,
    },
  });
  await insertPayment(payment.id, user.id, plan, value);

  const qr = await asaas<{ encodedImage: string; payload: string; expirationDate: string }>(
    `/payments/${payment.id}/pixQrCode`,
  );
  return {
    paymentId: payment.id,
    plan,
    value,
    qrCodeImage: qr.encodedImage,
    copyPaste: qr.payload,
    expiresAt: qr.expirationDate,
    simulation: false,
  };
}

async function insertPayment(id: string, userId: string, plan: PlanId, value: number) {
  const client = await db();
  await client.execute({
    sql: "INSERT INTO payments (id, user_id, plan, value, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    args: [id, userId, plan, value, Date.now()],
  });
}

// Marca o pagamento como pago e estende o Pro. Idempotente: webhooks repetidos não dão dias a mais.
export async function applyPaidPayment(paymentId: string): Promise<boolean> {
  const client = await db();
  const tx = await client.transaction("write");
  try {
    const row = (
      await tx.execute({ sql: "SELECT user_id, plan, status FROM payments WHERE id = ?", args: [paymentId] })
    ).rows[0];
    if (!row || row.status === "paid" || !isPlanId(row.plan as string)) {
      await tx.rollback();
      return false;
    }
    const now = Date.now();
    const days = PLANS[row.plan as PlanId].days;
    await tx.execute({ sql: "UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?", args: [now, paymentId] });
    await tx.execute({
      sql: "UPDATE users SET pro_until = MAX(pro_until, ?) + ? WHERE id = ?",
      args: [now, days * DAY_MS, row.user_id as string],
    });
    await tx.commit();
    return true;
  } finally {
    tx.close();
  }
}

export async function paymentStatus(paymentId: string, userId: string): Promise<"pending" | "paid" | null> {
  const client = await db();
  const row = (
    await client.execute({ sql: "SELECT status FROM payments WHERE id = ? AND user_id = ?", args: [paymentId, userId] })
  ).rows[0];
  if (!row) return null;
  if (row.status === "paid") return "paid";

  // Se o webhook atrasar, consulta o Asaas direto.
  if (!paymentId.startsWith("sim_") && !simulationMode()) {
    const payment = await asaas<{ status: string }>(`/payments/${paymentId}`);
    if (PAID_STATUSES.has(payment.status)) {
      await applyPaidPayment(paymentId);
      return "paid";
    }
  }
  return "pending";
}

export async function handleWebhookEvent(event: { id?: string; event?: string; payment?: { id?: string } }) {
  if (!event.id || !event.payment?.id) return;
  // Entrega "pelo menos uma vez": applyPaidPayment é idempotente, então repetir um evento é seguro.
  // O evento só é registrado depois de processado, para que uma falha seja reenviada pelo Asaas.
  if (event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED") {
    await applyPaidPayment(event.payment.id);
  }
  const client = await db();
  await client.execute({
    sql: "INSERT INTO webhook_events (id, received_at) VALUES (?, ?) ON CONFLICT (id) DO NOTHING",
    args: [event.id, Date.now()],
  });
}
