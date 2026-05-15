export const PROMOTION_READINESS_OPTIONS = [
  { value: 'ready_next_year_end', label: 'Ready for 2026 year-end cycle' },
  { value: 'ready_next_mid_year', label: 'Ready for 2027 mid-year cycle' },
  { value: 'reassess_next_year',  label: 'Reassess next year' },
] as const;

export type PromotionReadinessValue = (typeof PROMOTION_READINESS_OPTIONS)[number]['value'];

export const promotionReadinessLabel = (value: string | null | undefined): string =>
  PROMOTION_READINESS_OPTIONS.find(o => o.value === value)?.label ?? '—';
