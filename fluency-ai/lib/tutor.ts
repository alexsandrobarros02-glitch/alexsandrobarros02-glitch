import { z } from "zod";
import type { Language, Level } from "./languages";
import type { Scenario } from "./scenarios";

export const TutorReplySchema = z.object({
  reply: z.string().describe("Your next line in the conversation, in the target language."),
  reply_pt: z.string().describe("Portuguese (Brazil) translation of reply."),
  feedback: z.object({
    has_errors: z.boolean(),
    corrected: z.string().describe("The learner's message with only the mistakes fixed. Empty if no errors."),
    natural: z.string().describe("How a native speaker would naturally say it."),
    errors: z.array(
      z.object({
        original: z.string(),
        fix: z.string(),
        explanation_pt: z.string().describe("Short explanation in Brazilian Portuguese."),
      }),
    ),
    praise_pt: z.string().describe("One short, specific encouragement in Brazilian Portuguese."),
  }),
  new_words: z.array(
    z.object({
      word: z.string(),
      translation_pt: z.string(),
      example: z.string().describe("Short example sentence in the target language."),
    }),
  ),
});

export type TutorReply = z.infer<typeof TutorReplySchema>;

const LEVEL_GUIDE: Record<Level, string> = {
  A1: "Use very short sentences, the present tense and the most common 500 words. Speak slowly and simply.",
  A2: "Use short sentences and everyday vocabulary. Simple past and future are fine.",
  B1: "Use natural everyday language with some idioms. Keep sentences clear.",
  B2: "Speak naturally, with idioms and varied tenses, as with a fluent non-native.",
  C1: "Speak as you would with a native speaker, including nuance, slang and cultural references.",
};

// O prompt de sistema depende só de idioma, nível e cenário,
// então é idêntico em todas as mensagens da mesma conversa e pode ser cacheado.
export function buildSystemPrompt(language: Language, level: Level, scenario: Scenario): string {
  return `You are Fluency, a warm and encouraging conversation tutor for Brazilian learners of ${language.nativeName} (${language.name}).

## Role-play
${scenario.roleplay}
Stay in character. Keep the conversation moving: reply in 1-3 sentences and usually end with a question.

## Learner level: ${level}
${LEVEL_GUIDE[level]}

## Feedback on the learner's last message
- Check the learner's latest message for grammar, vocabulary, spelling and word-order mistakes.
- Ignore missing accents or punctuation that come from speech-to-text, and ignore capitalization.
- If the learner writes in Portuguese, answer in ${language.nativeName}, set has_errors to false, and put in "natural" how to say their message in ${language.nativeName}.
- Explain each mistake in Brazilian Portuguese in one short sentence. Point out false friends and typical mistakes Portuguese speakers make.
- Praise something specific the learner did well.

## New words
List up to 3 useful words or expressions from YOUR reply that a ${level} learner may not know. Use an empty list if none.

The first user message may be "[START]": then open the scene with a greeting and a question, with no feedback (has_errors false, empty corrected/natural/errors).`;
}
