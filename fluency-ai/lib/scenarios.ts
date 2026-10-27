export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  description: string;
  // instrução para a IA (em inglês, para o modelo seguir com precisão)
  roleplay: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "conversa-livre",
    title: "Conversa livre",
    emoji: "💬",
    description: "Bate-papo sobre o seu dia, hobbies e planos.",
    roleplay: "You are a friendly native speaker chatting casually. Ask about the learner's day, interests and plans.",
  },
  {
    id: "entrevista",
    title: "Entrevista de emprego",
    emoji: "💼",
    description: "Treine as perguntas mais comuns de uma entrevista.",
    roleplay: "You are a hiring manager interviewing the learner for a job they choose. Ask one typical interview question at a time.",
  },
  {
    id: "aeroporto",
    title: "Aeroporto e viagem",
    emoji: "✈️",
    description: "Check-in, imigração, bagagem e conexões.",
    roleplay: "You are an airport agent (check-in, then immigration). Guide the learner through a realistic travel situation.",
  },
  {
    id: "restaurante",
    title: "Restaurante",
    emoji: "🍽️",
    description: "Pedir, perguntar sobre o cardápio e pagar a conta.",
    roleplay: "You are a waiter at a local restaurant. Greet the learner, take their order, answer menu questions and bring the bill.",
  },
  {
    id: "hotel",
    title: "Hotel",
    emoji: "🏨",
    description: "Reserva, check-in e resolver problemas no quarto.",
    roleplay: "You are a hotel receptionist. Handle check-in and a small problem the learner reports with their room.",
  },
  {
    id: "medico",
    title: "Médico e farmácia",
    emoji: "🩺",
    description: "Explicar sintomas e entender orientações.",
    roleplay: "You are a doctor at a walk-in clinic. Ask about the learner's symptoms and give simple advice.",
  },
  {
    id: "reuniao",
    title: "Reunião de trabalho",
    emoji: "📊",
    description: "Apresentar ideias, concordar e discordar com educação.",
    roleplay: "You are a colleague in a work meeting. Discuss a project, ask the learner for their opinion and politely push back sometimes.",
  },
  {
    id: "compras",
    title: "Compras",
    emoji: "🛍️",
    description: "Tamanhos, preços, trocas e devoluções.",
    roleplay: "You are a shop assistant in a clothing store. Help the learner find, try and buy something, including a return.",
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
