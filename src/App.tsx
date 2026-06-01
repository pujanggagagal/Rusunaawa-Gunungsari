import React, { useState, useEffect } from 'react';
import { UserRole, Resident, Coordinator, BillingRecord, FinancialLog, getFloorFromUnit, AppSettings, DEFAULT_APP_SETTINGS } from './types';
import { getStoredData, saveStoredData, calculatePdamBill } from './data';
import { Login } from './components/Login';
import { WargaDashboard } from './components/WargaDashboard';
import { KoordinatorDashboard } from './components/KoordinatorDashboard';
import { SecurityDashboard } from './components/SecurityDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { 
  Droplets, ShieldCheck, Terminal, UserCheck, Key, User, Landmark, 
  HelpCircle, Sparkles, Database, DatabaseZap, ClipboardCheck, Info, X, Check,
  LogOut, RefreshCw, Layers, FileSpreadsheet, Sparkle, Loader, UploadCloud
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  createNewSpreadsheet, 
  checkSpreadsheetExists, 
  fetchSpreadsheetData, 
  saveTableToSpreadsheet,
  ensureSpreadsheetSchema
} from './googleSheetsClient';
import { User as FirebaseUser } from 'firebase/auth';
import { supabase } from './supabaseClient';
import { supabaseService } from './supabaseService';

export default function App() {
  const [data, setData] = useState(() => getStoredData());
  const [isLoading, setIsLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
    const stored = localStorage.getItem('rg_app_settings');
    if (stored) {
      try {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        return DEFAULT_APP_SETTINGS;
      }
    }
    return DEFAULT_APP_SETTINGS;
  });

  // Save changes locally to localStorage
  useEffect(() => {
    localStorage.setItem('rg_app_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // Load Data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        const { data: residentsData } = await supabase.from('residents').select('*');
        const { data: coordinatorsData } = await supabase.from('coordinators').select('*');
        const { data: billingData } = await supabase.from('billing').select('*');
        const { data: financeData } = await supabase.from('finance_logs').select('*');

        if (residentsData && coordinatorsData && billingData && financeData) {
          const toCamelCase = (obj: any) => {
            const newObj: any = {};
            for (const key in obj) {
              const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
              // Handle specific lowercase columns that were originally camelCase
              const mappedKey = 
                key === 'electricitystatus' ? 'electricityStatus' :
                key === 'laststatuschange' ? 'lastStatusChange' :
                key === 'occupancystatus' ? 'occupancyStatus' :
                key === 'initialmeter' ? 'initialMeter' :
                key === 'isvacant' ? 'isVacant' :
                key === 'assignedfloor' ? 'assignedFloor' :
                key === 'assignedblock' ? 'assignedBlock' :
                key === 'residentktp' ? 'residentKtp' :
                key === 'prevmeter' ? 'prevMeter' :
                key === 'currentmeter' ? 'currentMeter' :
                key === 'pdambill' ? 'pdamBill' :
                key === 'trashbill' ? 'trashBill' :
                key === 'totalbill' ? 'totalBill' :
                key === 'paymentdate' ? 'paymentDate' :
                key === 'funduser' ? 'fundUser' : camelKey;
              newObj[mappedKey] = obj[key];
            }
            return newObj;
          };

          setData(prev => ({
            ...prev,
            residents: residentsData.map(toCamelCase),
            coordinators: coordinatorsData.map(toCamelCase),
            billing: billingData.map(toCamelCase),
            finance: financeData.map(toCamelCase)
          }));
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      }
    };
    loadSupabaseData();
  }, []);


  // Google Sheets Integration States
  const [sheetsUser, setSheetsUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem('rg_sheets_id') || '1HWxCtW5KOKgrwljpYS7oMiWVt9EMdlEp9J0NEI4rns0');
  const [syncStatus, setSyncStatus] = useState<'not_connected' | 'connecting' | 'connected' | 'syncing' | 'error'>('not_connected');
  const [sheetsErrorMsg, setSheetsErrorMsg] = useState<string>('');
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState<string>('');
  const [showSheetsInfo, setShowSheetsInfo] = useState<boolean>(false);
  const [saveAllStatus, setSaveAllStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Save changes locally to localStorage
  useEffect(() => {
    saveStoredData(data);
  }, [data]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setSheetsUser(user);
        setAccessToken(token);
        if (spreadsheetId) {
          loadDataFromSheets(spreadsheetId, token);
        } else {
          setSyncStatus('connected');
        }
      },
      () => {
        setSheetsUser(null);
        setAccessToken(null);
        setSyncStatus('not_connected');
      }
    );
    return () => unsubscribe();
  }, [spreadsheetId]);

  // Read data from Google spreadsheets
  const loadDataFromSheets = async (sheetId: string, token: string) => {
    setSyncStatus('connecting');
    try {
      // Pastikan spreadsheet memiliki tab-tab database yang diperlukan, jika belum, buat otomatis!
      await ensureSpreadsheetSchema(sheetId, token);

      const { residents, coordinators, billing, finance } = await fetchSpreadsheetData(sheetId, token);
      
      const hasNoResidents = residents.length === 0;
      const hasNoCoordinators = coordinators.length === 0;
      const hasNoBilling = billing.length === 0;
      const hasNoFinance = finance.length === 0;

      const finalResidents = hasNoResidents ? data.residents : residents;
      const finalCoordinators = hasNoCoordinators ? data.coordinators : coordinators;
      const finalBilling = hasNoBilling ? data.billing : billing;
      const finalFinance = hasNoFinance ? data.finance : finance;

      setData({
        residents: finalResidents,
        coordinators: finalCoordinators,
        billing: finalBilling,
        finance: finalFinance,
        simulatedDate: data.simulatedDate
      });

      setSyncStatus('connected');
      setSheetsErrorMsg('');

      // Auto-upload data jika sheet baru/kosong agar data iuran, billing dan keuangan masuk
      if (hasNoResidents || hasNoCoordinators || hasNoBilling || hasNoFinance) {
        console.log('Sistem mendeteksi tab spreadsheet kosong. Melakukan sinkronisasi data awal otomatis...');
        setTimeout(async () => {
          try {
            if (hasNoResidents && finalResidents.length > 0) {
              await saveTableToSpreadsheet(sheetId, token, 'Residents', finalResidents);
            }
            if (hasNoCoordinators && finalCoordinators.length > 0) {
              await saveTableToSpreadsheet(sheetId, token, 'Coordinators', finalCoordinators);
            }
            if (hasNoBilling && finalBilling.length > 0) {
              await saveTableToSpreadsheet(sheetId, token, 'Billing', finalBilling);
            }
            if (hasNoFinance && finalFinance.length > 0) {
              await saveTableToSpreadsheet(sheetId, token, 'Finance', finalFinance);
            }
          } catch (syncErr) {
            console.error('Gagal memasukkan data awal otomatis ke Google Sheets:', syncErr);
          }
        }, 1200);
      }
    } catch (err: any) {
      console.error('Error fetching sheets data:', err);
      setSyncStatus('error');
      setSheetsErrorMsg(err.message || 'Gagal membaca data dari Google Spreadsheet Anda.');
    }
  };

// Push updates to Google Sheets client
  const syncTable = async (table: 'Residents' | 'Coordinators' | 'Billing' | 'Finance', updatedList: any[]) => {
    try {
      if (table === 'Residents') await supabaseService.bulkInsertResidents(updatedList);
      if (table === 'Coordinators') await supabaseService.bulkInsertCoordinators(updatedList);
      if (table === 'Billing') await supabaseService.bulkInsertBillingRecords(updatedList);
      if (table === 'Finance') await supabaseService.bulkInsertFinancialLogs(updatedList);
    } catch (err: any) {
      console.error(`Gagal melakukan autosync tabel "${table}" ke Supabase:`, err);
    }
  };

  // Sign In 
  const handleGoogleSignIn = async () => {
    setSyncStatus('connecting');
    try {
      const res = await googleSignIn();
      if (res) {
        setSheetsUser(res.user);
        setAccessToken(res.accessToken);
        if (spreadsheetId) {
          await loadDataFromSheets(spreadsheetId, res.accessToken);
        } else {
          setSyncStatus('connected');
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSheetsErrorMsg(err.message || 'Proses masuk akun Google gagal.');
    }
  };

  // Sign Out
  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setSheetsUser(null);
    setAccessToken(null);
    setSyncStatus('not_connected');
  };

  // Create sheet automatically
  const handleCreateAutoSpreadsheet = async () => {
    if (!accessToken) return;
    setSyncStatus('connecting');
    try {
      const newId = await createNewSpreadsheet(accessToken);
      setSpreadsheetId(newId);
      localStorage.setItem('rg_sheets_id', newId);
      await loadDataFromSheets(newId, accessToken);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSheetsErrorMsg(err.message || 'Proses pembuatan spreadsheet baru gagal.');
    }
  };

  // Connect an existing spreadsheet ID
  const handleConnectExistingSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !inputSpreadsheetId) return;
    setSyncStatus('connecting');
    try {
      const cleanId = inputSpreadsheetId.trim();
      let finalId = cleanId;
      if (cleanId.includes('/d/')) {
        const parts = cleanId.split('/d/');
        if (parts[1]) {
          finalId = parts[1].split('/')[0];
        }
      }

      const exists = await checkSpreadsheetExists(finalId, accessToken);
      if (!exists) {
        throw new Error('Spreadsheet ID tidak ditemukan atau akun Google Anda tidak memiliki hak akses.');
      }

      setSpreadsheetId(finalId);
      localStorage.setItem('rg_sheets_id', finalId);
      await loadDataFromSheets(finalId, accessToken);
      setInputSpreadsheetId('');
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSheetsErrorMsg(err.message || 'ID/Link spreadsheet salah atau tidak valid.');
    }
  };

  const handleDisconnectSpreadsheet = () => {
    const confirmation = window.confirm('Apakah Anda ingin memutuskan tautan Google Spreadsheet ini? Data lokal akan tetap aman.');
    if (confirmation) {
      setSpreadsheetId('');
      localStorage.removeItem('rg_sheets_id');
      setSyncStatus('connected');
    }
  };

  const handleForceReload = () => {
    if (spreadsheetId && accessToken) {
      loadDataFromSheets(spreadsheetId, accessToken);
    }
  };

  const handleExportAllToSheets = async () => {
    if (!spreadsheetId || !accessToken) return;
    setSaveAllStatus('saving');
    try {
      await saveTableToSpreadsheet(spreadsheetId, accessToken, 'Residents', data.residents);
      await saveTableToSpreadsheet(spreadsheetId, accessToken, 'Coordinators', data.coordinators);
      await saveTableToSpreadsheet(spreadsheetId, accessToken, 'Billing', data.billing);
      await saveTableToSpreadsheet(spreadsheetId, accessToken, 'Finance', data.finance);
      setSaveAllStatus('success');
      setTimeout(() => setSaveAllStatus('idle'), 3500);
    } catch (err: any) {
      console.error(err);
      setSaveAllStatus('error');
      setTimeout(() => setSaveAllStatus('idle'), 5000);
    }
  };

  // Handle Log Out from App dashboard
  const handleLogout = () => {
    setCurrentRole(null);
    setCurrentUser(null);
  };

  // Handle login success
  const handleLoginSuccess = (role: UserRole, userDetails: any) => {
    setCurrentRole(role);
    setCurrentUser(userDetails);
  };

  // citizen payments
  const handlePayBill = (billId: string, amount: number) => {
    setData((prev) => {
      // Find current records
      const targetBill = prev.billing.find((b) => b.id === billId);
      const resident = prev.residents.find((r) => r.ktp === targetBill?.residentKtp);

      // Find the billing record
      const updatedBilling = prev.billing.map((b) => {
        if (b.id === billId) {
          return {
            ...b,
            status: 'Lunas' as const,
            paymentDate: new Date().toISOString(),
          };
        }
        return b;
      });

      // Restore electricity automatically if payment clears
      const updatedResidents = prev.residents.map((r) => {
        if (r.ktp === targetBill?.residentKtp) {
          return {
            ...r,
            electricityStatus: 'Menyala' as const,
            lastStatusChange: new Date().toISOString(),
          };
        }
        return r;
      });

      // Create new cash log
      const newLog: FinancialLog = {
        id: `fin-${Date.now()}`,
        type: 'Pemasukan',
        amount: amount,
        description: `Pembayaran PDAM & Sampah Unit ${resident?.unit || 'Kamar'} (${targetBill?.month} ${targetBill?.year})`,
        date: new Date().toISOString(),
        category: 'Iuran Warga'
      };

      const updatedFinance = [newLog, ...prev.finance];

      // AutoSync asynchronously to Google Sheets
      syncTable('Billing', updatedBilling);
      syncTable('Residents', updatedResidents);
      syncTable('Finance', updatedFinance);

      return {
        ...prev,
        billing: updatedBilling,
        residents: updatedResidents,
        finance: updatedFinance,
      };
    });

    // Update current active user ref if logged in as Warga
    if (currentRole === 'warga' && currentUser) {
      setCurrentUser((prevUser: Resident) => ({
        ...prevUser,
        electricityStatus: 'Menyala' as const,
      }));
    }
  };

  // koordinator records meter cubic usages
  const handleSaveMeter = (residentKtp: string, prevMeter: number, currentMeter: number) => {
    const resident = data.residents.find((r) => r.ktp === residentKtp);
    const isVacant = resident?.isVacant || resident?.occupancyStatus === 'Kosong' || resident?.occupancyStatus === 'kosong' || resident?.name === 'Kamar Kosong' || resident?.name?.toLowerCase()?.includes('kamar kosong');

    const usage = isVacant ? 0 : currentMeter - prevMeter;
    const pdamBill = isVacant ? 0 : calculatePdamBill(usage, appSettings);
    const trashBill = isVacant ? 0 : appSettings.trashBillCost;
    const totalBill = pdamBill + trashBill;

    setData((prev) => {
      // Find if Mei record already exists for this citizen
      const existingMeiIdx = prev.billing.findIndex(
        (b) => b.residentKtp === residentKtp && b.month === 'Mei' && b.year === 2026
      );

      let updatedBilling = [...prev.billing];

      if (existingMeiIdx > -1) {
        // Update
        updatedBilling[existingMeiIdx] = {
          ...updatedBilling[existingMeiIdx],
          prevMeter,
          currentMeter: isVacant ? prevMeter : currentMeter,
          usage,
          pdamBill,
          trashBill,
          totalBill,
        };
      } else {
        // Insert new
        const newRecord: BillingRecord = {
          id: `bill-${residentKtp}-mei`,
          residentKtp,
          month: 'Mei',
          year: 2026,
          prevMeter,
          currentMeter: isVacant ? prevMeter : currentMeter,
          usage,
          pdamBill,
          trashBill,
          totalBill,
          status: 'Belum Lunas'
        };
        updatedBilling = [newRecord, ...updatedBilling];
      }

      // AutoSync asynchronously to Google Sheets
      syncTable('Billing', updatedBilling);

      return {
        ...prev,
        billing: updatedBilling,
      };
    });
  };

  // Admin correction for previous month (April) meter readings
  const handleUpdateAprilMeter = (residentKtp: string, newAprilMeter: number) => {
    const resident = data.residents.find(r => r.ktp === residentKtp);
    const isVacant = resident?.isVacant || resident?.occupancyStatus === 'Kosong' || resident?.occupancyStatus === 'kosong' || resident?.name === 'Kamar Kosong' || resident?.name?.toLowerCase()?.includes('kamar kosong');

    setData((prev) => {
      // 1. Check if April billing record exists for this resident
      const aprilBillIdx = prev.billing.findIndex(
        (b) => b.residentKtp === residentKtp && b.month === 'April' && b.year === 2026
      );

      let updatedBilling = [...prev.billing];
      if (aprilBillIdx > -1) {
        // April record exists -> update currentMeter
        const aprBill = updatedBilling[aprilBillIdx];
        const prevMeter = aprBill.prevMeter;
        const usage = isVacant ? 0 : Math.max(0, newAprilMeter - prevMeter);
        const pdamBill = isVacant ? 0 : calculatePdamBill(usage);
        const trashBill = isVacant ? 0 : aprBill.trashBill;
        const totalBill = pdamBill + trashBill;
        
        updatedBilling[aprilBillIdx] = {
          ...aprBill,
          currentMeter: isVacant ? prevMeter : newAprilMeter,
          usage,
          pdamBill,
          trashBill,
          totalBill,
        };
      } else {
        // April record does not exist -> Create one
        const prevMeter = resident?.initialMeter !== undefined && resident?.initialMeter !== null
          ? Number(resident.initialMeter)
          : 100;
        const usage = isVacant ? 0 : Math.max(0, newAprilMeter - prevMeter);
        const pdamBill = isVacant ? 0 : calculatePdamBill(usage);
        const trashBill = isVacant ? 0 : appSettings.trashBillCost;
        const totalBill = pdamBill + trashBill;

        const newAprilBill: BillingRecord = {
          id: `bill-${residentKtp}-april`,
          residentKtp,
          month: 'April',
          year: 2026,
          prevMeter,
          currentMeter: isVacant ? prevMeter : newAprilMeter,
          usage,
          pdamBill,
          trashBill,
          totalBill,
          status: 'Lunas' // April is historic, default to Paid
        };
        updatedBilling = [newAprilBill, ...updatedBilling];
      }

      // 2. Propagate this updated April currentMeter as prevMeter for May record (if it exists)
      const meiBillIdx = updatedBilling.findIndex(
        (b) => b.residentKtp === residentKtp && b.month === 'Mei' && b.year === 2026
      );
      if (meiBillIdx > -1) {
        const meiBill = updatedBilling[meiBillIdx];
        const prevMeter = isVacant ? meiBill.prevMeter : newAprilMeter;
        const usage = isVacant ? 0 : Math.max(0, meiBill.currentMeter - prevMeter);
        const pdamBill = isVacant ? 0 : calculatePdamBill(usage);
        const trashBill = isVacant ? 0 : meiBill.trashBill;
        const totalBill = pdamBill + trashBill;

        updatedBilling[meiBillIdx] = {
          ...meiBill,
          prevMeter,
          usage,
          pdamBill,
          trashBill,
          totalBill,
        };
      }

      // Also update resident's initialMeter to sync the fallback
      const updatedResidents = prev.residents.map((r) => {
        if (r.ktp === residentKtp) {
          return { ...r, initialMeter: newAprilMeter };
        }
        return r;
      });

      // Async sync to Supabase/Spreadsheet
      syncTable('Billing', updatedBilling);
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        billing: updatedBilling,
        residents: updatedResidents,
      };
    });
  };

  // security toggle electricity switches
  const handleUpdateElectricity = (residentId: string, status: 'Menyala' | 'Diputus') => {
    setData((prev) => {
      const updatedResidents = prev.residents.map((r) => {
        if (r.id === residentId) {
          return {
            ...r,
            electricityStatus: status,
            lastStatusChange: new Date().toISOString(),
          };
        }
        return r;
      });

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        residents: updatedResidents,
      };
    });

    // Update active user state details in case citizen logs in
    if (currentRole === 'warga' && currentUser && currentUser.id === residentId) {
      setCurrentUser((prev: any) => ({
        ...prev,
        electricityStatus: status,
      }));
    }
  };

  // calendar dates simulation updates
  const handleUpdateSimulatedDate = (newDate: string) => {
    setData((prev) => ({
      ...prev,
      simulatedDate: newDate,
    }));
  };

  // admin updates resident KTP typo
  const handleUpdateResidentKtp = (residentId: string, newKtp: string) => {
    setData((prev) => {
      const oldResVal = prev.residents.find(r => r.id === residentId);
      if (!oldResVal) return prev;
      const oldKtp = oldResVal.ktp;

      const updatedResidents = prev.residents.map((r) => {
        if (r.id === residentId) {
          return { ...r, ktp: newKtp };
        }
        return r;
      });

      // Update matching billing records too
      const updatedBilling = prev.billing.map((b) => {
        if (b.residentKtp === oldKtp) {
          return { ...b, residentKtp: newKtp };
        }
        return b;
      });

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);
      syncTable('Billing', updatedBilling);

      return {
        ...prev,
        residents: updatedResidents,
        billing: updatedBilling,
      };
    });
  };

  // admin edits a resident's details fully
  const handleEditResident = (id: string, updatedFields: Partial<Resident>) => {
    setData((prev) => {
      const oldRes = prev.residents.find((r) => r.id === id);
      if (!oldRes) return prev;
      const oldKtp = oldRes.ktp;
      const newKtp = updatedFields.ktp !== undefined ? updatedFields.ktp : oldKtp;

      const updatedResidents = prev.residents.map((r) => {
        if (r.id === id) {
          return { ...r, ...updatedFields };
        }
        return r;
      });

      let updatedBilling = prev.billing;
      if (oldKtp !== newKtp) {
        // Update matching billing records too
        updatedBilling = prev.billing.map((b) => {
          if (b.residentKtp === oldKtp) {
            return { ...b, residentKtp: newKtp };
          }
          return b;
        });
      }

      // Sync asynchronously to Sheets
      syncTable('Residents', updatedResidents);
      if (oldKtp !== newKtp) {
        syncTable('Billing', updatedBilling);
      }

      return {
        ...prev,
        residents: updatedResidents,
        billing: updatedBilling,
      };
    });
  };

  // admin edits a coordinator details fully and syncs to sheet
  const handleEditCoordinator = (id: string, updatedFields: Partial<Coordinator>) => {
    setData((prev) => {
      const updatedCoordinators = prev.coordinators.map((c) => {
        if (c.id === id) {
          const assignedFloor = updatedFields.assignedFloor !== undefined ? updatedFields.assignedFloor : c.assignedFloor;
          return {
            ...c,
            ...updatedFields,
            assignedBlock: `Lantai ${assignedFloor}`
          };
        }
        return c;
      });

      // Sync asynchronously to Sheets
      syncTable('Coordinators', updatedCoordinators);

      return {
        ...prev,
        coordinators: updatedCoordinators,
      };
    });
  };

  // admin updates resident occupancy status (Column I Status Hunian)
  const handleUpdateResidentStatus = (residentId: string, status: string) => {
    setData((prev) => {
      const updatedResidents = prev.residents.map((r) => {
        if (r.id === residentId) {
          return { ...r, occupancyStatus: status };
        }
        return r;
      });

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        residents: updatedResidents,
      };
    });
  };

  // admin creates new residents
  const handleAddResident = (newRes: Omit<Resident, 'id'>) => {
    const childId = `res-${Date.now()}`;

    setData((prev) => {
      const residentRecord: Resident = {
        ...newRes,
        floor: newRes.floor || getFloorFromUnit(newRes.unit),
        id: childId,
      };

      const updatedResidents = [...prev.residents, residentRecord];

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        residents: updatedResidents,
      };
    });
  };

  // admin bulk imports residents from Excel/XLSX/CSV data
  const handleImportResidents = (importedList: Omit<Resident, 'id'>[]) => {
    setData((prev) => {
      let updatedResidents = [...prev.residents];

      importedList.forEach((newRes, idx) => {
        const existingIdx = updatedResidents.findIndex(r => r.ktp === newRes.ktp);
        if (existingIdx !== -1) {
          // Update existing resident record
          updatedResidents[existingIdx] = {
            ...updatedResidents[existingIdx],
            ...newRes,
            floor: newRes.floor || getFloorFromUnit(newRes.unit),
          };
        } else {
          // Insert new resident record
          updatedResidents.push({
            ...newRes,
            floor: newRes.floor || getFloorFromUnit(newRes.unit),
            id: `res-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          });
        }
      });

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        residents: updatedResidents,
      };
    });
  };

  // admin deletes/checks out residents
  const handleDeleteResident = (id: string) => {
    setData((prev) => {
      const updatedResidents = prev.residents.filter((r) => r.id !== id);

      // AutoSync asynchronously to Google Sheets
      syncTable('Residents', updatedResidents);

      return {
        ...prev,
        residents: updatedResidents,
      };
    });
  };

  // admin logs new transaction (expenditure / income)
  const handleAddExpense = (amount: number, desc: string, category: string, fundUser?: string, type: 'Pemasukan' | 'Pengeluaran' = 'Pengeluaran') => {
    const newId = `exp-${Date.now()}`;

    setData((prev) => {
      const newLog: FinancialLog = {
        id: newId,
        type,
        amount,
        description: desc,
        date: new Date().toISOString(),
        category,
        fundUser,
      };

      const updatedFinance = [newLog, ...prev.finance];

      // AutoSync asynchronously to Google Sheets
      syncTable('Finance', updatedFinance);

      return {
        ...prev,
        finance: updatedFinance,
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Main Container Workspace Area */}
      <main className="flex-grow">
        {!currentRole ? (
          <Login
            residents={data.residents}
            coordinators={data.coordinators}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <>
            {currentRole === 'warga' && (
              <WargaDashboard
                user={currentUser}
                billingRecords={data.billing}
                financeLogs={data.finance}
                simulatedDate={data.simulatedDate}
                onLogout={handleLogout}
                onPayBill={handlePayBill}
                appSettings={appSettings}
              />
            )}

            {currentRole === 'koordinator' && (
              <KoordinatorDashboard
                coordinator={currentUser}
                residents={data.residents}
                billingRecords={data.billing}
                onLogout={handleLogout}
                onSaveMeter={handleSaveMeter}
                appSettings={appSettings}
                onPayBill={handlePayBill}
              />
            )}

            {currentRole === 'security' && (
              <SecurityDashboard
                residents={data.residents}
                billingRecords={data.billing}
                simulatedDate={data.simulatedDate}
                onLogout={handleLogout}
                onUpdateElectricity={handleUpdateElectricity}
                onUpdateSimulatedDate={handleUpdateSimulatedDate}
                appSettings={appSettings}
              />
            )}

            {currentRole === 'admin' && (
              <AdminDashboard
                residents={data.residents}
                coordinators={data.coordinators}
                financeLogs={data.finance}
                billingRecords={data.billing}
                onLogout={handleLogout}
                onAddResident={handleAddResident}
                onDeleteResident={handleDeleteResident}
                onAddExpense={handleAddExpense}
                onUpdateResidentKtp={handleUpdateResidentKtp}
                onImportResidents={handleImportResidents}
                onUpdateResidentStatus={handleUpdateResidentStatus}
                onEditResident={handleEditResident}
                onEditCoordinator={handleEditCoordinator}
                appSettings={appSettings}
                onUpdateAppSettings={setAppSettings}
                onSaveMeter={handleSaveMeter}
                onPayBill={handlePayBill}
                onUpdateAprilMeter={handleUpdateAprilMeter}
              />
            )}
          </>
        )}
      </main>

      {/* Universal footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium print:hidden">
        <p>© 2026 Paguyuban Rusunawa Gunungsari Mandiri. Sistem Informasi Iuran Warga &amp; PDAM.</p>
        <p className="mt-1 font-mono text-slate-400 text-[10px] uppercase select-none">
          Merahtia • Surabaya, Jawa Timur
        </p>
      </footer>
    </div>
  );
}
