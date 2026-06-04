import React, { useState } from 'react';
import { Resident, Coordinator, FinancialLog, BillingRecord, getFloorFromUnit, getBarcodeContent, AppSettings, getCleanPhone } from '../types';
import { LogOut, LayoutGrid, Users, Coins, Plus, Trash2, Edit2, UserPlus, Sparkles, CheckCircle2, ChevronRight, Calculator, Landmark, ShieldAlert, ArrowDownUp, UploadCloud, AlertCircle, Check, RotateCcw, QrCode, Printer, Search, FileText, Download, Settings, Building2 } from 'lucide-react';
import { calculatePdamBill } from '../data';
import { BarcodeRenderer } from './BarcodeRenderer';
import { QRCodeRenderer } from './QRCodeRenderer';

interface AdminDashboardProps {
  residents: Resident[];
  coordinators: Coordinator[];
  financeLogs: FinancialLog[];
  billingRecords: BillingRecord[];
  onLogout: () => void;
  onAddResident: (res: Omit<Resident, 'id'>) => void;
  onDeleteResident: (id: string) => void;
  onAddExpense: (amount: number, desc: string, category: string, fundUser?: string, type?: 'Pemasukan' | 'Pengeluaran') => void;
  onUpdateResidentKtp: (id: string, newKtp: string) => void;
  onImportResidents?: (imported: Omit<Resident, 'id'>[]) => void;
  onUpdateResidentStatus?: (id: string, status: string) => void;
  onEditResident?: (id: string, updatedFields: Partial<Resident>) => void;
  onEditCoordinator?: (id: string, updatedFields: Partial<Coordinator>) => void;
  onAddCoordinator?: (coord: Omit<Coordinator, 'id'>) => void;
  onDeleteCoordinator?: (id: string) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (settings: AppSettings) => void;
  onSaveMeter: (ktp: string, prevMeter: number, currentMeter: number) => void;
  onPayBill: (billId: string, amount: number) => void;
  onUpdateAprilMeter: (ktp: string, newAprilMeter: number) => void;
  onEditBillingRecord?: (billId: string, updatedFields: Partial<BillingRecord>) => void;
  onAddBillingRecord?: (bill: Omit<BillingRecord, 'id'>) => void;
  onDeleteBillingRecord?: (billId: string) => void;
  onEditFinanceLog?: (id: string, updatedFields: Partial<FinancialLog>) => void;
  onDeleteFinanceLog?: (id: string) => void;
  onReconcileFloorBills?: (billIds: string[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  residents,
  coordinators,
  financeLogs,
  billingRecords,
  onLogout,
  onAddResident,
  onDeleteResident,
  onAddExpense,
  onUpdateResidentKtp,
  onImportResidents,
  onUpdateResidentStatus,
  onEditResident,
  onEditCoordinator,
  onAddCoordinator,
  onDeleteCoordinator,
  appSettings,
  onUpdateAppSettings,
  onSaveMeter,
  onPayBill,
  onUpdateAprilMeter,
  onEditBillingRecord,
  onAddBillingRecord,
  onDeleteBillingRecord,
  onEditFinanceLog,
  onDeleteFinanceLog,
  onReconcileFloorBills
}) => {
  const [activeTab, setActiveTab] = useState<'finance' | 'residents' | 'coordinators' | 'reconciliation' | 'billing' | 'pdam-all' | 'barcodes' | 'settings'>('finance');

  // States for PDAM All Billing Management (Menu Baru)
  const [editingBill, setEditingBill] = useState<BillingRecord | null>(null);
  const [editBillPrevMeter, setEditBillPrevMeter] = useState<number>(0);
  const [editBillCurrentMeter, setEditBillCurrentMeter] = useState<number>(0);
  const [editBillMonth, setEditBillMonth] = useState<string>('Mei');
  const [editBillYear, setEditBillYear] = useState<number>(2026);
  const [editBillStatus, setEditBillStatus] = useState<'Lunas' | 'Belum Lunas'>('Belum Lunas');
  const [editBillPaymentDate, setEditBillPaymentDate] = useState<string>('');
  const [editBillTrashBill, setEditBillTrashBill] = useState<number>(10000);

  const [showAddBillModal, setShowAddBillModal] = useState<boolean>(false);
  const [addBillResidentKtp, setAddBillResidentKtp] = useState<string>('');
  const [addBillPrevMeter, setAddBillPrevMeter] = useState<number>(0);
  const [addBillCurrentMeter, setAddBillCurrentMeter] = useState<number>(0);
  const [addBillMonth, setAddBillMonth] = useState<string>('Mei');
  const [addBillYear, setAddBillYear] = useState<number>(2026);
  const [addBillStatus, setAddBillStatus] = useState<'Lunas' | 'Belum Lunas'>('Belum Lunas');
  const [addBillTrashBill, setAddBillTrashBill] = useState<number>(10000);
  const [addBillSearch, setAddBillSearch] = useState<string>('');

  // Filters for All Billing List
  const [pdamAllSearchQuery, setPdamAllSearchQuery] = useState<string>('');
  const [pdamAllFloorFilter, setPdamAllFloorFilter] = useState<'all' | number>('all');
  const [pdamAllBlockFilter, setPdamAllBlockFilter] = useState<'all' | string>('all');
  const [pdamAllMonthFilter, setPdamAllMonthFilter] = useState<'all' | string>('all');
  const [pdamAllYearFilter, setPdamAllYearFilter] = useState<'all' | number>('all');
  const [pdamAllStatusFilter, setPdamAllStatusFilter] = useState<'all' | string>('all');
  
  // States for editing a financial log
  const [editingFinanceLog, setEditingFinanceLog] = useState<FinancialLog | null>(null);
  const [editFinAmount, setEditFinAmount] = useState<number | ''>('');
  const [editFinDesc, setEditFinDesc] = useState<string>('');
  const [editFinCat, setEditFinCat] = useState<string>('');
  const [editFinFundUser, setEditFinFundUser] = useState<string>('');
  const [editFinType, setEditFinType] = useState<'Pemasukan' | 'Pengeluaran'>('Pengeluaran');
  
  // States for adding residents
  const [newResName, setNewResName] = useState('');
  const [newResKtp, setNewResKtp] = useState('');
  const [newResUnit, setNewResUnit] = useState('');
  const [newResBlock, setNewResBlock] = useState('Blok A');
  const [newResFloor, setNewResFloor] = useState<number>(1);
  const [newResPhone, setNewResPhone] = useState('');
  const [newResOccupancy, setNewResOccupancy] = useState('Dihuni');
  const [resError, setResError] = useState('');

  // States for mass importing from Excel/XLSX file/pasted text
  const [importText, setImportText] = useState('');
  const [parsedResidents, setParsedResidents] = useState<Omit<Resident, 'id'>[]>([]);
  const [importError, setImportError] = useState('');
  const [showImportPreview, setShowImportPreview] = useState(false);

  // States for adding expense
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDesc, setExpDesc] = useState('');
  const [expCat, setExpCat] = useState('Pemeliharaan Pompa');
  const [expFundUser, setExpFundUser] = useState('');
  const [expError, setExpError] = useState('');
  const [expType, setExpType] = useState<'Pemasukan' | 'Pengeluaran'>('Pengeluaran');

  // States for filtering finance logs
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Pemasukan' | 'Pengeluaran'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // States for editing resident KTP (legacy) and Full edit resident
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [editKtpInput, setEditKtpInput] = useState('');

  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [editResName, setEditResName] = useState('');
  const [editResKtp, setEditResKtp] = useState('');
  const [editResUnit, setEditResUnit] = useState('');
  const [editResBlock, setEditResBlock] = useState('');
  const [editResPhone, setEditResPhone] = useState('');
  const [editResFloor, setEditResFloor] = useState<number>(1);
  const [editResOccupancy, setEditResOccupancy] = useState('Dihuni');
  const [editResIsVacant, setEditResIsVacant] = useState(false);
  const [editFamilyMembers, setEditFamilyMembers] = useState<Array<{ name: string; age: string; gender: 'Laki-laki' | 'Perempuan'; occupation: string }>>([]);
  const [editVehicles, setEditVehicles] = useState<Array<{ type: string; plate: string }>>([]);
  const [editHasNoVehicle, setEditHasNoVehicle] = useState(false);

  // States for editing Coordinator
  const [editingCoordinator, setEditingCoordinator] = useState<Coordinator | null>(null);
  const [editCoordName, setEditCoordName] = useState('');
  const [editCoordKtp, setEditCoordKtp] = useState('');
  const [editCoordFloor, setEditCoordFloor] = useState<number>(1);

  // States for adding Coordinator/Security Petugas Baru
  const [newCoordName, setNewCoordName] = useState('');
  const [newCoordKtp, setNewCoordKtp] = useState('');
  const [newCoordFloor, setNewCoordFloor] = useState<number>(1);

  // States for Reconciliation
  const [reconcileFloor, setReconcileFloor] = useState<number | null>(null);
  const [reconcileSuccess, setReconcileSuccess] = useState('');

  // States for PDAM Backup & Payments Tab
  const [selectedResidentKtp, setSelectedResidentKtp] = useState('');
  const [inputAprilMeter, setInputAprilMeter] = useState('');
  const [inputMayMeter, setInputMayMeter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [billingSuccess, setBillingSuccess] = useState('');
  const [billingError, setBillingError] = useState('');

  // States for Barcode Management & Print layout
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeFloorFilter, setBarcodeFloorFilter] = useState<'all' | number>('all');
  const [barcodeBlockFilter, setBarcodeBlockFilter] = useState<'all' | string>('all');
  const [printMode, setPrintMode] = useState<'none' | 'cards' | 'worksheet' | 'single-card'>('none');
  const [selectedSinglePrintId, setSelectedSinglePrintId] = useState<string | null>(null);

  // States for App Settings Form
  const [formAppTitle, setFormAppTitle] = useState(appSettings.appTitle);
  const [formAdminSlogan, setFormAdminSlogan] = useState(appSettings.adminSlogan);
  const [formPdamMinUsage, setFormPdamMinUsage] = useState(appSettings.pdamMinUsage);
  const [formPdamMinPrice, setFormPdamMinPrice] = useState(appSettings.pdamMinPrice);
  const [formPdamCostPerCubic, setFormPdamCostPerCubic] = useState(appSettings.pdamCostPerCubic);
  const [formTrashBillCost, setFormTrashBillCost] = useState(appSettings.trashBillCost);
  const [formAppPrimaryColor, setFormAppPrimaryColor] = useState(appSettings.appPrimaryColor);
  const [formPaymentInstructions, setFormPaymentInstructions] = useState(appSettings.paymentInstructions);
  const [formIsMaintenanceMode, setFormIsMaintenanceMode] = useState(appSettings.isMaintenanceMode);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // States for Resident Directory filtering
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirFloorFilter, setDirFloorFilter] = useState<'all' | number>('all');
  const [dirBlockFilter, setDirBlockFilter] = useState<'all' | string>('all');
  const [dirStatusFilter, setDirStatusFilter] = useState<'all' | string>('all');
  const [isVacantModalOpen, setIsVacantModalOpen] = useState(false);

  // Finance calculations
  const totalBalance = financeLogs.reduce((sum, log) => {
    return log.type === 'Pemasukan' ? sum + log.amount : sum - log.amount;
  }, 0);

  const totalKasSementara = billingRecords
    .filter((b) => b.status === 'Terbayar di Koordinator')
    .reduce((sum, b) => sum + b.totalBill, 0);

  const totalInflow = financeLogs
    .filter((log) => log.type === 'Pemasukan')
    .reduce((sum, log) => sum + log.amount, 0);

  const totalOutflow = financeLogs
    .filter((log) => log.type === 'Pengeluaran')
    .reduce((sum, log) => sum + log.amount, 0);

  // Filter out iuran collections vs custom expenses directly from financeLogs to synchronize with actual finance data
  const cashInflowWater = financeLogs
    .filter((log) => log.type === 'Pemasukan' && log.category === 'Iuran Air')
    .reduce((sum, log) => sum + log.amount, 0);

  const cashInflowTrash = financeLogs
    .filter((log) => log.type === 'Pemasukan' && log.category === 'Iuran Sampah')
    .reduce((sum, log) => sum + log.amount, 0);

  // Helper list of filtered residents for barcodes & printable views (Sorted by floor, block, and unit number)
  const filteredResidentsForBarcodes = residents.filter((res) => {
    const matchesSearch = 
      res.name.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
      res.unit.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
      res.ktp.includes(barcodeSearch);
    
    const floor = res.floor || getFloorFromUnit(res.unit);
    const matchesFloor = barcodeFloorFilter === 'all' ? true : floor === Number(barcodeFloorFilter);
    const matchesBlock = barcodeBlockFilter === 'all' ? true : res.block === barcodeBlockFilter;
    
    return matchesSearch && matchesFloor && matchesBlock;
  }).sort((a, b) => {
    const aFloor = a.floor || getFloorFromUnit(a.unit);
    const bFloor = b.floor || getFloorFromUnit(b.unit);
    if (aFloor !== bFloor) {
      return aFloor - bFloor;
    }
    const aBlock = a.block || '';
    const bBlock = b.block || '';
    if (aBlock !== bBlock) {
      return aBlock.localeCompare(bBlock);
    }
    return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Filters & sorting for Admin Resident Directory (Sorted by floor then room unit number)
  const sortedAndFilteredResidents = [...residents]
    .filter((res) => {
      const matchesSearch = 
        res.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
        res.unit.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
        res.ktp.includes(dirSearchQuery);
      
      const floor = res.floor || getFloorFromUnit(res.unit);
      const matchesFloor = dirFloorFilter === 'all' ? true : floor === Number(dirFloorFilter);
      const matchesBlock = dirBlockFilter === 'all' ? true : res.block === dirBlockFilter;
      const matchesStatus = dirStatusFilter === 'all' ? true : (res.occupancyStatus || 'Dihuni') === dirStatusFilter;
      
      return matchesSearch && matchesFloor && matchesBlock && matchesStatus;
    })
    .sort((a, b) => {
      const aFloor = a.floor || getFloorFromUnit(a.unit);
      const bFloor = b.floor || getFloorFromUnit(b.unit);
      if (aFloor !== bFloor) {
        return aFloor - bFloor;
      }
      return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleCreateResident = (e: React.FormEvent) => {
    e.preventDefault();
    setResError('');

    if (!newResName || !newResKtp || !newResUnit || !newResPhone) {
      setResError('Harap lengkapi semua isian warga baru.');
      return;
    }

    if (residents.some(r => r.ktp === newResKtp)) {
      setResError('Nomor KTP sudah terdaftar.');
      return;
    }

    onAddResident({
      name: newResName,
      ktp: newResKtp,
      unit: newResUnit,
      block: newResBlock,
      phone: newResPhone,
      electricityStatus: 'Menyala',
      occupancyStatus: newResOccupancy,
      floor: newResFloor
    });

    // Reset inputs
    setNewResName('');
    setNewResKtp('');
    setNewResUnit('');
    setNewResPhone('');
    setNewResOccupancy('Dihuni');
    setNewResFloor(1);
  };

  const parseExcelPaste = (text: string): Omit<Resident, 'id'>[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // Split row into cells (Excel copy uses tabs, CSV uses commas/semicolons)
    const parsedRows = lines.map(line => {
      if (line.includes('\t')) return line.split('\t').map(c => c.trim());
      if (line.includes(';')) return line.split(';').map(c => c.trim());
      return line.split(',').map(c => c.trim());
    });

    const firstRow = parsedRows[0];
    const isHeader = firstRow.some(cell => {
      const c = cell.toLowerCase();
      return c.includes('nama') || c.includes('ktp') || c.includes('nik') || c.includes('unit') || c.includes('blok') || c.includes('kamar') || c.includes('telp') || c.includes('hp');
    });

    let nameValIdx = -1;
    let ktpValIdx = -1;
    let unitValIdx = -1;
    let blockValIdx = -1;
    let phoneValIdx = -1;
    let occupancyStatusValIdx = -1;

    if (isHeader) {
      const headers = firstRow.map(h => h.toLowerCase());
      nameValIdx = headers.findIndex(h => h.includes('nama') || h.includes('kepala'));
      ktpValIdx = headers.findIndex(h => h.includes('ktp') || h.includes('nik') || h.includes('identitas'));
      unitValIdx = headers.findIndex(h => h.includes('unit') || h.includes('kamar') || h.includes('no. kamar') || h.includes('no_kamar') || h.includes('no hunian'));
      blockValIdx = headers.findIndex(h => h.includes('blok') || h.includes('block'));
      phoneValIdx = headers.findIndex(h => h.includes('telp') || h.includes('phone') || h.includes('hp') || h.includes('telepon') || h.includes('wa') || h.includes('whatsapp'));
      occupancyStatusValIdx = headers.findIndex(h => h.includes('hunian') || h.includes('occupancy') || h.includes('status'));
    }

    const rowsToProcess = isHeader ? parsedRows.slice(1) : parsedRows;
    const results: Omit<Resident, 'id'>[] = [];

    for (const row of rowsToProcess) {
      if (row.length === 0) continue;

      let name = '';
      let ktp = '';
      let unit = '';
      let block = '';
      let phone = '';
      let occupancyStatus = 'Dihuni';

      if (isHeader) {
        if (nameValIdx !== -1) name = row[nameValIdx] || '';
        if (ktpValIdx !== -1) ktp = row[ktpValIdx] || '';
        if (unitValIdx !== -1) unit = row[unitValIdx] || '';
        if (blockValIdx !== -1) block = row[blockValIdx] || '';
        if (phoneValIdx !== -1) phone = row[phoneValIdx] || '';
        if (occupancyStatusValIdx !== -1) occupancyStatus = row[occupancyStatusValIdx] || 'Dihuni';
      } else {
        // Guess layout
        if (row.length >= 9) {
          occupancyStatus = row[8] || 'Dihuni';
        }
        if (row.length >= 5) {
          const cell0Lower = (row[0] || '').toLowerCase();
          if (cell0Lower.includes('blok') || ['blok a', 'blok b', 'blok c', 'blok d', 'blok e', 'a', 'b', 'c', 'd', 'e'].includes(cell0Lower)) {
            block = row[0] || '';
            unit = row[1] || '';
            name = row[2] || '';
            ktp = row[3] || '';
            phone = row[4] || '';
          } else {
            name = row[0] || '';
            ktp = row[1] || '';
            unit = row[2] || '';
            block = row[3] || '';
            phone = row[4] || '';
          }
        } else {
          name = row[0] || '';
          ktp = row[1] || '';
          unit = row[2] || '';
          phone = row[3] || '';
        }
      }

      name = name.trim();
      ktp = ktp.replace(/\D/g, '').trim(); 
      if (!ktp) {
        ktp = (row[1] || '').trim();
      }
      unit = unit.trim().toUpperCase();

      if (!block && unit) {
        const matches = unit.match(/^([A-Ea-e])-(.*)/);
        if (matches) {
          block = `Blok ${matches[1].toUpperCase()}`;
        } else {
          block = 'Blok A';
        }
      } else {
        block = block.trim();
        if (block && !block.toLowerCase().startsWith('blok')) {
          block = `Blok ${block}`;
        } else if (!block) {
          block = 'Blok A';
        }
      }

      phone = phone.trim() || '-';

      if (name && ktp) {
        results.push({
          name,
          ktp,
          unit: unit || 'A-101',
          block,
          phone,
          electricityStatus: 'Menyala',
          occupancyStatus: occupancyStatus || 'Dihuni'
        });
      }
    }

    return results;
  };

  const handleParseImport = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Silakan tempel (paste) tabel data Excel Anda terlebih dahulu.');
      return;
    }

    try {
      const parsed = parseExcelPaste(importText);
      if (parsed.length === 0) {
        setImportError('Tidak ada data warga valid yang terdeteksi. Silakan periksa kembali kecocokan penulisan kolom.');
        return;
      }
      setParsedResidents(parsed);
      setShowImportPreview(true);
    } catch (err: any) {
      setImportError(`Gagal membaca data: ${err.message || err}`);
    }
  };

  const handleConfirmImport = () => {
    if (parsedResidents.length === 0) return;
    if (onImportResidents) {
      onImportResidents(parsedResidents);
    }
    // Clean up
    setImportText('');
    setParsedResidents([]);
    setShowImportPreview(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');

    if (!expAmount || !expDesc) {
      setExpError('Lengkapi deskripsi & jumlah transaksi.');
      return;
    }

    onAddExpense(Number(expAmount), expDesc, expCat, expFundUser.trim() || undefined, expType);
    setExpAmount('');
    setExpDesc('');
    setExpFundUser('');
  };

  const handleOpenEditModal = (res: Resident) => {
    setEditingResident(res);
    setEditResName(res.name);
    setEditResKtp(res.ktp);
    setEditResUnit(res.unit);
    setEditResBlock(res.block);
    setEditResPhone(getCleanPhone(res.phone));
    setEditResFloor(res.floor || getFloorFromUnit(res.unit));
    setEditResOccupancy(res.occupancyStatus || 'Dihuni');
    setEditResIsVacant(res.isVacant || false);

    // Initialize verification states from db JSON
    const vData = res.phone && res.phone.startsWith('VERIFIED_V1:')
      ? (() => { try { return JSON.parse(res.phone.substring('VERIFIED_V1:'.length)); } catch (e) { return null; } })()
      : null;

    setEditFamilyMembers(vData?.familyMembers || []);
    setEditVehicles(vData?.vehicles || []);
    setEditHasNoVehicle(vData ? !!vData.hasNoVehicle : false);
  };

  const handleSaveEditResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResident) return;
    if (!editResName.trim() || !editResKtp.trim() || !editResUnit.trim()) {
      alert('Nama, KTP, dan Unit tidak boleh kosong!');
      return;
    }

    if (editResKtp.trim() !== editingResident.ktp && residents.some(r => r.id !== editingResident.id && r.ktp === editResKtp.trim())) {
      alert('Galat: Nomor NIK/KTP sudah terdaftar pada warga/hunian lain!');
      return;
    }

    // Build the updated verification payload to serialize into the phone field
    const payload = {
      whatsapp: editResPhone.trim(),
      familyMembers: editFamilyMembers,
      vehicles: editVehicles,
      hasNoVehicle: editHasNoVehicle,
      vehiclesCount: editHasNoVehicle ? 0 : editVehicles.length,
      vehiclesType: editHasNoVehicle ? 'Tidak Ada' : editVehicles.map(v => `${v.type} (${v.plate || '-'})`).join(', '),
      verifiedAt: new Date().toISOString()
    };
    const finalPhone = `VERIFIED_V1:${JSON.stringify(payload)}`;

    if (onEditResident) {
      onEditResident(editingResident.id, {
        name: editResName.trim(),
        ktp: editResKtp.trim(),
        unit: editResUnit.trim(),
        block: editResBlock,
        phone: finalPhone,
        floor: editResFloor,
        occupancyStatus: editResOccupancy,
        isVacant: editResOccupancy === 'Kosong',
      });
    }
    setEditingResident(null);
  };

  const handleOpenEditCoordinatorModal = (coord: Coordinator) => {
    setEditingCoordinator(coord);
    setEditCoordName(coord.name);
    setEditCoordKtp(coord.ktp);
    setEditCoordFloor(coord.assignedFloor || 1);
  };

  const handleSaveEditCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoordinator) return;
    if (!editCoordName.trim() || !editCoordKtp.trim()) {
      alert('Nama dan NIK/KTP tidak boleh kosong!');
      return;
    }
    if (onEditCoordinator) {
      onEditCoordinator(editingCoordinator.id, {
        name: editCoordName.trim(),
        ktp: editCoordKtp.trim(),
        assignedFloor: editCoordFloor,
      });
    }
    setEditingCoordinator(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppSettings({
      appTitle: formAppTitle,
      adminSlogan: formAdminSlogan,
      pdamMinUsage: Number(formPdamMinUsage),
      pdamMinPrice: Number(formPdamMinPrice),
      pdamCostPerCubic: Number(formPdamCostPerCubic),
      trashBillCost: Number(formTrashBillCost),
      appPrimaryColor: formAppPrimaryColor,
      paymentInstructions: formPaymentInstructions,
      isMaintenanceMode: formIsMaintenanceMode
    });
    setSettingsSuccessMsg('Pengaturan aplikasi berhasil disimpan & diperbarui secara universal! ✓');
    setTimeout(() => {
      setSettingsSuccessMsg('');
    }, 4000);
  };

  const handleCopyWargaLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const wargaUrl = `${origin}${path}?role=warga`;
    navigator.clipboard.writeText(wargaUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleStartEditKtp = (res: Resident) => {
    setEditingResId(res.id);
    setEditKtpInput(res.ktp);
  };

  const handleSaveKtp = (resId: string) => {
    if (!editKtpInput.trim()) return;
    onUpdateResidentKtp(resId, editKtpInput.trim());
    setEditingResId(null);
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // Filtered finance logs based on date, type, and category filters
  const filteredFinanceLogs = financeLogs.filter((log) => {
    // 1. Filter Type
    if (filterType !== 'all') {
      if (log.type !== filterType) return false;
    }

    // 2. Filter Category
    if (filterCategory !== 'all') {
      if (log.category !== filterCategory) return false;
    }

    // 3. Filter Start Date
    if (filterStartDate) {
      const logTime = new Date(log.date).getTime();
      const startTime = new Date(filterStartDate).getTime();
      if (logTime < startTime) return false;
    }

    // 4. Filter End Date
    if (filterEndDate) {
      const logTime = new Date(log.date).getTime();
      const endTime = new Date(filterEndDate).getTime() + (24 * 60 * 60 * 1000) - 1;
      if (logTime > endTime) return false;
    }

    return true;
  });

  if (printMode !== 'none') {
    return (
      <div className="bg-white text-black w-full min-h-screen p-10 font-sans print:p-0 print-stage">
        {/* Control banner (always Hidden during actual system physical printout) */}
        <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl mb-8 shadow-xl print:hidden max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Printer size={18} className={printMode === 'worksheet' ? "text-emerald-400 animate-pulse" : "text-purple-400 animate-pulse"} />
            <div>
              <span className="text-[9px] font-extrabold tracking-widest uppercase font-mono block text-slate-450">Pusat Cetak Dokumen PDF</span>
              <span className="text-xs font-bold block">
                Dokumen: {printMode === 'cards' ? 'Kumpulan Kartu Barcode (Stiker 3x5)' : printMode === 'single-card' ? 'Cetak Satuan Barcode (Stiker 3x5)' : 'Form Manual Verifikasi Lapangan'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.print(), 100);
              }}
              className={`px-4 py-2 text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md ${
                printMode === 'worksheet' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/15'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/15'
              }`}
            >
              <Printer size={12} />
              Simpan PDF / Cetak Fisik
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('none')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-extrabold uppercase rounded-xl transition-all cursor-pointer"
            >
              Tutup Simulator
            </button>
          </div>
        </div>

        {/* 1. PRINT MODE: MASS STICKER ROLL OR SHEET PRINTING (3x5cm Stickers with Only Barcode and Floor-Block-Unit) */}
        {(printMode === 'cards' || printMode === 'single-card') && (
          <div className="space-y-6">
            <style>
              {`
                @media print {
                  @page {
                    size: 50mm 30mm;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  .print-page-break {
                    page-break-after: always;
                  }
                }
              `}
            </style>
            <div className="print:hidden text-center max-w-2xl mx-auto space-y-1.5 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">
                TATA LETAK ROLL PRINT STICKER FISIK (UKURAN 5x3 CM)
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Format stiker didesain untuk printer thermal roll (ukuran 50mm x 30mm). Pastikan printer Anda disetel pada ukuran kertas 50x30mm saat mencetak. Hanya ada nama rusun, kode barcode, dan keterangan detail unit hunian.
              </p>
            </div>
            
            {/* Print Flex Wrapping Row */}
            <div className="flex flex-wrap gap-4 justify-center bg-white text-black p-4 rounded-xl print:p-0 print:gap-2">
              {(() => {
                const listToPrint = printMode === 'single-card' 
                  ? residents.filter(r => r.id === selectedSinglePrintId)
                  : filteredResidentsForBarcodes;

                if (listToPrint.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 font-mono text-xs">
                      Tidak ada stiker yang dapat dicetak.
                    </div>
                  );
                }

                return listToPrint.map((res) => {
                  const barcodeVal = getBarcodeContent(res);
                  const floorVal = res.floor || getFloorFromUnit(res.unit);
                  const blockLetter = res.block.replace('Blok ', '').trim();

                  return (
                    <div 
                      key={res.id} 
                      className="bg-white flex flex-row items-center justify-between p-[1.5mm] select-none relative overflow-hidden border border-slate-100 md:border-dashed print:border-0 print:p-[1mm] print-page-break"
                      style={{ 
                        width: '50mm', 
                        height: '30mm', 
                        maxHeight: '30mm',
                        maxWidth: '50mm',
                        minHeight: '30mm',
                        minWidth: '50mm',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Kolom Kiri: QR Code (2.8 x 2.8 cm) */}
                      <div className="flex items-center justify-center w-[25mm] h-[25mm] shrink-0 border border-slate-50 print:border-0">
                        <QRCodeRenderer value={barcodeVal} size={90} className="w-full h-full object-contain" />
                      </div>

                      {/* Kolom Kanan: Teks Identitas Premium */}
                      <div className="flex flex-col justify-between items-start pl-2 h-full text-left font-sans text-black grow">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] font-extrabold uppercase text-slate-500 tracking-wider block font-mono">PDAM RUSUN</span>
                          <span className="text-[10px] font-black uppercase text-black leading-none block tracking-tight">GUNUNGSARI</span>
                        </div>
                        
                        <div className="space-y-0.5 py-1">
                          <span className="text-[8px] font-bold text-slate-700 block">LANTAI {floorVal}</span>
                          <span className="text-[8px] font-bold text-slate-700 block">BLOK {blockLetter}</span>
                        </div>

                        <div className="text-[12.5px] font-black uppercase text-black leading-none shrink-0 font-sans border-2 border-black px-1.5 py-1 rounded mt-1.5 w-full text-center">
                          UNIT {res.unit}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 2. PRINT MODE: REGISTER MANUAL SHEETS TABLE (OFFLINE BACKUP) */}
        {printMode === 'worksheet' && (
          <div className="max-w-5xl mx-auto space-y-3 bg-white text-black p-4 print:p-0 print:space-y-2">
            <div className="border-b-2 border-slate-900 pb-1.5 text-center">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-505">
                REGISTER KERJA DAN VERIFIKASI FISIK MANUAL (SIAP CETAK)
              </span>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">
                BUKU LOG LAPANGAN CATATAN METER AIR RUSUN
              </h2>
              <div className="flex justify-center gap-10 mt-1.5 text-xxs font-mono font-bold text-slate-600 uppercase">
                <span>BULAN CATATAN: MEI 2026</span>
                <span>WAKTU BACKUP: {new Date().toLocaleString('id-ID')}</span>
                <span>UNIT LAPORAN: SEMUA UNIT AKTIF</span>
              </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <style>
                {`
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 8mm 10mm;
                    }
                    tr {
                      page-break-inside: avoid;
                    }
                    td {
                      padding: 4.5px 6px !important;
                      line-height: 1.15 !important;
                      font-size: 9.5px !important;
                    }
                    th {
                      padding: 5px 6px !important;
                      line-height: 1.15 !important;
                      font-size: 9.5px !important;
                    }
                    .print-compact-h {
                      height: 25px !important;
                    }
                  }
                `}
              </style>
              <table className="w-full border-collapse text-[10px] border border-slate-900 table-auto text-black mt-2">
                <thead>
                  <tr className="bg-slate-100 font-mono font-black uppercase border-b-2 border-slate-900 text-slate-900 divide-x divide-slate-900">
                    <th className="p-1.5 text-center w-8 border border-slate-900">No</th>
                    <th className="p-1.5 text-center w-12 border border-slate-900">Lantai</th>
                    <th className="p-1.5 text-center w-14 border border-slate-900">Blok</th>
                    <th className="p-1.5 text-center w-16 border border-slate-900">No Hunian</th>
                    <th className="p-1.5 text-left border border-slate-900">Nama Penghuni</th>
                    <th className="p-1.5 text-right w-24 border border-slate-900">Meter Lalu</th>
                    <th className="p-1.5 text-right w-32 border border-slate-900">Meter Baru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-900 font-bold">
                  {filteredResidentsForBarcodes.map((res, idx) => {
                    // Find previous (April) meter record
                    const pBills = billingRecords.filter(b => b.residentKtp === res.ktp && !(b.month === 'Mei' && b.year === 2026));
                    const aprVal = pBills.length > 0 ? pBills[0].currentMeter : 100;

                    return (
                      <tr key={res.id} className="divide-x divide-slate-900 hover:bg-slate-50/40 border border-slate-900">
                        <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="p-1.5 text-center font-mono">Lt {res.floor || getFloorFromUnit(res.unit)}</td>
                        <td className="p-1.5 text-center">{res.block}</td>
                        <td className="p-1.5 text-center font-mono font-black">{res.unit}</td>
                        <td className="p-1.5 uppercase">{res.name}</td>
                        <td className="p-1.5 text-right font-mono">{aprVal}</td>
                        <td className="p-1.5 border border-slate-900 h-6 print-compact-h"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="admin_dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl uppercase shadow-inner">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sistem {appSettings.appTitle}</h1>
            <p className="text-sm text-slate-500 font-mono">
              Workspace Administrator • {appSettings.adminSlogan}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          id="btn_admin_logout"
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl transition-all cursor-pointer text-sm font-semibold"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>

      {/* Main Stats of Rusunawa */}
      {(() => {
        const vacantResidentsList = residents.filter(
          (r) => r.isVacant || r.occupancyStatus === 'Kosong' || r.occupancyStatus === 'kosong' || r.name === 'Kamar Kosong' || r.name?.toLowerCase()?.includes('kamar kosong')
        );
        const vacantCount = vacantResidentsList.length;

        return (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-[#0700ad] text-white p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-xxs font-mono text-white block uppercase tracking-wider">Total Kas Utama Paguyuban</span>
                <span className="text-xl font-bold font-mono text-white block mt-1">{formatRupiah(totalBalance)}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/20">
                <span className="text-[9px] font-mono text-purple-200 block uppercase tracking-wider font-bold">Kas Sementara (Di Koordinator)</span>
                <span className="text-xs font-bold font-mono text-yellow-350 block">{formatRupiah(totalKasSementara)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-150">
              <span className="text-xxs font-mono text-rose-500 block uppercase tracking-wider font-bold">Total Pengeluaran Kas</span>
              <span className="text-xl font-bold font-mono text-rose-600 block mt-1.5">{formatRupiah(totalOutflow)}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Akumulasi pengeluaran paguyuban</span>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-150">
              <span className="text-xxs font-mono text-slate-400 block uppercase tracking-wider">Iuran PDAM Terbayar</span>
              <span className="text-xl font-bold font-mono text-blue-600 block mt-1.5">{formatRupiah(cashInflowWater)}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Pemasukan iuran air meter</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-150">
              <span className="text-xxs font-mono text-slate-400 block uppercase tracking-wider">Iuran Sampah Terbayar</span>
              <span className="text-xl font-bold font-mono text-emerald-600 block mt-1.5">{formatRupiah(cashInflowTrash)}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Flat Rp {appSettings.trashBillCost.toLocaleString('id-ID')} / hunian</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-150">
              <span className="text-xxs font-mono text-slate-400 block uppercase tracking-wider">Total Warga Terdaftar</span>
              <span className="text-xl font-bold font-mono text-slate-950 block mt-1.5">{residents.length} Hunian</span>
              <span className="text-[10px] text-slate-500 block mt-2">5 Koordinator aktif</span>
            </div>

            <div 
              onClick={() => setIsVacantModalOpen(true)}
              className="bg-white p-5 rounded-2xl border border-slate-150 cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group select-none"
            >
              <span className="text-xxs font-mono text-slate-400 block uppercase tracking-wider group-hover:text-amber-600 transition-colors">Hunian Kosong</span>
              <span className="text-xl font-bold font-mono text-amber-600 block mt-1.5">{vacantCount} Kamar</span>
              <span className="text-[10px] text-slate-500 block mt-2 font-semibold text-slate-400 group-hover:text-amber-500 transition-colors">Klik untuk verifikasi list →</span>
            </div>
          </div>
        );
      })()}

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto scrollbar-none w-full">
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'finance'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Keuangan &amp; Kas
        </button>
        <button
          onClick={() => setActiveTab('residents')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'residents'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Kelola Penghuni Warga
        </button>
        <button
          onClick={() => setActiveTab('coordinators')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'coordinators'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Petugas Koordinator
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'reconciliation'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🤝 Setoran &amp; Rekonsiliasi
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🚰 Pembayaran &amp; Catat PDAM
        </button>
        <button
          onClick={() => setActiveTab('pdam-all')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'pdam-all'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          💧 PDAM Seluruh Lantai
        </button>
        <button
          onClick={() => setActiveTab('barcodes')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'barcodes'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🏷️ Kelola Barcode &amp; Cetak
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-shrink-0 pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 px-4 transition-all cursor-pointer flex items-center gap-1 ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings size={13} />
          ⚙️ Pengaturan Aplikasi
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FINANCE TAB VIEW */}
        {activeTab === 'finance' && (
          <>
            {/* Adding Expense/Income Form (Left) */}
            <div className={`lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-150/30 transition-all duration-300 ${
              expType === 'Pemasukan' ? 'ring-2 ring-emerald-500/30' : 'ring-2 ring-purple-500/20'
            }`}>
              
              {/* TRANSACTION TYPE SELECT BUTTONS */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setExpType('Pengeluaran');
                    if (expCat === 'Sumbangan Untuk Kerohanian') setExpCat('Pemeliharaan Pompa');
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    expType === 'Pengeluaran'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📉 Pengeluaran (Keluar)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpType('Pemasukan');
                    setExpCat('Sumbangan Untuk Kerohanian');
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    expType === 'Pemasukan'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📈 Pemasukan (Masuk)
                </button>
              </div>

              <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Landmark className={expType === 'Pemasukan' ? 'text-emerald-600' : 'text-purple-600'} size={18} />
                Input {expType} Kas
              </h2>

              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono mb-1.5">Kategori {expType}</label>
                  <select
                    value={expCat}
                    onChange={(e) => setExpCat(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs font-bold text-slate-800"
                  >
                    {expType === 'Pemasukan' ? (
                      <>
                        <option value="Sumbangan Untuk Kerohanian">Sumbangan Untuk Kerohanian</option>
                        <option value="Iuran Air">Iuran Air Warga</option>
                        <option value="Iuran Sampah">Iuran Sampah Warga</option>
                        <option value="Setoran Koordinator">Setoran Koordinator Lantai</option>
                        <option value="Sumbangan Sukarela">Sumbangan Sukarela Warga</option>
                        <option value="Lain-lain">Pemasukan Lain-lain</option>
                      </>
                    ) : (
                      <>
                        <option value="Pemeliharaan Pompa">Pemeliharaan Pompa Air</option>
                        <option value="Kebersihan/Kesehatan">Kebersihan &amp; Kerja Bakti</option>
                        <option value="Perbaikan Listrik Hub">Perbaikan Kelistrikan Umum</option>
                        <option value="Kesekretariatan">Alat Kantor / Kertas Iuran</option>
                        <option value="Sumbangan Untuk Kerohanian">Aktivitas Kerohanian / Donasi Sosial</option>
                        <option value="Perbaikan Fasilitas Umum Lainnya">Perbaikan Fasilitas Umum Lainnya</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono mb-1.5">Jumlah Uang (Rp)</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 75000"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono mb-1.5">
                    {expType === 'Pemasukan' ? 'Pihak Penyetor (Sumber Dana)' : 'Pengguna Dana (Penerima)'}
                  </label>
                  <input
                    type="text"
                    value={expFundUser}
                    onChange={(e) => setExpFundUser(e.target.value)}
                    placeholder={expType === 'Pemasukan' ? "Misal: Hamba Allah / Paguyuban Pusat" : "Misal: Pak Budi (Unit B-102) / Teknisi Air"}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono mb-1.5">Deskripsi Transaksi ({expType})</label>
                  <textarea
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder={expType === 'Pemasukan' ? "Contoh: Sedekah bulanan sumbangan tahlil / iuran" : "eg: Pembelian kabel koaksial & stopkontak pos"}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 h-20 resize-none font-medium"
                  ></textarea>
                </div>

                {expError && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl text-center font-bold">{expError}</div>}

                <button
                  type="submit"
                  className={`w-full py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    expType === 'Pemasukan'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/10'
                  }`}
                >
                  <Plus size={14} />
                  {expType === 'Pemasukan' ? 'Simpan Pemasukan Masuk' : 'Ambil Kas Paguyuban'}
                </button>
              </form>
            </div>

            {/* List of Financial Logs (Right 2 Cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowDownUp size={16} className="text-purple-600" />
                  Aliran Buku Kas &amp; Iuran Masuk
                </h2>
                <span className="text-xxs font-mono font-bold text-slate-400">RIWAYAT AKTIF ({filteredFinanceLogs.length})</span>
              </div>

              {/* FILTERS TOOLBAR */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end mb-4 text-slate-800">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Jenis Kas</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-purple-500 outline-none"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="Pemasukan">Pemasukan (+)</option>
                    <option value="Pengeluaran">Pengeluaran (-)</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Kategori Kas</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-purple-500 outline-none"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="Iuran Air">Iuran Air</option>
                    <option value="Iuran Sampah">Iuran Sampah</option>
                    <option value="Setoran Koordinator">Setoran Koordinator</option>
                    <option value="Sumbangan Untuk Kerohanian">Sumbangan Untuk Kerohanian</option>
                    <option value="Pemeliharaan Pompa">Pemeliharaan Pompa Air</option>
                    <option value="Kebersihan/Kesehatan">Kebersihan &amp; Kerja Bakti</option>
                    <option value="Perbaikan Listrik Hub">Perbaikan Kelistrikan Umum</option>
                    <option value="Kesekretariatan">Alat Kantor / Kertas Iuran</option>
                    <option value="Perbaikan Fasilitas Umum Lainnya">Perbaikan Fasilitas Umum Lainnya</option>
                  </select>
                </div>

                {/* RESET BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterType('all');
                    setFilterCategory('all');
                  }}
                  className="bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer flex items-center justify-center h-[34px] w-[34px]"
                  title="Reset Filter"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredFinanceLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-medium">Tidak ada transaksi yang cocok dengan filter.</div>
                ) : (
                  filteredFinanceLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-4">
                      <div className="text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono mr-2 ${
                          log.type === 'Pemasukan' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.type}
                        </span>
                        <span className="font-bold text-slate-900">{log.description}</span>
                        {log.fundUser && (
                          <span className="ml-2 bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Penerima: {log.fundUser}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Kategori: {log.category} • Waktu: {new Date(log.date).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-mono font-bold whitespace-nowrap ${
                            log.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
                            {log.type === 'Pemasukan' ? '+' : '-'} {formatRupiah(log.amount)}
                          </span>
                          
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFinanceLog(log);
                                setEditFinAmount(log.amount);
                                setEditFinDesc(log.description);
                                setEditFinCat(log.category);
                                setEditFinFundUser(log.fundUser || '');
                                setEditFinType(log.type);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Edit Transaksi"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Apakah Anda yakin ingin menghapus catatan transaksi "${log.description}"?`)) {
                                  if (onDeleteFinanceLog) onDeleteFinanceLog(log.id);
                                }
                              }}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* RESIDENTS TAB VIEW */}
        {activeTab === 'residents' && (
          <>
            {/* Adding Resident Form (Left) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Manual Form Box */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus className="text-purple-600" size={18} />
                  Daftarkan Hunian Baru
                </h2>

                <form onSubmit={handleCreateResident} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Nama Lengkap Kepala Keluarga</label>
                    <input
                      type="text"
                      value={newResName}
                      onChange={(e) => setNewResName(e.target.value)}
                      placeholder="eg: Joko Susilo"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Nomor KTP (Untuk Login)</label>
                    <input
                      type="text"
                      value={newResKtp}
                      onChange={(e) => setNewResKtp(e.target.value)}
                      placeholder="eg: 454545"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-950 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Lantai</label>
                      <select
                        value={newResFloor}
                        onChange={(e) => setNewResFloor(parseInt(e.target.value, 10))}
                        className="block w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                      >
                        <option value={1}>Lantai 1</option>
                        <option value={2}>Lantai 2</option>
                        <option value={3}>Lantai 3</option>
                        <option value={4}>Lantai 4</option>
                        <option value={5}>Lantai 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Blok</label>
                      <select
                        value={newResBlock}
                        onChange={(e) => setNewResBlock(e.target.value)}
                        className="block w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                      >
                        <option value="Blok A">Blok A</option>
                        <option value="Blok B">Blok B</option>
                        <option value="Blok C">Blok C</option>
                        <option value="Blok D">Blok D</option>
                        <option value="Blok E">Blok E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">No. Kamar</label>
                      <input
                        type="text"
                        value={newResUnit}
                        onChange={(e) => setNewResUnit(e.target.value)}
                        placeholder="eg: A-103"
                        className="block w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">No Handphone</label>
                    <input
                      type="text"
                      value={newResPhone}
                      onChange={(e) => setNewResPhone(e.target.value)}
                      placeholder="eg: 0812..."
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Status Hunian (Kolom I)</label>
                    <select
                      value={newResOccupancy}
                      onChange={(e) => setNewResOccupancy(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none text-slate-900"
                    >
                      <option value="Dihuni">Dihuni</option>
                      <option value="Kosong">Kosong</option>
                      <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                    </select>
                  </div>

                  {resError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{resError}</div>}

                  <button
                    type="submit"
                    id="add_resident_submit"
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    Daftarkan Hunian
                  </button>
                </form>
              </div>

              {/* Mass Import / Copypaste Box */}
              <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 font-bold font-mono text-[100px] select-none pointer-events-none text-slate-400">
                  XLSX
                </div>
                
                <h2 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-1.5 font-mono uppercase tracking-wider text-purple-400">
                  <Sparkles size={16} />
                  Import Massal Excel / NIK KTP
                </h2>
                <p className="text-[11px] text-slate-400 leading-normal mb-3">
                  Punya file Excel? Cukup <strong>Salin (Copy)</strong> baris-baris tabel Anda dari Excel lalu <strong>TEMPEL (Paste)</strong> di kolom bawah ini:
                </p>

                <div className="space-y-3 font-sans">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Tempel baris tabel di sini, contoh:
Joko Wardoyo	357801...	Blok A	A-101	081234...
Siti Aminah	357802...	Blok B	B-202	085755..."
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 h-28 resize-none text-[11px]"
                    spellCheck="false"
                  ></textarea>

                  {importError && (
                    <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/30 font-medium flex items-start gap-1.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {!showImportPreview ? (
                    <button
                      type="button"
                      onClick={handleParseImport}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <UploadCloud size={14} />
                      Proses &amp; Tinjau Warga
                    </button>
                  ) : (
                    <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          {parsedResidents.length} Hunian Terdeteksi
                        </span>
                        <span className="text-[10px] text-slate-400">Format Sesuai 🟢</span>
                      </div>
                      
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px] text-slate-300">
                        {parsedResidents.map((pr, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-800/60 p-1.5 rounded flex justify-between gap-2">
                            <div>
                              <span className="text-purple-400 font-bold">[{pr.unit}]</span> <span className="text-white">{pr.name}</span>
                              <p className="text-slate-500 text-[8px]">KTP: {pr.ktp} • HP: {getCleanPhone(pr.phone)}</p>
                            </div>
                            <span className="text-slate-400 text-[8px] uppercase self-center bg-slate-800 px-1 py-0.5 rounded font-bold">{pr.block}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowImportPreview(false)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmImport}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check size={11} /> Simpan &amp; Sync Google
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 leading-tight">
                    💡 <strong>Tips:</strong> Kolom yang dideteksi otomatis meliputi <em>Nama warga</em>, <em>Nomor KTP/NIK</em>, <em>Blok</em>, <em>No Kamar/Unit</em>, dan <em>No HP</em>.
                  </div>
                </div>
              </div>
            </div>

            {/* Resident Directory (Right 2 Cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 leading-none">
                  <Users className="text-purple-600" size={18} />
                  Direktori Hunian Rusunawa Gunungsari
                </h2>
                <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-bold border border-purple-100 shrink-0">
                  Total Terfilter: {sortedAndFilteredResidents.length} Kamar
                </span>
              </div>

              {/* Interactive Directory Filters & Mutations Finder */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                {/* Search */}
                <div className="col-span-2 lg:col-span-1">
                  <label className="block text-[9px] font-black uppercase font-mono text-slate-400 mb-1">Cari Penghuni / Unit</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dirSearchQuery}
                      onChange={(e) => setDirSearchQuery(e.target.value)}
                      placeholder="Nama, Kamar, NIK..."
                      className="block w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-xxs"
                    />
                    <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                  </div>
                </div>

                {/* Filter Lantai */}
                <div>
                  <label className="block text-[9px] font-black uppercase font-mono text-slate-400 mb-1">Filter Lantai</label>
                  <select
                    value={dirFloorFilter}
                    onChange={(e) => setDirFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all">Semua Lantai</option>
                    <option value="1">Lantai 1</option>
                    <option value="2">Lantai 2</option>
                    <option value="3">Lantai 3</option>
                    <option value="4">Lantai 4</option>
                    <option value="5">Lantai 5</option>
                  </select>
                </div>

                {/* Filter Blok */}
                <div>
                  <label className="block text-[9px] font-black uppercase font-mono text-slate-400 mb-1">Filter Blok</label>
                  <select
                    value={dirBlockFilter}
                    onChange={(e) => setDirBlockFilter(e.target.value)}
                    className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all">Semua Blok</option>
                    <option value="Blok A">Blok A</option>
                    <option value="Blok B">Blok B</option>
                    <option value="Blok C">Blok C</option>
                  </select>
                </div>

                {/* Status Hunian */}
                <div>
                  <label className="block text-[9px] font-black uppercase font-mono text-slate-400 mb-1">Status Hunian</label>
                  <select
                    value={dirStatusFilter}
                    onChange={(e) => setDirStatusFilter(e.target.value)}
                    className="block w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Dihuni">Dihuni</option>
                    <option value="Kosong">Kosong</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
              </div>

              {/* Mobile View: Resident Cards Directory */}
              <div className="block md:hidden space-y-3" id="admin_residents_mobile_list">
                {sortedAndFilteredResidents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold">Warga tidak ditemukan.</p>
                  </div>
                ) : (
                  sortedAndFilteredResidents.map((res) => (
                    <div key={res.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col space-y-2.5 shadow-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">
                            Unit {res.unit}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-200 ml-1.5">
                            Lt. {res.floor || getFloorFromUnit(res.unit)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono ml-2">Blok {res.block}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded-lg transition-all"
                            title="Edit Detail Warga"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteResident(res.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-all"
                            title="Hapus / Check-out Warga"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-slate-800 text-sm">{res.name}</p>
                        <p className="text-slate-500 font-mono">No HP: {getCleanPhone(res.phone)}</p>
                        
                        <div className="bg-purple-50/40 p-2 rounded-xl mt-1 space-y-1 border border-purple-150/40 flex justify-between items-center text-slate-700">
                          <span className="text-[9px] text-purple-600 font-mono font-bold uppercase">Status Hunian:</span>
                          <select
                            value={res.occupancyStatus || 'Dihuni'}
                            onChange={(e) => onUpdateResidentStatus && onUpdateResidentStatus(res.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-xxs font-medium px-1.5 py-0.5 focus:outline-none text-slate-800"
                          >
                            <option value="Dihuni">Dihuni</option>
                            <option value="Kosong">Kosong</option>
                            <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                          </select>
                        </div>

                        <div className="bg-slate-100/50 p-3 rounded-xl mt-1 space-y-1.5 border border-slate-200/40">
                          <span className="block text-[9px] text-slate-400 font-mono uppercase">Nomor KTP (Untuk Login)</span>
                          {editingResId === res.id ? (
                            <div className="flex gap-1.5 items-center w-full mt-1">
                              <input
                                type="text"
                                value={editKtpInput}
                                onChange={(e) => setEditKtpInput(e.target.value)}
                                className="block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono bg-white"
                              />
                              <button
                                onClick={() => handleSaveKtp(res.id)}
                                className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              >
                                Simpan
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-mono font-bold text-slate-700 text-xs">
                                {res.ktp}
                              </span>
                              <button
                                onClick={() => handleStartEditKtp(res)}
                                className="text-purple-600 hover:text-purple-800 transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
                              >
                                <Edit2 size={11} /> Edit KTP
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Data Verifikasi Warga Terintegrasi */}
                        {(() => {
                          const vData = res.phone && res.phone.startsWith('VERIFIED_V1:')
                            ? (() => { try { return JSON.parse(res.phone.substring('VERIFIED_V1:'.length)); } catch (e) { return null; } })()
                            : null;
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                              {vData ? (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/40 text-emerald-800">
                                    <span className="text-[10px] font-black uppercase tracking-wider font-mono">Verifikasi Warga</span>
                                    <span className="text-[9px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">AKTIF 🟢</span>
                                  </div>
                                  
                                  {/* Detail keluarga */}
                                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-700 border border-slate-100">
                                    <span className="block text-[8px] text-slate-400 uppercase font-bold font-mono">Anggota Keluarga ({vData.familyMembers?.length || 0} Jiwa)</span>
                                    {vData.familyMembers && vData.familyMembers.length > 0 ? (
                                      <ul className="mt-1 space-y-0.5 list-disc list-inside font-semibold text-slate-800">
                                        {vData.familyMembers.map((fm: any, idx: number) => (
                                          <li key={idx} className="truncate">
                                            {fm.name} ({fm.age} th, {fm.gender === 'Laki-laki' ? 'L' : 'P'}) - {fm.occupation || '-'}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="font-semibold text-slate-500 italic block mt-0.5">Tinggal Sendiri</span>
                                    )}
                                  </div>

                                  {/* Detail kendaraan */}
                                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-700 border border-slate-100">
                                    <span className="block text-[8px] text-slate-400 uppercase font-bold font-mono">Kendaraan</span>
                                    {vData.hasNoVehicle ? (
                                      <span className="font-semibold text-slate-500 italic block mt-0.5">Tidak Ada Kendaraan Bermotor</span>
                                    ) : vData.vehicles && vData.vehicles.length > 0 ? (
                                      <ul className="mt-1 space-y-0.5 list-disc list-inside font-semibold text-slate-800">
                                        {vData.vehicles.map((vh: any, idx: number) => (
                                          <li key={idx} className="truncate">
                                            {vh.type} - Nopol: {vh.plate || '-'}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="font-semibold text-slate-500 italic block mt-0.5">-</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/50 text-slate-500 text-[10px] font-bold">
                                  <span>Status Verifikasi:</span>
                                  <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-black uppercase font-mono">BELUM ISI ⚪</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Interactive Table with Sticky Headers & Scroll Container */}
              <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px] border border-slate-150 rounded-2xl shadow-inner bg-white select-none">
                <table className="min-w-full text-xs table-auto">
                  <thead className="sticky top-0 bg-slate-50 z-20 shadow-xs">
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-left uppercase text-[9px] font-black bg-slate-50/95 backdrop-blur-xs">
                      <th className="py-3 px-4 w-32">Nomor Unit</th>
                      <th className="py-3 px-4 w-28">Lantai</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Nomor KTP (Login)</th>
                      <th className="py-3 px-4">No HP / Telp</th>
                      <th className="py-3 px-4">Status Hunian</th>
                      <th className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredResidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold font-mono">
                          Tidak ada warga yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredResidents.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold font-mono text-purple-700 text-sm whitespace-nowrap">Kamar {res.unit}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 font-semibold">Lantai {res.floor || getFloorFromUnit(res.unit)}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block text-slate-800">{res.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{res.block}</span>
                          {/* Data Verifikasi Warga Desktop */}
                          {(() => {
                            const vData = res.phone && res.phone.startsWith('VERIFIED_V1:')
                              ? (() => { try { return JSON.parse(res.phone.substring('VERIFIED_V1:'.length)); } catch (e) { return null; } })()
                              : null;
                            if (!vData) {
                              return (
                                <span className="text-[8px] bg-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded font-mono uppercase mt-1 inline-block border border-slate-200/50">
                                  Belum Verifikasi
                                </span>
                              );
                            }
                            return (
                              <div className="mt-1 space-y-1 max-w-sm">
                                <div className="flex gap-1 items-center flex-wrap">
                                  <span className="text-[8px] bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-250/30 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                                    ✓ Verifikasi Warga
                                  </span>
                                  <span className="text-[8px] bg-indigo-50 text-indigo-850 font-bold border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                                    {vData.familyMembers?.length || 0} Anggota
                                  </span>
                                  <span className="text-[8px] bg-slate-50 text-slate-700 font-bold border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                    {vData.hasNoVehicle ? '0 Kendaraan' : `${vData.vehicles?.length || 0} Kendaraan`}
                                  </span>
                                </div>
                                
                                <div className="text-[9px] text-slate-500 pl-1.5 border-l-2 border-emerald-400 py-0.5 font-medium space-y-0.5 max-w-[280px]">
                                  {vData.familyMembers && vData.familyMembers.length > 0 && (
                                    <p className="truncate"><strong className="text-slate-650 font-mono">Keluarga:</strong> {vData.familyMembers.map((f: any) => `${f.name} (${f.age} th)`).join(', ')}</p>
                                  )}
                                  {!vData.hasNoVehicle && vData.vehicles && vData.vehicles.length > 0 && (
                                    <p className="truncate"><strong className="text-slate-650 font-mono">Kendaraan:</strong> {vData.vehicles.map((v: any) => `${v.type} (${v.plate || '-'})`).join(', ')}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          {editingResId === res.id ? (
                            <div className="flex gap-1 items-center">
                              <input
                                type="text"
                                value={editKtpInput}
                                onChange={(e) => setEditKtpInput(e.target.value)}
                                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono max-w-[100px]"
                              />
                              <button
                                onClick={() => handleSaveKtp(res.id)}
                                className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xxs font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-mono font-bold bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {res.ktp}
                              </span>
                              <button
                                onClick={() => handleStartEditKtp(res)}
                                className="text-slate-400 hover:text-slate-800 transition-colors"
                                title="Edit KTP"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{getCleanPhone(res.phone)}</td>
                        <td className="py-3 px-4">
                          <select
                            value={res.occupancyStatus || 'Dihuni'}
                            onChange={(e) => onUpdateResidentStatus && onUpdateResidentStatus(res.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2 py-1.5 focus:outline-none text-slate-800 cursor-pointer hover:border-slate-300 transition duration-150"
                          >
                            <option value="Dihuni">Dihuni</option>
                            <option value="Kosong">Kosong</option>
                            <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Edit Detail Warga"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => onDeleteResident(res.id)}
                            id={`delete_citizen_${res.id}`}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Hapus / Check-out Warga"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'coordinators' && (
          <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6 text-slate-900">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="text-purple-600" size={18} />
              Pengelolaan Staf Petugas Rusunawa Gunungsari
            </h2>

            {/* Form Tambah Petugas Baru (Koordinator / Security) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">Daftarkan Petugas Staf Baru</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">INPUT DATA KOORDINATOR LANTAI ATAU PETUGAS SECURITY BARU</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newCoordName.trim() || !newCoordKtp.trim()) {
                  alert('Nama dan NIK/KTP petugas harus diisi!');
                  return;
                }
                if (onAddCoordinator) {
                  onAddCoordinator({
                    name: newCoordName.trim(),
                    ktp: newCoordKtp.trim(),
                    assignedFloor: newCoordFloor
                  });
                  setNewCoordName('');
                  setNewCoordKtp('');
                  setNewCoordFloor(1);
                  alert('Staf petugas baru berhasil didaftarkan! ✓');
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Nama Lengkap Petugas</label>
                  <input
                    type="text"
                    value={newCoordName}
                    onChange={(e) => setNewCoordName(e.target.value)}
                    placeholder="eg. Komandan Bambang"
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px] text-slate-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">NIK / KTP Akses (Password)</label>
                  <input
                    type="text"
                    value={newCoordKtp}
                    onChange={(e) => setNewCoordKtp(e.target.value)}
                    placeholder="eg. 777777"
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px] text-slate-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Penugasan Jabatan</label>
                  <select
                    value={newCoordFloor}
                    onChange={(e) => setNewCoordFloor(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px] text-slate-900"
                  >
                    <option value={0}>Petugas Keamanan (Security)</option>
                    <option value={1}>Koordinator Lantai 1</option>
                    <option value={2}>Koordinator Lantai 2</option>
                    <option value={3}>Koordinator Lantai 3</option>
                    <option value={4}>Koordinator Lantai 4</option>
                    <option value={5}>Koordinator Lantai 5</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase transition cursor-pointer shadow-md shadow-purple-500/10 h-[34px]"
                >
                  + Daftarkan Staf
                </button>
              </form>
            </div>

            {/* SECTION 1: FLOOR COORDINATORS */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-100 pb-2">
                1. Staf Koordinator Berwenang per Lantai
              </h3>

              {/* Desktop View: Floor Coordinators Table */}
              <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-2xl shadow-inner bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150">
                    <tr className="text-slate-500 font-mono text-left uppercase text-[9px] font-black">
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nama Koordinator</th>
                      <th className="py-3 px-4">NIK KTP Akses (Password)</th>
                      <th className="py-3 px-4 text-center">Tugas Lantai</th>
                      <th className="py-3 px-4 text-center">Warga Lantai</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {coordinators.filter(c => c.assignedFloor > 0).map((c, idx) => {
                      const floor = c.assignedFloor;
                      const floorCitizenCount = residents.filter(r => (r.floor || getFloorFromUnit(r.unit)) === floor).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{c.ktp}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-xxs font-bold uppercase font-mono">
                              Lantai {floor}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{floorCitizenCount} Kamar</td>
                          <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCoordinatorModal(c)}
                              className="text-indigo-600 hover:text-indigo-850 hover:bg-indigo-50 p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Edit Koordinator"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus petugas koordinator ${c.name}?`)) {
                                  onDeleteCoordinator && onDeleteCoordinator(c.id);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Hapus Koordinator"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: SECURITY OFFICERS */}
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-100 pb-2">
                2. Staf Petugas Keamanan (Security)
              </h3>

              {/* Desktop View: Security Table */}
              <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-2xl shadow-inner bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150">
                    <tr className="text-slate-500 font-mono text-left uppercase text-[9px] font-black">
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nama Petugas Security</th>
                      <th className="py-3 px-4">NIK KTP Akses (Password)</th>
                      <th className="py-3 px-4 text-center">Tugas Area</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {coordinators.filter(c => c.assignedFloor === 0).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-bold font-mono">
                          Belum ada petugas security terdaftar. Silakan tambahkan di form atas.
                        </td>
                      </tr>
                    ) : (
                      coordinators.filter(c => c.assignedFloor === 0).map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{c.ktp}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xxs font-bold uppercase font-mono">
                              POS KEAMANAN (SECURITY)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCoordinatorModal(c)}
                              className="text-indigo-600 hover:text-indigo-850 hover:bg-indigo-50 p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Edit Security"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus petugas security ${c.name}?`)) {
                                  onDeleteCoordinator && onDeleteCoordinator(c.id);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Hapus Security"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* RECONCILIATION TAB VIEW */}
        {activeTab === 'reconciliation' && (
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-black uppercase rounded-full">
                    Sistem Rekonsiliasi Otomatis
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight">SETORAN &amp; REKONSILIASI KOORDINATOR</h2>
                <p className="text-xs text-slate-300 max-w-2xl font-medium">
                  Verifikasi dan cocokkan uang tunai hasil iuran warga yang ditagih oleh Koordinator Staf per Lantai. Menjaga aliran kas masuk transparan dan langsung terekam pembukuan.
                </p>
              </div>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                <Landmark size={20} className="text-purple-300" />
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase font-mono leading-none">Status Buku Ledger</div>
                  <div className="text-xs font-black text-emerald-300">UP-TO-DATE &amp; SEIMBANG ✓</div>
                </div>
              </div>
            </div>

            {(() => {
              // 1. Total Tagihan Bulan Ini (Mei 2026)
              const totalMeiBillings = billingRecords
                .filter(b => b.month === 'Mei' && b.year === 2026)
                .reduce((sum, b) => sum + b.totalBill, 0);
              const countMeiBillings = billingRecords.filter(b => b.month === 'Mei' && b.year === 2026).length;

              // 2. Total Diterima Koordinator (Terbayar di Koordinator ATAU Lunas untuk Mei 2026)
              const totalMeiCollected = billingRecords
                .filter(b => b.month === 'Mei' && b.year === 2026 && (b.status === 'Terbayar di Koordinator' || b.status === 'Lunas'))
                .reduce((sum, b) => sum + b.totalBill, 0);
              const countMeiCollected = billingRecords.filter(b => b.month === 'Mei' && b.year === 2026 && (b.status === 'Terbayar di Koordinator' || b.status === 'Lunas')).length;

              // 3. Sisa Setoran Wajib ke Bendahara (Uang tunai di tangan koordinator yang berstatus 'Terbayar di Koordinator' dan belum diverifikasi)
              const remainderToDeposit = billingRecords
                .filter(b => b.month === 'Mei' && b.year === 2026 && b.status === 'Terbayar di Koordinator')
                .reduce((sum, b) => sum + b.totalBill, 0);

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-slate-900">
                  {/* CARD 1: Total Tagihan Bulan Ini */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xxs font-extrabold uppercase text-slate-450 font-mono tracking-wider">Total Tagihan Bulan Ini</p>
                      <h3 className="text-2xl font-black text-slate-900 mt-1">Rp {totalMeiBillings.toLocaleString('id-ID')}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">Tercatat dari {countMeiBillings} unit hunian.</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                  </div>

                  {/* CARD 2: Total Diterima Koordinator */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xxs font-extrabold uppercase text-slate-450 font-mono tracking-wider">Total Diterima Koordinator</p>
                      <h3 className="text-2xl font-black text-emerald-600 mt-1">Rp {totalMeiCollected.toLocaleString('id-ID')}</h3>
                      <p className="text-[10px] text-slate-600 mt-1 font-bold">Terbayar oleh {countMeiCollected} warga.</p>
                    </div>
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>

                  {/* CARD 3: Sisa Setoran Wajib ke Bendahara */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xxs font-extrabold uppercase text-slate-450 font-mono tracking-wider">Setoran Wajib ke Bendahara</p>
                      <h3 className={`text-2xl font-black mt-1 ${remainderToDeposit > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`}>
                        Rp {remainderToDeposit.toLocaleString('id-ID')}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">Uang menunggu verifikasi bendahara.</p>
                    </div>
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                      <Coins size={20} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Reconciliation table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden text-slate-900">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">Status Kas &amp; Iuran Terkumpul Per Lantai</h3>
                <span className="text-[10px] bg-purple-50 font-bold font-mono text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg">BULAN INI: MEI 2026</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] font-extrabold uppercase text-slate-405 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Lantai Rusun</th>
                      <th className="py-3 px-4">Petugas Koordinator</th>
                      <th className="py-3 px-4 text-center">Partisipasi Iuran</th>
                      <th className="py-3 px-4 text-right">Total Tagihan</th>
                      <th className="py-3 px-4 text-right">Sudah Bayar (Warga)</th>
                      <th className="py-3 px-4 text-right">Belum Bayar (Warga)</th>
                      <th className="py-3 px-4 text-right">Uang Ditangan Koord</th>
                      <th className="py-3 px-4 text-right">Sudah Verifikasi Setoran</th>
                      <th className="py-3 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {[1, 2, 3, 4, 5].map((floorNum) => {
                      const coord = coordinators.find(c => (c.assignedFloor || (c.id === 'coord-1' ? 1 : c.id === 'coord-2' ? 2 : c.id === 'coord-3' ? 3 : c.id === 'coord-4' ? 4 : c.id === 'coord-5' ? 5 : 1)) === floorNum) || { name: 'Belum Ditunjuk', id: '' };
                      
                      // Filter residents on this floor
                      const floorRes = residents.filter(r => (r.floor || getFloorFromUnit(r.unit)) === floorNum);
                      const floorTotalResCount = floorRes.length;

                      // Filter all billing records for Mei 2026 on this floor (handling vacant rooms)
                      const floorMeiBills = billingRecords.filter(
                        b => b.month === 'Mei' && b.year === 2026 && floorRes.some(r => r.ktp === b.residentKtp)
                      ).map(b => {
                        const res = floorRes.find(r => r.ktp === b.residentKtp);
                        const isVacant = res?.isVacant || res?.occupancyStatus === 'Kosong' || res?.occupancyStatus === 'kosong' || res?.name === 'Kamar Kosong' || res?.name?.toLowerCase()?.includes('kamar kosong');
                        if (isVacant) {
                          return { ...b, pdamBill: 0, trashBill: 0, totalBill: 0 };
                        }
                        return b;
                      });

                      // 1. Total Tagihan (generated)
                      const totalBillOnFloor = floorMeiBills.reduce((s, r) => s + r.totalBill, 0);

                      // 2. Sudah Bayar (Terbayar di Koordinator + Lunas)
                      const floorMeiPaidBills = floorMeiBills.filter(b => b.status === 'Terbayar di Koordinator' || b.status === 'Lunas');
                      const totalPaidOnFloor = floorMeiPaidBills.reduce((s, r) => s + r.totalBill, 0);
                      const totalPaidCount = floorMeiPaidBills.length;

                      // 3. Belum Bayar (Belum Lunas)
                      const floorMeiUnpaidBills = floorMeiBills.filter(b => b.status === 'Belum Lunas');
                      const totalUnpaidOnFloor = floorMeiUnpaidBills.reduce((s, r) => s + r.totalBill, 0);

                      // 4. Uang Ditangan Koord (Terbayar di Koordinator yang belum disetor ke bendahara)
                      const floorMeiCollectedBills = floorMeiBills.filter(b => b.status === 'Terbayar di Koordinator');
                      const totalCollectedOnFloor = floorMeiCollectedBills.reduce((s, r) => s + r.totalBill, 0);
                      const floorLunasCount = floorMeiBills.filter(b => b.status === 'Lunas').length;

                      // Check if verify setoran exists in finance logs
                      const verifyRecord = financeLogs.find(
                        log => log.type === 'Pemasukan' && 
                               (log.category === 'Setoran Koordinator' || log.category === 'Iuran Air' || log.category === 'Iuran Sampah') && 
                               log.description.toLowerCase().includes(`lantai ${floorNum}`)
                      );

                      return (
                        <tr key={floorNum} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 font-black">
                              <span className="h-6 w-6 rounded-md bg-purple-50 text-purple-600 font-bold font-mono text-xs flex items-center justify-center">
                                {floorNum}
                              </span>
                              <span className="font-extrabold text-slate-800">Lantai {floorNum}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-700">
                            {coord.name}
                            <span className="block text-[9px] text-slate-400 font-mono leading-none mt-1">ID: {coord.id || 'N/A'}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-slate-900">{totalPaidCount} / {floorTotalResCount} Kamar</span>
                              <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                                <div 
                                  className="bg-emerald-500 h-full" 
                                  style={{ width: `${floorTotalResCount > 0 ? (totalPaidCount / floorTotalResCount) * 100 : 0}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                            Rp {totalBillOnFloor.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                            Rp {totalPaidOnFloor.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-rose-500">
                            Rp {totalUnpaidOnFloor.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black text-slate-900">
                            Rp {totalCollectedOnFloor.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-right font-mono pr-2">
                            {totalCollectedOnFloor > 0 ? (
                              <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded font-extrabold text-[10px] animate-pulse">
                                MENUNGGU SETORAN ⚠️
                              </span>
                            ) : totalPaidOnFloor > 0 ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded font-extrabold text-[10px]">
                                  SUDAH MASUK KAS ✓
                                </span>
                                {verifyRecord && (
                                  <span className="text-[9px] text-slate-400 leading-none mt-1 font-semibold">Tgl: {new Date(verifyRecord.date).toLocaleDateString('id-ID')}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                NIL (BELUM ADA KAS)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {totalCollectedOnFloor > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReconcileFloor(floorNum);
                                  setReconcileSuccess('');
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-[10px] uppercase shadow-md shadow-purple-500/10 cursor-pointer transition-colors active:scale-95"
                              >
                                Dana Diterima Bendahara
                              </button>
                            ) : floorLunasCount > 0 ? (
                              <span className="text-xs text-slate-400 font-bold">Terverifikasi</span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Belum ada tagihan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* BARCODES & OFFLINE VERIFICATION TAB VIEW */}
        {/* ======================================================== */}
        {activeTab === 'barcodes' && (
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase rounded-full font-mono">
                    Sistem Tag &amp; Cadangan Manual
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight">MANAJEMEN BARCODE &amp; CADANGAN CETAK MANUAL</h2>
                <p className="text-xs text-slate-300 max-w-2xl font-medium">
                  Atur kode identifikasi warga rusunawa untuk dipindai koordinator. Dilengkapi modul export dan cetak kartu barcode / PDF lembar verifikasi lapangan sebagai backup data jika terjadi kendala teknis offline.
                </p>
              </div>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                <QrCode size={20} className="text-indigo-300 animate-pulse" />
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase font-mono leading-none">Format Scan</div>
                  <div className="text-xs font-black text-rose-300">AUTO-GEN 1D &amp; QR ✓</div>
                </div>
              </div>
            </div>

            {/* Print Controls / Action Row */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Search text */}
              <div className="relative">
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1.5">Cari Hunian / Warga</label>
                <div className="relative">
                  <input
                    type="text"
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    placeholder="Nama, Unit, Nomor KTP..."
                    className="block w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xxs"
                  />
                  <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              {/* Lantai Dropdown */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1.5">Filter Lantai</label>
                <select
                  value={barcodeFloorFilter}
                  onChange={(e) => setBarcodeFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="all">Semua Lantai (1-5)</option>
                  <option value="1">Lantai 1</option>
                  <option value="2">Lantai 2</option>
                  <option value="3">Lantai 3</option>
                  <option value="4">Lantai 4</option>
                  <option value="5">Lantai 5</option>
                </select>
              </div>

              {/* Blok Dropdown */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1.5">Filter Blok Rusun</label>
                <select
                  value={barcodeBlockFilter}
                  onChange={(e) => setBarcodeBlockFilter(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="all">Semua Blok</option>
                  <option value="Blok A">Blok A</option>
                  <option value="Blok B">Blok B</option>
                  <option value="Blok C">Blok C</option>
                </select>
              </div>

              {/* Selection Summary */}
              <div className="bg-slate-50/80 border border-dashed border-slate-200 p-3 rounded-2xl flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wide">WARGA TERFILTER</span>
                <span className="text-base font-black text-slate-900 font-mono leading-none mt-0.5">
                  {filteredResidentsForBarcodes.length} <span className="text-[10px] font-bold text-slate-505">Kamar</span>
                </span>
              </div>
            </div>

            {/* Cetak Bulk PDF / Form Action Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box Action 1: Cetak Kartu Barcode Grid */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center">
                    <QrCode size={18} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono mt-2">Cetak Massal Kartu Barcode</h4>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    Menghasilkan file siap cetak berisikan kartu pass berkode barcode/QR unik untuk masing-masing warga terpilih. Dapat dipotong dan dilaminating untuk ditaruh dekat instalasi meteran air/pintu hunian. Fits on standard A4 cards paper.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (filteredResidentsForBarcodes.length === 0) {
                      alert('Tidak ada warga yang terpilih dalam filter.');
                      return;
                    }
                    setPrintMode('cards');
                  }}
                  className="w-full py-3 bg-fuchsia-700 hover:bg-fuchsia-800 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-md shadow-fuchsia-700/10 active:scale-98"
                >
                  <Printer size={12} />
                  Cetak {filteredResidentsForBarcodes.length} Kartu Pass Barcode
                </button>
              </div>

              {/* Box Action 2: Cetak Form Kerja Manual */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono mt-2">Cetak Lembar Verifikasi Manual (Backup)</h4>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    Sistem mencetak tabel register kosong formal yang rapi berdasarkan warga terfilter. Berguna sebagai catatan fisik lapangan (back-up) koordinator jika ponsel mati atau terjadi gangguan koneksi database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (filteredResidentsForBarcodes.length === 0) {
                      alert('Tidak ada warga yang terpilih dalam filter.');
                      return;
                    }
                    setPrintMode('worksheet');
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-md shadow-emerald-600/10 active:scale-98"
                >
                  <FileText size={12} />
                  Cetak Lembar Kerja Lapangan (PDF)
                </button>
              </div>

            </div>

            {/* Interactive Cards Preview Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">Pratinjau Kartu Fisik {filteredResidentsForBarcodes.length} Warga</h3>
                <span className="text-[10px] text-slate-400 font-bold leading-none font-mono">TAMPILAN CARD FITUR</span>
              </div>

              {filteredResidentsForBarcodes.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl space-y-2">
                  <p className="text-xs text-slate-500 font-bold">Warga tidak ditemukan.</p>
                  <p className="text-[10px] text-slate-400">Silakan ubah filter pencarian atau lantai Anda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredResidentsForBarcodes.map((res) => {
                    const floorNum = res.floor || getFloorFromUnit(res.unit);
                    const isCopied = selectedSinglePrintId === res.id;
                    const colorClass = 
                      floorNum === 1 ? 'border-cyan-500/40 from-cyan-500/5' :
                      floorNum === 2 ? 'border-emerald-500/40 from-emerald-500/5' :
                      floorNum === 3 ? 'border-purple-500/40 from-purple-500/5' :
                      floorNum === 4 ? 'border-pink-500/40 from-pink-500/5' :
                      'border-amber-500/40 from-amber-500/5';

                    const handleCopyToken = () => {
                      navigator.clipboard.writeText(res.ktp);
                      setSelectedSinglePrintId(res.id);
                      setTimeout(() => {
                        setSelectedSinglePrintId(null);
                      }, 1200);
                    };

                    return (
                      <div 
                        key={res.id} 
                        className={`bg-gradient-to-b ${colorClass} to-white border-2 p-5 rounded-2xl flex flex-col justify-between text-slate-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md`}
                      >
                        {/* Top Accent Logo info */}
                        <div className="flex justify-between items-center text-[7px] font-mono font-black text-slate-400 tracking-wider">
                          <span>SISTEM RUSUN PRATAMA</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-slate-600">ID CARD METER</span>
                        </div>

                        {/* Warga Info */}
                        <div className="mt-4 space-y-1">
                          <span className="text-[10px] font-black text-purple-700 tracking-wider uppercase font-mono bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 inline-block font-bold">
                            UNIT {res.unit} • {res.block}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">{res.name}</h4>
                          <p className="text-[9px] text-indigo-600 font-mono font-bold uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block mt-1">
                            Barcode: {getBarcodeContent(res)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold text-slate-500 mt-1">Kontak: {getCleanPhone(res.phone)}</p>
                        </div>

                        {/* Visual QR Code pattern */}
                        <div className="mt-5 border border-slate-150 p-3 bg-white rounded-xl flex flex-col items-center gap-2 shadow-inner">
                          <QRCodeRenderer value={getBarcodeContent(res)} size={70} className="mx-auto" />
                          <span className="text-[8px] font-mono tracking-widest text-slate-500 font-bold uppercase mt-1">
                            {getBarcodeContent(res)}
                          </span>
                        </div>

                        {/* Control panel for single card actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(getBarcodeContent(res));
                              setSelectedSinglePrintId(res.id);
                              setTimeout(() => {
                                setSelectedSinglePrintId(null);
                              }, 1200);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all whitespace-nowrap cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500 text-white font-black'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isCopied ? 'Tersalin ✓' : 'Salin Code'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSinglePrintId(res.id);
                              setPrintMode('single-card');
                            }}
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap cursor-pointer flex justify-center items-center gap-1"
                          >
                            <Printer size={10} />
                            Cetak Satuan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}


        {/* BILLING & PDAM BACKUP MANAGEMENT TAB VIEW */}
        {/* ======================================================== */}
        {activeTab === 'billing' && (() => {
          // Find selected resident details
          const activeRes = residents.find(r => r.ktp === selectedResidentKtp);
          
          // Get April record and May record for selected resident
          const aprRecord = activeRes ? billingRecords.find(b => b.residentKtp === activeRes.ktp && b.month === 'April' && b.year === 2026) : null;
          const meiRecord = activeRes ? billingRecords.find(b => b.residentKtp === activeRes.ktp && b.month === 'Mei' && b.year === 2026) : null;

          // Previous meter fallback: April record's currentMeter, or initialMeter, or 100
          const prevMeterVal = activeRes
            ? (meiRecord 
                ? meiRecord.prevMeter 
                : (aprRecord 
                    ? aprRecord.currentMeter 
                    : (activeRes.initialMeter !== undefined && activeRes.initialMeter !== null ? Number(activeRes.initialMeter) : 100)
                  )
              )
            : 0;

          // Filtered list of residents based on search query
          const filteredResList = residents.filter(r => {
            const query = searchQuery.toLowerCase();
            return r.name.toLowerCase().includes(query) || 
                   r.unit.toLowerCase().includes(query) || 
                   r.block.toLowerCase().includes(query) ||
                   r.ktp.includes(query);
          });

          // Sort naturally by Block -> Floor -> Unit
          const sortedResList = [...filteredResList].sort((a, b) => {
            if (a.block !== b.block) return a.block.localeCompare(b.block);
            const floorA = a.floor || getFloorFromUnit(a.unit);
            const floorB = b.floor || getFloorFromUnit(b.unit);
            if (floorA !== floorB) return floorA - floorB;
            return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' });
          });

          const handleSaveMayMeter = (e: React.FormEvent) => {
            e.preventDefault();
            if (!activeRes) return;
            const newMeterVal = Number(inputMayMeter);
            if (isNaN(newMeterVal) || inputMayMeter === '') {
              setBillingError('Silakan masukkan angka meteran yang valid.');
              return;
            }
            if (newMeterVal < prevMeterVal) {
              setBillingError(`Error: Angka baru (${newMeterVal} m³) tidak boleh lebih kecil dari meteran lalu (${prevMeterVal} m³).`);
              return;
            }
            onSaveMeter(activeRes.ktp, prevMeterVal, newMeterVal);
            setBillingSuccess(`Sukses menyimpan meteran Mei (${newMeterVal} m³) untuk Unit ${activeRes.unit}!`);
            setBillingError('');
            setInputMayMeter('');
            setTimeout(() => setBillingSuccess(''), 4000);
          };

          const handleSaveAprilMeter = (e: React.FormEvent) => {
            e.preventDefault();
            if (!activeRes) return;
            const newMeterVal = Number(inputAprilMeter);
            if (isNaN(newMeterVal) || inputAprilMeter === '') {
              setBillingError('Silakan masukkan angka meteran April yang valid.');
              return;
            }
            onUpdateAprilMeter(activeRes.ktp, newMeterVal);
            setBillingSuccess(`Sukses mengoreksi meteran April (${newMeterVal} m³) untuk Unit ${activeRes.unit}!`);
            setBillingError('');
            setInputAprilMeter('');
            setTimeout(() => setBillingSuccess(''), 4000);
          };

          // May usage & live pricing calculations
          const isActiveResVacant = activeRes?.isVacant || activeRes?.occupancyStatus === 'Kosong' || activeRes?.occupancyStatus === 'kosong' || activeRes?.name === 'Kamar Kosong' || activeRes?.name?.toLowerCase()?.includes('kamar kosong');
          const usage = isActiveResVacant ? 0 : (inputMayMeter !== '' ? Math.max(0, Number(inputMayMeter) - prevMeterVal) : 0);
          const pdamBill = isActiveResVacant ? 0 : calculatePdamBill(usage);
          const trashBill = isActiveResVacant ? 0 : appSettings.trashBillCost;
          const totalBill = pdamBill + trashBill;

          return (
            <div className="lg:col-span-3 space-y-6 animate-fade-in text-slate-900 w-full">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[10px] font-black uppercase rounded-full">
                      PENCATATAN BACKUP & PEMBAYARAN PDAM
                    </span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight">KONTROL IURAN & BACKUP PDAM WARGA</h2>
                  <p className="text-xs text-slate-300 max-w-2xl font-medium">
                    Membantu mencatatkan angka meteran air (backup) jika koordinator berhalangan, memproses pelunasan pembayaran secara tunai, serta melakukan koreksi angka meteran bulan lalu (April) yang bermasalah.
                  </p>
                </div>
              </div>

              {/* Status Alerts */}
              {(billingSuccess || billingError) && (
                <div className="space-y-2">
                  {billingSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl flex items-center gap-2.5 font-bold text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{billingSuccess}</span>
                    </div>
                  )}
                  {billingError && (
                    <div className="p-4 bg-rose-50 border border-rose-250 text-rose-800 rounded-2xl flex items-center gap-2.5 font-bold text-xs">
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      <span>{billingError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
                {/* COLUMN LEFT: INPUT WORKSTATION (5/12) */}
                <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-100 shadow-xl space-y-5">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 border-b pb-2 flex items-center gap-2">
                    <Settings size={16} className="text-blue-600" />
                    Pilih &amp; Olah Data Warga
                  </h3>

                  {/* Dropdown Resident Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Pilih Unit Hunian Warga</label>
                    <select
                      value={selectedResidentKtp}
                      onChange={(e) => {
                        setSelectedResidentKtp(e.target.value);
                        setInputAprilMeter('');
                        setInputMayMeter('');
                        setBillingError('');
                        setBillingSuccess('');
                      }}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Pilih Unit --</option>
                      {residents.map((r) => (
                        <option key={r.id} value={r.ktp}>
                          [{r.unit}] - {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!activeRes ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Search size={32} className="mx-auto opacity-40 text-slate-500" />
                      <p className="text-xs font-bold">Belum ada warga terpilih.</p>
                      <p className="text-[10px]">Silakan pilih salah satu unit warga di atas untuk mulai mencatat atau melakukan koreksi data.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Resident Info Card */}
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Unit Hunian</span>
                          <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 -mt-0.5">
                            {activeRes.unit}
                          </div>
                          <span className="text-xs font-extrabold text-slate-700 block mt-0.5">{activeRes.name}</span>
                          <span className="text-[9px] font-mono text-slate-400 block mt-0.5">KTP: {activeRes.ktp}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Meteran Bulan Lalu</span>
                          <span className="text-lg font-mono font-black text-slate-750 block -mt-0.5">
                            {prevMeterVal} <span className="text-xs">m³</span>
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 block bg-slate-100 px-1.5 py-0.5 rounded-md mt-1 border border-slate-200">
                            Terakhir: April 2026
                          </span>
                        </div>
                      </div>

                      {/* PART A: KOREKSI DATA APRIL (BULAN LALU) */}
                      <form onSubmit={handleSaveAprilMeter} className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                          <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                            <Edit2 size={13} />
                            Koreksi Meteran April (Bulan Lalu)
                          </h4>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">
                            April 2026
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 leading-tight">
                          Gunakan kolom ini untuk mengedit angka meteran akhir April jika terjadi kesalahan koordinator di lapangan. Sistem akan mengalirkan nilai perbaikan ini sebagai angka dasar pencatatan Mei.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder={`Koreksi April (Semula ${prevMeterVal} m³)`}
                            value={inputAprilMeter}
                            onChange={(e) => setInputAprilMeter(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition cursor-pointer select-none active:scale-[0.97]"
                          >
                            Koreksi
                          </button>
                        </div>
                      </form>

                      {/* PART B: PENCATATAN BACKUP MEI */}
                      <form onSubmit={handleSaveMayMeter} className="p-4 bg-blue-50/20 border border-blue-100 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                          <h4 className="text-xs font-black text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                            <Plus size={13} />
                            Catat Meteran Mei (Backup)
                          </h4>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">
                            Mei 2026
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Angka Baru Meteran Mei</label>
                          <input
                            type="number"
                            placeholder={`Minimal angka ${prevMeterVal}`}
                            value={inputMayMeter}
                            onChange={(e) => setInputMayMeter(e.target.value)}
                            className="block w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-mono font-black text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Calculations preview */}
                        {inputMayMeter !== '' && Number(inputMayMeter) >= prevMeterVal && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono font-bold space-y-1.5 text-slate-600">
                            <div className="flex justify-between">
                              <span>Kubikasi Air Terpakai:</span>
                              <span className="text-slate-900">{usage} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tarif Air PDAM:</span>
                              <span className="text-slate-900">Rp {pdamBill.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Iuran Sampah:</span>
                              <span className="text-slate-900">Rp {trashBill.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1.5 text-xs text-blue-800 font-extrabold">
                              <span>ESTIMASI TOTAL:</span>
                              <span>Rp {totalBill.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/10 cursor-pointer active:scale-[0.98]"
                        >
                          Catat &amp; Simpan Mei
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* COLUMN RIGHT: BILLING DIRECTORY & PAID ACTION (7/12) */}
                <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-100 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-2">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      Daftar Tagihan &amp; Pembayaran Warga
                    </h3>
                    <div className="relative w-full sm:w-48">
                      <input
                        type="text"
                        placeholder="Cari Unit / Nama..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                      />
                      <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-thin max-h-[500px]">
                    <table className="w-full text-left text-xs divide-y divide-slate-100 table-auto">
                      <thead>
                        <tr className="text-[10px] uppercase font-extrabold text-slate-450 tracking-wider font-mono">
                          <th className="py-2.5 px-2">Unit</th>
                          <th className="py-2.5 px-2">Nama</th>
                          <th className="py-2.5 px-2 text-right">Lalu (Apr)</th>
                          <th className="py-2.5 px-2 text-right">Baru (Mei)</th>
                          <th className="py-2.5 px-2 text-right">Tagihan</th>
                          <th className="py-2.5 px-2 text-center">Status</th>
                          <th className="py-2.5 px-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-750">
                        {sortedResList.map((res) => {
                          const isVacant = res.isVacant || res.occupancyStatus === 'Kosong' || res.occupancyStatus === 'kosong' || res.name === 'Kamar Kosong' || res.name.toLowerCase().includes('kamar kosong');
                          const rawMeiRec = billingRecords.find(b => b.residentKtp === res.ktp && b.month === 'Mei' && b.year === 2026);
                          const meiRec = rawMeiRec ? (isVacant ? { ...rawMeiRec, pdamBill: 0, trashBill: 0, totalBill: 0 } : rawMeiRec) : null;
                          const rawAprRec = billingRecords.find(b => b.residentKtp === res.ktp && b.month === 'April' && b.year === 2026);
                          const aprRec = rawAprRec ? (isVacant ? { ...rawAprRec, pdamBill: 0, trashBill: 0, totalBill: 0 } : rawAprRec) : null;
                          
                          const lastMeterVal = meiRec 
                            ? meiRec.prevMeter 
                            : (aprRec 
                                ? aprRec.currentMeter 
                                : (res.initialMeter !== undefined && res.initialMeter !== null ? Number(res.initialMeter) : 100)
                              );

                          return (
                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-2 font-mono font-black text-slate-900">{res.unit}</td>
                              <td className="py-3 px-2 max-w-[120px] truncate text-[11px] font-semibold text-slate-800" title={res.name}>
                                {res.name}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-500">{lastMeterVal} m³</td>
                              <td className="py-3 px-2 text-right font-mono text-slate-900">
                                {meiRec ? `${meiRec.currentMeter} m³` : '-'}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-950 font-black">
                                {meiRec ? `Rp ${meiRec.totalBill.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {!meiRec ? (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-extrabold uppercase rounded font-mono">
                                    Belum Catat
                                  </span>
                                ) : meiRec.status === 'Lunas' ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-extrabold uppercase rounded font-mono border border-emerald-100">
                                    Lunas
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold uppercase rounded font-mono border border-amber-100">
                                    Belum Bayar
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {meiRec && meiRec.status !== 'Lunas' && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Konfirmasi pembayaran air & sampah Unit ${res.unit} sebesar Rp ${meiRec.totalBill.toLocaleString('id-ID')} secara TUNAI?`)) {
                                        onPayBill(meiRec.id, meiRec.totalBill);
                                        setBillingSuccess(`Pelunasan iuran Unit ${res.unit} berhasil diverifikasi!`);
                                        setTimeout(() => setBillingSuccess(''), 4000);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer select-none active:scale-[0.97]"
                                  >
                                    Lunas ✓
                                  </button>
                                )}
                                {(!meiRec || meiRec.status === 'Lunas') && (
                                  <span className="text-[10px] text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* PDAM ALL BILLING MANAGEMENT (MENU BARU) */}
        {/* ======================================================== */}
        {activeTab === 'pdam-all' && (
          <div className="lg:col-span-3 space-y-6 animate-fade-in text-slate-900 w-full">
            {/* Header Info */}
            <div className="bg-gradient-to-r from-teal-900 to-emerald-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[10px] font-black uppercase rounded-full">
                    KONTROL UTAMA METER AIR SELURUH BULAN
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight font-sans">KONTROL TAGIHAN &amp; METER AIR GLOBAL</h2>
                <p className="text-xs text-slate-300 max-w-2xl font-medium">
                  Akses langsung dan terpusat untuk memperbarui tagihan PDAM seluruh lantai, mengedit/koreksi kesalahan angka meteran dari koordinator untuk seluruh bulan (Januari-Desember), serta menambah/menghapus tagihan iuran.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddBillResidentKtp(residents[0]?.ktp || '');
                  setAddBillPrevMeter(0);
                  setAddBillCurrentMeter(0);
                  setAddBillMonth('Mei');
                  setAddBillYear(2026);
                  setAddBillStatus('Belum Lunas');
                  setAddBillTrashBill(appSettings.trashBillCost);
                  setAddBillSearch('');
                  setShowAddBillModal(true);
                }}
                className="px-4 py-2.5 bg-white text-teal-900 hover:bg-teal-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus size={14} />
                Tambah Tagihan Baru
              </button>
            </div>

            {/* Filters Row */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
              <div className="col-span-2 relative">
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1">Cari Warga/Unit</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama, unit, KTP..."
                    value={pdamAllSearchQuery}
                    onChange={(e) => setPdamAllSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <Search size={12} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1">Lantai</label>
                <select
                  value={pdamAllFloorFilter}
                  onChange={(e) => setPdamAllFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">Semua</option>
                  <option value="1">Lantai 1</option>
                  <option value="2">Lantai 2</option>
                  <option value="3">Lantai 3</option>
                  <option value="4">Lantai 4</option>
                  <option value="5">Lantai 5</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1">Blok</label>
                <select
                  value={pdamAllBlockFilter}
                  onChange={(e) => setPdamAllBlockFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">Semua</option>
                  <option value="Blok A">Blok A</option>
                  <option value="Blok B">Blok B</option>
                  <option value="Blok C">Blok C</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1">Bulan</label>
                <select
                  value={pdamAllMonthFilter}
                  onChange={(e) => setPdamAllMonthFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">Semua</option>
                  <option value="Januari">Januari</option>
                  <option value="Februari">Februari</option>
                  <option value="Maret">Maret</option>
                  <option value="April">April</option>
                  <option value="Mei">Mei</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 mb-1">Status</label>
                <select
                  value={pdamAllStatusFilter}
                  onChange={(e) => setPdamAllStatusFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">Semua</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-slate-900">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Daftar Tagihan Iuran Air &amp; Sampah Global</h3>
                <span className="text-[10px] text-slate-405 font-bold font-mono">TOTAL REKAMAN: {billingRecords.length}</span>
              </div>

              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full text-left text-xs divide-y divide-slate-150 border-collapse">
                  <thead className="bg-slate-50 font-mono text-[10px] font-extrabold uppercase text-slate-450 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Unit / Warga</th>
                      <th className="py-3 px-2">Periode</th>
                      <th className="py-3 px-2 text-right">Lalu</th>
                      <th className="py-3 px-2 text-right">Baru</th>
                      <th className="py-3 px-2 text-right">Pakai</th>
                      <th className="py-3 px-2 text-right">Air PDAM</th>
                      <th className="py-3 px-2 text-right">Sampah</th>
                      <th className="py-3 px-2 text-right">Total</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                    {(() => {
                      const filtered = billingRecords.filter((b) => {
                        const resident = residents.find(r => r.ktp === b.residentKtp);
                        if (!resident) return false;

                        const query = pdamAllSearchQuery.toLowerCase();
                        const matchesSearch = 
                          resident.name.toLowerCase().includes(query) ||
                          resident.unit.toLowerCase().includes(query) ||
                          resident.ktp.includes(query);
                        if (!matchesSearch) return false;

                        const floor = resident.floor || getFloorFromUnit(resident.unit);
                        if (pdamAllFloorFilter !== 'all' && floor !== Number(pdamAllFloorFilter)) return false;

                        if (pdamAllBlockFilter !== 'all' && resident.block !== pdamAllBlockFilter) return false;

                        if (pdamAllMonthFilter !== 'all' && b.month !== pdamAllMonthFilter) return false;

                        if (pdamAllStatusFilter !== 'all' && b.status !== pdamAllStatusFilter) return false;

                        return true;
                      }).sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year;
                        const monthsMap: Record<string, number> = { 'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5 };
                        const monthA = monthsMap[a.month] || 0;
                        const monthB = monthsMap[b.month] || 0;
                        if (monthA !== monthB) return monthB - monthA;
                        
                        const resA = residents.find(r => r.ktp === a.residentKtp);
                        const resB = residents.find(r => r.ktp === b.residentKtp);
                        return (resA?.unit || '').localeCompare(resB?.unit || '', undefined, { numeric: true });
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                              Tidak ada tagihan yang cocok dengan filter pencarian.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((b) => {
                        const resident = residents.find(r => r.ktp === b.residentKtp);
                        const isVacant = resident?.isVacant || resident?.occupancyStatus === 'Kosong' || resident?.name?.toLowerCase()?.includes('kamar kosong');
                        
                        const finalPdam = isVacant ? 0 : b.pdamBill;
                        const finalTrash = isVacant ? 0 : b.trashBill;
                        const finalTotal = isVacant ? 0 : b.totalBill;
                        const finalUsage = isVacant ? 0 : b.usage;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 font-mono">{resident?.unit}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-semibold">{resident?.name}</div>
                            </td>
                            <td className="py-3 px-2 font-bold text-slate-800 text-[11px]">
                              {b.month} {b.year}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-slate-500">{b.prevMeter} m³</td>
                            <td className="py-3 px-2 text-right font-mono text-slate-900">{b.currentMeter} m³</td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-teal-700 bg-teal-50/20">{finalUsage} m³</td>
                            <td className="py-3 px-2 text-right font-mono">{formatRupiah(finalPdam)}</td>
                            <td className="py-3 px-2 text-right font-mono">{formatRupiah(finalTrash)}</td>
                            <td className="py-3 px-2 text-right font-mono font-black text-slate-900">{formatRupiah(finalTotal)}</td>
                            <td className="py-3 px-2 text-center">
                              {b.status === 'Lunas' ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold uppercase font-mono">Lunas</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-bold uppercase font-mono animate-pulse">Belum Bayar</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBill(b);
                                    setEditBillPrevMeter(b.prevMeter);
                                    setEditBillCurrentMeter(b.currentMeter);
                                    setEditBillMonth(b.month);
                                    setEditBillYear(b.year);
                                    setEditBillStatus(b.status);
                                    setEditBillPaymentDate(b.paymentDate || '');
                                    setEditBillTrashBill(b.trashBill);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="Edit Rekaman Iuran"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Apakah Anda yakin ingin menghapus tagihan ${b.month} ${b.year} untuk Unit ${resident?.unit}?`)) {
                                      if (onDeleteBillingRecord) onDeleteBillingRecord(b.id);
                                    }
                                  }}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="Hapus Rekaman Iuran"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL: EDIT BILLING RECORD */}
            {editingBill && (() => {
              const res = residents.find(r => r.ktp === editingBill.residentKtp);
              const isVacant = res?.isVacant || res?.occupancyStatus === 'Kosong' || res?.name?.toLowerCase()?.includes('kamar kosong');
              const finalUsage = isVacant ? 0 : Math.max(0, editBillCurrentMeter - editBillPrevMeter);
              const finalPdam = isVacant ? 0 : calculatePdamBill(finalUsage, appSettings);
              const finalTotal = finalPdam + editBillTrashBill;

              return (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative space-y-5 animate-fade-in text-slate-800">
                    <div>
                      <span className="text-[10px] text-teal-600 font-extrabold uppercase tracking-widest font-mono">Pusat Koreksi Data</span>
                      <h3 className="text-lg font-black text-slate-950">Edit Rekaman Iuran</h3>
                      <p className="text-xs text-slate-450 font-mono mt-0.5">UNIT: {res?.unit} • {res?.name}</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (onEditBillingRecord) {
                          onEditBillingRecord(editingBill.id, {
                            prevMeter: editBillPrevMeter,
                            currentMeter: editBillCurrentMeter,
                            month: editBillMonth,
                            year: editBillYear,
                            status: editBillStatus,
                            trashBill: editBillTrashBill,
                            pdamBill: finalPdam,
                            totalBill: finalTotal,
                            usage: finalUsage,
                            paymentDate: editBillStatus === 'Lunas' ? (editBillPaymentDate || new Date().toISOString()) : undefined
                          });
                        }
                        setEditingBill(null);
                      }}
                      className="space-y-4 text-xs font-semibold text-slate-700"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Bulan Periode</label>
                          <select
                            value={editBillMonth}
                            onChange={(e) => setEditBillMonth(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                          >
                            <option value="Januari">Januari</option>
                            <option value="Februari">Februari</option>
                            <option value="Maret">Maret</option>
                            <option value="April">April</option>
                            <option value="Mei">Mei</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Tahun Periode</label>
                          <input
                            type="number"
                            value={editBillYear}
                            onChange={(e) => setEditBillYear(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Meteran Lalu (m³)</label>
                          <input
                            type="number"
                            value={editBillPrevMeter}
                            onChange={(e) => setEditBillPrevMeter(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Meteran Baru (m³)</label>
                          <input
                            type="number"
                            value={editBillCurrentMeter}
                            onChange={(e) => setEditBillCurrentMeter(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Iuran Sampah (Rp)</label>
                        <input
                          type="number"
                          value={editBillTrashBill}
                          onChange={(e) => setEditBillTrashBill(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Status Pembayaran</label>
                          <select
                            value={editBillStatus}
                            onChange={(e) => setEditBillStatus(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                          >
                            <option value="Belum Lunas">Belum Bayar</option>
                            <option value="Lunas">Lunas</option>
                          </select>
                        </div>
                        {editBillStatus === 'Lunas' && (
                          <div>
                            <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Tanggal Bayar</label>
                            <input
                              type="text"
                              placeholder="yyyy-mm-dd"
                              value={editBillPaymentDate ? editBillPaymentDate.substring(0, 10) : ''}
                              onChange={(e) => setEditBillPaymentDate(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* Calculations Preview */}
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl font-mono text-[10px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Volume Terpakai:</span>
                          <span className="font-bold text-slate-900">{finalUsage} m³</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimasi PDAM:</span>
                          <span className="font-bold text-slate-900">{formatRupiah(finalPdam)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-xs text-teal-800 font-extrabold">
                          <span>TOTAL TAGIHAN:</span>
                          <span>{formatRupiah(finalTotal)}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingBill(null)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center cursor-pointer transition"
                        >
                          Batalkan
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-center cursor-pointer shadow-md shadow-teal-705 transition animate-fade-in"
                        >
                          Simpan Pembaruan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}

            {/* MODAL: ADD BILLING RECORD */}
            {showAddBillModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative space-y-5 animate-fade-in text-slate-800">
                  <div>
                    <span className="text-[10px] text-teal-605 font-extrabold uppercase tracking-widest font-mono">Pencatatan Baru</span>
                    <h3 className="text-lg font-black text-slate-955">Tambah Rekaman Iuran Baru</h3>
                    <p className="text-xs text-slate-450 font-mono mt-0.5">Input data pemakaian air &amp; sampah warga rusunawa secara manual.</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const targetRes = residents.find(r => r.ktp === addBillResidentKtp);
                      if (!targetRes) {
                        alert('Silakan pilih warga terlebih dahulu.');
                        return;
                      }

                      const isVacant = targetRes.isVacant || targetRes.occupancyStatus === 'Kosong' || targetRes.name.toLowerCase().includes('kamar kosong');
                      const finalUsage = isVacant ? 0 : Math.max(0, addBillCurrentMeter - addBillPrevMeter);
                      const finalPdam = isVacant ? 0 : calculatePdamBill(finalUsage, appSettings);
                      const finalTotal = finalPdam + addBillTrashBill;

                      if (onAddBillingRecord) {
                        onAddBillingRecord({
                          residentKtp: addBillResidentKtp,
                          prevMeter: addBillPrevMeter,
                          currentMeter: addBillCurrentMeter,
                          month: addBillMonth,
                          year: addBillYear,
                          status: addBillStatus,
                          trashBill: addBillTrashBill,
                          pdamBill: finalPdam,
                          totalBill: finalTotal,
                          usage: finalUsage,
                          paymentDate: addBillStatus === 'Lunas' ? new Date().toISOString() : undefined
                        });
                      }
                      setShowAddBillModal(false);
                    }}
                    className="space-y-4 text-xs font-semibold text-slate-700"
                  >
                    <div>
                      <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Pilih Warga / Unit</label>
                      <input
                        type="text"
                        placeholder="Cari unit (misal: C-404) atau nama..."
                        value={addBillSearch}
                        onChange={(e) => setAddBillSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none mb-2"
                      />
                      {(() => {
                        const filtered = residents.filter(r => {
                          const q = addBillSearch.toLowerCase().trim();
                          if (!q) return true;
                          return r.unit.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.ktp.includes(q);
                        });
                        return (
                          <select
                            value={addBillResidentKtp}
                            onChange={(e) => {
                              const ktp = e.target.value;
                              setAddBillResidentKtp(ktp);
                              const latestRec = billingRecords.filter(b => b.residentKtp === ktp).sort((a, b) => b.year - a.year)[0];
                              setAddBillPrevMeter(latestRec ? latestRec.currentMeter : 0);
                              setAddBillCurrentMeter(latestRec ? latestRec.currentMeter : 0);
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                          >
                            <option value="">-- Pilih Unit Warga ({filtered.length} ditemukan) --</option>
                            {filtered.map((r) => (
                              <option key={r.id} value={r.ktp}>
                                [{r.unit}] - {r.name}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Bulan Periode</label>
                        <select
                          value={addBillMonth}
                          onChange={(e) => setAddBillMonth(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                        >
                          <option value="Januari">Januari</option>
                          <option value="Februari">Februari</option>
                          <option value="Maret">Maret</option>
                          <option value="April">April</option>
                          <option value="Mei">Mei</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Tahun Periode</label>
                        <input
                          type="number"
                          value={addBillYear}
                          onChange={(e) => setAddBillYear(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Meteran Lalu (m³)</label>
                        <input
                          type="number"
                          value={addBillPrevMeter}
                          onChange={(e) => setAddBillPrevMeter(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Meteran Baru (m³)</label>
                        <input
                          type="number"
                          value={addBillCurrentMeter}
                          onChange={(e) => setAddBillCurrentMeter(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Iuran Sampah (Rp)</label>
                        <input
                          type="number"
                          value={addBillTrashBill}
                          onChange={(e) => setAddBillTrashBill(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-bold text-[10px] uppercase font-mono text-slate-400">Status Awal</label>
                        <select
                          value={addBillStatus}
                          onChange={(e) => setAddBillStatus(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                        >
                          <option value="Belum Lunas">Belum Bayar</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBillModal(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center cursor-pointer transition"
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-teal-650 hover:bg-teal-700 text-white font-bold rounded-xl text-center cursor-pointer shadow-md shadow-teal-705 transition"
                      >
                        Catat Tagihan Warga
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* APP CONFIGURATION & SETTINGS TAB VIEW */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="lg:col-span-3 space-y-6 animate-fade-in">
            {/* Header info card */}
            <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                  ⚙️ Pusat Kontrol Sistem
                </div>
                <h2 className="text-lg font-black tracking-tight">{appSettings.appTitle} SETTINGS</h2>
                <p className="text-xs text-indigo-100 font-semibold leading-relaxed">
                  Sesuaikan teks tampilan, rumus tarif iuran air PDAM, iuran sampah tetap, instruksi pembayaran bagi warga, serta setelan operasional di sini.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {settingsSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl flex items-center gap-3 animate-bounce">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-extrabold">{settingsSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Branding Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-lg">🎨</span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Identitas &amp; Visual Aplikasi</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Ubah teks logo &amp; tema warna</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Nama / Judul Aplikasi</label>
                      <input
                        type="text"
                        value={formAppTitle}
                        onChange={(e) => setFormAppTitle(e.target.value.toUpperCase())}
                        placeholder="E.g. RUSUN GUNUNGSARI"
                        className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                        required
                      />
                      <p className="text-[9px] text-slate-405 mt-1">Digunakan pada tajuk header, label barcode kustom, dan footer universal.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Slogan / Sub-header Banner</label>
                      <textarea
                        value={formAdminSlogan}
                        onChange={(e) => setFormAdminSlogan(e.target.value)}
                        placeholder="Deskripsi singkat layanan rusun..."
                        rows={2}
                        className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Aksen Warna Tema Utama</label>
                      <select
                        value={formAppPrimaryColor}
                        onChange={(e) => setFormAppPrimaryColor(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="purple">🔮 Royal Purple (Default)</option>
                        <option value="indigo">💠 Deep Indigo</option>
                        <option value="cyan">⚡ Electric Cyan</option>
                        <option value="emerald">💚 Emerald Active</option>
                        <option value="slate">🖤 Minimalist Charcoal Slate</option>
                      </select>
                      <p className="text-[9px] text-slate-405 mt-1">Menentukan warna sorotan sidebar utama, aksen tombol, dan pembatas navigasi.</p>
                    </div>
                  </div>
                </div>

                {/* Tariff System Pricing Cards */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-lg">🪙</span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Rumus Tarif PDAM &amp; Iuran Sampah</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Tentukan batas harga iuran air</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Batas Minimal Air (m³)</label>
                        <input
                          type="number"
                          value={formPdamMinUsage}
                          onChange={(e) => setFormPdamMinUsage(Number(e.target.value))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none bg-white"
                          min={0}
                          required
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Default: 10 m³</p>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Biaya Minimal (Rp)</label>
                        <input
                          type="number"
                          value={formPdamMinPrice}
                          onChange={(e) => setFormPdamMinPrice(Number(e.target.value))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none bg-white"
                          min={0}
                          required
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Default: Rp 25.000</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Tarif Kelebihan / m³ (Rp)</label>
                        <input
                          type="number"
                          value={formPdamCostPerCubic}
                          onChange={(e) => setFormPdamCostPerCubic(Number(e.target.value))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none bg-white"
                          min={0}
                          required
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Default: Rp 2.500</p>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Iuran Sampah Tetap (Rp)</label>
                        <input
                          type="number"
                          value={formTrashBillCost}
                          onChange={(e) => setFormTrashBillCost(Number(e.target.value))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none bg-white"
                          min={0}
                          required
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Default: Rp 10.000 / bln</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-slate-700 uppercase font-mono tracking-wider">Simulasi Rumus saat ini:</p>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Jika warga memakai <strong className="text-slate-850">15 m³</strong> air, maka air dihitung: <br />
                        Batas Minimal ({formPdamMinUsage} m³) = <strong className="text-slate-850">Rp {formPdamMinPrice.toLocaleString('id-ID')}</strong> <br />
                        Kelebihan (5 m³ &times; Rp {formPdamCostPerCubic.toLocaleString('id-ID')}) = <strong className="text-slate-850">Rp {(5 * formPdamCostPerCubic).toLocaleString('id-ID')}</strong> <br />
                        Total PDAM = <strong className="text-indigo-600 font-bold">Rp {(formPdamMinPrice + 5 * formPdamCostPerCubic).toLocaleString('id-ID')}</strong> + Iuran Sampah Flet (<strong className="text-slate-850">Rp {formTrashBillCost.toLocaleString('id-ID')}</strong>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions and Bank guide */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-lg">📢</span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Panduan Instruksi Pembayaran Warga</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Informasi Pembayaran yang ditampilkan pada Dashboard warga</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 font-mono mb-1">Teks Instruksi Pembayaran Mandiri</label>
                    <textarea
                      value={formPaymentInstructions}
                      onChange={(e) => setFormPaymentInstructions(e.target.value)}
                      placeholder="Masukkan panduan transfer bank atau setoran bendahara/koordinator rusun..."
                      rows={3}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                      required
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Teks ini akan dimuat secara penuh dan interaktif di lembar tagihan Warga, memudahkan warga dalam menyelesaikan iuran wajib.</p>
                  </div>
                </div>

                {/* System Maintenance Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Kontrol Pemeliharaan &amp; Proteksi Sistem (Maintenance)</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Kunci modifikasi data meteran dari petugas koordinator</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">Pasang Mode Pemeliharaan Rusun</p>
                      <p className="text-[10.5px] text-slate-400 leading-normal">
                        Saat diaktifkan, petugas Koordinator di lapangan dilarang/tidak bisa sementara waktu menyimpan atau mengubah data angka meteran meter air baru (Lock Inputs).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormIsMaintenanceMode(!formIsMaintenanceMode)}
                      className={`px-4 py-2 text-xxs font-mono font-black uppercase rounded-xl border flex items-center gap-1.5 transition cursor-pointer select-none ${
                        formIsMaintenanceMode 
                          ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${formIsMaintenanceMode ? 'bg-rose-600 animate-ping' : 'bg-emerald-500'}`} />
                      {formIsMaintenanceMode ? 'Maintenance AKTIF (TERKUNCI)' : 'Normal (TERBUKA)'}
                    </button>
                  </div>
                </div>

                {/* Citizens Link Portal Splitter Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <span className="text-lg">🔗</span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Pemisahan Portal Warga (Bebas Navigasi Admin / Petugas)</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Bagikan tautan bersih bebas tab Koordinator, Security, dan Admin untuk Warga</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60 text-slate-700 space-y-3.5">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">Salin Link Khusus Warga</p>
                      <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                        Ketika warga membuka aplikasi menggunakan tautan ini, menu tab pergantian peran login (Koordinator, Security, Admin) dan akses cepat demo untuk peran tersebut akan <strong className="text-slate-900 font-bold">disembunyikan secara otomatis &amp; permanen</strong> dari perangkat warga demi kerapian dan kenyamanan.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10.5px] font-mono text-slate-600 block flex-1 break-all select-all font-semibold">
                        {typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?role=warga` : '...'}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyWargaLink}
                        className={`px-4 py-2.5 rounded-xl text-xxs font-mono font-black uppercase text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                          copiedLink 
                            ? 'bg-emerald-600 shadow-sm shadow-emerald-200 hover:bg-emerald-700 animate-pulse'
                            : 'bg-indigo-600 shadow-sm shadow-indigo-200 hover:bg-indigo-700'
                        }`}
                      >
                        {copiedLink ? '✓ BERHASIL DISALIN' : '📋 SALIN LINK TAUTAN'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Universal Submission Controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setFormAppTitle(appSettings.appTitle);
                    setFormAdminSlogan(appSettings.adminSlogan);
                    setFormPdamMinUsage(appSettings.pdamMinUsage);
                    setFormPdamMinPrice(appSettings.pdamMinPrice);
                    setFormPdamCostPerCubic(appSettings.pdamCostPerCubic);
                    setFormTrashBillCost(appSettings.trashBillCost);
                    setFormAppPrimaryColor(appSettings.appPrimaryColor);
                    setFormPaymentInstructions(appSettings.paymentInstructions);
                    setFormIsMaintenanceMode(appSettings.isMaintenanceMode);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-extrabold tracking-wide uppercase transition duration-200 cursor-pointer"
                >
                  Reset Setelan
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black tracking-wide uppercase transition duration-200 shadow-md shadow-purple-500/10 cursor-pointer"
                >
                  Simpan Semua Pengaturan Universal ✓
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* 5. MODAL EDIT DETAIL WARGA */}
      {editingResident && (
        <div id="edit_resident_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative space-y-5 animate-fade-in text-slate-900">
            <div>
              <span className="text-[10px] text-purple-650 font-extrabold uppercase tracking-widest font-mono">Simper Admin</span>
              <h3 className="text-lg font-black text-slate-950">Edit Detail Warga</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">PERUBAHAN PERSONAL KODE DATA PENGHUNI</p>
            </div>

            <form onSubmit={handleSaveEditResident} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Nama Lengkap Kepala Keluarga</label>
                <input
                  type="text"
                  value={editResName}
                  onChange={(e) => setEditResName(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Nomor KTP (Login)</label>
                <input
                  type="text"
                  value={editResKtp}
                  onChange={(e) => setEditResKtp(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Urutan Lantai</label>
                  <select
                    value={editResFloor}
                    onChange={(e) => setEditResFloor(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={1}>Lantai 1</option>
                    <option value={2}>Lantai 2</option>
                    <option value={3}>Lantai 3</option>
                    <option value={4}>Lantai 4</option>
                    <option value={5}>Lantai 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">No. Kamar</label>
                  <input
                    type="text"
                    value={editResUnit}
                    onChange={(e) => setEditResUnit(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Blok</label>
                  <select
                    value={editResBlock}
                    onChange={(e) => setEditResBlock(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Blok A">Blok A</option>
                    <option value="Blok B">Blok B</option>
                    <option value="Blok C">Blok C</option>
                    <option value="Blok D">Blok D</option>
                    <option value="Blok E">Blok E</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">No Handphone</label>
                  <input
                    type="text"
                    value={editResPhone}
                    onChange={(e) => setEditResPhone(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Status Hunian</label>
                <select
                  value={editResOccupancy}
                  onChange={(e) => setEditResOccupancy(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Dihuni">Dihuni (Aktif)</option>
                  <option value="Kosong">Kosong (Tidak Dihuni)</option>
                </select>
              </div>

              {/* Seksi Edit Data Verifikasi Warga */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[10px] text-purple-650 font-extrabold uppercase tracking-widest font-mono block">Data Verifikasi Warga (Pusat)</span>
                
                {/* Family Members list */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono">Anggota Keluarga Tinggal</label>
                    <button
                      type="button"
                      onClick={() => setEditFamilyMembers(prev => [...prev, { name: '', age: '', gender: 'Laki-laki', occupation: '' }])}
                      className="text-[9px] bg-purple-50 text-purple-750 font-extrabold px-2 py-1 rounded-lg border border-purple-200/50 hover:bg-purple-100 transition cursor-pointer"
                    >
                      + Tambah Jiwa
                    </button>
                  </div>
                  
                  {editFamilyMembers.length === 0 ? (
                    <p className="text-[10px] text-slate-450 italic bg-slate-50 p-2 rounded-xl text-center border border-slate-100">Tinggal Sendiri / Belum Diisi</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {editFamilyMembers.map((fm, idx) => (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 relative space-y-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditFamilyMembers(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1.5 right-1.5 text-[9px] text-rose-500 font-bold hover:bg-rose-50 p-1 rounded"
                          >
                            Hapus
                          </button>
                          <div className="grid grid-cols-2 gap-2 pr-8">
                            <input
                              type="text"
                              placeholder="Nama"
                              value={fm.name}
                              onChange={(e) => {
                                const updated = [...editFamilyMembers];
                                updated[idx].name = e.target.value;
                                setEditFamilyMembers(updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white text-slate-900"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Umur"
                              value={fm.age}
                              onChange={(e) => {
                                const updated = [...editFamilyMembers];
                                updated[idx].age = e.target.value;
                                setEditFamilyMembers(updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white text-slate-900"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={fm.gender}
                              onChange={(e) => {
                                const updated = [...editFamilyMembers];
                                updated[idx].gender = e.target.value as any;
                                setEditFamilyMembers(updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white text-slate-900"
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Pekerjaan"
                              value={fm.occupation}
                              onChange={(e) => {
                                const updated = [...editFamilyMembers];
                                updated[idx].occupation = e.target.value;
                                setEditFamilyMembers(updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white text-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicles list */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase text-slate-400 font-mono">Kepemilikan Kendaraan</label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditVehicles(prev => [...prev, { type: '', plate: '' }]);
                        setEditHasNoVehicle(false);
                      }}
                      className="text-[9px] bg-purple-50 text-purple-750 font-extrabold px-2 py-1 rounded-lg border border-purple-200/50 hover:bg-purple-100 transition cursor-pointer"
                    >
                      + Tambah Unit
                    </button>
                  </div>

                  <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasNoVehicle}
                      onChange={(e) => {
                        setEditHasNoVehicle(e.target.checked);
                        if (e.target.checked) setEditVehicles([]);
                      }}
                      className="rounded text-purple-650 focus:ring-purple-500"
                    />
                    <span className="text-[10px] font-semibold text-slate-650">Tidak memiliki kendaraan bermotor di Rusunawa</span>
                  </label>
                  
                  {!editHasNoVehicle && (
                    editVehicles.length === 0 ? (
                      <p className="text-[10px] text-slate-450 italic bg-slate-50 p-2 rounded-xl text-center border border-slate-100">Belum Ada Kendaraan</p>
                    ) : (
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {editVehicles.map((vh, idx) => (
                          <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 relative flex gap-2 items-center text-xs pr-8">
                            <input
                              type="text"
                              placeholder="Jenis (ex: NMAX)"
                              value={vh.type}
                              onChange={(e) => {
                                const updated = [...editVehicles];
                                updated[idx].type = e.target.value;
                                setEditVehicles(updated);
                              }}
                              className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white text-slate-900"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Nopol (ex: L 1234 XY)"
                              value={vh.plate}
                              onChange={(e) => {
                                const updated = [...editVehicles];
                                updated[idx].plate = e.target.value;
                                setEditVehicles(updated);
                              }}
                              className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xxs bg-white font-mono uppercase text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editVehicles.filter((_, i) => i !== idx);
                                setEditVehicles(updated);
                                if (updated.length === 0) setEditHasNoVehicle(true);
                              }}
                              className="absolute right-1 text-[9px] text-rose-500 font-bold hover:bg-rose-50 p-1 rounded"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingResident(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-md shadow-purple-500/10"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL EDIT DETAIL KOORDINATOR */}
      {editingCoordinator && (
        <div id="edit_coordinator_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative space-y-5 animate-fade-in text-slate-900">
            <div>
              <span className="text-[10px] text-purple-650 font-extrabold uppercase tracking-widest font-mono">Simper Admin</span>
              <h3 className="text-lg font-black text-slate-950">Edit Detail Petugas (Koordinator / Security)</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">PERUBAHAN DATA RESMI STAF PETUGAS RUSUNAWA</p>
            </div>

            <form onSubmit={handleSaveEditCoordinator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Nama Lengkap Petugas</label>
                <input
                  type="text"
                  value={editCoordName}
                  onChange={(e) => setEditCoordName(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">NIK / KTP Akses (Login)</label>
                <input
                  type="text"
                  value={editCoordKtp}
                  onChange={(e) => setEditCoordKtp(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Penugasan / Jabatan</label>
                <select
                  value={editCoordFloor}
                  onChange={(e) => setEditCoordFloor(parseInt(e.target.value, 10))}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value={0}>Petugas Keamanan (Security)</option>
                  <option value={1}>Koordinator Lantai 1</option>
                  <option value={2}>Koordinator Lantai 2</option>
                  <option value={3}>Koordinator Lantai 3</option>
                  <option value={4}>Koordinator Lantai 4</option>
                  <option value={5}>Koordinator Lantai 5</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCoordinator(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-md shadow-purple-500/10"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECONCILIATION VERIFICATION MODAL */}
      {/* ======================================================== */}
      {reconcileFloor !== null && (() => {
        const floorNum = reconcileFloor;
        const coord = coordinators.find(c => (c.assignedFloor || (c.id === 'coord-1' ? 1 : c.id === 'coord-2' ? 2 : c.id === 'coord-3' ? 3 : c.id === 'coord-4' ? 4 : c.id === 'coord-5' ? 5 : 1)) === floorNum) || { name: 'Koordinator', id: '' };
        const floorRes = residents.filter(r => (r.floor || getFloorFromUnit(r.unit)) === floorNum);
        
        // Target bills that are currently ready to be verified (status 'Terbayar di Koordinator')
        const floorMeiCollectedBills = billingRecords.filter(
          b => b.month === 'Mei' && b.year === 2026 && b.status === 'Terbayar di Koordinator' && floorRes.some(r => r.ktp === b.residentKtp)
        );
        const totalCollectedOnFloor = floorMeiCollectedBills.reduce((s, r) => s + r.totalBill, 0);

        const trashBillAmount = floorMeiCollectedBills.reduce((s, r) => s + r.trashBill, 0);
        const pdamBillAmount = floorMeiCollectedBills.reduce((s, r) => s + r.pdamBill, 0);

        const handleConfirmReconcile = () => {
          // 1. Catat kas masuk untuk Iuran Air (PDAM) jika ada
          if (pdamBillAmount > 0) {
            onAddExpense(
              pdamBillAmount, 
              `Setoran Iuran Air PDAM Lantai ${floorNum} (${coord.name}) - Mei 2026`, 
              "Iuran Air", 
              coord.name, 
              "Pemasukan"
            );
          }
          // 2. Catat kas masuk untuk Iuran Sampah jika ada
          if (trashBillAmount > 0) {
            onAddExpense(
              trashBillAmount, 
              `Setoran Iuran Sampah Lantai ${floorNum} (${coord.name}) - Mei 2026`, 
              "Iuran Sampah", 
              coord.name, 
              "Pemasukan"
            );
          }
          
          if (onReconcileFloorBills) {
            const billIds = floorMeiCollectedBills.map(b => b.id);
            onReconcileFloorBills(billIds);
          }
          
          setReconcileSuccess(`Setoran masuk sebesar Rp ${totalCollectedOnFloor.toLocaleString('id-ID')} berhasil dicatatkan dan diverifikasi!`);
          setTimeout(() => {
            setReconcileFloor(null);
          }, 1500);
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-slate-900 animate-scale-up">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-purple-600 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Verifikasi Setoran</h3>
                </div>
                <button
                  onClick={() => setReconcileFloor(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {reconcileSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="flex justify-center text-emerald-500">
                    <CheckCircle2 size={48} className="animate-bounce" />
                  </div>
                  <p className="font-extrabold text-emerald-800 uppercase tracking-wide text-xs">Setoran Berhasil Cocok ✓</p>
                  <p className="text-[10px] text-slate-550 max-w-xs mx-auto leading-relaxed">{reconcileSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4 text-slate-755">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">PETUGAS KOORDINATOR:</span>
                      <span className="text-slate-850">{coord.name}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">WILAYAH TUGAS:</span>
                      <span className="text-slate-850">Lantai {floorNum}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">STATUS BILLS MEI 2026:</span>
                      <span className="text-emerald-600">{floorMeiCollectedBills.length} Warga Lunas</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 space-y-2 font-mono text-xxs bg-slate-50/50">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Rincian Fisik Rekonsiliasi:</div>
                    <div className="flex justify-between text-slate-600">
                      <span>1. Iuran Kebersihan &amp; Sampah:</span>
                      <span className="font-bold">Rp {trashBillAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>2. Tagihan Pemakaian Air PDAM:</span>
                      <span className="font-bold">Rp {pdamBillAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <hr className="border-slate-100 my-2" />
                    <div className="flex justify-between text-xs text-slate-950 font-black">
                      <span>TOTAL FISIK KAS:</span>
                      <span className="text-purple-700">Rp {totalCollectedOnFloor.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2 text-slate-600">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] leading-normal font-semibold">
                      Apakah Anda yakin uang fisik sejumlah <strong>Rp {totalCollectedOnFloor.toLocaleString('id-ID')}</strong> telah diterima dengan benar dari koordinator Lantai {floorNum}?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setReconcileFloor(null)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] rounded-xl uppercase transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReconcile}
                      className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-xl uppercase transition-colors shadow-md shadow-purple-500/10"
                    >
                      Dana Sudah Diterima oleh Bendahara ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 8. GORGEOUS PREMIUM VACANT UNITS VERIFICATION MODAL */}
      {isVacantModalOpen && (() => {
        const vacantList = residents.filter(
          (r) => r.isVacant || r.occupancyStatus === 'Kosong' || r.occupancyStatus === 'kosong' || r.name === 'Kamar Kosong' || r.name?.toLowerCase()?.includes('kamar kosong')
        ).sort((a, b) => {
          const aFloor = a.floor || getFloorFromUnit(a.unit);
          const bFloor = b.floor || getFloorFromUnit(b.unit);
          if (aFloor !== bFloor) return aFloor - bFloor;
          return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: 'base' });
        });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
            <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold">
                    🚰
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Daftar Hunian Kosong ({vacantList.length} Kamar)</h3>
                    <p className="text-[10px] text-slate-500 font-medium leading-none">Hunian dibebaskan iuran (Rp 0) untuk keadilan tagihan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVacantModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[450px]">
                {vacantList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <p className="text-xs font-bold">Tidak ada hunian kosong.</p>
                    <p className="text-[10px]">Seluruh hunian saat ini berstatus dihuni.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-left divide-y divide-slate-150">
                      <thead>
                        <tr className="text-[10px] uppercase font-mono font-extrabold text-slate-450 tracking-wider">
                          <th className="pb-3 px-2">Lantai</th>
                          <th className="pb-3 px-2">Blok</th>
                          <th className="pb-3 px-2">Nomor Hunian</th>
                          <th className="pb-3 px-2">Nama Terdaftar</th>
                          <th className="pb-3 px-2">KTP</th>
                          <th className="pb-3 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {vacantList.map((res) => {
                          const floor = res.floor || getFloorFromUnit(res.unit);
                          return (
                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-2 font-mono">Lt {floor}</td>
                              <td className="py-2.5 px-2">{res.block}</td>
                              <td className="py-2.5 px-2 font-mono text-slate-900">{res.unit}</td>
                              <td className="py-2.5 px-2 text-slate-800 font-semibold">{res.name}</td>
                              <td className="py-2.5 px-2 font-mono text-slate-400 text-[10px]">{res.ktp}</td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[9px] uppercase border border-amber-150 font-bold">
                                  Kosong (Rp 0)
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsVacantModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl uppercase transition-colors shadow-xs cursor-pointer"
                >
                  Tutup Verifikasi
                </button>
              </div>

            </div>
          </div>
        );
      })()}


      {/* 9. GORGEOUS PREMIUM EDIT FINANCE LOG MODAL */}
      {editingFinanceLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                  📝
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Edit Catatan Buku Kas</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-none">Ubah data transaksi keuangan paguyuban</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFinanceLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Jenis Kas */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFinType('Pemasukan')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      editFinType === 'Pemasukan'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFinType('Pengeluaran')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      editFinType === 'Pengeluaran'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                </div>
              </div>

              {/* Jumlah (Rp) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Jumlah (Rp)</label>
                <input
                  type="number"
                  value={editFinAmount}
                  onChange={(e) => setEditFinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Masukkan jumlah dana..."
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Deskripsi Transaksi</label>
                <input
                  type="text"
                  value={editFinDesc}
                  onChange={(e) => setEditFinDesc(e.target.value)}
                  placeholder="eg: Pembayaran Iuran Sampah atau Perbaikan Pompa"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Kategori</label>
                <select
                  value={editFinCat}
                  onChange={(e) => setEditFinCat(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Pilih Kategori</option>
                  <option value="Iuran Air">Iuran Air</option>
                  <option value="Iuran Sampah">Iuran Sampah</option>
                  <option value="Setoran Koordinator">Setoran Koordinator</option>
                  <option value="Sumbangan Untuk Kerohanian">Sumbangan Untuk Kerohanian</option>
                  <option value="Pemeliharaan Pompa">Pemeliharaan Pompa Air</option>
                  <option value="Kebersihan/Kesehatan">Kebersihan &amp; Kerja Bakti</option>
                  <option value="Perbaikan Listrik Hub">Perbaikan Kelistrikan Umum</option>
                  <option value="Kesekretariatan">Alat Kantor / Kertas Iuran</option>
                  <option value="Perbaikan Fasilitas Umum Lainnya">Perbaikan Fasilitas Umum Lainnya</option>
                </select>
              </div>

              {/* Penerima / Penyetor (Opsional) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">Pihak Terkait / Penerima / Penyetor (Opsional)</label>
                <input
                  type="text"
                  value={editFinFundUser}
                  onChange={(e) => setEditFinFundUser(e.target.value)}
                  placeholder="eg: Staf Pompa Air, Koordinator Lantai 2"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFinanceLog(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl uppercase transition-colors shadow-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editFinAmount || Number(editFinAmount) <= 0) {
                    alert('Masukkan jumlah dana yang valid');
                    return;
                  }
                  if (!editFinDesc.trim()) {
                    alert('Masukkan deskripsi transaksi');
                    return;
                  }
                  if (!editFinCat) {
                    alert('Pilih kategori transaksi');
                    return;
                  }
                  if (onEditFinanceLog) {
                    onEditFinanceLog(editingFinanceLog.id, {
                      amount: Number(editFinAmount),
                      description: editFinDesc.trim(),
                      category: editFinCat,
                      fundUser: editFinFundUser.trim() || undefined,
                      type: editFinType
                    });
                  }
                  setEditingFinanceLog(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded-xl uppercase transition-colors shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
