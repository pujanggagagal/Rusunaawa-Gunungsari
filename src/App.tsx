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

export default function App() {
  const [data, setData] = useState(() => getStoredData());
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
    if (!spreadsheetId || !accessToken) return;
    try {
      console.log(`Autosync: pushing ${table} to Google Sheet...`);
      await saveTableToSpreadsheet(spreadsheetId, accessToken, table, updatedList);
    } catch (err: any) {
      console.error(`Gagal melakukan autosync tabel "${table}" ke Google Sheets:`, err);
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
    const usage = currentMeter - prevMeter;
    const pdamBill = calculatePdamBill(usage, appSettings);
    const trashBill = appSettings.trashBillCost;
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
          currentMeter,
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
          currentMeter,
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
      
      {/* Google Sheets Connection Status Hub Banner */}
      {currentRole === 'admin' && (
        <div className="bg-white border-b border-slate-200 py-4 px-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col gap-4 font-sans">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Status block */}
              <div className="flex items-start gap-3 flex-grow animate-fade-in">
                <div className={`p-2.5 rounded-xl self-start ${
                  syncStatus === 'connected' && spreadsheetId ? 'bg-emerald-100 text-emerald-700' :
                  syncStatus === 'connecting' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                  syncStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {syncStatus === 'connected' && spreadsheetId ? <DatabaseZap size={20} /> : <FileSpreadsheet size={20} />}
                </div>

                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">
                      Sistem Integrasi Google Sheets
                    </h4>
                    <span className={`text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded font-extrabold font-mono ${
                      syncStatus === 'connected' && spreadsheetId ? 'bg-emerald-200 text-emerald-800' :
                      syncStatus === 'connected' ? 'bg-amber-100 text-amber-800' :
                      syncStatus === 'connecting' ? 'bg-blue-100 text-blue-800' :
                      syncStatus === 'error' ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {syncStatus === 'connected' && spreadsheetId ? 'SINKRONISASI AKTIF 🟢' :
                       syncStatus === 'connected' ? 'MASUK GOOGLE 🟡 (Menunggu spreadsheet)' :
                       syncStatus === 'connecting' ? 'MENGHUBUNGKAN / MEMPROSES 🔄' :
                       syncStatus === 'error' ? 'PENCEGAHAN EROR / GAGAL 🔴' : 'MODE DI LUAR JARINGAN 🔘'}
                    </span>

                    <button
                      onClick={() => setShowSheetsInfo(!showSheetsInfo)}
                      className="text-[11px] underline font-bold text-purple-600 hover:text-purple-800 cursor-pointer flex items-center gap-1 ml-auto md:ml-0"
                    >
                      <HelpCircle size={13} />
                      {showSheetsInfo ? 'Sembunyikan Panduan' : 'Lihat Panduan & Struktur'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                    {syncStatus === 'not_connected' && (
                      <span>
                        Aplikasi saat ini beroperasi menggunakan <strong>penyimpanan lokal browser</strong>. Masuk ke Akun Google Anda untuk menikmati sinkronisasi data tagihan air otomatis ke Google Sheets.
                      </span>
                    )}
                    {syncStatus === 'connecting' && (
                      <span className="flex items-center gap-1.5">
                        <Loader size={12} className="animate-spin text-amber-500" />
                        Sedang memproses dan menyusun database template Google Sheet Anda...
                      </span>
                    )}
                    {syncStatus === 'error' && (
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 mt-1 text-rose-700">
                        <p className="font-bold flex items-center gap-1 text-[13px] text-rose-800">
                          <Info size={14} /> Solusi Eror Koneksi / Akses:
                        </p>
                        <p className="mt-1 text-xs">{sheetsErrorMsg}</p>
                        <p className="mt-1.5 text-[11px] text-slate-600 font-medium">
                          👉 <strong>Cara Memperbaiki:</strong> Klik 
                          <strong className="text-rose-700"> tombol keluar merah [Log Out] </strong> 
                          di pojok kanan banner ini. Kemudian, klik kembali 
                          <strong> "Hubungkan Google Sheets"</strong>. Saat muncul layar login popup akun Google, 
                          <span className="text-purple-700 font-extrabold underline"> ANDA WAJIB MENCENTANG semua pilihan kotak izin akses Google Drive / Google Sheets Anda</span> sebelum menekan tombol lanjutkan agar token memiliki izin membaca spreadsheet!
                        </p>
                      </div>
                    )}
                    {syncStatus === 'connected' && !spreadsheetId && (
                      <span>
                        Berhasil masuk sebagai <strong className="text-slate-700">{sheetsUser?.email}</strong>. Silakan buat Spreadsheet baru atau hubungkan Spreadsheet yang sudah ada untuk mengaktifkan autosync.
                      </span>
                    )}
                    {syncStatus === 'connected' && spreadsheetId && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span>
                          Tersambung ke Google Spreadsheet: 
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 font-bold underline ml-1 inline-flex items-center gap-0.5"
                          >
                            [Buka di Tab Baru]
                          </a>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">•</span>
                        <span className="text-slate-400 text-[11px]">
                          Email: {sheetsUser?.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action block */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-start md:justify-end">
                
                {/* Show manual connection inputs when logged-in but no sheet ID is paired */}
                {syncStatus === 'connected' && !spreadsheetId && (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCreateAutoSpreadsheet}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Sparkles size={14} />
                      Buat Lembar Baru
                    </button>
                    <div className="text-slate-300 block sm:inline font-mono hidden sm:block">|</div>
                    
                    <form onSubmit={handleConnectExistingSpreadsheet} className="flex items-center gap-1.5 w-full sm:w-auto">
                      <input
                        type="text"
                        value={inputSpreadsheetId}
                        onChange={(e) => setInputSpreadsheetId(e.target.value)}
                        placeholder="Tempel ID / Link Spreadsheet"
                        className="p-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white min-w-[180px] flex-grow sm:flex-none"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        Hubungkan
                      </button>
                    </form>
                  </div>
                )}

                {/* Signed-in and connected spreadsheet state action */}
                {syncStatus === 'connected' && spreadsheetId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportAllToSheets}
                      disabled={saveAllStatus === 'saving'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer ${
                        saveAllStatus === 'saving' ? 'bg-amber-100 text-amber-700 cursor-not-allowed animate-pulse' :
                        saveAllStatus === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                        saveAllStatus === 'error' ? 'bg-rose-600 hover:bg-rose-700 text-white' :
                        'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                      title="Ekspor seluruh data warga, koordinator, tagihan air (billing), dan kas keuangan ke lembar kerja Google Sheets saat ini."
                    >
                      <UploadCloud size={14} className={saveAllStatus === 'saving' ? 'animate-bounce' : ''} />
                      {saveAllStatus === 'saving' ? 'Mengunggah...' :
                       saveAllStatus === 'success' ? 'Berhasil Diunggah! ✓' :
                       saveAllStatus === 'error' ? 'Gagal Unggah! ✗' :
                       'Ekspor Data Lokal ke Sheet'}
                    </button>

                    <button
                      onClick={handleForceReload}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition flex items-center gap-1 text-xs font-semibold"
                      title="Force Reload Data from Sheet"
                    >
                      <RefreshCw size={13} />
                      Reload
                    </button>
                    <button
                      onClick={handleDisconnectSpreadsheet}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition cursor-pointer"
                    >
                      Putus Tautan
                    </button>
                  </div>
                )}

                {/* Handle sign-in/sign-out buttons */}
                {syncStatus === 'not_connected' && (
                  <button
                    onClick={handleGoogleSignIn}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Sparkles size={14} />
                    Hubungkan Google Sheets
                  </button>
                )}

                {syncStatus !== 'not_connected' && (
                  <button
                    onClick={handleGoogleSignOut}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="Google Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>

            </div>

            {/* Collapsible Help & Table Schema Guideline area */}
            {showSheetsInfo && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <h5 className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 text-purple-700 mb-1.5">
                    <Sparkles size={14} />
                    Panduan Step-by-Step Integrasi Google Sheets
                  </h5>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                    <li>
                      Klik <strong>"Hubungkan Google Sheets"</strong> di banner ini untuk masuk menggunakan akun Google Anda.
                    </li>
                    <li>
                      <strong className="text-purple-700">PENTING (Solusi Mencegah Eror Akses):</strong> Di popup login Google, 
                      pastikan Anda mencentang kotak izin persetujuan bertuliskan <em>"Lihat, edit, buat, dan hapus semua spreadsheet Google Anda"</em>. 
                      Jika kotak ini tidak diaktifkan, maka Google akan menolak izin akses dari aplikasi.
                    </li>
                    <li>
                      Klik tombol <strong>"Buat Lembar Baru"</strong> jika Anda ingin sistem kami secara otomatis membuat dan menyusun Google Spreadsheet baru di Google Drive Anda.
                    </li>
                    <li>
                      <strong>Sikronisasi Mandiri:</strong> Jika Anda membuat Google Sheet manual, cukup hubungkan link atau ID file-nya di kolom input. 
                      Sistem kami akan <span className="font-bold text-slate-800">mendeteksi secara otomatis</span> dan menyusun tab database yang kosong secara instan!
                    </li>
                  </ol>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 text-emerald-700 mb-1.5">
                    <Database size={14} />
                    Struktur Header & Tab Lembar Kerja Otomatis
                  </h5>
                  <p className="mb-2 text-[11px] text-slate-500 leading-normal">
                    Sistem kami mendaftarkan dan mensinkronisasikan 4 (empat) buah tab data ini di Google Sheet Anda:
                  </p>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <p className="font-bold text-slate-800 font-mono text-[11px]">📁 Residents (Data Warga)</p>
                      <p className="text-[10px] text-slate-400 select-all font-mono mt-0.5">ID | Nama Warga | KTP | Unit | Blok | Telepon | Status Listrik | Tanggal Ubah Listrik</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <p className="font-bold text-slate-800 font-mono text-[11px]">📁 Coordinators (Data Koordinator)</p>
                      <p className="text-[10px] text-slate-400 select-all font-mono mt-0.5">ID | Nama Koordinator | KTP | Blok Tugas</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <p className="font-bold text-slate-800 font-mono text-[11px]">📁 Billing (Tagihan PDAM)</p>
                      <p className="text-[10px] text-slate-400 select-all font-mono mt-0.5">ID | KTP Warga | Bulan | Tahun | Meter Lalu | Meter Ini | Pemakaian | Tagihan PDAM | Tagihan Sampah | Total Tagihan | Status Pembayaran | Tanggal Bayar</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <p className="font-bold text-slate-800 font-mono text-[11px]">📁 Finance (Kas Masuk/Keluar)</p>
                      <p className="text-[10px] text-slate-400 select-all font-mono mt-0.5">ID | Jenis Transaksi | Jumlah | Keterangan | Tanggal | Kategori</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

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
              />
            )}
          </>
        )}
      </main>

      {/* Universal footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 Paguyuban Rusunawa Gunungsari Mandiri. Sistem Informasi Iuran Warga &amp; PDAM.</p>
        <p className="mt-1 font-mono text-slate-400 text-[10px] uppercase select-none">
          Merahtia • Surabaya, Jawa Timur
        </p>
      </footer>
    </div>
  );
}
