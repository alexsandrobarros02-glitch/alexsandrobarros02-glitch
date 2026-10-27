import React, { useEffect, useRef, useState } from 'react';
import { Send, AlertCircle, Lightbulb } from 'lucide-react';
import { askTutor, recordPractice } from '../api';
import { errorText } from './errors';

const T = {
  pt: { placeholder: 'Escreva na língua que está aprendendo…', thinking: 'pensando…', fix: 'Correções', reset: 'Nova conversa' },
  en: { placeholder: 'Write in the language you are learning…', thinking: 'thinking…', fix: 'Corrections', reset: 'New conversation' },
};

export default function TutorChat({ tutor, level, uiLang, onPractice }) {
  const t = T[uiLang] || T.pt;
  const greeting = { role: 'tutor', text: tutor.hello };
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  // Switching language starts a fresh conversation with that tutor.
  useEffect(() => { setMessages([{ role: 'tutor', text: tutor.hello }]); setError(null); }, [tutor.id, tutor.hello]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, loading]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history = [...messages, { role: 'user', text }];
    setMessages(history); setInput(''); setLoading(true); setError(null);
    try {
      const res = await askTutor({
        mode: 'chat', langId: tutor.id, level, uiLang,
        history: history.map(({ role, text: body }) => ({ role, text: body })),
      });
      setMessages([...history, {
        role: 'tutor', text: res.reply || '…',
        corrections: Array.isArray(res.corrections) ? res.corrections : [], tip: res.tip,
      }]);
      onPractice?.(recordPractice(tutor.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gold/15 bg-obsidian-light/40">
      <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gold/20 px-3 py-2 text-sm text-warm">{m.text}</div>
            ) : (
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl rounded-bl-sm border border-gold/10 bg-obsidian/60 px-3 py-2 text-sm text-warm">
                  <span className="mr-1 text-xs font-semibold text-gold">{tutor.tutor}</span>{m.text}
                </div>
                {m.corrections?.length > 0 && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300">{t.fix}</div>
                    {m.corrections.map((c, j) => (
                      <div key={j} className="text-xs text-warm/80">
                        <span className="text-rose-300 line-through">{c.original}</span>
                        {' → '}<span className="text-emerald-300">{c.corrected}</span>
                        {c.rule && <span className="block text-warm/50">{c.rule}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {m.tip && (
                  <div className="flex gap-2 rounded-lg border border-gold/15 bg-gold/5 px-3 py-2 text-xs text-gold-light">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" /><span>{m.tip}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-xs text-gold/50">{tutor.tutor} {t.thinking}</p>}
        {error && (
          <div className="flex items-start gap-2 text-xs text-gold-light">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{errorText(error, uiLang)}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-gold/10 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} maxLength={1000}
          className="min-w-0 flex-1 rounded-md border border-gold/20 bg-obsidian/60 px-3 py-2 text-sm text-warm outline-none placeholder:text-gold/30 focus:border-gold/50" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar"
          className="rounded-md bg-gold px-3 text-obsidian hover:bg-gold-light disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="px-3 pb-3 text-right">
        <button type="button" onClick={() => { setMessages([greeting]); setError(null); }}
          className="text-[11px] text-gold/50 hover:text-gold">{t.reset}</button>
      </div>
    </div>
  );
}
