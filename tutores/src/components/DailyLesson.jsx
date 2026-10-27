import React, { useEffect, useState } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';
import { askTutor } from '../api';
import { errorText } from './errors';

const T = {
  pt: { intro: 'Uma microaula nova a cada pedido: 5 frases, 1 ponto de gramática e um desafio.',
    go: 'Gerar aula de hoje', again: 'Outra aula', loading: 'Preparando…', grammar: 'Gramática', challenge: 'Desafio' },
  en: { intro: 'A fresh micro-lesson each time: 5 phrases, 1 grammar point and a challenge.',
    go: "Generate today's lesson", again: 'Another lesson', loading: 'Preparing…', grammar: 'Grammar', challenge: 'Challenge' },
};

export default function DailyLesson({ tutor, level, uiLang }) {
  const t = T[uiLang] || T.pt;
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setLesson(null); setError(null); }, [tutor.id, level]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      setLesson(await askTutor({ mode: 'lesson', langId: tutor.id, level, uiLang }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-gold/15 bg-obsidian-light/40 p-5">
      {!lesson && (
        <div className="text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-gold" />
          <p className="mx-auto max-w-sm text-sm text-warm/70">{t.intro}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-sm text-gold-light">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorText(error, uiLang)}
        </div>
      )}
      {lesson && (
        <div className="space-y-4">
          <h3 className="font-jakarta text-base font-bold text-warm">{tutor.flag} {lesson.title}</h3>
          <ul className="space-y-2">
            {(lesson.phrases || []).map((p, i) => (
              <li key={i} className="rounded-lg border border-gold/10 bg-obsidian/40 px-3 py-2">
                <div className="text-sm font-medium text-warm">{p.phrase}</div>
                <div className="text-xs text-warm/50">{p.meaning}</div>
              </li>
            ))}
          </ul>
          {lesson.grammar && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-gold/60">{t.grammar}</div>
              <p className="text-sm text-warm/80">{lesson.grammar}</p>
            </div>
          )}
          {lesson.challenge && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-gold">{t.challenge}</div>
              <p className="text-sm text-warm">{lesson.challenge}</p>
            </div>
          )}
        </div>
      )}
      <div className="text-center">
        <button type="button" onClick={generate} disabled={loading}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-obsidian hover:bg-gold-light disabled:opacity-50">
          {loading ? t.loading : lesson ? t.again : t.go}
        </button>
      </div>
    </div>
  );
}
