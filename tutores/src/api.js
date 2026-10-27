// Browser side of /api/tutor. Throws Error(code) with the server's error code.
export async function askTutor(body) {
  let res;
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('offline');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'failed');
  return data;
}

// Per-language progress, kept in this browser only.
const PROGRESS_KEY = 'ax99_tutor_progress';

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}

export function recordPractice(langId) {
  const all = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  const p = all[langId] || { messages: 0, days: 0, streak: 0, last: null };
  if (p.last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    p.streak = p.last === yesterday ? p.streak + 1 : 1;
    p.days += 1;
    p.last = today;
  }
  p.messages += 1;
  all[langId] = p;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
  return all;
}
