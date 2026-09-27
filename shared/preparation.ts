/** Quantity orders count steaks, never pieces of arbitrary preparations. */
export function isSteakPreparation(preparation: string): boolean {
  return /^bifes?\b/i.test(preparation.trim());
}
