import React, { useState } from 'react';
import { Resident, BillingRecord, FinancialLog, getFloorFromUnit, AppSettings } from '../types';
import { 
  Calendar, 
  Droplet, 
  Trash2, 
  CreditCard, 
  Sparkles, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  TrendingUp,
  Zap,
  Home,
  Activity,
  FileText,
  User,
  ShieldAlert,
  PhoneCall,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface WargaDashboardProps {
  user: Resident;
  billingRecords: BillingRecord[];
  financeLogs: FinancialLog[];
  simulatedDate: string;
  onLogout: () => void;
  onPayBill: (billId: string, amount: number) => void;
  appSettings: AppSettings;
  onEditResident?: (id: string, updatedFields: Partial<Resident>) => void;
}

export const WargaDashboard: React.FC<WargaDashboardProps> = ({
  user,
  billingRecords,
  financeLogs,
  simulatedDate,
  onLogout,
  onPayBill,
  appSettings,
  onEditResident
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);

  // Parse verification state stored on the database inside user.phone
  const dbVerification = React.useMemo(() => {
    if (user.phone && user.phone.startsWith('VERIFIED_V1:')) {
      try {
        return JSON.parse(user.phone.substring('VERIFIED_V1:'.length));
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [user.phone]);

  // States for citizen Data Verifikasi
  const yearMonth = simulatedDate ? simulatedDate.substring(0, 7) : '2026-05';
  const verifiedKey = `rg_verification_v1_${user.ktp}_${yearMonth}`;
  const latestKey = `rg_verification_latest_${user.ktp}`;

  const [showVerificationModal, setShowVerificationModal] = useState(() => {
    if (dbVerification) return false;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(verifiedKey) !== 'true';
    }
    return true;
  });

  const [isForceEditVerification, setIsForceEditVerification] = useState(false);

  // Verification data states
  const [whatsapp, setWhatsapp] = useState(() => {
    if (dbVerification?.whatsapp) return dbVerification.whatsapp;
    let raw = '';
    if (typeof window !== 'undefined') {
      const latest = localStorage.getItem(latestKey);
      if (latest) {
        try {
          const parsed = JSON.parse(latest);
          raw = parsed.whatsapp || user.phone || '';
        } catch (e) {}
      }
    }
    if (!raw) {
      raw = user.phone || '';
    }
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.substring(1);
    }
    if (!digits.startsWith('62')) {
      digits = '62' + digits;
    }
    return digits;
  });

  const handleWhatsappChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.substring(1);
    }
    if (!digits.startsWith('62')) {
      if (digits.length > 0) {
        digits = '62' + digits;
      } else {
        digits = '62';
      }
    }
    setWhatsapp(digits);
  };

  const [familyMembers, setFamilyMembers] = useState<Array<{ name: string; age: string; gender: 'Laki-laki' | 'Perempuan'; occupation: string }>>(() => {
    if (dbVerification?.familyMembers) return dbVerification.familyMembers;
    if (typeof window !== 'undefined') {
      const latest = localStorage.getItem(latestKey);
      if (latest) {
        try {
          const parsed = JSON.parse(latest);
          if (parsed.familyMembers && Array.isArray(parsed.familyMembers)) {
            return parsed.familyMembers;
          }
        } catch (e) {}
      }
    }
    return [];
  });

  const [vehicles, setVehicles] = useState<Array<{ type: string; plate: string }>>(() => {
    if (dbVerification?.vehicles) return dbVerification.vehicles;
    if (typeof window !== 'undefined') {
      const latest = localStorage.getItem(latestKey);
      if (latest) {
        try {
          const parsed = JSON.parse(latest);
          if (parsed.vehicles && Array.isArray(parsed.vehicles)) {
            return parsed.vehicles;
          }
          if (typeof parsed.vehiclesCount === 'number' && parsed.vehiclesCount > 0) {
            return [{ type: parsed.vehiclesType || '', plate: '' }];
          }
        } catch (e) {}
      }
    }
    return [{ type: '', plate: '' }];
  });

  const [hasNoVehicle, setHasNoVehicle] = useState<boolean>(() => {
    if (dbVerification) return !!dbVerification.hasNoVehicle;
    if (typeof window !== 'undefined') {
      const latest = localStorage.getItem(latestKey);
      if (latest) {
        try {
          const parsed = JSON.parse(latest);
          if (typeof parsed.hasNoVehicle === 'boolean') {
            return parsed.hasNoVehicle;
          }
          if (parsed.vehiclesCount === 0) {
            return true;
          }
        } catch (e) {}
      }
    }
    return false;
  });

  const handleAddFamilyMember = () => {
    setFamilyMembers(prev => [...prev, { name: '', age: '', gender: 'Laki-laki', occupation: '' }]);
  };

  const handleUpdateFamilyMember = (index: number, field: 'name' | 'age' | 'gender' | 'occupation', value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const handleRemoveFamilyMember = (index: number) => {
    const updated = familyMembers.filter((_, i) => i !== index);
    setFamilyMembers(updated);
  };

  const handleAddVehicle = () => {
    setVehicles([...vehicles, { type: '', plate: '' }]);
    setHasNoVehicle(false);
  };

  const handleUpdateVehicle = (index: number, field: 'type' | 'plate', value: string) => {
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [field]: value };
    setVehicles(updated);
  };

  const handleRemoveVehicle = (index: number) => {
    const updated = vehicles.filter((_, i) => i !== index);
    setVehicles(updated);
    if (updated.length === 0) {
      setHasNoVehicle(true);
    }
  };

  const handleToggleNoVehicle = (checked: boolean) => {
    setHasNoVehicle(checked);
    if (checked) {
      setVehicles([]);
    } else if (vehicles.length === 0) {
      setVehicles([{ type: '', plate: '' }]);
    }
  };

  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      whatsapp,
      familyMembers,
      vehicles,
      hasNoVehicle,
      vehiclesCount: hasNoVehicle ? 0 : vehicles.length,
      vehiclesType: hasNoVehicle ? 'Tidak Ada' : vehicles.map(v => `${v.type} (${v.plate || '-'})`).join(', ')
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(verifiedKey, 'true');
      localStorage.setItem(latestKey, JSON.stringify(payload));
    }
    
    // Save to Supabase using onEditResident if provided
    if (onEditResident) {
      onEditResident(user.id, {
        phone: `VERIFIED_V1:${JSON.stringify(payload)}`
      });
    }

    setShowVerificationModal(false);
    setIsForceEditVerification(false);
  };

  // Filter bills for this resident
  const userBills = billingRecords.filter((b) => b.residentKtp === user.ktp);
  const currentMonthBill = userBills.find((b) => b.month === 'Mei' && b.year === 2026);

  // Filter only April & Mei 2026 billing records for resident view
  const recentBills = userBills.filter(
    (b) => (b.month === 'Mei' || b.month === 'April') && b.year === 2026
  );

  // Sort chronologically for chart (April -> Mei)
  const chartBills = [...recentBills].sort((a, b) => {
    const months: Record<string, number> = { 'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5 };
    return (months[a.month] || 0) - (months[b.month] || 0);
  });

  // Sort reverse chronological for table (Mei -> April)
  const listBills = [...recentBills].sort((a, b) => {
    const months: Record<string, number> = { 'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5 };
    return (months[b.month] || 0) - (months[a.month] || 0);
  });

  // Financial calculations for Paguyuban
  const totalBalance = financeLogs.reduce((sum, log) => {
    return log.type === 'Pemasukan' ? sum + log.amount : sum - log.amount;
  }, 0);

  const totalInflow = financeLogs
    .filter((log) => log.type === 'Pemasukan')
    .reduce((sum, log) => sum + log.amount, 0);

  const totalOutflow = financeLogs
    .filter((log) => log.type === 'Pengeluaran')
    .reduce((sum, log) => sum + log.amount, 0);

  // Convert simulated date string to get simulated day of month
  const simDay = parseInt(simulatedDate.split('-')[2] || '1', 10);
  const isPastDue = simDay > 9;

  const handleOpenPayment = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (selectedBill) {
      onPayBill(selectedBill.id, selectedBill.totalBill);
      setShowPaymentModal(false);
      setSelectedBill(null);
    }
  };

  // Safe Indonesian Currency formatter
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // Determine avatar background color based on name length or block
  const isBlockA = user.block.toLowerCase().includes('a');
  const avatarBg = isBlockA ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white';

  return (
    <div id="warga_dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* 1. Header Profile & Status Info Block */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Activity size={240} className="text-slate-200" />
        </div>
        
        <div className="flex items-center gap-4 z-10">
          <div className={`${avatarBg} h-16 w-16 rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-lg border border-white/15`}>
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{user.name}</h1>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full uppercase border border-slate-700/50">
                Warga Rusun
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/30">
                <Home size={12} /> Unit {user.unit}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900/30">
                Lantai {user.floor || getFloorFromUnit(user.unit)}
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-medium text-slate-300 font-mono">{user.block}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-xs font-mono">No KTP: {user.ktp}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/50 text-left backdrop-blur-xs">
            <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">Simulasi Tanggal</span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5 mt-0.5">
              <Calendar size={13} className="text-purple-400" />
              {simulatedDate}
            </span>
          </div>

          <button
            onClick={() => setIsForceEditVerification(true)}
            id="btn_edit_verification"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all cursor-pointer font-bold duration-150 shadow-md shadow-indigo-900/20 text-xs text-center"
          >
            📋 Update Data Verifikasi
          </button>

          <button
            onClick={onLogout}
            id="btn_logout"
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all cursor-pointer font-bold duration-150 shadow-md shadow-rose-900/20 text-xs text-center"
          >
            <LogOut size={14} className="flex-shrink-0" />
            Keluar
          </button>
        </div>
      </div>

      {/* 2. Top Quick Highlight Cards (Bento Board) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* Card A: mei iuran summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/80 shadow-md shadow-slate-100/50 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            currentMonthBill?.status === 'Lunas' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            <CreditCard size={22} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Iuran Mei 2026</span>
            <p className="text-md font-bold text-slate-900 font-mono">
              {currentMonthBill ? formatRupiah(currentMonthBill.totalBill) : 'Rp 0'}
            </p>
            <div className="mt-1">
              {currentMonthBill ? (
                currentMonthBill.status === 'Lunas' ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                    Selesai Lunas
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
                    Belum Dibayar
                  </span>
                )
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md">
                  Belum Ada Tagihan
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card B: electricity status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/80 shadow-md shadow-slate-100/50 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            user.electricityStatus === 'Menyala' ? 'bg-amber-50 text-amber-600' : 'bg-rose-150/30 text-rose-600'
          }`}>
            <Zap size={22} className={user.electricityStatus === 'Diputus' ? 'animate-pulse' : ''} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Aliran Listrik Unit</span>
            <p className="text-md font-bold text-slate-900">
              {user.electricityStatus === 'Menyala' ? 'Menyala Normal' : 'Diputus / Disegel'}
            </p>
            <div className="mt-1">
              {user.electricityStatus === 'Menyala' ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                  Aktif 🟢
                </span>
              ) : (
                <span className="text-[10px] bg-rose-50 text-rose-700 font-extrabold px-2 py-0.5 rounded-md border border-rose-200">
                  Sanksi Tunggakan ⚠️
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card C: occupancy status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/80 shadow-md shadow-slate-100/50 flex items-center gap-4 sm:col-span-2 md:col-span-1">
          <div className={`p-3 rounded-xl ${
            (user.occupancyStatus || 'Dihuni') === 'Dihuni' ? 'bg-indigo-50 text-indigo-600' :
            (user.occupancyStatus || 'Dihuni') === 'Kosong' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <Home size={22} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status Hunian</span>
            <p className="text-md font-bold text-slate-900">
              {user.occupancyStatus || 'Dihuni'}
            </p>
            <div className="mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                (user.occupancyStatus || 'Dihuni') === 'Dihuni' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                (user.occupancyStatus || 'Dihuni') === 'Kosong' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {(user.occupancyStatus || 'Dihuni') === 'Dihuni' ? 'Aktif Terisi 🏠' :
                 (user.occupancyStatus || 'Dihuni') === 'Kosong' ? 'Kosong 🔘' : 'Renovasi / Baik 🛠️'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Sanction or Pending payment warnings */}
      {user.electricityStatus === 'Diputus' ? (
        <div id="electricity_alert_disconnected" className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-3xl flex flex-col sm:flex-row items-start gap-4 shadow-sm">
          <div className="bg-rose-100 p-3 rounded-2xl text-rose-600 flex-shrink-0">
            <ShieldAlert className="h-6 w-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-900">PEMBERITAHUAN NONAKTIF ALIRAN LISTRIK</h3>
            <p className="text-sm text-slate-700 mt-1">
              Mohon maaf, sistem mendeteksi adanya keterlambatan pembayaran iuran air &amp; sampah bulanan yang telah melewati batas jatuh tempo (tanggal 9). Sesuai dengan ketentuan tata tertib pengelola rusun, aliran listrik ke unit <strong className="font-bold text-slate-900">{user.unit}</strong> dinonaktifkan sementara.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-1 rounded-lg">
                ⚠️ Silakan Lakukan Pelunasan Tagihan Di Bawah
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Setelah pembayaran selesai diproses, silakan hubungi Pos Keamanan atau Koordinator Lantai untuk mengaktifkan kembali MCB listrik Anda.
              </span>
            </div>
          </div>
        </div>
      ) : (
        currentMonthBill?.status === 'Belum Lunas' && isPastDue && (
          <div id="electricity_alert_warning" className="bg-amber-50 border border-amber-200 text-amber-850 p-5 rounded-3xl flex flex-col sm:flex-row items-start gap-4 shadow-sm animate-fade-in">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 flex-shrink-0 animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-900">Pemberitahuan Batas Akhir Pembayaran Iuran</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Yth. Bapak/Ibu Warga Rusunawa, kami menginfokan bahwa <strong>pembayaran terakhir setiap bulannya adalah di tanggal 9</strong>. Sesuai dengan aturan dari pihak pengelola, jika pembayaran tidak dilakukan maka akan dikenakan sanksi pemutusan aliran listrik oleh pihak pengelola. Demi kenyamanan bersama, mohon segera melakukan pembayaran melalui masing-masing koordinator. Terima kasih atas pengertian dan kerja samanya.
              </p>
            </div>
          </div>
        )
      )}

      {/* 4. Main Core Dashboard Content: Row layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section (2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Month Bill Card / Invoice Details */}
          <div id="active_bill_card" className="bg-white rounded-3xl border border-slate-150 shadow-lg shadow-slate-100/40 p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest font-mono">Lembar Tagihan Bulanan</span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">Tagihan Iuran Air &amp; Sampah</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">PERIODE: MEI 2026 • RUSUN GUNUNGSARI SURABAYA</p>
              </div>
              <div className="self-start sm:self-auto">
                {currentMonthBill ? (
                  currentMonthBill.status === 'Lunas' ? (
                    <span id="bill_status_lunas" className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 size={13} />
                      Terbayar Lunas
                    </span>
                  ) : (
                    <span id="bill_status_unpaid" className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs animate-pulse">
                      <ShieldAlert size={13} />
                      Belum Dibayar
                    </span>
                  )
                ) : (
                  <span className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold font-mono">
                    Belum Diinput Koordinator
                  </span>
                )}
              </div>
            </div>

            {currentMonthBill ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-100 relative">
                
                {/* Left Part: Meter readings & consumption details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider font-mono">Data Meteran Air</h4>
                    <div className="mt-2.5 bg-white p-4 rounded-xl border border-slate-150 space-y-2.5 shadow-xs text-sm text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Meter Lalu:</span>
                        <span className="font-mono font-bold text-slate-900">{currentMonthBill.prevMeter} m³</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Meter Baru:</span>
                        <span className="font-mono font-bold text-slate-900">{currentMonthBill.currentMeter} m³</span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                        <span className="text-slate-600 font-semibold">Total Pemakaian:</span>
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {currentMonthBill.usage} m³
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100/60 rounded-xl p-3 border border-slate-200/50 text-xxs text-slate-500 flex gap-2">
                    <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                      <strong>Ketentuan Tarif Air:</strong> Pemakaian 1-10 m³ dikenakan tarif flat <strong>Rp 25.000</strong>. Jika pemakaian melebihi 10 m³, kelebihan kubik berikutnya dikali <strong>Rp 2.500/m³</strong>.
                    </p>
                  </div>
                </div>

                {/* Right Part: Bill pricing & breakdown */}
                <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 pt-5 md:pt-0 md:pl-6 space-y-5">
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider font-mono">Rincian Perhitungan Biaya</h4>
                    
                    <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                          <Droplet size={14} className="text-blue-500" /> 
                          Biaya Air Mandiri:
                        </span>
                        <span className="font-mono font-bold text-slate-800">{formatRupiah(currentMonthBill.pdamBill)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                          <Trash2 size={14} className="text-amber-500" /> 
                          Kebersihan Sampah:
                        </span>
                        <span className="font-mono font-bold text-slate-800">{formatRupiah(currentMonthBill.trashBill)}</span>
                      </div>

                      <div className="border-t border-slate-200 my-2"></div>
                      
                      <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                        <span className="font-bold text-indigo-950 font-mono text-xs uppercase tracking-wider">Total Tagihan Ke-2</span>
                        <span className="font-mono text-base font-black text-indigo-700">{formatRupiah(currentMonthBill.totalBill)}</span>
                      </div>
                    </div>
                  </div>

                  {currentMonthBill.status === 'Belum Lunas' ? (
                    <button
                      onClick={() => handleOpenPayment(currentMonthBill)}
                      id={`pay_btn_mei`}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer shadow-md shadow-emerald-700/25 transition-all duration-150 select-none active:scale-98"
                    >
                      <CreditCard size={15} />
                      Selesaikan Pembayaran Sekarang
                    </button>
                  ) : (
                    currentMonthBill.paymentDate && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-center gap-2 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-emerald-900 font-bold uppercase tracking-wider text-[10px]">Telah Terbayar Lunas</p>
                          <p className="text-slate-500 font-medium font-mono text-[11px] mt-0.5">
                            Tanggal: {new Date(currentMonthBill.paymentDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                </div>

              </div>
            ) : (
              <div id="bill_empty_state" className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="bg-slate-100 p-2.5 rounded-full inline-block text-slate-400 mb-3">
                  <FileText size={28} />
                </div>
                <p className="text-slate-600 text-sm font-semibold">Pencatatan meteran air Anda belum tersedia</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                  Pengurus wilayah atau koordinator belum melakukan proses pencatatan input air untuk bulan Mei. Silakan hubungi koordinator blok Anda (biasanya diinput tgl 1-5).
                </p>
              </div>
            )}

          </div>

          {/* Graphical Trends Section */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-lg shadow-slate-100/40 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <TrendingUp className="text-emerald-500 flex-shrink-0" size={18} />
                <h3 className="text-md font-bold text-slate-900">Statistik Konsumsi Air Anda</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Riwayat Kubikasi</span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="h-44 w-full flex items-end justify-center gap-4 sm:gap-10 pt-4 pb-2">
                {chartBills.map((bill) => {
                  const maxUsage = 25; // Scale base representation
                  const heightPct = Math.min((bill.usage / maxUsage) * 100, 100);
                  const isPaid = bill.status === 'Lunas';
                  return (
                    <div key={bill.id} className="flex flex-col items-center flex-1 max-w-[55px]">
                      <span className="text-[10px] font-mono font-extrabold text-slate-800 mb-1">{bill.usage} m³</span>
                      <div className="w-full bg-slate-200/80 rounded-t-lg h-28 flex items-end overflow-hidden shadow-inner">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isPaid ? 'bg-indigo-600 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                          }`} 
                          style={{ height: `${heightPct}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-2 font-mono uppercase">{bill.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 text-xs mt-4 pt-1 border-t border-slate-100 text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span> 
                  Lunas Terbayar
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> 
                  Ada Tunggakan
                </span>
              </div>
            </div>

            {/* Riwayat Table & Mobile List redone */}
            <div className="pt-2">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider font-mono mb-3">Daftar Nota Riwayat Transaksi</h4>
              
              {/* Mobile Card stack layout */}
              <div className="block sm:hidden space-y-3.5" id="warga_bill_list_mobile">
                {listBills.map((bill) => (
                  <div key={bill.id} className="p-4 bg-white border border-slate-150 rounded-xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm font-mono uppercase">{bill.month} {bill.year}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        bill.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Volume Air</span>
                        <span className="font-mono text-slate-800 font-bold">{bill.usage} m³</span>
                        <span className="text-slate-400 block text-[8px] font-mono mt-0.5">({bill.prevMeter} ➔ {bill.currentMeter})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Jumlah Pembayaran</span>
                        <span className="font-mono text-indigo-700 font-extrabold text-sm">{formatRupiah(bill.totalBill)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-150 shadow-xs">
                <table className="min-w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-55 bg-slate-50 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200/60">
                    <tr>
                      <th className="px-4 py-3 font-bold">Periode Penagihan</th>
                      <th className="px-4 py-3 font-bold">Detail Volume Air (m³)</th>
                      <th className="px-4 py-3 font-bold">Akumulasi Tagihan</th>
                      <th className="px-4 py-3 text-right font-bold font-mono">Status Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {listBills.map((bill) => (
                      <tr key={bill.id} className="text-slate-700 hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">{bill.month} {bill.year}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="font-bold text-slate-800">{bill.usage} m³</span> 
                          <span className="text-slate-400 font-normal ml-1.5">({bill.prevMeter} m³ s/d {bill.currentMeter} m³)</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatRupiah(bill.totalBill)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            bill.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* Right Section / Treasury & Rules Tab */}
        <div className="space-y-6">
          
          {/* HIDE SEMENTARA KEUANGAN PAGUYUBAN */}
          {false && (
            <div id="paguyuban_treasury_card" className="bg-white rounded-3xl border border-slate-150 shadow-lg shadow-slate-100/40 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Coins className="text-indigo-600" size={18} />
                <h3 className="text-md font-bold text-slate-900">Transparansi Khas Paguyuban</h3>
              </div>

              {/* Glowing obsidian balance representation */}
              <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 border border-slate-800 relative overflow-hidden shadow-inner flex flex-col justify-between">
                <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-white">
                  <Coins size={140} />
                </div>
                <div className="space-y-1 z-10">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Total Saldo Kas RT/Paguyuban</span>
                  <h4 className="text-2xl font-black font-mono tracking-tight text-emerald-400">{formatRupiah(totalBalance)}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-800 pt-3 text-xs z-10">
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase tracking-wider">Akumulasi Masuk</span>
                    <span className="font-mono text-[11px] text-emerald-300 font-bold mt-0.5 block">{formatRupiah(totalInflow)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase tracking-wider font-bold">Akumulasi Keluar</span>
                    <span className="font-mono text-[11px] text-slate-300 font-bold mt-0.5 block">{formatRupiah(totalOutflow)}</span>
                  </div>
                </div>
              </div>

              {/* Ledger transaction logs list */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider font-mono">Buku Kas (Arus Transaksi Riil)</h4>
                <div className="space-y-2.5 max-h-[295px] overflow-y-auto pr-1">
                  {financeLogs.map((log) => {
                    const isInflow = log.type === 'Pemasukan';
                    return (
                      <div key={log.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-start gap-2 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-850 leading-snug">{log.description}</p>
                          <p className="text-slate-400 font-mono text-[9px] flex items-center gap-1">
                            <span>{new Date(log.date).toLocaleDateString('id', { day: 'numeric', month: 'short' })}</span>
                            <span>•</span>
                            <span className="text-[10px] text-indigo-500 font-semibold">{log.category}</span>
                          </p>
                        </div>
                        <span className={`font-mono text-xs font-black whitespace-nowrap self-center ${
                          isInflow ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isInflow ? '+' : '-'} {log.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Rules Guidelines Block */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Sparkles className="text-emerald-600 flex-shrink-0" size={16} />
              Aturan Utama {appSettings.appTitle}
            </h4>
            
            <ul className="space-y-2.5 text-xs text-emerald-800 list-none font-medium">
              <li className="flex gap-2 items-start">
                <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Petugas Koordinator mencatat angka meter air mandiri warga secara berkala tanggal 1-5 setiap bulannya.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Batas maksimal pembayaran iuran bulanan adalah tanggal <strong>9 setiap bulannya</strong>.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0"></span>
                <span><strong>Sanksi MCB Listrik Dinonaktifkan:</strong> Pengelola berhak menonaktifkan listrik bagi warga yang memiliki tunggakan melewati batas tanggal 9.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Setiap dana masuk dari pembayaran iuran disinkronkan langsung ke kas Paguyuban Rusunawa secara transparan.</span>
              </li>
              <li className="flex gap-2 items-start text-amber-900 border-t border-emerald-200/50 pt-2 mt-2">
                <span className="h-1.5 w-1.5 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></span>
                <span className="font-semibold">Aplikasi ini masih dalam tahap uji coba, jika ada masukan dan saran bisa langsung menghubungi Paguyuban.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Modern Payment Modal Pop-Up sheet */}
      {showPaymentModal && selectedBill && (
        <div id="payment_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative space-y-5 animate-fade-in">
            <div>
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest font-mono">Simper Gateway</span>
              <h3 className="text-lg font-black text-slate-950">Konfirmasi Setoran Iuran</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">SISTEM PEMBAYARAN RUSUN DI LUAR JARINGAN</p>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600">
                <span>Hunian Unit:</span> 
                <span className="font-mono font-bold text-slate-900">{user.block}, Unit {user.unit}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600">
                <span>Nama Warga:</span> 
                <span className="font-semibold text-slate-900">{user.name}</span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600">
                <span>Iuran Periode:</span> 
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{selectedBill.month} {selectedBill.year}</span>
              </div>

              <div className="border-t border-slate-200/60 my-2"></div>

              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600">
                <span>Biaya Air ({selectedBill.usage} m³):</span> 
                <span className="font-mono text-slate-800">{formatRupiah(selectedBill.pdamBill)}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600">
                <span>Iuran Sampah Wajib:</span> 
                <span className="font-mono text-slate-800">{formatRupiah(selectedBill.trashBill)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm sm:text-md font-bold text-slate-900">
                <span>Total Setoran:</span> 
                <span className="font-mono text-emerald-700 font-black text-base">{formatRupiah(selectedBill.totalBill)}</span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100/70 p-3.5 rounded-2xl space-y-1 text-slate-700 text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 font-mono block">Panduan Setoran &amp; Transfer:</span>
              <p className="text-[10.5px] leading-relaxed font-medium">{appSettings.paymentInstructions}</p>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg">
              🔒 <strong>Konfigurasi Pengujian:</strong> Klik "Konfirmasi Bayar" akan memicu pembayaran simulasi secara instan, memasukkan saldo ke Kas Paguyuban, serta menormalkan Listrik warga.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                id="btn_cancel_payment"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Batalkan
              </button>
              <button
                onClick={handleConfirmPayment}
                id="btn_confirm_payment"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-700/20 transition duration-150"
              >
                Konfirmasi Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Data Verifikasi Modal Pop-Up */}
      {(showVerificationModal || isForceEditVerification) && (
        <div id="verification_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div>
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Sistem Pemutakhiran Data Warga
              </span>
              <h3 className="text-lg font-black text-slate-950 mt-1">Formulir Verifikasi Identitas Hunian</h3>
              <p className="text-[10px] text-slate-400 font-bold font-mono uppercase bg-slate-50 px-2 py-1 rounded inline-block mt-1">
                Unit: {user.block} - {user.unit} • Periode: {yearMonth}
              </p>
            </div>

            {/* Explanatory Header Box */}
            <div className="bg-amber-50/70 border border-amber-200/50 p-3.5 rounded-2xl text-[11px] leading-relaxed text-slate-700">
              <span className="font-bold text-amber-900 block mb-0.5">ℹ️ PANDUAN PENGISIAN &amp; UPDATE:</span>
              Jika data di bawah <strong className="text-slate-900">tidak memiliki perubahan</strong> dari bulan sebelumnya, Anda dapat langsung mengklik tombol <span className="font-extrabold text-indigo-700">"Simpan &amp; Konfirmasi Data"</span> di bawah langsung untuk menyelesaikan verifikasi cepat.
            </div>

            <form onSubmit={handleSaveVerification} className="space-y-5">
              
              {/* WhatsApp Field */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-600 font-mono uppercase">1. Nomor WhatsApp Aktif</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold font-mono text-xs">+62</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="8123456789 (Sambungan No WA)"
                    value={whatsapp.startsWith('62') ? whatsapp.substring(2) : whatsapp}
                    onChange={(e) => handleWhatsappChange('62' + e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-450 font-bold font-mono uppercase mt-0.5 px-0.5">Kode negara 62 terisi otomatis. Silakan langsung lanjutkan nomor WA Anda.</p>
              </div>

              {/* Family members dynamic list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <label className="block text-xs font-black text-slate-600 font-mono uppercase">2. Anggota Keluarga yang Tinggal</label>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Total pengisian: {familyMembers.length} jiwa</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFamilyMember}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-indigo-100/50"
                  >
                    ＋ Tambah Jiwa
                  </button>
                </div>

                {familyMembers.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-500">Tinggal Sendiri / Belum Terisi?</p>
                    <p className="text-[10px] text-slate-400 leading-normal font-medium">
                      Silakan klik tombol <span className="text-indigo-600 font-black">"＋ Tambah Jiwa"</span> untuk mendaftarkan nama/anggota keluarga Anda jika ada yang menetap.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {familyMembers.map((member, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-150 flex flex-col gap-2.5 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyMember(idx)}
                          className="absolute -top-1.5 -right-1.5 text-rose-500 hover:text-rose-700 bg-white hover:bg-rose-50 h-5 w-5 rounded-full border border-slate-200 shadow-xs flex items-center justify-center text-[10px] font-black transition-all cursor-pointer"
                          title="Hapus Jiwa ini"
                        >
                          ✕
                        </button>
                        
                        <span className="text-[9px] font-mono font-bold text-indigo-500 block uppercase tracking-wider">Anggota Keluarga Jiwa #{idx + 1}</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Nama</label>
                            <input
                              type="text"
                              required
                              placeholder="Nama anggota keluarga"
                              value={member.name}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Umur / Usia</label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: 12 Tahun"
                              value={member.age}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'age', e.target.value)}
                              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Jenis Kelamin</label>
                            <select
                              value={member.gender}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'gender', e.target.value as any)}
                              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none"
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Pekerjaan</label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Sekolah, Karyawan"
                              value={member.occupation}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'occupation', e.target.value)}
                              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicles Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <label className="block text-xs font-black text-slate-600 font-mono uppercase">3. Kepemilikan Kendaraan</label>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                      {hasNoVehicle ? 'Tidak memiliki kendaraan' : `Total: ${vehicles.length} unit kendaraan`}
                    </p>
                  </div>
                  {!hasNoVehicle && (
                    <button
                      type="button"
                      onClick={handleAddVehicle}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-indigo-100/50"
                    >
                      ＋ Tambah Unit
                    </button>
                  )}
                </div>

                {/* Styled Checkbox Panel for No Vehicle Option */}
                <div className="flex items-center gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-150 transition-all hover:bg-slate-50">
                  <input
                    type="checkbox"
                    id="checkbox_no_vehicle_verified"
                    checked={hasNoVehicle}
                    onChange={(e) => handleToggleNoVehicle(e.target.checked)}
                    className="h-4.5 w-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <label htmlFor="checkbox_no_vehicle_verified" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Saya TIDAK memiliki kendaraan bermotor di area Rusunawa
                  </label>
                </div>

                {!hasNoVehicle && (
                  <div className="space-y-3 max-h-[170px] overflow-y-auto pr-1">
                    {vehicles.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                        <p className="text-xs font-bold text-slate-500 font-mono uppercase">Silakan Tambahkan Unit</p>
                        <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                          Tekan tombol <span className="text-indigo-600 font-black">"＋ Tambah Unit"</span> di kanan atas kendaraan untuk mendaftarkan unit kendaraan Anda.
                        </p>
                      </div>
                    ) : (
                      vehicles.map((v, vidx) => (
                        <div key={vidx} className="p-3 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col gap-2.5 relative">
                          {vehicles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(vidx)}
                              className="absolute -top-1.5 -right-1.5 text-rose-500 hover:text-rose-700 bg-white hover:bg-rose-50 h-5 w-5 rounded-full border border-slate-200 shadow-xs flex items-center justify-center text-[10px] font-black transition-all cursor-pointer"
                              title="Hapus Unit ini"
                            >
                              ✕
                            </button>
                          )}
                          <span className="text-[9px] font-mono font-bold text-indigo-500 block uppercase tracking-wider">Unit Kendaraan #{vidx + 1}</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Jenis / Merk</label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: Honda Beat, Toyota Avanza"
                                value={v.type}
                                onChange={(e) => handleUpdateVehicle(vidx, 'type', e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black font-mono text-slate-500 mb-1 uppercase">Nomor Polisi (Nopol)</label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: S 1234 XY"
                                value={v.plate}
                                onChange={(e) => handleUpdateVehicle(vidx, 'plate', e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 bg-white focus:outline-none font-mono uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Notice Description text underneath */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">📢</span>
                <p className="text-[10.5px] leading-relaxed text-indigo-950 font-bold">
                  Keterangan: Data Verifikasi ini bertujuan untuk Penyesuaian Fasilitas Umum serta Update Pendataan Jumlah Warga yang berada di Rusun secara Global.
                </p>
              </div>

              {/* Submission Controls */}
              <div className="flex gap-3 pt-2">
                {isForceEditVerification && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForceEditVerification(false);
                      // Restore from localStorage if canceled
                      const latest = typeof window !== 'undefined' ? localStorage.getItem(latestKey) : null;
                      if (latest) {
                        try {
                          const parsed = JSON.parse(latest);
                          // whatsapp
                          let raw = parsed.whatsapp || user.phone || '';
                          let digits = raw.replace(/\D/g, '');
                          if (digits.startsWith('0')) { digits = '62' + digits.substring(1); }
                          if (!digits.startsWith('62')) { digits = '62' + digits; }
                          setWhatsapp(digits);

                          setFamilyMembers(parsed.familyMembers || []);
                          
                          if (parsed.vehicles && Array.isArray(parsed.vehicles)) {
                            setVehicles(parsed.vehicles);
                          } else if (typeof parsed.vehiclesCount === 'number' && parsed.vehiclesCount > 0) {
                            setVehicles([{ type: parsed.vehiclesType || '', plate: '' }]);
                          } else {
                            setVehicles([{ type: '', plate: '' }]);
                          }
                          setHasNoVehicle(typeof parsed.hasNoVehicle === 'boolean' ? parsed.hasNoVehicle : parsed.vehiclesCount === 0);
                        } catch (e) {}
                      }
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-all uppercase tracking-wider"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md shadow-indigo-600/25 transition-all text-center uppercase tracking-wider"
                >
                  Simpan &amp; Konfirmasi Data ✓
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
