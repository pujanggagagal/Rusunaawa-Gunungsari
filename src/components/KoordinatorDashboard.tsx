import React, { useState, useEffect, useRef } from 'react';
import { Resident, BillingRecord, Coordinator, getFloorFromUnit, getBarcodeContent, AppSettings } from '../types';
import { 
  LogOut, 
  UserCheck, 
  Droplets, 
  CheckCircle2, 
  Save, 
  FileSpreadsheet, 
  Sparkles, 
  Search, 
  Check, 
  Building2, 
  Layers, 
  User, 
  Plus, 
  Minus, 
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  HelpCircle,
  QrCode,
  Camera,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { calculatePdamBill } from '../data';

interface KoordinatorDashboardProps {
  coordinator: Coordinator;
  residents: Resident[];
  billingRecords: BillingRecord[];
  onLogout: () => void;
  onSaveMeter: (ktp: string, prevMeter: number, currentMeter: number) => void;
  appSettings: AppSettings;
  onPayBill?: (billId: string, amount: number) => void;
}

export const KoordinatorDashboard: React.FC<KoordinatorDashboardProps> = ({
  coordinator,
  residents,
  billingRecords,
  onLogout,
  onSaveMeter,
  appSettings,
  onPayBill
}) => {
  // Extract assignedFloor. If not defined to avoid type issues, fetch from ID or default to 1.
  const targetFloor = coordinator.assignedFloor || (coordinator.id === 'coord-1' ? 1 : coordinator.id === 'coord-2' ? 2 : coordinator.id === 'coord-3' ? 3 : coordinator.id === 'coord-4' ? 4 : coordinator.id === 'coord-5' ? 5 : 1);

  // 1. Filter residents belonging to this coordinator's assigned floor (e.g., Floor 1)
  const floorResidents = residents.filter((r) => {
    const fl = r.floor || getFloorFromUnit(r.unit);
    return fl === targetFloor;
  });

  // Helper: Extract floor number from unit string for general purposes if any
  const getResidentFloor = (res: Resident): number => {
    return res.floor || getFloorFromUnit(res.unit);
  };

  // 2. State management
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>(targetFloor);
  const [recordFilter, setRecordFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterBlock, setFilterBlock] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  const [selectedResidentKtp, setSelectedResidentKtp] = useState('');
  const [currentMeterInput, setCurrentMeterInput] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Barcode / QR Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [useRealCamera, setUseRealCamera] = useState(true);
  const [scanningStatus, setScanningStatus] = useState<'idle' | 'searching' | 'scanned' | 'error'>('idle');
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [simulateTargetRes, setSimulateTargetRes] = useState<string>('');

  // Scanned Resident Direct entry states
  const [scannedResident, setScannedResident] = useState<Resident | null>(null);
  const [scannedMeterInput, setScannedMeterInput] = useState<string>('');
  const [scannedError, setScannedError] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio synthethizer feedback for scanning
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime); // high pitched beep
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio play error", e);
    }
  };

  const playErrorBuzzer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime); // low pitch buzzer
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.log("Audio play error", e);
    }
  };

  // 3. Filtered resident list based on Floor, status, and Search string
  const filteredResidents = floorResidents.filter((res) => {
    // Block filter: compare lowercase and trimmed to avoid spaces or syntax difference
    if (filterBlock !== 'all') {
      const filterVal = filterBlock.toLowerCase().replace(/\s+/g, '').trim();
      const resVal = (res.block || '').toLowerCase().replace(/\s+/g, '').trim();
      if (resVal !== filterVal && !resVal.includes(filterVal) && !filterVal.includes(resVal)) {
        return false;
      }
    }

    // Recording status filter (Mei 2026)
    const hasMei = (billingRecords || []).some(
      (b) => b.residentKtp?.trim() === res.ktp?.trim() && b.month === 'Mei' && b.year === 2026
    );
    if (recordFilter === 'pending' && hasMei) return false;
    if (recordFilter === 'completed' && !hasMei) return false;

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (res.name || '').toLowerCase().includes(q);
      const unitMatch = (res.unit || '').toLowerCase().includes(q);
      const ktpMatch = (res.ktp || '').includes(q);
      const blockMatch = (res.block || '').toLowerCase().includes(q);
      if (!nameMatch && !unitMatch && !ktpMatch && !blockMatch) return false;
    }

    return true;
  });

  // Calculate active resident: default to the first in the filtered list
  const activeResident = filteredResidents.find((r) => r.ktp === selectedResidentKtp) || filteredResidents[0];

  // Whenever the active resident changes, pre-populate their meter reading data
  useEffect(() => {
    if (activeResident) {
      setSelectedResidentKtp(activeResident.ktp);
      setError('');
      setSuccess('');
      
      const matchMei = billingRecords.find(
        (b) => b.residentKtp === activeResident.ktp && b.month === 'Mei' && b.year === 2026
      );
      if (matchMei) {
        setCurrentMeterInput(matchMei.currentMeter);
      } else {
        setCurrentMeterInput('');
      }
    } else {
      setSelectedResidentKtp('');
      setCurrentMeterInput('');
    }
  }, [activeResident?.ktp, billingRecords]);

  // Handle successful barcode / QR code scans
  const handleSuccessfulScan = (decodedText: string, html5QrCodeInstance?: any) => {
    if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
      html5QrCodeInstance.stop().catch((e: any) => console.log("Gagal stop scanner", e));
    }
    
    const token = decodedText.trim();
    
    // Helper to clean strings
    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tokenClean = cleanStr(token);
    
    // Robust character-equivalence fuzzy matcher for phone cameras & custom barcodes
    const matchResidentWithToken = (r: Resident, t: string): boolean => {
      const tClean = cleanStr(t);
      const barcodeClean = cleanStr(getBarcodeContent(r));
      const ktpClean = cleanStr(r.ktp);
      const nameClean = r.name.toLowerCase();
      const unitClean = cleanStr(r.unit);
      
      // 1. Direct/Sub-string matches
      if (barcodeClean === tokenClean || ktpClean === tokenClean || nameClean.includes(t.toLowerCase()) || unitClean === tokenClean) {
        return true;
      }
      
      // 2. Unit alphanumeric clean match (e.g. r.unit is "B-101" -> "b101", token is "b101")
      if (tClean.includes(unitClean) || unitClean.includes(tClean)) {
        return true;
      }
      
      // 3. Common Code39 / camera character misread equivalents (e.g., '1' <-> 'B' <-> 'A', '0' <-> 'O' <-> 'D')
      const isFuzzyMatch = (s1: string, s2: string): boolean => {
        if (s1.length !== s2.length) return false;
        
        const isEquivalent = (c1: string, c2: string): boolean => {
          if (c1 === c2) return true;
          const equivalents = [
            ['1', 'b', 'i', 'l', 'a'],
            ['0', 'o', 'd', 'q', 'u'],
            ['2', 'z'],
            ['5', 's'],
            ['8', 'b']
          ];
          return equivalents.some(group => group.includes(c1) && group.includes(c2));
        };
        
        for (let i = 0; i < s1.length; i++) {
          if (!isEquivalent(s1[i], s2[i])) return false;
        }
        return true;
      };
      
      if (isFuzzyMatch(barcodeClean, tClean) || isFuzzyMatch(unitClean, tClean)) {
        return true;
      }
      
      // 4. Custom parts parsing for tokens like "1-1-10B" -> matches Floor 1, Block B, Unit B-101 or Floor 1, Block A, Unit A-110
      const parts = t.toLowerCase().split('-');
      if (parts.length === 3) {
        const floorPart = parseInt(parts[0], 10);
        const middlePart = parts[1]; // e.g. "1" or "a" or "b"
        const lastPart = parts[2]; // e.g. "10b" or "110"
        
        const rFloor = r.floor || getFloorFromUnit(r.unit);
        if (rFloor === floorPart) {
          const rBlockClean = r.block.toLowerCase().replace(/[^a-z0-9]/g, '').replace('blok', ''); // "a", "b", "c"
          const rUnitNoClean = r.unit.toLowerCase().replace(/[^a-z0-9]/g, ''); // "a110", "b101"
          
          const combinedTokenClean = cleanStr(middlePart + lastPart); // "110b" or "110"
          if (isFuzzyMatch(rUnitNoClean, combinedTokenClean)) {
            return true;
          }
          
          // Mapped block comparison (A=1, B=2, C=3)
          const blockMap: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c' };
          const mappedBlock = blockMap[middlePart] || middlePart;
          if (rBlockClean === mappedBlock) {
            const roomNoToken = lastPart.replace(/[^0-9]/g, ''); // "10" from "10b"
            if (rUnitNoClean.includes(roomNoToken) && roomNoToken.length > 0) {
              return true;
            }
          }
        }
      }
      
      return false;
    };

    // First search in this floor
    let found = floorResidents.find((r) => matchResidentWithToken(r, token));
    
    // If not found, look at the similarity score to find the best match on this floor
    if (!found) {
      const getSimilarityScore = (s1: string, s2: string): number => {
        const chars1 = s1.split('');
        const chars2 = s2.split('');
        let matchCount = 0;
        
        const normalizeChar = (c: string): string => {
          if (['1', 'i', 'l', 'b', 'a'].includes(c)) return '1';
          if (['0', 'o', 'd', 'q'].includes(c)) return '0';
          return c;
        };
        
        const map1: Record<string, number> = {};
        const map2: Record<string, number> = {};
        
        chars1.forEach(c => {
          const nc = normalizeChar(c);
          map1[nc] = (map1[nc] || 0) + 1;
        });
        
        chars2.forEach(c => {
          const nc = normalizeChar(c);
          map2[nc] = (map2[nc] || 0) + 1;
        });
        
        Object.keys(map1).forEach(key => {
          if (map2[key]) {
            matchCount += Math.min(map1[key], map2[key]);
          }
        });
        
        return matchCount / Math.max(s1.length, s2.length);
      };

      const scoredResidents = floorResidents.map((r) => {
        const barcodeClean = cleanStr(getBarcodeContent(r));
        const unitClean = cleanStr(r.unit);
        
        const barcodeScore = getSimilarityScore(barcodeClean, tokenClean);
        const unitScore = getSimilarityScore(unitClean, tokenClean);
        const maxScore = Math.max(barcodeScore, unitScore);
        
        return { resident: r, score: maxScore };
      });
      
      // Filter by threshold (e.g. 75% similarity)
      const bestScored = scoredResidents
        .filter(item => item.score >= 0.74)
        .sort((a, b) => b.score - a.score)[0];
        
      if (bestScored) {
        found = bestScored.resident;
      }
    }

    if (found) {
      playScanBeep();
      setScannedResident(found);
      
      const matchMei = billingRecords.find(
        (b) => b.residentKtp === found.ktp && b.month === 'Mei' && b.year === 2026
      );
      setScannedMeterInput(matchMei ? String(matchMei.currentMeter) : '');
      setScannedError('');
      
      setIsScannerOpen(false);
      setScanningStatus('idle');
      setUseRealCamera(false);
    } else {
      playErrorBuzzer();
      
      // Fallback search across other floors
      let otherFloorRes = residents.find((r) => matchResidentWithToken(r, token));
      
      let errorMsgStr = `Kode "${token}" tidak cocok dengan warga di Lantai ${targetFloor}`;
      if (otherFloorRes) {
        const otherFloor = otherFloorRes.floor || getFloorFromUnit(otherFloorRes.unit);
        errorMsgStr += ` (Ditemukan di Lantai ${otherFloor}: Kamar ${otherFloorRes.unit} - ${otherFloorRes.name})`;
      }
      
      setError(errorMsgStr);
      setScanErrorMsg(errorMsgStr);
      setScanningStatus('error');
    }
  };

  // Real scan camera listener hook
  useEffect(() => {
    let html5QrCode: any = null;
    if (isScannerOpen && useRealCamera) {
      setScanningStatus('searching');
      setScanErrorMsg('');
      
      import('html5-qrcode').then((module) => {
        try {
          html5QrCode = new module.Html5Qrcode("qr-reader");
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width: number, height: number) => {
                const min = Math.min(width, height);
                const size = Math.floor(min * 0.7);
                return { width: size, height: size };
              }
            },
            (decodedText: string) => {
              handleSuccessfulScan(decodedText, html5QrCode);
            },
            (errorMessage: string) => {
              // Ignore standard error frames
            }
          ).catch((err: any) => {
            console.error("Camera access error:", err);
            setScanningStatus('error');
            setScanErrorMsg("Akses kamera ditolak / terblokir oleh browser. Silakan gunakan tab Simulasi Pindai dibawah ini.");
          });
        } catch (e: any) {
          console.error("Scanner exception:", e);
          setScanningStatus('error');
          setScanErrorMsg("Terjadi masalah sistem scanner. Gunakan simulator.");
        }
      });
    }

    return () => {
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch((e: any) => console.log("Stop error", e));
          }
        } catch (err) {
          console.log("Cleanup error", err);
        }
      }
    };
  }, [isScannerOpen, useRealCamera]);

  // Determine previous meter and May status
  const getPrevMeterAndCurrentMei = () => {
    if (!activeResident) return { prev: 0, currentMeiRecord: null };
    
    // Check if Mei already recorded
    const currentMeiRecord = billingRecords.find(
      (b) => b.residentKtp === activeResident.ktp && b.month === 'Mei' && b.year === 2026
    );

    if (currentMeiRecord) {
      return { prev: currentMeiRecord.prevMeter, currentMeiRecord };
    }

    // Get latest meter reading before May (April)
    const pastRecords = billingRecords.filter(
      (b) => b.residentKtp === activeResident.ktp && !(b.month === 'Mei' && b.year === 2026)
    );

    // Sort past records descending, prioritizing our imported CSV revision IDs (start with 'bill-')
    const sortedPast = [...pastRecords].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const aIsRev = a.id.startsWith('bill-') ? 1 : 0;
      const bIsRev = b.id.startsWith('bill-') ? 1 : 0;
      if (aIsRev !== bIsRev) return bIsRev - aIsRev;
      return 0;
    });

    const prev = sortedPast.length > 0 
      ? sortedPast[0].currentMeter 
      : (activeResident.initialMeter !== undefined && activeResident.initialMeter !== null
          ? Number(activeResident.initialMeter)
          : 100);

    return { prev, currentMeiRecord };
  };

  const { prev: prevMeterValue, currentMeiRecord } = getPrevMeterAndCurrentMei();

  // Handle manual selection
  const handleSelectResident = (ktp: string) => {
    setSelectedResidentKtp(ktp);
    setError('');
    setSuccess('');

    // Smooth scroll to form on mobile devices
    if (window.innerWidth < 1024 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Stepper input helpers for non-tech-savvy coordinators
  const handleQuickAdd = (amount: number) => {
    setError('');
    const baseValue = currentMeterInput === '' ? prevMeterValue : Number(currentMeterInput);
    setCurrentMeterInput(Math.max(prevMeterValue, baseValue + amount));
  };

  const handleSetSameValue = () => {
    setError('');
    setCurrentMeterInput(prevMeterValue);
    setSuccess('Diset sama dengan bulan lalu (Pemakaian air = 0 m³). Silakan klik Simpan untuk merekam.');
  };

  const handleResetInput = () => {
    setError('');
    setSuccess('');
    setCurrentMeterInput('');
  };

  // Submit recorded values
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!activeResident) {
      setError('Pilih warga terlebih dahulu.');
      return;
    }

    if (currentMeterInput === '' || currentMeterInput === undefined) {
      setError('Silakan isi angka meteran air terbaru warga.');
      return;
    }

    if (appSettings.isMaintenanceMode) {
      setError('Kesalahan: Sistem masuk dalam Mode Pemeliharaan (Terkuci sementara oleh Admin Pusat).');
      return;
    }

    const value = Number(currentMeterInput);
    if (value < prevMeterValue) {
      setError(`Kesalahan: Meteran baru (${value} m³) tidak boleh lebih kecil dari meteran bulan lalu (${prevMeterValue} m³). Buatlah koreksi agar pendaftaran valid.`);
      return;
    }

    // Call state updater in app component
    onSaveMeter(activeResident.ktp, prevMeterValue, value);
    setSuccess(`✓ Sukses mencatatkan meteran air Unit ${activeResident.unit}!`);

    // Auto Advance to the next "Belum Catat" resident
    if (autoAdvance) {
      const activeIdx = filteredResidents.findIndex((r) => r.ktp === activeResident.ktp);
      
      // Look forward
      let nextRes = null;
      for (let i = activeIdx + 1; i < filteredResidents.length; i++) {
        const r = filteredResidents[i];
        const matchMei = billingRecords.some(
          (b) => b.residentKtp === r.ktp && b.month === 'Mei' && b.year === 2026
        );
        if (!matchMei) {
          nextRes = r;
          break;
        }
      }

      // Wrap around to start if not found forward
      if (!nextRes) {
        for (let i = 0; i < activeIdx; i++) {
          const r = filteredResidents[i];
          const matchMei = billingRecords.some(
            (b) => b.residentKtp === r.ktp && b.month === 'Mei' && b.year === 2026
          );
          if (!matchMei) {
            nextRes = r;
            break;
          }
        }
      }

      if (nextRes) {
        const nextTarget = nextRes;
        setTimeout(() => {
          setSelectedResidentKtp(nextTarget.ktp);
          setSuccess(`✓ Sukses menyimpan unit ${activeResident.unit}! Melanjutkan otomatis ke kamar berikutnya: ${nextTarget.unit}.`);
        }, 900);
      }
    }
  };

  // Calculations for dynamic preview
  const usageFloat = currentMeterInput !== '' ? Number(currentMeterInput) - prevMeterValue : 0;
  const pdamBillCalc = usageFloat > 0 ? calculatePdamBill(usageFloat) : 0;
  const iuranSampah = 10000;
  const totalInvoiceCalc = pdamBillCalc > 0 ? pdamBillCalc + iuranSampah : 0;

  // May progress percentages
  const totalMeiRecorded = floorResidents.filter((r) =>
    billingRecords.some((b) => b.residentKtp === r.ktp && b.month === 'Mei' && b.year === 2026)
  ).length;
  const progressPercent = floorResidents.length > 0 
    ? Math.round((totalMeiRecorded / floorResidents.length) * 100) 
    : 0;

  return (
    <div id="coordinator_dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Header & Identity Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/50 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-100 text-cyan-800 h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl shadow-inner">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs uppercase tracking-wider font-extrabold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-md border border-cyan-200">
              Modul Petugas Lapangan • Lantai {targetFloor}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {coordinator.name}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Area Kerja: <span className="text-cyan-600 font-bold">Koordinator Lantai {targetFloor}</span> • KTP Akses: {coordinator.ktp}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          id="btn_coord_logout"
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl transition-all font-bold text-xs"
        >
          <LogOut size={15} />
          Keluar Keamanan Pas
        </button>
      </div>

      {/* Maintenance lock alert banner */}
      {appSettings.isMaintenanceMode && (
        <div className="bg-amber-50 border-2 border-amber-500/25 p-4 rounded-3xl text-slate-800 flex items-start gap-3.5 shadow-sm animate-fade-in">
          <div className="bg-amber-100 p-2 text-amber-700 rounded-xl font-black shrink-0">⚠️</div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 font-mono">PEMBERITAHUAN: PENGINPUTAN DIKUNCI (MAINTENANCE)</h4>
            <p className="text-[11px] text-slate-505 font-medium leading-relaxed">
              Sistem saat ini sedang dikunci sementara oleh administrator rusun untuk pemeliharaan data atau penutupan buku. Anda tetap dapat memantau hunian dan memindai barcode warga, namun penyimpanan data iuran dibekukan.
            </p>
          </div>
        </div>
      )}

      {/* 2. Visual Progress Bar for Record Completion Status */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Building2 size={16} className="text-cyan-600" />
              Kemajuan Catat Meteran Lantai {targetFloor}
            </h2>
            <p className="text-xxs text-slate-400 font-mono font-bold">Seluruh Unit di Lantai {targetFloor}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold font-mono">
            {totalMeiRecorded} / {floorResidents.length} Kamar Terdata ({progressPercent}%)
          </div>
        </div>
        
        {/* Progress Bar Visual */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-700 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

       {/* 3. Responsibility & Assistant Banner */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* LANTAI DETAILED RESPONSIBILITY FOCUS BANNER (Focused per floor as requested) */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-cyan-100 text-cyan-700 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
            {targetFloor}
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-cyan-600 font-mono">Penugasan Tersegmentasi</span>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800">
              Mengelola khusus unit hunian di <span className="text-cyan-600">Lantai {targetFloor}</span>
            </div>
          </div>
        </div>

        {/* AUTO ADVANCE TOGGLE */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer select-none w-full sm:w-auto justify-center sm:justify-start">
          <input
            type="checkbox"
            id="coord_auto_advance"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500 accent-cyan-600 cursor-pointer"
          />
          <label htmlFor="coord_auto_advance" className="text-[11px] font-bold text-slate-700 leading-tight cursor-pointer">
            Asisten Otomatis (Lanjut Ke Kamar Berikutnya)
          </label>
        </div>
      </div>

      {/* 4. Core Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN LEFT: ENTRY FORM (5/12 widths) */}
        <div ref={scrollRef} className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="text-cyan-500 animate-pulse" size={16} />
              Form Pencatatan Cepat
            </h2>
          </div>

          {/* GIANT SCAN BUTTON FOR COORDINATORS (Extremely comfortable for field walk with one-hand/thumb reach) */}
          <button
            type="button"
            onClick={() => {
              setIsScannerOpen(true);
              setUseRealCamera(true); // start with physical camera by default for instant scans
              setScanningStatus('idle');
              setScanErrorMsg('');
              if (floorResidents.length > 0) {
                setSimulateTargetRes(floorResidents[0].ktp);
              }
            }}
            className="w-full py-4.5 px-5 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-600 hover:via-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-between gap-4 border border-white/10 group cursor-pointer"
            title="Scan Kartu Warga"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-105 transition-transform duration-300">
                <QrCode size={24} className="text-white animate-pulse" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] tracking-wider uppercase font-extrabold text-cyan-200">Tombol Utama</span>
                <span className="block text-base font-black tracking-tight -mt-0.5">Scan Kode Warga</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </button>

          {!activeResident ? (
            <div className="py-12 text-center space-y-2">
              <HelpCircle className="mx-auto text-slate-300" size={32} />
              <p className="text-xs text-slate-500 font-bold">Kamar warga tidak ditemukan.</p>
              <p className="text-[10px] text-slate-400">Silakan ubah filter pencarian atau pilih tombol Semua Lantai.</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Resident identity display inside form */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-cyan-50/20 border border-slate-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Unit Hunian</span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 -mt-0.5">
                    <Building2 className="text-cyan-600" size={18} />
                    {activeResident.unit}
                  </div>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">
                    {activeResident.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    No KTP: {activeResident.ktp}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">Meteran Lalu</span>
                  <span className="text-lg font-mono font-black text-slate-700 block -mt-0.5">
                    {prevMeterValue} <span className="text-xs">m³</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block bg-slate-100 px-1.5 py-0.5 rounded-md mt-1 border border-slate-250">
                    April 2026
                  </span>
                </div>
              </div>

              {/* GIANT METER INPUT SECTION */}
              <div className="space-y-2">
                <label htmlFor="current_meter" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Angka Meteran Baru (Mei 2026)
                </label>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      id="current_meter"
                      name="current_meter"
                      value={currentMeterInput}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setCurrentMeterInput(val);
                      }}
                      placeholder={`Angka baru (harus >= ${prevMeterValue})`}
                      className="block w-full py-4 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-extrabold font-mono text-slate-950 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-inner"
                    />
                    <span className="absolute right-4 top-4.5 text-xs font-black font-mono text-slate-400">m³</span>
                  </div>

                  {/* RESET BUTTON */}
                  <button
                    type="button"
                    onClick={handleResetInput}
                    title="Kosongkan Isian"
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl transition-all border border-slate-200"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>

              {/* TOUCH ASSIST BUTTONS FOR EASIER INPUT (Tailored specifically for non-tech-savvy users) */}
              <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/50">
                <span className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                  Asisten Tombol Sentuh (Tanpa Ketik)
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSetSameValue}
                    className="col-span-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1 text-center"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Sama dengan Bulan Lalu (0 m³)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(1)}
                    className="py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1"
                  >
                    <Plus size={12} /> 1 m³
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAdd(5)}
                    className="py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1"
                  >
                    <Plus size={12} /> 5 m³
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAdd(10)}
                    className="py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1"
                  >
                    <Plus size={12} /> 10 m³
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAdd(25)}
                    className="py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1"
                  >
                    <Plus size={12} /> 25 m³
                  </button>
                </div>
              </div>

              {/* PREVIEW AND LIVE CALCULATION ASSISTANCE */}
              {currentMeterInput !== '' && Number(currentMeterInput) >= prevMeterValue ? (
                <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl text-xs space-y-2 text-slate-700 transition-all">
                  <p className="font-extrabold text-sky-900 flex justify-between uppercase tracking-wider text-[10px]">
                    <span>Kalkulasi Volume Air Masuk:</span>
                    <span className="bg-sky-100 text-sky-800 font-mono px-1.5 py-0.5 rounded leading-none">Mei 2026</span>
                  </p>
                  
                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-sky-100/50 shadow-sm">
                    <span className="font-bold text-slate-500 font-mono text-[10px] uppercase">Pemakaian Air:</span>
                    <span className="font-mono text-2xl text-sky-700 font-black">
                      +{usageFloat.toFixed(2).replace(/\.00$/, '')} m³
                    </span>
                  </div>

                  <div className="flex justify-between font-mono text-slate-600 pt-1">
                    <span>Estimasi Biaya Air PDAM:</span>
                    <span className="font-black text-slate-900 text-sm">Rp {pdamBillCalc.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <p className="text-[9px] text-slate-400 font-mono italic">
                    * {usageFloat <= 10 
                        ? 'Flat minimum Rp 25.000 untuk pemakaian <= 10 m³' 
                        : `Tarif progresif: ${usageFloat} m³ x Rp 2.500`}
                  </p>
                </div>
              ) : (
                currentMeterInput !== '' && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xxs font-semibold">
                    Silakan masukkan angka meteran yang valid (minimal {prevMeterValue} m³).
                  </div>
                )
              )}

              {error && <div className="text-xs text-red-700 bg-red-50 border border-red-150 p-3 rounded-2xl font-semibold leading-relaxed">{error}</div>}
              {success && <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-150 p-3 rounded-2xl font-bold leading-relaxed">{success}</div>}

              {/* MAIN SUBMIT BUTTON */}
              <button
                type="submit"
                id="save_meter_btn"
                disabled={appSettings.isMaintenanceMode}
                className={`w-full py-4 text-white rounded-2xl font-extrabold flex justify-center items-center gap-2 transition-all text-sm uppercase tracking-wider ${
                  appSettings.isMaintenanceMode
                    ? 'bg-slate-300 text-slate-500 border border-slate-200 cursor-not-allowed shadow-none'
                    : 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer shadow-md shadow-cyan-600/10 active:scale-[0.99]'
                }`}
              >
                <Save size={16} />
                {appSettings.isMaintenanceMode ? 'PENGINPUTAN TERKUNCI' : 'Simpan &amp; Rekam Tagihan'}
              </button>
            </form>
          )}

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2.5 text-slate-600">
            <Sparkles className="text-amber-600 mt-0.5 flex-shrink-0" size={15} />
            <p className="text-[10px] leading-relaxed">
              <strong>Tips Cepat:</strong> Cukup sentuh kartu warga di sebelah kanan untuk langsung berpindah, atau gunakan asisten tombol sentuh untuk menghindari mengetik angka di HP.
            </p>
          </div>
        </div>

        {/* COLUMN RIGHT: CHAMBER DIRECTORY (7/12 widths) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="text-cyan-600" size={16} />
                Daftar Kamar Warga ({filteredResidents.length})
              </h2>
              <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded">
                Grup {coordinator.assignedBlock}
              </span>
            </div>

            {/* Inline Connected Filter & Search Tools */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mt-4 space-y-3.5 shadow-inner">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari unit (misal: 101), nama warga, atau nomor KTP..."
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-xs text-slate-900 placeholder-slate-450 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all h-[34px] shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SELECT BLOCK FILTER */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-450 mb-1.5 font-mono">
                    Saring Blok Hunian
                  </label>
                  <select
                    value={filterBlock}
                    onChange={(e) => setFilterBlock(e.target.value)}
                    className="block w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs h-[34px] shadow-xs"
                  >
                    <option value="all">Semua Blok (Full)</option>
                    <option value="Blok A">Blok A</option>
                    <option value="Blok B">Blok B</option>
                    <option value="Blok C">Blok C</option>
                    <option value="Blok D">Blok D</option>
                    <option value="Blok E">Blok E</option>
                  </select>
                </div>

                {/* SELECT STATUS REKOD FILTER */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-450 mb-1.5 font-mono">
                    Saring Status Input Record (Mei)
                  </label>
                  <select
                    value={recordFilter}
                    onChange={(e) => setRecordFilter(e.target.value as any)}
                    className="block w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs h-[34px] shadow-xs"
                  >
                    <option value="all">Semua Kamar</option>
                    <option value="pending">Belum Di-input (📝 Belum Catat)</option>
                    <option value="completed">Sudah Di-input (✓ Sudah Catat)</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredResidents.length === 0 ? (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <SlidersHorizontal className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-bold">Kamar tidak ditemukan.</p>
                <p className="text-[10px]">Coba hapus saringan pencarian atau bersinkan filter di atas.</p>
              </div>
            ) : (
              <>
                {/* 1. Mobile & Touch Screen: Grid of Cards (Highly optimized for smartphones) */}
                <div className="block md:hidden space-y-3 mt-4" id="coord_resident_list_mobile">
                  {filteredResidents.map((res) => {
                    const meiRecord = billingRecords.find(
                      (b) => b.residentKtp === res.ktp && b.month === 'Mei' && b.year === 2026
                    );
                    const aprRecord = billingRecords.find(
                      (b) => b.residentKtp === res.ktp && b.month === 'April' && b.year === 2026
                    );
                    const isSelected = selectedResidentKtp === res.ktp;
                    const prevMeter = meiRecord ? meiRecord.prevMeter : (aprRecord ? aprRecord.currentMeter : 100);

                    return (
                      <div
                        key={res.id}
                        onClick={() => handleSelectResident(res.ktp)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-200 shadow-md scale-[1.01]' 
                            : meiRecord 
                              ? 'bg-emerald-50/10 border-slate-150 hover:bg-slate-50'
                              : 'bg-slate-50 border-slate-150 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono font-extrabold text-slate-400 block uppercase">
                              Lantai {getResidentFloor(res)}
                            </span>
                            <span className="font-extrabold text-slate-900 text-xs block">
                              Unit {res.unit} - {res.block} - No. {res.unit.split('-').pop()} — <span className="font-bold text-slate-700">{res.name}</span>
                            </span>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {meiRecord ? (
                              <>
                                <span className="px-2.5 py-1 bg-emerald-150 text-emerald-800 border border-emerald-250 rounded-full font-extrabold text-[9px] uppercase">
                                  Sudah Catat ✓
                                </span>
                                {meiRecord.status === 'Lunas' ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[8px] font-black uppercase">
                                    Lunas
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-black uppercase">
                                      Belum Bayar
                                    </span>
                                    {onPayBill && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm(`Konfirmasi pembayaran air & sampah Unit ${res.unit} sebesar Rp ${meiRecord.totalBill.toLocaleString('id-ID')} secara TUNAI?`)) {
                                            onPayBill(meiRecord.id, meiRecord.totalBill);
                                          }
                                        }}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase tracking-wider transition cursor-pointer select-none active:scale-[0.97]"
                                      >
                                        Bayar ✓
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-full font-extrabold text-[9px] uppercase animate-pulse">
                                Belum Catat 📝
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meter and usage inline status details */}
                        <div className="grid grid-cols-3 gap-2 pt-2.5 mt-2.5 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                          <div>
                            <span className="block text-[8px] text-slate-400 uppercase">Meter Lalu</span>
                            <span className="font-bold text-slate-700">{prevMeter} m³</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 uppercase">Meter Baru</span>
                            <span className="font-black text-slate-900">
                              {meiRecord ? `${meiRecord.currentMeter} m³` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 uppercase">Volume Masuk</span>
                            <span className="font-extrabold text-sky-700">
                              {meiRecord ? `+${meiRecord.usage} m³` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop & Tablet: Interactive Table View */}
                <div className="hidden md:block overflow-x-auto mt-4">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-mono text-xxs tracking-wider uppercase text-left">
                        <th className="pb-3 text-left">Lantai</th>
                        <th className="pb-3">Unit - Blok - No Kamar</th>
                        <th className="pb-3">Nama Warga</th>
                        <th className="pb-3">Meter Lalu</th>
                        <th className="pb-3">Meter Baru</th>
                        <th className="pb-3">Volume Masuk</th>
                        <th className="pb-3">Estimasi Biaya Air</th>
                        <th className="pb-3 text-right">Status Pencatatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResidents.map((res) => {
                        const meiRecord = billingRecords.find(
                          (b) => b.residentKtp === res.ktp && b.month === 'Mei' && b.year === 2026
                        );
                        const aprRecord = billingRecords.find(
                          (b) => b.residentKtp === res.ktp && b.month === 'April' && b.year === 2026
                        );
                        const isSelected = selectedResidentKtp === res.ktp;

                        return (
                          <tr
                            key={res.id}
                            onClick={() => handleSelectResident(res.ktp)}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer rounded-lg ${
                              isSelected ? 'bg-cyan-50/70 border-l-4 border-cyan-500' : ''
                            }`}
                          >
                            <td className="py-3 font-mono text-slate-500 font-bold pl-1">
                              Lt {getResidentFloor(res)}
                            </td>
                            <td className="py-3 font-extrabold text-slate-900 font-mono">
                              {res.unit} - {res.block} - No. {res.unit.split('-').pop()}
                            </td>
                            <td className="py-3 font-semibold">
                              <span className="font-bold block text-slate-800 leading-none">{res.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono block mt-1">{res.ktp}</span>
                            </td>
                            <td className="py-3 font-mono text-slate-500">
                              {meiRecord ? meiRecord.prevMeter : (aprRecord ? aprRecord.currentMeter : 100)}
                            </td>
                            <td className="py-3 font-mono font-black text-slate-950">
                              {meiRecord ? `${meiRecord.currentMeter} m³` : '-'}
                            </td>
                            <td className="py-3 font-mono">
                              {meiRecord ? (
                                <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 font-bold rounded border border-sky-100">
                                  +{meiRecord.usage} m³
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3 font-mono font-bold text-slate-800">
                              {meiRecord ? `Rp ${meiRecord.pdamBill.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="py-3 text-right pr-1" onClick={(e) => e.stopPropagation()}>
                              {meiRecord ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-750 border border-emerald-100 rounded font-bold text-[9px]">
                                    Sudah Catat ✓
                                  </span>
                                  {meiRecord.status === 'Lunas' ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-extrabold text-[9px]">
                                      Lunas ✓
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-2 py-0.5 bg-amber-55 text-amber-700 border border-amber-100 rounded font-bold text-[9px]">
                                        Belum Bayar
                                      </span>
                                      {onPayBill && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (window.confirm(`Konfirmasi pembayaran air & sampah Unit ${res.unit} sebesar Rp ${meiRecord.totalBill.toLocaleString('id-ID')} secara TUNAI?`)) {
                                              onPayBill(meiRecord.id, meiRecord.totalBill);
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer select-none active:scale-[0.97]"
                                        >
                                          Lunas ✓
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full font-bold animate-pulse">
                                  Belum Catat 📝
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="bg-cyan-55/40 border border-cyan-100 p-3 rounded-2xl flex items-center gap-2.5 mt-4">
            <Sparkles className="text-cyan-600 flex-shrink-0" size={16} />
            <p className="text-[10px] text-cyan-800 leading-relaxed font-semibold">
              INFORMASI PETUGAS: Laporan pemakaian air yang masuk akan langsung muncul sebagai tagihan aktif di HP warga serta terekam di dasbor admin pusat secara langsung.
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================== */}
      {/* 5. GORGEOUS PREMIUM BARCODE & QR CODE SCANNER MODAL */}
      {/* ========================================================== */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-cyan-50/60 to-sky-50/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-cyan-100 text-cyan-700 rounded-lg flex items-center justify-center">
                  <QrCode size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Pindai Kartu Warga</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-none">Cari & catat meter warga otomatis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setUseRealCamera(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
              <div className="space-y-4 text-center">
                <div className="relative w-full aspect-square max-w-[240px] mx-auto overflow-hidden bg-slate-950 rounded-2xl border-4 border-cyan-500/40 shadow-inner flex items-center justify-center">
                  {scanningStatus === 'searching' && (
                    <>
                      {/* Interactive green scanning lazer lines */}
                      <div className="absolute inset-x-0 h-0.5 bg-green-400 opacity-80 animate-bounce z-10" style={{ animationDuration: '2.5s' }} />
                      <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
                    </>
                  )}
                  <div id="qr-reader" className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
                  
                  {scanningStatus === 'scanned' && (
                    <div className="absolute inset-0 bg-emerald-500/95 flex flex-col items-center justify-center text-white p-3 z-30">
                      <CheckCircle2 size={42} className="text-white animate-scale-up mb-2" />
                      <p className="font-extrabold text-sm uppercase tracking-wide">Pindai Berhasil!</p>
                    </div>
                  )}

                  {scanningStatus === 'error' && (
                    <div className="absolute inset-0 bg-rose-50 flex flex-col items-center justify-center p-4 text-center text-rose-700 z-30">
                      <HelpCircle size={36} className="text-rose-500 mb-2" />
                      <p className="text-[10px] font-bold leading-normal">{scanErrorMsg || "Kamera bermasalah"}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setScanningStatus('idle');
                        }}
                        className="mt-3 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] rounded-lg uppercase cursor-pointer"
                      >
                        Coba Lagi ↻
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xxs text-slate-400 leading-normal max-w-xs mx-auto">
                  👉 Arahkan kamera ponsel Anda ke QR Code / Kartu Warga Rusunawa.
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setUseRealCamera(false);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl uppercase transition-colors shadow-xs"
              >
                Batalkan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. DIRECT ENTRY KEYPAD MODAL FOR SCANNED WARGA */}
      {/* ========================================================== */}
      {scannedResident && (() => {
        // Query previous April meter record
        const pastRecords = billingRecords.filter(
          (b) => b.residentKtp === scannedResident.ktp && !(b.month === 'Mei' && b.year === 2026)
        );
        const prevMeterVal = pastRecords.length > 0 ? pastRecords[0].currentMeter : 100;
        
        // Calculate usage & live costs
        const numericInputVal = scannedMeterInput === '' ? 0 : Number(scannedMeterInput);
        const usageAmount = Math.max(0, numericInputVal - prevMeterVal);
        const livePdamBill = calculatePdamBill(usageAmount);
        const liveTotalBill = livePdamBill + 10000; // Water + trash fee
        
        // Handle physical virtual key clicks
        const handleKeyPress = (char: string) => {
          setScannedError('');
          if (char === 'C') {
            setScannedMeterInput('');
          } else if (char === '⌫') {
            setScannedMeterInput(prev => prev.slice(0, -1));
          } else {
            // Prevent too large inputs (limit length of meter to 6 digits)
            if (scannedMeterInput.length >= 6) return;
            setScannedMeterInput(prev => prev + char);
          }
        };

        const handleSetSameValueScanned = () => {
          setScannedError('');
          setScannedMeterInput(String(prevMeterVal));
        };

        const handleConfirmDirectSave = () => {
          if (scannedMeterInput === '') {
            setScannedError('Silakan masukkan angka meteran yang baru.');
            playErrorBuzzer();
            return;
          }

          const value = Number(scannedMeterInput);
          if (value < prevMeterVal) {
            setScannedError(`Kesalahan: Angka baru (${value} m³) tidak boleh kurang dari meteran April (${prevMeterVal} m³).`);
            playErrorBuzzer();
            return;
          }

          // Trigger save
          onSaveMeter(scannedResident.ktp, prevMeterVal, value);
          
          // Show successful save effect
          playScanBeep();
          
          // Select this resident so the active list switches smoothly
          setSelectedResidentKtp(scannedResident.ktp);
          setSuccess(`✓ Sukses mencatatkan meteran air Unit ${scannedResident.unit} - ${scannedResident.name}!`);
          
          // Close the modal
          setScannedResident(null);
          setScannedMeterInput('');
          setScannedError('');
        };

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
            <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
              
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-cyan-600 to-sky-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider font-mono opacity-80 block leading-none">Pencatatan Barcode Cepat</span>
                    <h3 className="text-sm font-black uppercase text-white tracking-tight mt-0.5">Scan - Input - Konfirmasi</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedResident(null)}
                  className="text-white/80 hover:text-white font-bold text-lg h-7 w-7 rounded-full bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Citizen & Location Metadata Card */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black text-cyan-700">
                  <span>Informasi Hunian Rusun</span>
                  <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded">MEI 2026</span>
                </div>
                
                {/* Visual Label (Floor - Block - Room - Name) */}
                <div className="pt-2 text-slate-900 grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <span className="text-[8px] uppercase font-mono text-slate-400 block h-3">Lantai / Blok</span>
                    <span className="text-xs font-black leading-none block font-mono">
                      Lt {scannedResident.floor || getResidentFloor(scannedResident)} • {scannedResident.block}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-mono text-slate-400 block h-3">Nomor Kamar</span>
                    <span className="text-xs font-black leading-none block font-mono">
                      Kamar {scannedResident.unit}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/50 mt-1">
                    <span className="text-[8px] uppercase font-mono text-slate-400 block h-3">Nama Lengkap Kepala Keluarga</span>
                    <span className="text-sm font-black text-slate-900 block truncate leading-tight uppercase font-sans">
                      {scannedResident.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Display & Calculations Panel */}
              <div className="p-5 flex flex-col space-y-4">
                
                {/* Interactive Large Screen Indicator representation */}
                <div className="grid grid-cols-5 bg-slate-950 p-4 rounded-2xl relative border-2 border-slate-800 shadow-inner">
                  <div className="col-span-2 text-left shrink-0">
                    <span className="text-[8px] font-mono font-black tracking-wider text-cyan-400/80 block">Meter Lalu (April)</span>
                    <span className="text-lg font-mono font-black text-slate-300 block select-none">{prevMeterVal} m³</span>
                  </div>
                  
                  <div className="col-span-3 text-right">
                    <span className="text-[8px] font-mono font-black tracking-wider text-green-400 block">Meter Baru (Ketik Numpad)</span>
                    <span className="text-2xl font-mono font-black text-green-400 tracking-wide block animate-pulse">
                      {scannedMeterInput || '0'} <span className="text-xs">m³</span>
                    </span>
                  </div>
                </div>

                {/* Live Estimations calculated based on meter entry */}
                {scannedMeterInput !== '' && Number(scannedMeterInput) >= prevMeterVal && (
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[9px] font-mono text-slate-650 font-bold text-center">
                    <div>
                      <span className="block text-[8px] text-slate-400">VOLUME AIR</span>
                      <span className="text-slate-900 block font-black text-xs">+{usageAmount} m³</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold">ESTIMASI PDAM</span>
                      <span className="text-indigo-700 block font-black text-xs">Rp {livePdamBill.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold">ESTIMASI TOTAL</span>
                      <span className="text-emerald-700 block font-black text-xs">Rp {liveTotalBill.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}

                {/* Error field */}
                {scannedError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-150 text-[10px] text-rose-700 font-bold rounded-lg text-center leading-normal">
                     ⚠️ {scannedError}
                  </div>
                )}

                {/* Touch assist Same As Last Month */}
                <button
                  type="button"
                  onClick={handleSetSameValueScanned}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  Sama Dengan Bulan Lalu (Pemakaian = 0 m³)
                </button>

                {/* Virtual Interactive Touch Grid Numpad */}
                <div className="grid grid-cols-3 gap-2 bg-slate-100/60 p-2.5 rounded-2xl border border-slate-200/50">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                    const isControl = key === 'C' || key === '⌫';
                    const bgStyle = isControl 
                      ? 'bg-slate-205 hover:bg-slate-300 text-slate-700 font-extrabold'
                      : 'bg-white hover:bg-slate-50 text-slate-900 font-black shadow-xs border border-slate-205 text-sm';
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleKeyPress(key)}
                        className={`h-11 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none ${bgStyle}`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Bottom Actions Confirmation */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScannedResident(null);
                    setScannedMeterInput('');
                    setScannedError('');
                  }}
                  className="py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-xl transition-colors cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDirectSave}
                  className="py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-500/10 flex justify-center items-center gap-1"
                >
                  Simpan &amp; Konfirmasi ✓
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* FLOATING ACTION BUTTON (FAB) FOR INSTANT SCANNING - Always within comfortable thumb-reach on mobile layout */}
      <div className="fixed bottom-6 right-6 z-45 md:bottom-8 md:right-8">
        <button
          type="button"
          onClick={() => {
            setIsScannerOpen(true);
            setUseRealCamera(true); // start with physical camera by default for instant scans
            setScanningStatus('idle');
            setScanErrorMsg('');
            if (floorResidents.length > 0) {
              setSimulateTargetRes(floorResidents[0].ktp);
            }
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-650 text-white shadow-2xl shadow-cyan-600/40 hover:shadow-cyan-600/60 hover:scale-105 active:scale-95 transition-all duration-300 border border-cyan-400/30 group cursor-pointer"
          title="Scan Kode Warga"
        >
          <QrCode size={26} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700/50">
            Scan Kode Warga
          </span>
        </button>
      </div>

    </div>
  );
};
