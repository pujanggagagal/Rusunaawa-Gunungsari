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

export const getFloorFromUnit = (unit: string): number => {
  if (!unit) return 1;
  const parts = unit.split('-');
  const unitNumberPart = parts[parts.length - 1];
  if (!unitNumberPart) return 1;
  const match = unitNumberPart.trim().match(/\d/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 1;
};

export const compareUnits = (a: SortableUnit, b: SortableUnit): number => {
  // 1. Sort by floor first (Lantai)
  const floorA = getFloorFromUnit(a.unit);
  const floorB = getFloorFromUnit(b.unit);
  if (floorA !== floorB) {
    return floorA - floorB;
  }

  // 2. Sort by block first (e.g. "Blok A" vs "Blok B")
  const blockA = (a.block || '').trim().toUpperCase();
  const blockB = (b.block || '').trim().toUpperCase();
  if (blockA !== blockB) {
    return blockA.localeCompare(blockB);
  }

  // 3. Sort by unit number numerically if floor and block are identical
  const numA = getUnitNumber(a.unit);
  const numB = getUnitNumber(b.unit);
  if (numA !== numB) {
    return numA - numB;
  }

  // 4. Fallback to string comparison
  return (a.unit || '').localeCompare(b.unit || '');
};

export const sortResidents = <T extends { block: string; unit: string }>(list: T[]): T[] => {
  return [...list].sort(compareUnits);
};
