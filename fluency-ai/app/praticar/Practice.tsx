"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, api, useMe } from "@/lib/client";
import { LEVELS, LEVEL_LABELS, isLevel, type Language, type Level } from "@/lib/languages";
import { PLACEMENT_SCENARIO, PLACEMENT_TURNS, SCENARIOS, type Scenario } from "@/lib/scenarios";
import { speak, useSpeechRecognition } from "@/lib/speech";
import type { PlacementResult, TutorReply } from "@/lib/tutor";

const START = "[START]";

type Entry =
  | { role: "user"; text: string; feedback?: TutorReply["feedback"] }
  | { role: "assistant"; text: string; data: TutorReply };

export default function Practice({ language }: { language: Language }) {
  const { me, reload } = useMe();
  const [level, setLevel] = useState<Level>("A2");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [ended, setEnded] = useState(false);
  const [placementResult, setPlacementResult] = useState<(PlacementResult & { shareId?: string }) | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mic = useSpeechRecognition(language.speechLocale, (text) => send(text));
  const savedLevel = me?.levels[language.code]?.level;
  const isPlacement = scenario?.id === PLACEMENT_SCENARIO.id;
  const userTurns = entries.filter((e) => e.role === "user" && e.text !== START).length;

  useEffect(() => {
    if (savedLevel && isLevel(savedLevel)) setLevel(savedLevel);
  }, [savedLevel]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, loading, placementResult]);

  async function request(history: Entry[], id: string) {
    setLoading(true);
    setError("");
    try {
      const reply = await api<TutorReply>("/api/chat", {
        conversationId: id,
        messages: history.map((e) => ({ role: e.role, text: e.text })),
      });
      const next = [...history];
      const last = next[next.length - 1];
      if (last?.role === "user" && last.text !== START) next[next.length - 1] = { ...last, feedback: reply.feedback };
      next.push({ role: "assistant", text: reply.reply, data: reply });
      setEntries(next);
      if (autoSpeak) speak(reply.reply, language.speechLocale);
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.data.ended) setEnded(true);
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function begin(chosen: Scenario) {
    setError("");
    setNeedsUpgrade(false);
    try {
      const { id } = await api<{ id: string }>("/api/conversations", {
        language: language.code,
        level,
        scenario: chosen.id,
      });
      setConversationId(id);
      setScenario(chosen);
      setEnded(false);
      setPlacementResult(null);
      const first: Entry[] = [{ role: "user", text: START }];
      setEntries(first);
      request(first, id);
    } catch (e) {
      if (e instanceof ApiError && e.data.upgrade) setNeedsUpgrade(true);
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading || !scenario || ended || placementResult) return;
    const next: Entry[] = [...entries, { role: "user", text: clean }];
    setEntries(next);
    setInput("");
    const result = await request(next, conversationId);
    if (result && isPlacement && userTurns + 1 >= PLACEMENT_TURNS) finishPlacement(result);
  }

  async function finishPlacement(history: Entry[]) {
    setLoading(true);
    setError("");
    try {
      const result = await api<PlacementResult & { shareId: string }>("/api/placement", {
        conversationId,
        messages: history.map((e) => ({ role: e.role, text: e.text })),
      });
      setPlacementResult(result);
      setLevel(result.level);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function leave() {
    setScenario(null);
    setEntries([]);
    setConversationId("");
    reload();
  }

  if (!scenario) {
    return (
      <main className="container">
        <Link href="/app" className="link-btn">← Painel</Link>
        <h1>{language.flag} {language.name}</h1>
        <div className="tools">
          <Link href={`/revisar?idioma=${language.code}`} className="link-btn">
            🃏 Revisar palavras{me?.dueCards[language.code] ? ` (${me.dueCards[language.code]})` : ""}
          </Link>
          <Link href={`/erros?idioma=${language.code}`} className="link-btn">📒 Meus erros</Link>
        </div>

        {!savedLevel && (
          <button className="card upgrade" style={{ width: "100%" }} onClick={() => begin(PLACEMENT_SCENARIO)}>
            <div className="title">🎯 Descubra seu nível em 2 minutos</div>
            <div className="sub">Uma conversa curta com {PLACEMENT_TURNS} perguntas. Não conta no limite grátis.</div>
          </button>
        )}

        <h2 className="section-title">Seu nível</h2>
        <div className="chips">
          {LEVELS.map((l) => (
            <button key={l} className={`chip ${l === level ? "selected" : ""}`} onClick={() => setLevel(l)}>
              {l} · {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
        {savedLevel && (
          <button className="link-btn" style={{ marginTop: 8 }} onClick={() => begin(PLACEMENT_SCENARIO)}>
            Refazer teste de nível
          </button>
        )}

        <h2 className="section-title">Escolha uma situação</h2>
        {me && !me.pro && <p className="sub">Conversas grátis restantes nesta semana: {me.freeConversationsLeft}</p>}
        {error && (
          <div className="notice">
            {error}{" "}
            {needsUpgrade && (
              <Link href="/assinar" className="link-btn">
                Assine o Pro por R$ 6,99/mês ou R$ 36,99/ano via Pix →
              </Link>
            )}
          </div>
        )}
        <div className="grid" style={{ marginTop: 12 }}>
          {SCENARIOS.map((s) => (
            <button key={s.id} className="card" onClick={() => begin(s)}>
              <div className="emoji">{s.emoji}</div>
              <div className="title">{s.title}</div>
              <div className="sub">{s.description}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="chat-header">
        <div>
          <strong>{scenario.emoji} {scenario.title}</strong>
          <div className="meta">
            {language.flag} {language.name}
            {isPlacement ? ` · pergunta ${Math.min(userTurns + 1, PLACEMENT_TURNS)} de ${PLACEMENT_TURNS}` : ` · ${level}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => setAutoSpeak((v) => !v)} title="Ler respostas em voz alta">
            {autoSpeak ? "🔊" : "🔇"}
          </button>
          <button className="btn ghost" onClick={leave}>Encerrar</button>
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
        {loading && <div className="typing">{isPlacement && userTurns >= PLACEMENT_TURNS ? "Avaliando seu nível…" : "O professor está escrevendo…"}</div>}
        {mic.listening && mic.interim && <div className="bubble user" style={{ opacity: 0.6 }}>{mic.interim}</div>}
        {placementResult && (
          <div className="card upgrade">
            <div className="title">🎯 Seu nível: {placementResult.level} · {LEVEL_LABELS[placementResult.level]}</div>
            <p>{placementResult.summary_pt}</p>
            {placementResult.strengths_pt.length > 0 && (
              <>
                <strong>Pontos fortes</strong>
                <ul className="result-list">{placementResult.strengths_pt.map((s) => <li key={s}>{s}</li>)}</ul>
              </>
            )}
            {placementResult.focus_pt.length > 0 && (
              <>
                <strong>Para treinar</strong>
                <ul className="result-list">{placementResult.focus_pt.map((s) => <li key={s}>{s}</li>)}</ul>
              </>
            )}
            <div className="actions-row">
              {placementResult.shareId && (
                <Link href={`/resultado/${placementResult.shareId}`} className="btn ghost">Compartilhar resultado</Link>
              )}
              <button className="btn" onClick={leave}>Escolher uma situação</button>
            </div>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {ended && <button className="btn" onClick={leave}>Nova conversa</button>}
        <div ref={bottomRef} />
      </div>

      {!placementResult && !ended && (
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
      )}
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
