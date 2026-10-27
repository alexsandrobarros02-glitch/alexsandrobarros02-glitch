"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(message);
  }
}

// Chama a API do app; sem login, manda para a tela de entrada.
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth")) {
    window.location.href = `/entrar?voltar=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) throw new ApiError(data.error ?? "Erro inesperado.", res.status, data);
  return data as T;
}

export interface Me {
  email: string;
  pro: boolean;
  proUntil: number | null;
  freeConversationsLeft: number | null;
  messagesToday: number;
  proMessagesPerDay: number;
  practicedToday: boolean;
  streak: number;
  dueCards: Record<string, number>;
  levels: Record<string, { level: string; summary: string | null }>;
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const reload = useCallback(() => {
    api<Me>("/api/me").then(setMe, () => {});
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { me, reload };
}
