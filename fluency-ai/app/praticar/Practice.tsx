"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LEVELS, LEVEL_LABELS, type Language, type Level } from "@/lib/languages";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { speak, useSpeechRecognition } from "@/lib/speech";
import type { TutorReply } from "@/lib/tutor";
import { conversationsLeft, FREE_CONVERSATIONS_PER_WEEK, registerConversation } from "@/lib/usage";

const START = "[START]";

type Entry =
  | { role: "user"; text: string; feedback?: TutorReply["feedback"] }
  | { role: "assistant"; text: string; data: TutorReply };

export default function Practice({ language }: { language: Language }) {
  const [level, setLevel] = useState<Level>("A2");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [left, setLeft] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mic = useSpeechRecognition(language.speechLocale, (text) => send(text));

  useEffect(() => {
    setLeft(conversationsLeft());
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, loading]);

  async function request(history: Entry[], current: Scenario) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language.code,
          level,
          scenario: current.id,
          messages: history.map((e) => ({ role: e.role, text: e.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro inesperado.");
      const reply = data as TutorReply;
      setEntries((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "user" && last.text !== START) next[next.length - 1] = { ...last, feedback: reply.feedback };
        return [...next, { role: "assistant", text: reply.reply, data: reply }];
      });
      if (autoSpeak) speak(reply.reply, language.speechLocale);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function begin(chosen: Scenario) {
    registerConversation();
    setLeft(conversationsLeft());
    setScenario(chosen);
    const first: Entry[] = [{ role: "user", text: START }];
    setEntries(first);
    request(first, chosen);
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || loading || !scenario) return;
    const next: Entry[] = [...entries, { role: "user", text: clean }];
    setEntries(next);
    setInput("");
    request(next, scenario);
  }

  if (!scenario) {
    const blocked = left !== null && left <= 0;
    return (
      <main className="container">
        <Link href="/" className="link-btn">← Trocar idioma</Link>
        <h1>{language.flag} {language.name}</h1>

        <h2 className="section-title">Seu nível</h2>
        <div className="chips">
          {LEVELS.map((l) => (
            <button key={l} className={`chip ${l === level ? "selected" : ""}`} onClick={() => setLevel(l)}>
              {l} · {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>

        <h2 className="section-title">Escolha uma situação</h2>
        {blocked ? (
          <div className="notice">
            Você usou as {FREE_CONVERSATIONS_PER_WEEK} conversas grátis desta semana. Assine o <strong>Pro por R$ 6,99/mês</strong> ou{" "}
            <strong>R$ 36,99/ano</strong> via Pix para praticar sem parar. (Pagamento Pix chegando em breve.)
          </div>
        ) : (
          <>
            {left !== null && <p className="sub">Conversas grátis restantes nesta semana: {left}</p>}
            <div className="grid">
              {SCENARIOS.map((s) => (
                <button key={s.id} className="card" onClick={() => begin(s)}>
                  <div className="emoji">{s.emoji}</div>
                  <div className="title">{s.title}</div>
                  <div className="sub">{s.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="container">
      <div className="chat-header">
        <div>
          <strong>{scenario.emoji} {scenario.title}</strong>
          <div className="meta">{language.flag} {language.name} · {level}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => setAutoSpeak((v) => !v)} title="Ler respostas em voz alta">
            {autoSpeak ? "🔊" : "🔇"}
          </button>
          <button className="btn ghost" onClick={() => { setScenario(null); setEntries([]); }}>
            Encerrar
          </button>
        </div>
      </div>

      <div className="messages">
        {entries.map((entry, i) =>
          entry.role === "assistant" ? (
            <AssistantBubble key={i} entry={entry} locale={language.speechLocale} />
          ) : entry.text === START ? null : (
            <UserBubble key={i} entry={entry} />
          ),
        )}
        {loading && <div className="typing">O professor está escrevendo…</div>}
        {mic.listening && mic.interim && <div className="bubble user" style={{ opacity: 0.6 }}>{mic.interim}</div>}
        {error && <div className="error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <form
          className="composer-inner"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={mic.supported ? "Fale no microfone ou digite…" : "Digite sua resposta…"}
            rows={1}
            maxLength={1000}
          />
          {input.trim() ? (
            <button type="submit" className="mic" disabled={loading} aria-label="Enviar">➤</button>
          ) : mic.supported ? (
            <button
              type="button"
              className={`mic ${mic.listening ? "listening" : ""}`}
              disabled={loading}
              onClick={mic.listening ? mic.stop : mic.start}
              aria-label={mic.listening ? "Parar de gravar" : "Falar"}
            >
              🎤
            </button>
          ) : null}
        </form>
      </div>
    </main>
  );
}

function AssistantBubble({ entry, locale }: { entry: Extract<Entry, { role: "assistant" }>; locale: string }) {
  const [showTranslation, setShowTranslation] = useState(false);
  return (
    <div className="bubble">
      <div>{entry.text}</div>
      {showTranslation && <div className="translation">{entry.data.reply_pt}</div>}
      <div className="actions">
        <button className="link-btn" onClick={() => speak(entry.text, locale)}>▶ Ouvir</button>
        <button className="link-btn" onClick={() => setShowTranslation((v) => !v)}>
          {showTranslation ? "Esconder tradução" : "Traduzir"}
        </button>
      </div>
      {entry.data.new_words.length > 0 && (
        <div className="words">
          {entry.data.new_words.map((w) => (
            <span key={w.word} className="word" title={w.example}>
              {w.word} = {w.translation_pt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function UserBubble({ entry }: { entry: Extract<Entry, { role: "user" }> }) {
  const fb = entry.feedback;
  return (
    <>
      <div className="bubble user">{entry.text}</div>
      {fb &&
        (fb.has_errors ? (
          <div className="feedback fix">
            <div className="label">Correção</div>
            <div>✅ {fb.corrected}</div>
            {fb.natural && fb.natural !== fb.corrected && <div>🗣️ Mais natural: {fb.natural}</div>}
            <ul>
              {fb.errors.map((err, i) => (
                <li key={i}>
                  <s>{err.original}</s> → <strong>{err.fix}</strong>: {err.explanation_pt}
                </li>
              ))}
            </ul>
            {fb.praise_pt && <div>👏 {fb.praise_pt}</div>}
          </div>
        ) : (
          <div className="feedback ok">
            👏 {fb.praise_pt || "Perfeito!"}
            {fb.natural && <div>🗣️ Outra forma de dizer: {fb.natural}</div>}
          </div>
        ))}
    </>
  );
}
