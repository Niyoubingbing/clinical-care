export const ROUNDING_ORDER = [
  '309W41', '309W42', '309W43', '309WJ04',
  '309W38', '309W39', '309W40',
  '309WJ06', '309WJ07', '309W36', '309W37',
  '309W01', '309W02', '309W03', '309W04', '309W05', '309W06',
  '309WJ08', '309W34', '309W35',
  '309W07', '309W08', '309W09', '309WJ09', '309WJ10', '309WJ12',
  '309W10', '309W11', '309W12', '309WJ13',
  '309W13', '309W14', '309W15', '309WJ14',
  '309W16', '309W17', '309W18', '309W19', '309W20', '309W21',
  '309WJ15', '309WJ16', '309W22', '309W23', '309W24',
  '309W25', '309W26', '309W27', '309WJ17',
  '309W28', '309W29', '309W30', '309WJ18', '309W31', '309W32', '309W33'
];

const orderMap = new Map<string, number>();
ROUNDING_ORDER.forEach((bed, idx) => orderMap.set(bed, idx));

export function getRoundingOrder(bedNumber: string): number {
  const idx = orderMap.get(bedNumber);
  return idx !== undefined ? idx : ROUNDING_ORDER.length + bedNumber.localeCompare(bedNumber);
}

export function sortByRoundingOrder(bedNumbers: string[]): string[] {
  return [...bedNumbers].sort((a, b) => getRoundingOrder(a) - getRoundingOrder(b));
}
