export type PlanId = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  value: number; // em reais
  days: number; // dias de Pro liberados por pagamento
  priceLabel: string;
  note: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: "monthly", name: "Pro mensal", value: 6.99, days: 31, priceLabel: "R$ 6,99", note: "por mês" },
  annual: { id: "annual", name: "Pro anual", value: 36.99, days: 366, priceLabel: "R$ 36,99", note: "por ano (≈ R$ 3,08/mês)" },
};

export function isPlanId(value: string): value is PlanId {
  return value === "monthly" || value === "annual";
}
