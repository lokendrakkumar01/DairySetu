export interface MilkRateCandidate {
  customerId?: string | { _id?: string } | null;
  milkType: 'cow' | 'buffalo' | 'mixed';
  rateUnit?: 'litre' | 'kg';
  ratePerLitre: number;
}

function customerIdOf(value: MilkRateCandidate['customerId']): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value._id ? String(value._id) : String(value);
}

export function resolveMilkRate(
  rates: MilkRateCandidate[],
  customerId: string,
  milkType: 'cow' | 'buffalo',
  rateUnit: 'litre' | 'kg'
): number | null {
  const matchingUnit = rates.filter(rate => rate.rateUnit === rateUnit || (rateUnit === 'litre' && !rate.rateUnit));
  const scopes = [customerId, null];
  const types: Array<'cow' | 'buffalo' | 'mixed'> = [milkType, 'mixed'];
  for (const scope of scopes) {
    for (const type of types) {
      const match = matchingUnit.find(rate => customerIdOf(rate.customerId) === scope && rate.milkType === type);
      if (match) return Number(match.ratePerLitre);
    }
  }
  return null;
}

export function calculateMilkProcurementAmount(quantityKg: number, ratePerKg: number, accepted: boolean): number {
  if (!accepted) return 0;
  return Math.round(quantityKg * ratePerKg * 100) / 100;
}
