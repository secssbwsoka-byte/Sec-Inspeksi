import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  ClipboardCheck, 
  History, 
  LayoutDashboard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  MapPin,
  Search,
  ChevronRight,
  User,
  FileText,
  Settings,
  LogOut,
  Lock,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Equipment, Inspection } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipment' | 'history'>('dashboard');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Form states
  const [newEquip, setNewEquip] = useState({ name: '', type: '', location: '' });
  const [newInspect, setNewInspect] = useState({ 
    inspector: '', 
    status: 'Good', 
    notes: '', 
    image: '',
    guardPost: '',
    dutyOfficer: ''
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('guardcheck_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const [equipRes, inspectRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/inspections')
      ]);
      const equipData = await equipRes.json();
      const inspectData = await inspectRes.json();
      setEquipment(equipData);
      setInspections(inspectData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(id);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await fetch(`/api/equipment/${id}/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64String })
        });
        fetchData();
      } catch (error) {
        console.error("Failed to upload image", error);
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('guardcheck_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.message);
      }
    } catch (error) {
      setLoginError("Koneksi ke server gagal");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('guardcheck_user');
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquip)
      });
      setShowAddModal(false);
      setNewEquip({ name: '', type: '', location: '' });
      fetchData();
    } catch (error) {
      console.error("Failed to add equipment", error);
    }
  };

  const handleAddInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInspectModal) return;
    try {
      await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: showInspectModal.id,
          inspector_name: newInspect.inspector || user?.username,
          status: newInspect.status,
          notes: newInspect.notes,
          image: newInspect.image,
          guard_post_location: newInspect.guardPost,
          duty_officer_name: newInspect.dutyOfficer
        })
      });
      setShowInspectModal(null);
      setNewInspect({ 
        inspector: '', 
        status: 'Good', 
        notes: '', 
        image: '',
        guardPost: '',
        dutyOfficer: ''
      });
      fetchData();
    } catch (error) {
      console.error("Failed to add inspection", error);
    }
  };

  const handleInspectionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewInspect(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Needs Repair': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-zinc-100"
        >
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shadow-zinc-200">
              <Shield className="text-white w-10 h-10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900">GuardCheck Portal</h1>
              <p className="text-zinc-500 text-sm">Silakan masuk untuk melanjutkan inspeksi</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="text" 
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="admin" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="password" 
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-4 text-lg shadow-lg shadow-zinc-200">
              Masuk Sekarang
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">© 2026 GuardCheck Security Systems</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Shield className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-base">GuardCheck</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
        >
          {isMobileMenuOpen ? <Plus className="rotate-45 transition-transform" /> : <Settings size={20} />}
        </button>
      </header>

      {/* Sidebar / Navigation */}
      <aside className={`
        fixed inset-0 z-50 bg-white md:relative md:z-0 md:flex md:w-64 md:border-r md:border-zinc-200 p-6 flex-col gap-8 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between md:justify-start gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">GuardCheck</h1>
              <p className="text-xs text-zinc-500">Security Inspection</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-zinc-400">
            <Plus className="rotate-45" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('equipment'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'equipment' ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <Shield size={20} />
            <span className="font-medium">Peralatan</span>
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <History size={20} />
            <span className="font-medium">Riwayat</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-zinc-500 capitalize truncate">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-rose-600 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8 md:mb-12">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
              {activeTab === 'dashboard' && 'Ringkasan Sistem'}
              {activeTab === 'equipment' && 'Daftar Peralatan'}
              {activeTab === 'history' && 'Riwayat Inspeksi'}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {activeTab === 'dashboard' && 'Pantau status keamanan fasilitas Anda secara real-time.'}
              {activeTab === 'equipment' && 'Kelola aset keamanan dan jadwalkan pemeriksaan.'}
              {activeTab === 'history' && 'Laporan lengkap aktivitas inspeksi berkala.'}
            </p>
          </div>
          
          {activeTab === 'equipment' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Plus size={18} />
              Tambah Alat
            </button>
          )}
        </header>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Total Alat</p>
                  <h3 className="text-4xl font-bold mt-2">{equipment.length}</h3>
                </div>
                <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600">
                  <Shield size={24} />
                </div>
              </div>
              <div className="glass-card p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Kondisi Baik</p>
                  <h3 className="text-4xl font-bold mt-2 text-emerald-600">
                    {equipment.filter(e => e.status === 'Good').length}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <div className="glass-card p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Perlu Perhatian</p>
                  <h3 className="text-4xl font-bold mt-2 text-rose-600">
                    {equipment.filter(e => e.status !== 'Good').length}
                  </h3>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                  <AlertTriangle size={24} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="glass-card p-8">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-lg">Inspeksi Terakhir</h4>
                  <button onClick={() => setActiveTab('history')} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                    Lihat Semua <ChevronRight size={14} />
                  </button>
                </div>
                <div className="space-y-4">
                  {inspections.slice(0, 5).map((inspect) => (
                    <div key={inspect.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(inspect.status)}`}>
                        <ClipboardCheck size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{inspect.equipment_name}</p>
                        <p className="text-xs text-zinc-500">Oleh: {inspect.inspector_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-zinc-900">
                          {new Date(inspect.inspection_date).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {new Date(inspect.inspection_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-card p-8">
                <h4 className="font-bold text-lg mb-6">Peralatan Kritis</h4>
                <div className="space-y-4">
                  {equipment.filter(e => e.status !== 'Good').length > 0 ? (
                    equipment.filter(e => e.status !== 'Good').map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 bg-rose-50/30">
                        <AlertTriangle className="text-rose-600" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.location}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
                      <CheckCircle2 size={48} className="mb-4 opacity-20" />
                      <p>Semua peralatan dalam kondisi baik.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari peralatan atau lokasi..." 
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {equipment.map((item) => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="glass-card overflow-hidden flex flex-col group hover:border-zinc-300 transition-all"
                >
                  {/* Equipment Image Header */}
                  <div className="relative h-48 bg-zinc-100 overflow-hidden">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-2">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-medium uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border shadow-sm ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <label className="absolute bottom-4 right-4 cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(item.id, e)}
                      />
                      <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-zinc-600 shadow-lg hover:bg-zinc-900 hover:text-white transition-all">
                        {uploadingId === item.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Camera size={18} />
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Shield size={20} />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                      <p className="text-sm text-zinc-500">{item.type}</p>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <MapPin size={14} />
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={14} />
                        <span>Inspeksi: {item.last_inspection_date ? new Date(item.last_inspection_date).toLocaleDateString('id-ID') : 'Belum pernah'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowInspectModal(item)}
                      className="mt-2 w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                    >
                      <ClipboardCheck size={16} />
                      Inspeksi Sekarang
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="glass-card overflow-hidden overflow-x-auto">
            <div className="min-w-[800px] md:min-w-full">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-bottom border-zinc-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Peralatan</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Pemeriksa / Pos / Petugas</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Foto</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {inspections.map((inspect) => (
                  <tr key={inspect.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <Shield size={14} />
                        </div>
                        <span className="font-medium text-sm">{inspect.equipment_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900">{inspect.inspector_name}</span>
                        <span className="text-xs text-zinc-500">Pos: {inspect.guard_post_location || '-'}</span>
                        <span className="text-[10px] text-zinc-400">Petugas: {inspect.duty_officer_name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {new Date(inspect.inspection_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(inspect.status)}`}>
                        {inspect.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {inspect.image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200">
                          <img src={inspect.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <span className="text-zinc-300 italic text-xs">No Photo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 italic">
                      {inspect.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-xl font-bold mb-6">Tambah Peralatan Baru</h3>
              <form onSubmit={handleAddEquipment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Nama Alat</label>
                  <input 
                    required
                    value={newEquip.name}
                    onChange={e => setNewEquip({...newEquip, name: e.target.value})}
                    type="text" 
                    placeholder="Contoh: APAR Lantai 2" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Tipe</label>
                  <select 
                    value={newEquip.type}
                    onChange={e => setNewEquip({...newEquip, type: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="">Pilih Tipe</option>
                    <option value="Vehicle">Kendaraan</option>
                    <option value="Lighting">Penerangan</option>
                    <option value="Security Tool">Alat Keamanan</option>
                    <option value="Apparel">Pakaian/Rompi</option>
                    <option value="Traffic Control">Kontrol Lalin</option>
                    <option value="Safety Gear">Alat Keselamatan</option>
                    <option value="Surveillance">Pengawasan</option>
                    <option value="Communication">Komunikasi</option>
                    <option value="Fire Extinguisher">APAR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Lokasi</label>
                  <input 
                    required
                    value={newEquip.location}
                    onChange={e => setNewEquip({...newEquip, location: e.target.value})}
                    type="text" 
                    placeholder="Contoh: Pos Jaga Utama" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">Batal</button>
                  <button type="submit" className="flex-1 btn-primary">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showInspectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInspectModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Inspeksi Peralatan</h3>
                  <p className="text-sm text-zinc-500">{showInspectModal.name}</p>
                </div>
              </div>

              <form onSubmit={handleAddInspection} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Nama Pemeriksa</label>
                    <input 
                      required
                      value={newInspect.inspector || user?.username || ''}
                      onChange={e => setNewInspect({...newInspect, inspector: e.target.value})}
                      type="text" 
                      placeholder="Nama Anda" 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Lokasi Pos</label>
                    <input 
                      required
                      value={newInspect.guardPost}
                      onChange={e => setNewInspect({...newInspect, guardPost: e.target.value})}
                      type="text" 
                      placeholder="Contoh: Pos 1" 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Petugas Jaga / KARU / QRT</label>
                  <input 
                    required
                    value={newInspect.dutyOfficer}
                    onChange={e => setNewInspect({...newInspect, dutyOfficer: e.target.value})}
                    type="text" 
                    placeholder="Nama Petugas Jaga" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Status Kondisi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Good', 'Needs Repair', 'Critical'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewInspect({...newInspect, status: s})}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${newInspect.status === s ? getStatusColor(s) + ' ring-2 ring-offset-1 ring-zinc-200' : 'bg-white text-zinc-400 border-zinc-100'}`}
                      >
                        {s === 'Good' ? 'BAIK' : s === 'Needs Repair' ? 'RUSAK' : 'KRITIS'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Catatan Tambahan</label>
                  <textarea 
                    value={newInspect.notes}
                    onChange={e => setNewInspect({...newInspect, notes: e.target.value})}
                    placeholder="Detail temuan inspeksi..." 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Foto Kondisi (Opsional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleInspectionImageUpload}
                      />
                      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-900 transition-colors text-zinc-500 hover:text-zinc-900">
                        <Upload size={18} />
                        <span className="text-sm font-medium">Pilih Gambar</span>
                      </div>
                    </label>
                    {newInspect.image && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200">
                        <img src={newInspect.image} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowInspectModal(null)} className="flex-1 btn-secondary">Batal</button>
                  <button type="submit" className="flex-1 btn-primary">Kirim Laporan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
