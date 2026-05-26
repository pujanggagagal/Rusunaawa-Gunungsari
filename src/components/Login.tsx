import React, { useState } from 'react';
import { UserRole, Resident, Coordinator } from '../types';
import { Building2, ShieldCheck, UserCheck, Droplets, ArrowRight, User, Lock } from 'lucide-react';

interface LoginProps {
  residents: Resident[];
  coordinators: Coordinator[];
  onLoginSuccess: (role: UserRole, userDetails: any) => void;
}

export const Login: React.FC<LoginProps> = ({ residents, coordinators, onLoginSuccess }) => {
  // Check for URL parameters to isolate login view to Citizens only (Warga Only)
  const isWargaOnly = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('role') === 'warga' || params.get('view') === 'warga' || params.get('warga') === 'true';
    }
    return false;
  })();

  const [activeTab, setActiveTab] = useState<UserRole>('warga');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError(activeTab === 'warga' ? 'Masukkan KTP anda.' : 'Masukkan Password anda.');
      return;
    }

    if (activeTab === 'warga') {
      const cleanInput = identifier.trim().replace(/\D/g, '');
      const citizen = residents.find(r => {
        const cleanKtp = (r.ktp || '').trim().replace(/\D/g, '');
        return (cleanKtp && cleanKtp === cleanInput) || (r.ktp || '').trim() === identifier.trim();
      });
      if (citizen) {
        onLoginSuccess('warga', citizen);
      } else {
        setError('Nomor KTP tidak terdaftar sebagai warga.');
      }
    } else if (activeTab === 'koordinator') {
      const cleanInput = identifier.trim().replace(/\D/g, '');
      const coord = coordinators.find(c => {
        const cleanKtp = (c.ktp || '').trim().replace(/\D/g, '');
        return (cleanKtp && cleanKtp === cleanInput) || (c.ktp || '').trim() === identifier.trim();
      });
      if (coord) {
        onLoginSuccess('koordinator', coord);
      } else {
        setError('Password Koordinator salah.');
      }
    } else if (activeTab === 'security') {
      if (identifier.trim().toLowerCase() === 'security' || identifier.trim() === '777777') {
        onLoginSuccess('security', { name: 'Komandan Bambang', id: 'sec-1' });
      } else {
        setError('Password Security salah.');
      }
    } else if (activeTab === 'admin') {
      if (identifier.trim().toLowerCase() === 'adminrusun') {
        onLoginSuccess('admin', { name: 'Admin Diana', id: 'admin-1' });
      } else {
        setError('Password Admin salah.');
      }
    }
  };

  const handleDemoLogin = (role: UserRole, idValue: string) => {
    setIdentifier(idValue);
    setActiveTab(role);
    
    // Auto submit next tick or directly log in
    if (role === 'warga') {
      const citizen = residents.find(r => r.ktp === idValue);
      if (citizen) onLoginSuccess('warga', citizen);
    } else if (role === 'koordinator') {
      const coord = coordinators.find(c => c.ktp === idValue);
      if (coord) onLoginSuccess('koordinator', coord);
    } else if (role === 'security') {
      onLoginSuccess('security', { name: 'Komandan Bambang', id: 'sec-1' });
    } else if (role === 'admin') {
      onLoginSuccess('admin', { name: 'Admin Diana', id: 'admin-1' });
    }
  };

  return (
    <div id="login_container" className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md shadow-emerald-200">
            <Droplets className="h-8 w-8" />
          </div>
          <div>
            <span className="font-sans font-bold text-2xl tracking-tight text-slate-900 block">Sistem Gunungsari</span>
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">PDAM &amp; IURAN WARGA</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Portal Rusunawa Gunungsari
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sistem Pembayaran PDAM, Iuran Sampah, &amp; Kontrol Kelistrikan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          
          {/* Tabs */}
          {isWargaOnly ? (
            <div className="mb-6 bg-slate-100 p-2.5 rounded-2xl text-center border border-slate-200/60 flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest font-mono">PORTAL AKSES MANDIRI WARGA</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 mb-6 bg-slate-100 p-1.5 rounded-xl text-center">
              {(['warga', 'koordinator', 'security', 'admin'] as UserRole[]).map((tab) => (
                <button
                  key={tab}
                  id={`tab_${tab}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setIdentifier('');
                    setError('');
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab === 'security' ? 'Security' : tab}
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="identifier_input" className="block text-sm font-medium text-slate-700 mb-1">
                {activeTab === 'warga' ? 'Nomor KTP Warga' : 'Kata Sandi / Password'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {activeTab === 'warga' ? <User size={18} /> : <Lock size={18} />}
                </div>
                <input
                  type={activeTab === 'warga' ? 'text' : 'password'}
                  name="identifier"
                  id="identifier_input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeTab === 'warga' ? 'Ketik KTP Warga' :
                    activeTab === 'koordinator' ? 'Ketik Password Koordinator' :
                    activeTab === 'security' ? 'Ketik Password Security' :
                    'Ketik Password Admin'
                  }
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <div id="login_error" className="text-red-600 text-xs py-1 px-3 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                id="login_submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                Masuk Sistem
                <ArrowRight size={16} />
              </button>
            </div>
          </form>



        </div>
      </div>
    </div>
  );
};
