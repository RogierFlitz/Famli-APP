import type { FeatureFlags, PlanId } from "./types";

export const planLimits: Record<
  PlanId,
  { children: number; members: number; flags: FeatureFlags }
> = {
  free: {
    children: 2,
    members: 2,
    flags: {
      calendarSync: false,
      documents: true,
      yearOverview: true,
      aiAssistant: false,
      recurringExpenses: false,
    },
  },
  plus: {
    children: 6,
    members: 4,
    flags: {
      calendarSync: false,
      documents: true,
      yearOverview: true,
      aiAssistant: false,
      recurringExpenses: true,
    },
  },
  family: {
    children: 20,
    members: 8,
    flags: {
      calendarSync: true,
      documents: true,
      yearOverview: true,
      aiAssistant: false,
      recurringExpenses: true,
    },
  },
};

export function canUseFeature(plan: PlanId, flag: keyof FeatureFlags): boolean {
  return planLimits[plan].flags[flag];
}
