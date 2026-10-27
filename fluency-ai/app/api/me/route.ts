import { currentUser, isPro } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/claude";
import { countDueCards, getLevels, streak } from "@/lib/server/learning";
import { PRO_MESSAGES_PER_DAY, freeConversationsLeft, messagesToday, today } from "@/lib/server/plan";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const [left, todayMessages, dueCards, levels, days] = await Promise.all([
    freeConversationsLeft(user),
    messagesToday(user),
    countDueCards(user.id),
    getLevels(user.id),
    streak(user.id),
  ]);
  return Response.json({
    email: user.email,
    pro: isPro(user),
    proUntil: user.proUntil || null,
    freeConversationsLeft: left,
    messagesToday: todayMessages,
    proMessagesPerDay: PRO_MESSAGES_PER_DAY,
    practicedToday: todayMessages > 0,
    today: today(),
    streak: days,
    dueCards,
    levels,
  });
}
