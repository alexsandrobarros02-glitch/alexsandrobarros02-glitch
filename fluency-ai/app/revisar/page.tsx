"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguage } from "@/lib/languages";
import { api } from "@/lib/client";
import { speak } from "@/lib/speech";

interface Card {
  id: number;
  word: string;
  translation: string;
  example: string;
}

export default function Revisar() {
  const [code, setCode] = useState("");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const language = getLanguage(code);

  useEffect(() => {
    const idioma = new URLSearchParams(window.location.search).get("idioma") ?? "";
    setCode(idioma);
    api<{ cards: Card[] }>(`/api/cards?idioma=${encodeURIComponent(idioma)}`).then((r) => setCards(r.cards), () => setCards([]));
  }, []);

  async function grade(g: "again" | "good" | "easy") {
    if (!cards?.length) return;
    const [card, ...rest] = cards;
    await api("/api/cards/review", { id: card.id, grade: g }).catch(() => {});
    // "De novo" volta para o fim da fila desta sessão.
    setCards(g === "again" ? [...rest, card] : rest);
    if (g !== "again") setDone((n) => n + 1);
    setFlipped(false);
  }

  const card = cards?.[0];
  return (
    <main className="container narrow">
      <Link href="/app" className="link-btn">← Painel</Link>
      <h1>Revisar {language ? `${language.flag} ${language.name}` : ""}</h1>
      {!cards ? (
        <p className="typing">Carregando…</p>
      ) : !card ? (
        <div className="card">
          <div className="title">{done > 0 ? `🎉 ${done} palavras revisadas!` : "Nada para revisar agora."}</div>
          <div className="sub">As palavras novas das suas conversas aparecem aqui no momento certo de revisar.</div>
          <p>
            <Link href={`/praticar?idioma=${code}`} className="btn">Praticar conversa</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="sub">{cards.length} restantes</p>
          <button className="card flashcard" onClick={() => setFlipped(true)}>
            <div className="word-big">{card.word}</div>
            {flipped ? (
              <>
                <div className="title">{card.translation}</div>
                <div className="sub">{card.example}</div>
              </>
            ) : (
              <div className="sub">Toque para ver a tradução</div>
            )}
          </button>
          <div className="actions-row">
            {language && (
              <button className="btn ghost" onClick={() => speak(card.word, language.speechLocale)}>▶ Ouvir</button>
            )}
          </div>
          {flipped && (
            <div className="actions-row">
              <button className="btn ghost" onClick={() => grade("again")}>De novo</button>
              <button className="btn" onClick={() => grade("good")}>Lembrei</button>
              <button className="btn ghost" onClick={() => grade("easy")}>Fácil</button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
