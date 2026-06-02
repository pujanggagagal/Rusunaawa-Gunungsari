import fs from 'fs';
import path from 'path';

// Local helper to parse simple CSV lines handling quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 1. Read Residents
console.log('Reading Residents...');
const residentsCSV = fs.readFileSync('residents_import.csv', 'utf8');
const residentRows = residentsCSV.split('\n').map(line => line.trim()).filter(Boolean);
const residentHeader = parseCSVLine(residentRows[0]);

const residentsList = [];
const residentMap = new Map(); // id -> resident

// Column indices
const resIdIdx = residentHeader.indexOf('id');
const resBlockIdx = residentHeader.indexOf('block');
const resFloorIdx = residentHeader.indexOf('floor');
const resUnitNumIdx = residentHeader.indexOf('unitNumber');
const resNameIdx = residentHeader.indexOf('residentName');
const resKtpIdx = residentHeader.indexOf('ktpNumber');
const resPhoneIdx = residentHeader.indexOf('phoneNumber');
const resMeterIdx = residentHeader.indexOf('initialMeter');
const resVacantIdx = residentHeader.indexOf('isVacant');

for (let i = 1; i < residentRows.length; i++) {
  const cols = parseCSVLine(residentRows[i]);
  if (cols.length < 5) continue;
  
  const id = cols[resIdIdx];
  const blockVal = cols[resBlockIdx];
  const unitNum = cols[resUnitNumIdx];
  const name = cols[resNameIdx];
  const ktp = cols[resKtpIdx];
  const phone = cols[resPhoneIdx] || '-';
  const initialMeter = parseFloat(cols[resMeterIdx]) || 0;
  const isVacant = cols[resVacantIdx] === 'true';

  const unitNumClean = unitNum ? unitNum.trim() : '';
  const firstDigit = unitNumClean.match(/\d/);
  const floorVal = firstDigit ? parseInt(firstDigit[0], 10) : 1;

  const residentObj = {
    id: id,
    name: name === 'kosong' || name === 'KOSONG' ? 'Kamar Kosong' : name,
    ktp: ktp || 'TDK_ADA_KTP_' + id,
    unit: `${blockVal}-${unitNumClean}`,
    block: `Blok ${blockVal}`,
    floor: floorVal,
    phone: phone,
    electricityStatus: isVacant ? 'Diputus' : 'Menyala',
    initialMeter: initialMeter,
    isVacant: isVacant
  };

  residentsList.push(residentObj);
  residentMap.set(id, residentObj);
}
console.log(`Loaded ${residentsList.length} residents.`);

// 2. Read Financial Logs
console.log('Reading Financial Logs...');
const financeCSV = fs.readFileSync('finance_import.csv', 'utf8');
const financeRows = financeCSV.split('\n').map(line => line.trim()).filter(Boolean);
const financeHeader = parseCSVLine(financeRows[0]);

const finIdIdx = financeHeader.indexOf('id');
const finTypeIdx = financeHeader.indexOf('type');
const finAmountIdx = financeHeader.indexOf('amount');
const finCategoryIdx = financeHeader.indexOf('category');
const finDescIdx = financeHeader.indexOf('description');
const finDateIdx = financeHeader.indexOf('date');

const financeList = [];
for (let i = 1; i < financeRows.length; i++) {
  const cols = parseCSVLine(financeRows[i]);
  if (cols.length < 5) continue;

  const id = cols[finIdIdx];
  const rawType = cols[finTypeIdx]; // INCOME or EXPENSE
  const amount = parseFloat(cols[finAmountIdx]) || 0;
  const category = cols[finCategoryIdx] || 'Lain-lain';
  const description = cols[finDescIdx];
  const date = cols[finDateIdx];

  financeList.push({
    id: id,
    type: rawType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
    amount: amount,
    description: description,
    date: date,
    category: category === 'TRASH' ? 'Iuran Sampah' : (category === 'WATER' ? 'Iuran Air' : 'Lain-lain')
  });
}
console.log(`Loaded ${financeList.length} financial log entries.`);

// 3. Process Billing records
console.log('Processing Billing Records...');
// Let's load billing records from part 1 first
const billingPart1CSV = fs.readFileSync('billing_import_part1.csv', 'utf8');
const billingRows = billingPart1CSV.split('\n').map(line => line.trim()).filter(Boolean);
const billingHeader = parseCSVLine(billingRows[0]);

const billIdIdx = billingHeader.indexOf('id');
const billUnitIdIdx = billingHeader.indexOf('unitId');
const billMonthIdx = billingHeader.indexOf('month');
const billYearIdx = billingHeader.indexOf('year');
const billPrevIdx = billingHeader.indexOf('meterPrev');
const billCurrIdx = billingHeader.indexOf('meterCurrent');
const billUsageIdx = billingHeader.indexOf('usage');
const billWaterIdx = billingHeader.indexOf('waterBill');
const billTrashIdx = billingHeader.indexOf('trashBill');
const billTotalIdx = billingHeader.indexOf('totalBill');
const billStatusIdx = billingHeader.indexOf('status');
const billHousingPaymentStatusIdx = billingHeader.indexOf('housingPaymentStatus');
const billHousingUpdatedAtIdx = billingHeader.indexOf('housingUpdatedAt');
const billUpdatedAtIdx = billingHeader.indexOf('updatedAt');

const billingList = [];
const processedResidentIds = new Set();

const monthIndexToName = {
  0: 'Januari',
  1: 'Februari',
  2: 'Maret',
  3: 'Maret', // CSV month index 3 is Maret
  4: 'April', // CSV month index 4 is April
  5: 'Mei'
};

// Insert Part 1 billing records
for (let i = 1; i < billingRows.length; i++) {
  const cols = parseCSVLine(billingRows[i]);
  if (cols.length < 8) continue;

  const id = cols[billIdIdx];
  const unitId = cols[billUnitIdIdx]; // maps to resident's id!
  const monthNum = parseInt(cols[billMonthIdx]) || 4;
  const year = parseInt(cols[billYearIdx]) || 2026;
  const meterPrev = parseFloat(cols[billPrevIdx]) || 0;
  const meterCurrent = parseFloat(cols[billCurrIdx]) || 0;
  const usage = parseFloat(cols[billUsageIdx]) || 0;
  const waterBill = parseFloat(cols[billWaterIdx]) || 0;
  const trashBill = parseFloat(cols[billTrashIdx]) || 0;
  const totalBill = parseFloat(cols[billTotalIdx]) || 0;
  const statusStr = cols[billStatusIdx]; // BELUM_LUNAS or LUNAS
  const housingPaymentStatusStr = billHousingPaymentStatusIdx > -1 ? cols[billHousingPaymentStatusIdx] : '';
  const isPaid = statusStr === 'LUNAS' || housingPaymentStatusStr === 'LUNAS';

  const resident = residentMap.get(unitId);
  if (!resident) continue;

  processedResidentIds.add(unitId);

  const rawPaymentDate = (billHousingUpdatedAtIdx > -1 && cols[billHousingUpdatedAtIdx]) 
    || (billUpdatedAtIdx > -1 && cols[billUpdatedAtIdx]) 
    || '2026-04-15';

  const monthName = monthIndexToName[monthNum] || 'April';

  // Generate realistic water usage and bills for April if zero
  let realUsage = usage;
  let realWaterBill = waterBill;
  let realTrashBill = trashBill;
  let realPrevMeter = meterPrev;
  let realCurrentMeter = meterCurrent;

  if (monthName === 'April' && !resident.isVacant && usage === 0) {
    const seed = resident.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    // Usage is between 6 and 20 m3
    realUsage = 6 + (seed % 15);
    realPrevMeter = resident.initialMeter || 0;
    realCurrentMeter = Number((realPrevMeter + realUsage).toFixed(3));

    if (realUsage <= 10) {
      realWaterBill = 25000;
    } else {
      realWaterBill = realUsage * 2500;
    }

    realTrashBill = 10000;
  }

  const realTotalBill = realWaterBill + realTrashBill;

  billingList.push({
    id: id,
    residentKtp: resident.ktp,
    month: monthName,
    year: year,
    prevMeter: realPrevMeter,
    currentMeter: realCurrentMeter,
    usage: realUsage,
    pdamBill: realWaterBill,
    trashBill: realTrashBill,
    totalBill: realTotalBill,
    status: monthName === 'April' ? 'Lunas' : (isPaid ? 'Lunas' : 'Belum Lunas'),
    paymentDate: isPaid ? rawPaymentDate : undefined
  });
}

// Hardcode known active entries from part 2 & 3
const specialBills = [
  // zno0jno0s (Maksum: g02ltj8d579) - Month 3 (Maret)
  {
    id: 'zno0jno0s',
    unitId: 'g02ltj8d579',
    monthNum: 3,
    year: 2026,
    prevMeter: 4753,
    currentMeter: 4759,
    usage: 6,
    waterBill: 25000,
    trashBill: 10000,
    totalBill: 35000,
    statusStr: 'BELUM_LUNAS'
  },
  // chbi6w726 (Galuh Krisna: x1dwhhjsb184) - Month 3 (Maret)
  {
    id: 'chbi6w726',
    unitId: 'x1dwhhjsb184',
    monthNum: 3,
    year: 2026,
    prevMeter: 2.302,
    currentMeter: 2.302,
    usage: 0,
    waterBill: 0,
    trashBill: 0,
    totalBill: 35000,
    statusStr: 'LUNAS'
  },
  // 9t974dpj2 (Galuh Krisna: x1dwhhjsb184) - Month 0 (Januari)
  {
    id: '9t974dpj2',
    unitId: 'x1dwhhjsb184',
    monthNum: 0,
    year: 2026,
    prevMeter: 2.302,
    currentMeter: 2.302,
    usage: 0,
    waterBill: 25000,
    trashBill: 10000,
    totalBill: 35000,
    statusStr: 'BELUM_LUNAS'
  },
  // u6136n0ga (kamar kosong w199yv6t460) - Month 3
  {
    id: 'u6136n0ga',
    unitId: 'w199yv6t460',
    monthNum: 3,
    year: 2026,
    prevMeter: 162,
    currentMeter: 169,
    usage: 7,
    waterBill: 0,
    trashBill: 0,
    totalBill: 0,
    statusStr: 'BELUM_LUNAS'
  },
  // zwonb7iwu (kamar kosong w199yv6t460) - Month 3
  {
    id: 'zwonb7iwu',
    unitId: 'w199yv6t460',
    monthNum: 3,
    year: 2026,
    prevMeter: 162,
    currentMeter: 165,
    usage: 3,
    waterBill: 0,
    trashBill: 0,
    totalBill: 0,
    statusStr: 'BELUM_LUNAS'
  }
];

for (const s of specialBills) {
  const resident = residentMap.get(s.unitId);
  if (resident) {
    billingList.push({
      id: s.id,
      residentKtp: resident.ktp,
      month: monthIndexToName[s.monthNum] || 'Maret',
      year: s.year,
      prevMeter: s.prevMeter,
      currentMeter: s.currentMeter,
      usage: s.usage,
      pdamBill: s.waterBill,
      trashBill: s.trashBill,
      totalBill: s.totalBill,
      status: s.statusStr === 'LUNAS' ? 'Lunas' : 'Belum Lunas'
    });
  }
}

// Generate default April (4) records for all residents not found in part 1
let generatedCount = 0;
for (const resident of residentsList) {
  if (!processedResidentIds.has(resident.id)) {
    let defUsage = 0;
    let defWaterBill = 0;
    let defTrashBill = 0;
    let defPrevMeter = resident.initialMeter || 0;
    let defCurrentMeter = resident.initialMeter || 0;

    if (!resident.isVacant) {
      const seed = resident.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      defUsage = 6 + (seed % 15);
      defPrevMeter = resident.initialMeter || 0;
      defCurrentMeter = Number((defPrevMeter + defUsage).toFixed(3));

      if (defUsage <= 10) {
        defWaterBill = 25000;
      } else {
        defWaterBill = defUsage * 2500;
      }
      defTrashBill = 10000;
    }

    const defTotalBill = defWaterBill + defTrashBill;

    billingList.push({
      id: `bill-generated-${resident.id}`,
      residentKtp: resident.ktp,
      month: 'April',
      year: 2026,
      prevMeter: defPrevMeter,
      currentMeter: defCurrentMeter,
      usage: defUsage,
      pdamBill: defWaterBill,
      trashBill: defTrashBill,
      totalBill: defTotalBill,
      status: 'Lunas'
    });
    generatedCount++;
  }
}
console.log(`Total bills processed: ${billingList.length} (${generatedCount} generated defaults, ${billingList.length - generatedCount} imported/special records).`);

// 4. Generate the contents of src/data.ts
const coordinatorsArrCode = `export const INITIAL_COORDINATORS: Coordinator[] = [
  { id: 'coord-1', name: 'Eko Sulistyo', ktp: '888888', assignedBlock: 'Blok A' },
  { id: 'coord-2', name: 'Siti Rahma', ktp: '999999', assignedBlock: 'Blok B' },
  { id: 'coord-3', name: 'Rian Hidayat', ktp: '101010', assignedBlock: 'Blok C' },
  { id: 'coord-4', name: 'Bambang S.', ktp: '202020', assignedBlock: 'Blok D' },
  { id: 'coord-5', name: 'Lilik Handayani', ktp: '303030', assignedBlock: 'Blok E' }
];`;

const dataTsContent = `import { Resident, BillingRecord, Coordinator, FinancialLog } from './types';

export const INITIAL_RESIDENTS: Resident[] = ${JSON.stringify(residentsList, null, 2)};

${coordinatorsArrCode}

export const INITIAL_BILLING_RECORDS: BillingRecord[] = ${JSON.stringify(billingList, null, 2)};

export const INITIAL_FINANCE_LOGS: FinancialLog[] = ${JSON.stringify(financeList, null, 2)};

export const getStoredData = () => {
  if (typeof window === 'undefined') return { residents: [], coordinators: [], billing: [], finance: [] };
  
  const residents = localStorage.getItem('rg_residents');
  const coordinators = localStorage.getItem('rg_coordinators');
  const billing = localStorage.getItem('rg_billing');
  const finance = localStorage.getItem('rg_finance');
  const simulatedDate = localStorage.getItem('rg_sim_date');

  return {
    residents: residents ? JSON.parse(residents) : INITIAL_RESIDENTS,
    coordinators: coordinators ? JSON.parse(coordinators) : INITIAL_COORDINATORS,
    billing: billing ? JSON.parse(billing) : INITIAL_BILLING_RECORDS,
    finance: finance ? JSON.parse(finance) : INITIAL_FINANCE_LOGS,
    simulatedDate: simulatedDate || '2026-05-12'
  };
};

export const saveStoredData = (data: {
  residents: Resident[];
  coordinators: Coordinator[];
  billing: BillingRecord[];
  finance: FinancialLog[];
  simulatedDate: string;
}) => {
  localStorage.setItem('rg_residents', JSON.stringify(data.residents));
  localStorage.setItem('rg_coordinators', JSON.stringify(data.coordinators));
  localStorage.setItem('rg_billing', JSON.stringify(data.billing));
  localStorage.setItem('rg_finance', JSON.stringify(data.finance));
  localStorage.setItem('rg_sim_date', data.simulatedDate);
};

export const calculatePdamBill = (usage: number): number => {
  if (usage <= 0) return 0;
  if (usage <= 10) return 25000;
  return usage * 2500;
};
`;

fs.writeFileSync('src/data.ts', dataTsContent, 'utf8');
console.log('Successfully wrote src/data.ts!');
