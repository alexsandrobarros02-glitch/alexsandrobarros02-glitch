import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Headphones } from 'lucide-react';

// Same protocol as the Método 369 LanguageLearningPlayer: 10 min of a 40 Hz
// carrier (gamma activation), then 10 min at 432 Hz (consolidation), with a
// 4 Hz binaural offset on the right ear. Headphones required.
const PHASES = [
  { hz: 40, duration: 10 * 60, name: { pt: 'Ativação Gamma', en: 'Gamma activation' } },
  { hz: 432, duration: 10 * 60, name: { pt: 'Consolidação 432 Hz', en: '432 Hz consolidation' } },
];
const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);
const BEAT = 4;

const T = {
  pt: { title: 'Foco para estudar', sub: '20 min · use fones de ouvido · deixe tocando enquanto conversa com o tutor', start: 'Iniciar', stop: 'Parar' },
  en: { title: 'Study focus', sub: '20 min · use headphones · keep it on while you talk to the tutor', start: 'Start', stop: 'Stop' },
};

const phaseAt = (t) => {
  let acc = 0;
  for (const p of PHASES) { acc += p.duration; if (t < acc) return p; }
  return PHASES[PHASES.length - 1];
};
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function FocusPlayer({ uiLang }) {
  const t = T[uiLang] || T.pt;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);

  const stop = () => {
    const a = audio.current;
    if (a) { a.osc.forEach((o) => o.stop()); a.ctx.close(); audio.current = null; }
    setPlaying(false);
  };

  const start = async () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.2;
    master.connect(ctx.destination);
    const osc = [-1, 1].map((pan) => {
      const o = ctx.createOscillator();
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      o.connect(p); p.connect(master); o.start();
      return o;
    });
    audio.current = { ctx, osc };
    setElapsed(0);
    setPlaying(true);
  };

  // Tick the clock and retune the oscillators to the current phase.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const a = audio.current;
    if (!playing || !a) return;
    if (elapsed >= TOTAL) { stop(); return; }
    const { hz } = phaseAt(elapsed);
    a.osc[0].frequency.setValueAtTime(hz, a.ctx.currentTime);
    a.osc[1].frequency.setValueAtTime(hz + BEAT, a.ctx.currentTime);
  }, [elapsed, playing]);

  useEffect(() => stop, []);

  const phase = phaseAt(elapsed);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gold/15 bg-obsidian-light/40 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15">
        <Headphones className="h-5 w-5 text-gold" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-warm">{t.title}</div>
        <div className="truncate text-xs text-warm/50">
          {playing ? `${phase.name[uiLang] || phase.name.pt} · ${mmss(elapsed)} / ${mmss(TOTAL)}` : t.sub}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-obsidian">
          <div className="h-full bg-gold/70 transition-all" style={{ width: `${(elapsed / TOTAL) * 100}%` }} />
        </div>
      </div>
      <button type="button" onClick={playing ? stop : start}
        className={'flex items-center rounded-md px-3 py-1.5 text-sm font-medium ' + (playing ? 'border border-gold/30 text-gold hover:bg-gold/10' : 'bg-gold text-obsidian hover:bg-gold-light')}>
        {playing ? <><Square className="mr-1 h-3.5 w-3.5" />{t.stop}</> : <><Play className="mr-1 h-3.5 w-3.5" />{t.start}</>}
      </button>
    </div>
  );
}
