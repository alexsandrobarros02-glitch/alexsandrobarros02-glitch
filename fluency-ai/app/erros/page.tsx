"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguage } from "@/lib/languages";
import { api } from "@/lib/client";

interface Mistake {
  original: string;
  fix: string;
  explanation: string;
  createdAt: number;
}

export default function Erros() {
  const [code, setCode] = useState("");
  const [mistakes, setMistakes] = useState<Mistake[] | null>(null);
  const language = getLanguage(code);

  useEffect(() => {
    const idioma = new URLSearchParams(window.location.search).get("idioma") ?? "";
    setCode(idioma);
    api<{ mistakes: Mistake[] }>(`/api/mistakes?idioma=${encodeURIComponent(idioma)}`).then(
      (r) => setMistakes(r.mistakes),
      () => setMistakes([]),
    );
  }, []);

  return (
    <main className="container narrow">
      <Link href={`/praticar?idioma=${code}`} className="link-btn">← Voltar</Link>
      <h1>Meus erros {language ? `${language.flag}` : ""}</h1>
      <p className="sub">O professor usa os seus erros mais recentes para criar chances de você praticá-los de novo.</p>
      {!mistakes ? (
        <p className="typing">Carregando…</p>
      ) : mistakes.length === 0 ? (
        <div className="card">Nenhum erro registrado ainda. Comece uma conversa!</div>
      ) : (
        <div className="list">
          {mistakes.map((m, i) => (
            <div key={i} className="card">
              <div>
                <s>{m.original}</s> → <strong>{m.fix}</strong>
              </div>
              <div className="sub">{m.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
