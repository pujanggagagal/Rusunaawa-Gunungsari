import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Resident, BillingRecord, Coordinator, FinancialLog, getFloorFromUnit } from './types';
import { INITIAL_RESIDENTS, INITIAL_COORDINATORS, INITIAL_BILLING_RECORDS, INITIAL_FINANCE_LOGS } from './data';

// Keep app instance singleton
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // If we don't have token cached yet, we might need sign-in again, or retrieve cached if valid.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Trigger login popup or flag that we need login
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Sistem gagal mengambil access token Google Drive/Sheets dari Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Proses masuk Google gagal:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Spreadsheet creation helper
export const createNewSpreadsheet = async (token: string): Promise<string> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Sistem Informasi Warga Rusunawa (Data Air & Tagihan)',
      },
      sheets: [
        { properties: { title: 'Residents' } },
        { properties: { title: 'Coordinators' } },
        { properties: { title: 'Billing' } },
        { properties: { title: 'Finance' } },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat Spreadsheet baru: ${errText}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;

  // Let's populate default sheets right away
  await populateSheetWithDefaults(spreadsheetId, token);
  return spreadsheetId;
};

// Check if spreadsheet exists
export const checkSpreadsheetExists = async (spreadsheetId: string, token: string): Promise<boolean> => {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Sistem tidak memiliki izin mengakses Spreadsheet ini. Harap LAKUKAN KELUAR (Log Out) via tombol merah di kanan atas, lalu Masuk kembali, dan pastikan Anda MENCENTANG semua kotak izin ("Lihat, edit, buat, dan hapus semua spreadsheet Google Anda").');
    }
    if (response.status === 404) {
      throw new Error('Spreadsheet ID tidak ditemukan atau tidak ada dalam Google Drive Anda. Periksa kembali ID atau tautan spreadsheet Anda.');
    }
    if (response.status === 401) {
      throw new Error('Sesi autentikasi Google Anda telah kedaluwarsa. Silakan keluar dan masuk kembali.');
    }
    
    let errMsg = `Gagal memverifikasi Spreadsheet (Status: ${response.status}).`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errMsg += ` Detail: ${errJson.error.message}`;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return true;
};

// Ensure spreadsheet contains required sheets, and auto-initialize if missing
export const ensureSpreadsheetSchema = async (spreadsheetId: string, token: string): Promise<boolean> => {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Sistem tidak memiliki izin mengakses/membaca info tabel dari Spreadsheet ini. Silakan keluar (Log Out) dan masuk kembali dengan mencentang kotak akses Google Drive & Sheets.');
    }
    throw new Error(`Gagal membaca metadata spreadsheet (Status: ${response.status}).`);
  }

  const result = await response.json();
  const existingSheets: string[] = (result.sheets || []).map((s: any) => s.properties?.title || '');

  const requiredSheets = ['Residents', 'Coordinators', 'Billing', 'Finance'];
  const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

  if (missingSheets.length > 0) {
    console.log('Autosetup: Menambahkan tab-tab yang hilang ke spreadsheet Anda:', missingSheets);
    
    // Create missing sheets via batchUpdate
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: {
          title
        }
      }
    }));

    const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      throw new Error(`Gagal menambahkan tab baru "${missingSheets.join(', ')}" ke spreadsheet Anda: ${errText}`);
    }

    // Since we added new sheets, let's populate them with default initial values!
    await populateSheetWithDefaults(spreadsheetId, token);
    return true; // schema was updated/initialized
  }

  return false; // schema was already complete
};

const populateSheetWithDefaults = async (spreadsheetId: string, token: string) => {
  // 1. Prepare Residents rows
  const residentRows = [
    ['ID', 'Nama Warga', 'KTP', 'Unit', 'Blok', 'Lantai', 'Telepon', 'Status Listrik', 'Tanggal Ubah Listrik', 'Status Hunian'],
    ...INITIAL_RESIDENTS.map(r => [
      r.id, r.name, r.ktp, r.unit, r.block, (r.floor || getFloorFromUnit(r.unit)).toString(), r.phone, r.electricityStatus, r.lastStatusChange || '', r.occupancyStatus || 'Dihuni'
    ])
  ];

  // 2. Prepare Coordinators rows
  const coordRows = [
    ['ID', 'Nama Koordinator', 'KTP', 'Lantai Tugas'],
    ...INITIAL_COORDINATORS.map(c => [
      c.id, c.name, c.ktp, c.assignedFloor.toString()
    ])
  ];

  // 3. Prepare Billing rows
  const billingRows = [
    ['ID', 'KTP Warga', 'Bulan', 'Tahun', 'Meter Lalu', 'Meter Ini', 'Pemakaian', 'Tagihan PDAM', 'Tagihan Sampah', 'Total Tagihan', 'Status Pembayaran', 'Tanggal Bayar'],
    ...INITIAL_BILLING_RECORDS.map(b => [
      b.id, b.residentKtp, b.month, b.year.toString(), b.prevMeter.toString(), b.currentMeter.toString(), b.usage.toString(), b.pdamBill.toString(), b.trashBill.toString(), b.totalBill.toString(), b.status, b.paymentDate || ''
    ])
  ];

  // 4. Prepare Finance rows
  const financeRows = [
    ['ID', 'Jenis Transaksi', 'Jumlah', 'Keterangan', 'Tanggal', 'Kategori'],
    ...INITIAL_FINANCE_LOGS.map(f => [
      f.id, f.type, f.amount.toString(), f.description, f.date, f.category
    ])
  ];

  // Send updates to all tabs in a batch
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Residents!A1', values: residentRows },
        { range: 'Coordinators!A1', values: coordRows },
        { range: 'Billing!A1', values: billingRows },
        { range: 'Finance!A1', values: financeRows },
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gagal memasukkan data template awal ke sheets:', errText);
  }
};

// Generic read sheets data
export const fetchSpreadsheetData = async (spreadsheetId: string, token: string) => {
  const ranges = ['Residents!A1:J500', 'Coordinators!A1:D200', 'Billing!A1:L1000', 'Finance!A1:F1000'];
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`, 
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Sistem tidak memiliki izin membaca data tabel dari Spreadsheet ini. Silakan keluar lalu masuk lagi dengan Google dan pastikan mencentang kotak akses Google Drive & Sheets.');
    }
    if (response.status === 404) {
      throw new Error('File Google Spreadsheet tidak ditemukan. Pastikan ID Spreadsheet sesuai.');
    }
    const errText = await response.text();
    throw new Error(`Data tidak dapat dimuat: ${errText}`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges;

  const residentsData = valueRanges[0]?.values || [];
  const coordinatorsData = valueRanges[1]?.values || [];
  const billingData = valueRanges[2]?.values || [];
  const financeData = valueRanges[3]?.values || [];

  // Parse Residents
  const residents: Resident[] = [];
  if (residentsData.length > 1) {
    for (let i = 1; i < residentsData.length; i++) {
      const row = residentsData[i];
      if (!row[0] && !row[1] && !row[2]) continue; // Skip completely empty rows
      const id = row[0] || `res-imported-${row[2] || i}`;
      const unitVal = row[3] || '';
      residents.push({
        id: id,
        name: row[1] || '',
        ktp: (row[2] || '').toString().trim(),
        unit: unitVal,
        block: row[4] || '',
        floor: Number(row[5]) || getFloorFromUnit(unitVal),
        phone: row[6] || '',
        electricityStatus: (row[7] === 'Diputus' ? 'Diputus' : 'Menyala'),
        lastStatusChange: row[8] || undefined,
        occupancyStatus: row[9] || 'Dihuni',
      });
    }
  }

  // Parse Coordinators
  const coordinators: Coordinator[] = [];
  if (coordinatorsData.length > 1) {
    for (let i = 1; i < coordinatorsData.length; i++) {
      const row = coordinatorsData[i];
      if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows
      const id = row[0] || `coord-imported-${row[2] || i}`;
      const floorVal = row[3] || '1';
      const parsedFloor = parseInt(floorVal.toString().replace(/\D/g, ''), 10) || 1;
      coordinators.push({
        id: id,
        name: row[1] || '',
        ktp: (row[2] || '').toString().trim(),
        assignedFloor: parsedFloor,
        assignedBlock: `Lantai ${parsedFloor}`,
      });
    }
  }

  // Parse Billing
  const billing: BillingRecord[] = [];
  if (billingData.length > 1) {
    for (let i = 1; i < billingData.length; i++) {
      const row = billingData[i];
      if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows
      const id = row[0] || `bill-imported-${row[1] || 'ktp'}-${row[2] || 'm'}-${i}`;
      billing.push({
        id: id,
        residentKtp: (row[1] || '').toString().trim(),
        month: row[2] || '',
        year: Number(row[3]) || 2026,
        prevMeter: Number(row[4]) || 0,
        currentMeter: Number(row[5]) || 0,
        usage: Number(row[6]) || 0,
        pdamBill: Number(row[7]) || 0,
        trashBill: Number(row[8]) || 10000,
        totalBill: Number(row[9]) || 10000,
        status: (row[10] === 'Lunas' ? 'Lunas' : 'Belum Lunas'),
        paymentDate: row[11] || undefined,
      });
    }
  }

  // Parse Finance
  const finance: FinancialLog[] = [];
  if (financeData.length > 1) {
    for (let i = 1; i < financeData.length; i++) {
      const row = financeData[i];
      if (!row[0] && !row[1] && !row[2] && !row[3]) continue; // Skip empty rows
      const id = row[0] || `fin-imported-${i}`;
      finance.push({
        id: id,
        type: (row[1] === 'Pengeluaran' ? 'Pengeluaran' : 'Pemasukan'),
        amount: Number(row[2]) || 0,
        description: row[3] || '',
        date: row[4] || new Date().toISOString(),
        category: row[5] || '',
      });
    }
  }

  return { residents, coordinators, billing, finance };
};

// Generic Batch Write tab back to spreadsheet
export const saveTableToSpreadsheet = async (
  spreadsheetId: string, 
  token: string, 
  table: 'Residents' | 'Coordinators' | 'Billing' | 'Finance',
  dataList: any[]
) => {
  let values: any[][] = [];
  let range = '';

  if (table === 'Residents') {
    values = [
      ['ID', 'Nama Warga', 'KTP', 'Unit', 'Blok', 'Lantai', 'Telepon', 'Status Listrik', 'Tanggal Ubah Listrik', 'Status Hunian'],
      ...dataList.map((r: Resident) => [
        r.id, r.name, r.ktp, r.unit, r.block, (r.floor || getFloorFromUnit(r.unit)).toString(), r.phone, r.electricityStatus, r.lastStatusChange || '', r.occupancyStatus || 'Dihuni'
      ])
    ];
    // We clear with empty rows space up to 500 rows to ensure deleted items are wiped out!
    range = 'Residents!A1:J500';
  } else if (table === 'Coordinators') {
    values = [
      ['ID', 'Nama Koordinator', 'KTP', 'Lantai Tugas'],
      ...dataList.map((c: Coordinator) => [
        c.id, c.name, c.ktp, c.assignedFloor.toString()
      ])
    ];
    range = 'Coordinators!A1:D300';
  } else if (table === 'Billing') {
    values = [
      ['ID', 'KTP Warga', 'Bulan', 'Tahun', 'Meter Lalu', 'Meter Ini', 'Pemakaian', 'Tagihan PDAM', 'Tagihan Sampah', 'Total Tagihan', 'Status Pembayaran', 'Tanggal Bayar'],
      ...dataList.map((b: BillingRecord) => [
        b.id, b.residentKtp, b.month, b.year.toString(), b.prevMeter.toString(), b.currentMeter.toString(), b.usage.toString(), b.pdamBill.toString(), b.trashBill.toString(), b.totalBill.toString(), b.status, b.paymentDate || ''
      ])
    ];
    range = 'Billing!A1:L1000';
  } else if (table === 'Finance') {
    values = [
      ['ID', 'Jenis Transaksi', 'Jumlah', 'Keterangan', 'Tanggal', 'Kategori'],
      ...dataList.map((f: FinancialLog) => [
        f.id, f.type, f.amount.toString(), f.description, f.date, f.category
      ])
    ];
    range = 'Finance!A1:F1000';
  }

  // To prevent trailing rows having leftover values from previous save, 
  // we pad the values grid with empty arrays up to the range size!
  const expectedRows = range.includes('Residents') ? 500 : (range.includes('Coordinators') ? 300 : 1000);
  while (values.length < expectedRows) {
    const colCount = range.includes('Residents') ? 10 : (range.includes('Coordinators') ? 4 : (range.includes('Billing') ? 12 : 6));
    values.push(Array(colCount).fill(''));
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gagal menyimpan tabel "${table}" ke Google Sheets:`, errText);
    throw new Error(`Gagal menyimpan data "${table}" ke Google Sheets.`);
  }
};
