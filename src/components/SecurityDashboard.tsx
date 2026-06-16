import React, { useState } from 'react';
import { Resident, BillingRecord, getFloorFromUnit, AppSettings, getMonthYearFromDateString } from '../types';
import { LogOut, ShieldCheck, Zap, ZapOff, CheckCircle2, AlertTriangle, Calendar, Info, RefreshCw, Badge } from 'lucide-react';
import { sortResidents } from '../utils/sorting';

interface SecurityDashboardProps {
  residents: Resident[];
  billingRecords: BillingRecord[];
  simulatedDate: string;
  onLogout: () => void;
  onUpdateElectricity: (residentId: string, status: 'Menyala' | 'Diputus') => void;
  onUpdateSimulatedDate: (newDate: string) => void;
  appSettings: AppSettings;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  residents,
  billingRecords,
  simulatedDate,
  onLogout,
  onUpdateElectricity,
  onUpdateSimulatedDate,
  appSettings
}) => {
  const [filterBlock, setFilterBlock] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Lunas' | 'Belum Lunas' | 'Diputus'>('Semua');
  const [filterFloor, setFilterFloor] = useState<string>('Semua');

  const { month: activeMonth, year: activeYear } = getMonthYearFromDateString(simulatedDate);

  // Convert simulated date string to get day of month
  const simDay = parseInt(simulatedDate.split('-')[2] || '12', 10);
  const isPastDue = simDay > 10;

  // Find unpaid billing records for active period
  const meiBills = billingRecords.filter((b) => b.month === activeMonth && b.year === activeYear);
  
  // Map residents with their payment status for active period
  const complianceData = residents.map((resident) => {
    const bill = meiBills.find((b) => b.residentKtp === resident.ktp);
    return {
      ...resident,
      billInputted: !!bill,
      paymentStatus: bill ? bill.status : 'Belum Dicatat',
      totalBill: bill ? bill.totalBill : 0,
    };
  });

  // Filter based on selected block, status, and floor
  const filteredCompliance = sortResidents(complianceData.filter((r) => {
    if (filterBlock !== 'Semua' && r.block !== filterBlock) return false;
    
    if (filterStatus === 'Lunas') {
      if (r.paymentStatus !== 'Lunas') return false;
    } else if (filterStatus === 'Belum Lunas') {
      if (r.paymentStatus !== 'Belum Lunas') return false;
    } else if (filterStatus === 'Diputus') {
      if (r.electricityStatus !== 'Diputus') return false;
    }
    
    if (filterFloor !== 'Semua') {
      const resFloor = (r.floor || getFloorFromUnit(r.unit)).toString();
      if (resFloor !== filterFloor) return false;
    }
    
    return true;
  }));

  // Highlight rules
  const unpaidResidents = complianceData.filter(r => r.paymentStatus === 'Belum Lunas');
  const threatCount = unpaidResidents.length;
  const disconnectedCount = complianceData.filter(r => r.electricityStatus === 'Diputus').length;

  const handleToggleElectricity = (resId: string, currentStatus: 'Menyala' | 'Diputus') => {
    const targetStatus = currentStatus === 'Menyala' ? 'Diputus' : 'Menyala';
    onUpdateElectricity(resId, targetStatus);
  };

  // Safe currency format
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div id="security_dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-rose-100 text-rose-800 h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl uppercase shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E-Security Kontrol Rusunawa</h1>
            <p className="text-sm text-slate-500 font-mono">
              Petugas Pembatasan Listrik &amp; Pemantauan Warga Menunggak • Gunungsari Surabaya
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          id="btn_security_logout"
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl transition-all cursor-pointer text-sm font-semibold"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>

      {/* Interactive Date-Simulator & Security Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Date Selector Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-rose-600" size={18} />
              <h3 className="text-sm font-bold text-slate-900">Alat Simulasi Tanggal Kalender</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Aturan: Jika tanggal simulasi sudah <strong>lewat tanggal 10</strong>, warga yang belum lunas WAJIB ditertibkan (diputus listriknya).
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Set Tanggal Simulasi:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-lg ${isPastDue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {isPastDue ? ' Lewat Tanggal 10' : ' Masa Tenggang'}
              </span>
            </div>

            <input
              type="date"
              value={simulatedDate}
              onChange={(e) => onUpdateSimulatedDate(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
            />
          </div>
        </div>

        {/* Security Metrics */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 grid grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between text-slate-900">
            <span className="text-xxs uppercase tracking-wider text-slate-400 font-mono font-bold">Total Warga</span>
            <span className="text-3xl font-bold font-mono text-slate-950 mt-2">{residents.length}</span>
            <span className="text-[10px] text-slate-400 font-semibold leading-tight mt-1">Hunian aktif</span>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 flex flex-col justify-between text-amber-900">
            <span className="text-xxs uppercase tracking-wider text-amber-500 font-mono font-bold">Menunggak {activeMonth}</span>
            <span className="text-3xl font-bold font-mono text-amber-700 mt-2">{threatCount}</span>
            <span className="text-[10px] text-amber-500 font-semibold leading-tight mt-1">Belum Lunas</span>
          </div>

          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-between text-rose-900">
            <span className="text-xxs uppercase tracking-wider text-rose-500 font-mono font-bold">Listrik Berstatus Putus</span>
            <span className="text-3xl font-bold font-mono text-rose-700 mt-2">{disconnectedCount}</span>
            <span className="text-[10px] text-rose-500 font-semibold leading-tight mt-1">MCB Tersegel</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Delinquency control list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6">
               {/* Table Filter block selection header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Rencana Penertiban &amp; Kontrol Saklar MCB Listrik</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Daftar tindakan pemutusan aliran meteran warga per tanggal 10 {activeMonth}</p>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100/85 shadow-sm">
          {/* Block Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Blok Hunian</label>
            <select
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all cursor-pointer font-sans text-slate-800"
            >
              <option value="Semua">Semua Blok</option>
              <option value="Blok A">Blok A</option>
              <option value="Blok B">Blok B</option>
              <option value="Blok C">Blok C</option>
              <option value="Blok D">Blok D</option>
              <option value="Blok E">Blok E</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status Keuangan / Aliran</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all cursor-pointer font-sans text-slate-800"
            >
              <option value="Semua">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="Diputus">Putus Aliran Listrik</option>
            </select>
          </div>

          {/* Floor Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lantai</label>
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all cursor-pointer font-sans text-slate-800"
            >
              <option value="Semua">Semua Lantai</option>
              <option value="1">Lantai 1</option>
              <option value="2">Lantai 2</option>
              <option value="3">Lantai 3</option>
              <option value="4">Lantai 4</option>
              <option value="5">Lantai 5</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Compliance cards for Patrol Security (Hidden on large screens, display on mobile) */}
        <div className="block lg:hidden space-y-3" id="security_compliance_cards_mobile">
          {filteredCompliance.map((res) => {
            const mustCut = isPastDue && res.paymentStatus === 'Belum Lunas';
            const isDisconnected = res.electricityStatus === 'Diputus';

            return (
              <div
                key={res.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col space-y-3 shadow-xs"
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-250 border border-slate-300 rounded text-slate-800">
                      Unit {res.unit}
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-1.5 font-semibold">Blok {res.block} • Lantai {res.floor || getFloorFromUnit(res.unit)}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-[10px] rounded-full font-extrabold border ${
                      res.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      res.paymentStatus === 'Belum Lunas' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {res.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Body details */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/50">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">Penghuni</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{res.name}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">Tagihan {activeMonth}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {res.billInputted ? formatRupiah(res.totalBill) : '-'}
                    </span>
                  </div>
                </div>

                {/* Sanksi & MCB switch info */}
                <div className="grid grid-cols-2 gap-2 text-xs pb-1 items-center">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono mb-1">Status Listrik</span>
                    {isDisconnected ? (
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-250 text-rose-700 rounded-lg font-bold inline-flex items-center gap-1 text-[10px]">
                        <ZapOff size={11} className="text-rose-500" />
                        SEKAT (Mati)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold inline-flex items-center gap-1 text-[10px]">
                        <Zap size={11} className="text-emerald-500 animate-bounce" />
                        MENYALA
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono mb-1 text-right">Rencana Saksi</span>
                    <div className="text-right">
                      {mustCut ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] border border-red-200 rounded font-bold animate-pulse inline-block">
                          Wajib Dimatikan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-200 rounded font-bold inline-block">
                          Aman / Lunas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Toggle Action Button */}
                <button
                  onClick={() => handleToggleElectricity(res.id, res.electricityStatus)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none uppercase tracking-wider text-center ${
                    isDisconnected
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/10'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-700/10'
                  }`}
                >
                  {isDisconnected ? 'Nyalakan Air & Listrik' : 'Putus Aliran Listrik'}
                </button>
              </div>
            );
          })}
        </div>
 
        {/* Security Delinquents table (Desktop and tablet view) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-150 text-slate-400 font-mono text-xxs tracking-wider uppercase text-left">
                <th className="pb-3 text-left">Hunian</th>
                <th className="pb-3">Nama Penghuni</th>
                <th className="pb-3">Tagihan Air + Sampah</th>
                <th className="pb-3 text-center">Status Pembayaran ({activeMonth})</th>
                <th className="pb-3 text-center">Sanksi Pemutusan Listrik</th>
                <th className="pb-3 text-center">Saklar MCB Listrik (Security)</th>
                <th className="pb-3 text-right">Aksi Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompliance.map((res) => {
                const mustCut = isPastDue && res.paymentStatus === 'Belum Lunas';
                const isDisconnected = res.electricityStatus === 'Diputus';
                
                return (
                  <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-900 font-mono">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-mono text-xs">
                        {res.unit}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-slate-800 text-sm">{res.name}</div>
                      <div className="text-slate-450 font-mono text-[10px]">{res.block} • Lantai {res.floor || getFloorFromUnit(res.unit)} • KTP: {res.ktp}</div>
                    </td>
                    <td className="py-4 font-mono font-bold text-slate-800 text-sm">
                      {res.billInputted ? formatRupiah(res.totalBill) : '-'}
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                        res.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' :
                        res.paymentStatus === 'Belum Lunas' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {res.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      {mustCut ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs rounded-lg font-bold inline-flex items-center gap-1 leading-none uppercase tracking-wider animate-pulse">
                          Wajib Dimatikan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-lg font-bold inline-flex items-center gap-1 leading-none uppercase tracking-wider">
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center">
                        {isDisconnected ? (
                          <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-1">
                            <ZapOff size={13} />
                            MATI (Putus)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold flex items-center gap-1">
                            <Zap size={13} className="text-emerald-500 animate-bounce" />
                            MENYALA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleElectricity(res.id, res.electricityStatus)}
                          className={`px-3 py-1.5 rounded-lg text-xxs font-bold transition-all shadow-sm cursor-pointer select-none uppercase tracking-wider ${
                            isDisconnected
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/10'
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-700/10'
                          }`}
                        >
                          {isDisconnected ? 'Nyalakan Air-Listrik' : 'Putus Aliran'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Informative advice at the bottom */}
        <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
          <Info className="text-rose-700 flex-shrink-0" size={18} />
          <div className="text-xxs text-rose-900 leading-relaxed font-semibold">
            INSTRUKSI PENINDAKAN: Sebagai Security, anda berhak mematikan/menyalakan kelistrikan MCB warga secara manual demi menegakkan ketertiban sanksi pasca tanggal 10. Jika warga lunas membayar lewat Portal Warga mereka, Anda disarankan untuk segera menyalakan kembali saklar mereka.
          </div>
        </div>

      </div>

    </div>
  );
};
