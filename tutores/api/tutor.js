// POST /api/tutor — the only place that talks to Claude. The API key stays in
// the server environment (ANTHROPIC_API_KEY); the browser never sees it.
//
// Body: { mode: 'chat' | 'lesson', langId, level, uiLang, history?: [{ role: 'user'|'tutor', text }] }

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { TUTORS, LEVELS, UI_LANGS } from '../src/tutors.js';

const MODEL = process.env.TUTOR_MODEL || 'claude-opus-5-5';
const MAX_TURNS = 20;
const MAX_CHARS = 1000;

const ChatReply = z.object({
  reply: z.string().describe('The tutor reply in the target language, ending with one question.'),
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    rule: z.string().describe('Short rule, in the learner interface language.'),
  })),
  tip: z.string().describe('One useful word or expression with its meaning, or an empty string.'),
});

const Lesson = z.object({
  title: z.string(),
  phrases: z.array(z.object({ phrase: z.string(), meaning: z.string() })),
  grammar: z.string().describe('One grammar point, explained in 2-3 sentences.'),
  challenge: z.string().describe('One sentence the learner must write using the lesson.'),
});

const uiName = (uiLang) => (uiLang === 'en' ? 'English' : 'Brazilian Portuguese');

function chatSystem(t, level, uiLang) {
  return [
    `You are ${t.tutor}, a warm, precise ${t.language} tutor from ${t.city}, inside the AX99 app.`,
    `The learner is at CEFR level ${level}. Topics you favour: ${t.focus}.`,
    `You opened the conversation with: "${t.hello}"`,
    `Reply only in ${t.language}, adapted to ${level}: short sentences, one question at the end.`,
    `Correct every mistake in the learner's latest message (grammar, spelling, accents, word choice);`,
    `write each rule in ${uiName(uiLang)}. With no mistakes, return an empty corrections list.`,
    'No empty praise. Keep the conversation moving. Stay a language tutor: if asked for something unrelated, steer back to practice.',
  ].join('\n');
}

function lessonPrompt(t, level, uiLang) {
  return [
    `You are ${t.tutor}, a ${t.language} tutor. Create today's micro-lesson for a ${level} learner.`,
    `Theme: something from ${t.focus}. Give 5 useful phrases in ${t.language} with their meaning in ${uiName(uiLang)},`,
    `one grammar point explained in ${uiName(uiLang)}, and one writing challenge (in ${uiName(uiLang)}) that uses the phrases.`,
  ].join('\n');
}

// Keep only well-formed turns, starting at the learner's first message.
function toMessages(history) {
  const turns = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'tutor') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, MAX_CHARS) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

let client;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'not_configured' });

  const { mode, langId, level, uiLang, history } = req.body || {};
  const tutor = TUTORS.find((x) => x.id === langId);
  if (!tutor || !LEVELS.includes(level) || !UI_LANGS.includes(uiLang) || !['chat', 'lesson'].includes(mode)) {
    return res.status(400).json({ error: 'bad_request' });
  }

  let request;
  if (mode === 'chat') {
    const messages = toMessages(history);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'bad_request' });
    }
    request = { system: chatSystem(tutor, level, uiLang), messages, schema: ChatReply, effort: 'low' };
  } else {
    request = { messages: [{ role: 'user', content: lessonPrompt(tutor, level, uiLang) }], schema: Lesson, effort: 'medium' };
  }

  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: request.effort, format: betaZodOutputFormat(request.schema) },
      ...(request.system ? { system: request.system } : {}),
      messages: request.messages,
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return res.status(502).json({ error: 'no_answer' });
    }
    return res.status(200).json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'not_configured' });
    console.error('tutor error', err?.status, err?.message);
    return res.status(502).json({ error: 'failed' });
  }
}
