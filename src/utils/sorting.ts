export interface SortableUnit {
  block: string;
  unit: string;
}

export const getUnitNumber = (unitStr: string): number => {
  if (!unitStr) return 0;
  const parts = unitStr.split('-');
  const lastPart = parts[parts.length - 1] || '';
  const num = parseInt(lastPart.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

export const compareUnits = (a: SortableUnit, b: SortableUnit): number => {
  // 1. Sort by block first (e.g. "Blok A" vs "Blok B")
  const blockA = (a.block || '').trim().toUpperCase();
  const blockB = (b.block || '').trim().toUpperCase();
  if (blockA !== blockB) {
    return blockA.localeCompare(blockB);
  }

  // 2. Sort by unit number numerically if blocks are identical
  const numA = getUnitNumber(a.unit);
  const numB = getUnitNumber(b.unit);
  if (numA !== numB) {
    return numA - numB;
  }

  // 3. Fallback to string comparison
  return (a.unit || '').localeCompare(b.unit || '');
};

export const sortResidents = <T extends { block: string; unit: string }>(list: T[]): T[] => {
  return [...list].sort(compareUnits);
};
