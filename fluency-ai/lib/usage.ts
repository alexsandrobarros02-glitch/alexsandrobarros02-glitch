"use client";

// Limite do plano grátis guardado no navegador. É provisório: quando entrar
// login + Pix, a contagem passa para o servidor, junto com o status do plano Pro.

export const FREE_CONVERSATIONS_PER_WEEK = 3;
const KEY = "fluency.usage";

function weekKey(date = new Date()): string {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function read(): { week: string; count: number } {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (data && data.week === weekKey()) return data;
  } catch {}
  return { week: weekKey(), count: 0 };
}

export function conversationsLeft(): number {
  return Math.max(0, FREE_CONVERSATIONS_PER_WEEK - read().count);
}

export function registerConversation() {
  const data = read();
  try {
    localStorage.setItem(KEY, JSON.stringify({ week: data.week, count: data.count + 1 }));
  } catch {}
}
