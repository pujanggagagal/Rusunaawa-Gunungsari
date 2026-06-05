export type UserRole = 'admin' | 'koordinator' | 'warga' | 'security';

export interface Resident {
  id: string;
  name: string;
  ktp: string;
  unit: string; // e.g., "A-101"
  block: string; // e.g., "Blok A"
  floor?: number; // extracted from the unit first digit
  phone: string;
  electricityStatus: 'Menyala' | 'Diputus';
  lastStatusChange?: string; // Date string
  occupancyStatus?: string; // Column I on Google Spreadsheet
  initialMeter?: number;
  isVacant?: boolean;
}

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

export const getBarcodeContent = (res: { id?: string; floor?: number; unit: string; block: string }): string => {
  const idSingkat = res.id ? res.id.substring(0, 4).toUpperCase() : 'TEMP';
  const floorVal = res.floor || getFloorFromUnit(res.unit);
  const blockClean = (res.block || '').trim().replace(/Blok\s+/i, '').trim();
  const unitClean = (res.unit || '').trim().replace(/^[A-Ea-e]-/, '').trim();
  return `RGS-${idSingkat}-${floorVal}-${blockClean}-${unitClean}`;
};

export const getCleanPhone = (phoneStr: string): string => {
  if (!phoneStr) return '';
  if (phoneStr.startsWith('VERIFIED_V1:')) {
    try {
      const data = JSON.parse(phoneStr.substring('VERIFIED_V1:'.length));
      return data.whatsapp || '';
    } catch (e) {
      return '';
    }
  }
  return phoneStr;
};

export interface BillingRecord {
  id: string;
  residentKtp: string;
  month: string; // e.g., "Mei"
  year: number; // e.g., 2026
  prevMeter: number;
  currentMeter: number;
  usage: number; // currentMeter - prevMeter
  pdamBill: number; // Calculation: basic or linear
  trashBill: number; // Fixed 10,000
  totalBill: number;
  status: 'Lunas' | 'Belum Lunas' | 'Terbayar di Koordinator';
  paymentDate?: string;
}

export interface Coordinator {
  id: string;
  name: string;
  ktp: string;
  assignedFloor: number; // e.g., 1, 2, 3...
  assignedBlock?: string; // e.g., "Blok A" (for backward compatibility if any)
}

export interface FinancialLog {
  id: string;
  type: 'Pemasukan' | 'Pengeluaran';
  amount: number;
  description: string;
  date: string;
  category: string; // e.g., "Iuran Air", "Iuran Sampah", "Operasional Pompa"
  fundUser?: string; // "Pengguna Dana", only for Pengeluaran and hidden from warga
}

export interface AppSettings {
  appTitle: string;
  adminSlogan: string;
  pdamMinUsage: number;
  pdamMinPrice: number;
  pdamCostPerCubic: number;
  trashBillCost: number;
  appPrimaryColor: string; // 'purple' | 'cyan' | 'emerald' | 'indigo' | 'slate'
  paymentInstructions: string;
  isMaintenanceMode: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appTitle: "RUSUN GUNUNGSARI",
  adminSlogan: "Sistem Informasi Iuran Mandiri & Pendataan Meter Air Rusunawa Gunungsari",
  pdamMinUsage: 10,
  pdamMinPrice: 25000,
  pdamCostPerCubic: 2500,
  trashBillCost: 10000,
  appPrimaryColor: 'purple',
  paymentInstructions: "Pembayaran lunas iuran air & sampah dapat disetorkan langsung ke Koordinator Lantai atau melalui transfer ke Rekening Paguyuban Bank Jatim No: 001-2345-678 a.n Paguyuban Rusun Gunungsari.",
  isMaintenanceMode: false
};

