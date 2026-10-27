import React, { useState } from 'react';
import { Languages, Flame } from 'lucide-react';
import { TUTORS, LEVELS, UI_LANGS } from './tutors';
import { loadProgress } from './api';
import TutorChat from './components/TutorChat';
import DailyLesson from './components/DailyLesson';
import FocusPlayer from './components/FocusPlayer';

const LANG_KEY = 'ax99_tutor_lang';
const LEVEL_KEY = 'ax99_tutor_level';
const UI_KEY = 'ax99_lang';

const T = {
  pt: { title: 'AX99 Tutores de Idiomas', sub: 'Um tutor de IA por idioma · conversa, correção e foco',
    level: 'Nível', chat: 'Conversa', lesson: 'Aula do dia', days: 'dias', msgs: 'mensagens' },
  en: { title: 'AX99 Language Tutors', sub: 'One AI tutor per language · conversation, correction and focus',
    level: 'Level', chat: 'Conversation', lesson: 'Daily lesson', days: 'days', msgs: 'messages' },
};

const cx = (...c) => c.filter(Boolean).join(' ');
const read = (key, fallback, allowed) => {
  try { const v = localStorage.getItem(key); return allowed.includes(v) ? v : fallback; } catch { return fallback; }
};
const save = (key, v) => { try { localStorage.setItem(key, v); } catch { /* storage blocked */ } };

// ?lang=it opens a tutor directly (used by the AX99 Portal links).
const initialLang = () => {
  const ids = TUTORS.map((x) => x.id);
  const q = new URLSearchParams(window.location.search).get('lang');
  return ids.includes(q) ? q : read(LANG_KEY, 'it', ids);
};
const initialUi = () => {
  const browser = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  return read(UI_KEY, UI_LANGS.includes(browser) ? browser : 'pt', UI_LANGS);
};

export default function App() {
  const [uiLang, setUiLang] = useState(initialUi);
  const [langId, setLangId] = useState(initialLang);
  const [level, setLevel] = useState(() => read(LEVEL_KEY, 'A2', LEVELS));
  const [tab, setTab] = useState('chat');
  const [progress, setProgress] = useState(loadProgress);
  const t = T[uiLang] || T.pt;
  const tutor = TUTORS.find((x) => x.id === langId) || TUTORS[0];

  const pickLang = (id) => { setLangId(id); save(LANG_KEY, id); };
  const pickLevel = (lv) => { setLevel(lv); save(LEVEL_KEY, lv); };
  const switchUi = () => {
    const next = UI_LANGS[(UI_LANGS.indexOf(uiLang) + 1) % UI_LANGS.length];
    setUiLang(next); save(UI_KEY, next);
  };

  return (
    <div className="min-h-screen bg-obsidian font-inter text-warm">
      <header className="border-b border-gold/15 bg-obsidian-light/40 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15">
            <Languages className="h-5 w-5 text-gold" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-jakarta text-lg font-bold tracking-tight">{t.title}</h1>
            <p className="truncate text-xs text-gold/50">{t.sub}</p>
          </div>
          <button type="button" onClick={switchUi}
            className="rounded-full border border-gold/30 px-2.5 py-1 text-[11px] font-semibold text-gold">
            {uiLang.toUpperCase()}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {TUTORS.map((x) => {
            const p = progress[x.id];
            return (
              <button key={x.id} type="button" onClick={() => pickLang(x.id)}
                className={cx('rounded-xl border px-2 py-3 text-center transition-colors',
                  x.id === langId ? 'border-gold/60 bg-gold/10' : 'border-gold/15 bg-obsidian-light/40 hover:border-gold/35')}>
                <div className="text-2xl leading-none">{x.flag}</div>
                <div className="mt-1 text-xs font-semibold">{x.language}</div>
                <div className="text-[10px] text-gold/50">{x.tutor}</div>
                {p?.streak > 0 && (
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-[10px] text-gold">
                    <Flame className="h-3 w-3" />{p.streak}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[11px] uppercase tracking-wider text-gold/60">{t.level}</span>
            {LEVELS.map((lv) => (
              <button key={lv} type="button" onClick={() => pickLevel(lv)}
                className={cx('rounded-md px-2 py-1 text-xs', lv === level ? 'bg-gold text-obsidian' : 'text-warm/60 hover:text-gold')}>
                {lv}
              </button>
            ))}
          </div>
          {progress[langId] && (
            <div className="text-xs text-warm/50">
              {progress[langId].days} {t.days} · {progress[langId].messages} {t.msgs}
            </div>
          )}
        </div>

        <FocusPlayer uiLang={uiLang} />

        <div>
          <div role="tablist" className="mb-4 inline-flex rounded-lg bg-obsidian-light/60 p-1">
            {['chat', 'lesson'].map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={cx('rounded-md px-3 py-1.5 text-sm', tab === id ? 'bg-gold/20 text-gold-light' : 'text-warm/60')}>
                {t[id]}
              </button>
            ))}
          </div>
          {/* Both stay mounted so switching tabs keeps the conversation. */}
          <div hidden={tab !== 'chat'}>
            <TutorChat tutor={tutor} level={level} uiLang={uiLang} onPractice={setProgress} />
          </div>
          <div hidden={tab !== 'lesson'}>
            <DailyLesson tutor={tutor} level={level} uiLang={uiLang} />
          </div>
        </div>
      </main>

      <footer className="pb-8 text-center text-[11px] text-gold/30">AX99 · consciousness-tech</footer>
    </div>
  );
}
