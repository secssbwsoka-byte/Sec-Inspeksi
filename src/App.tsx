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
  User as UserIcon,
  Mail,
  Lock,
  LogOut,
  Settings,
  Menu,
  X,
  Trash2,
  Download,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Equipment, Inspection, User } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipment' | 'history'>('dashboard');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState<Equipment | null>(null);
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);

  // Form states
  const [newEquip, setNewEquip] = useState({ name: '', type: '', location: '' });
  const [newInspect, setNewInspect] = useState({ 
    status: 'Good', 
    notes: '', 
    inspector_name: '', 
    guard_post: '', 
    officer_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    image: null as string | null
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('guardcheck_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setNewInspect(prev => ({ ...prev, inspector_name: parsedUser.username }));
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
      console.log("Fetched inspections:", inspectData);
      setEquipment(equipData);
      setInspections(inspectData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMessage('');
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      console.log(`Attempting ${authMode} for user: ${authForm.username}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Server error: ${res.status}` }));
        setAuthError(errorData.message || `Gagal: ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        if (authMode === 'login') {
          console.log("Login successful:", data.user);
          setUser(data.user);
          setIsAuthenticated(true);
          localStorage.setItem('guardcheck_user', JSON.stringify(data.user));
        } else {
          setSuccessMessage("Registrasi berhasil! Silakan masuk.");
          setAuthMode('login');
        }
      } else {
        setAuthError(data.message);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setAuthError("Koneksi ke server gagal. Pastikan server sedang berjalan.");
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
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: showInspectModal.id,
          inspector_name: newInspect.inspector_name,
          status: newInspect.status,
          notes: newInspect.notes,
          guard_post: newInspect.guard_post,
          officer_name: newInspect.officer_name,
          image: newInspect.image,
          inspection_date: new Date(newInspect.inspection_date).toISOString()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowInspectModal(null);
        setNewInspect({ 
          status: 'Good', 
          notes: '', 
          inspector_name: user?.username || '', 
          guard_post: '', 
          officer_name: '',
          inspection_date: new Date().toISOString().split('T')[0],
          image: null
        });
        fetchData();
        alert("Inspeksi berhasil disimpan!");
      } else {
        alert("Gagal menyimpan inspeksi: " + data.message);
      }
    } catch (error) {
      console.error("Failed to add inspection", error);
      alert("Terjadi kesalahan koneksi saat menyimpan inspeksi.");
    }
  };

  const handleDeleteInspection = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data inspeksi ini?")) return;
    
    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Gagal menghapus data: " + data.message);
      }
    } catch (error) {
      console.error("Failed to delete inspection", error);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const downloadCSV = () => {
    if (filteredInspections.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const headers = ["ID", "Peralatan", "Inspektur", "Petugas", "Pos", "Tanggal", "Status", "Catatan"];
    const rows = filteredInspections.map(ins => [
      ins.id,
      ins.equipment_name,
      ins.inspector_name,
      ins.officer_name || "-",
      ins.guard_post || "-",
      new Date(ins.inspection_date).toLocaleString(),
      ins.status,
      (ins.notes || "").replace(/,/g, ";") // Escape commas
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `log_inspeksi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    if (filteredInspections.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Log Record Inspeksi Peralatan", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Security Command Center Soka ags`, 14, 36);

    const tableColumn = ["Peralatan", "Inspektur", "Tanggal", "Status", "Catatan", "Gambar"];
    const tableRows = filteredInspections.map(ins => [
      ins.equipment_name,
      ins.inspector_name,
      new Date(ins.inspection_date).toLocaleDateString(),
      ins.status,
      ins.notes || "-",
      "" // Placeholder for image
    ]);

    autoTable(doc, {
      startY: 45,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 8, minCellHeight: 25, valign: 'middle' },
      columnStyles: {
        5: { cellWidth: 30, halign: 'center' } // Width for image column
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const ins = filteredInspections[data.row.index];
          if (ins && ins.image && ins.image.startsWith('data:image')) {
            try {
              // Auto-detect format from data URL or default to JPEG
              let format = 'JPEG';
              if (ins.image.includes('png')) format = 'PNG';
              else if (ins.image.includes('webp')) format = 'WEBP';
              
              // Add image to the cell, centered
              const imgSize = 20;
              doc.addImage(
                ins.image, 
                format, 
                data.cell.x + (data.cell.width - imgSize) / 2, 
                data.cell.y + (data.cell.height - imgSize) / 2, 
                imgSize, 
                imgSize
              );
            } catch (e) {
              console.error("Error adding image to PDF at row", data.row.index, e);
              doc.setFontSize(6);
              doc.text("Err Img", data.cell.x + 2, data.cell.y + 10);
            }
          } else {
            doc.setFontSize(6);
            doc.setTextColor(150);
            doc.text(ins?.image ? "Invalid Img" : "No Image", data.cell.x + 5, data.cell.y + 10);
          }
        }
      }
    });

    doc.save(`log_inspeksi_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewInspect(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Broken': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-zinc-100"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center">
              <Shield className="text-white w-10 h-10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900">GuardCheck Portal</h1>
              <p className="text-zinc-500 text-sm">Sistem Inspeksi Peralatan Keamanan</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} />
                {authError}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                {successMessage}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="text" 
                  value={authForm.username}
                  onChange={e => setAuthForm({...authForm, username: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type="email" 
                    value={authForm.email}
                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="password" 
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors">
              {authMode === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setSuccessMessage('');
              }}
              className="text-sm text-zinc-600 hover:text-zinc-900 underline"
            >
              {authMode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const stats = {
    total: equipment.length,
    good: equipment.filter(e => e.status === 'Good').length,
    broken: equipment.filter(e => e.status === 'Broken').length,
    critical: equipment.filter(e => e.status === 'Critical').length
  };

  const filteredInspections = inspections.filter(inspection => {
    const equipName = inspection.equipment_name || '';
    const inspectName = inspection.inspector_name || '';
    const officerName = inspection.officer_name || '';

    const matchesSearch = 
      equipName.toLowerCase().includes(historySearch.toLowerCase()) ||
      inspectName.toLowerCase().includes(historySearch.toLowerCase()) ||
      officerName.toLowerCase().includes(historySearch.toLowerCase());
    
    const matchesStatus = historyStatusFilter === 'All' || inspection.status === historyStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] bg-white border-r border-zinc-200 w-64 p-6 flex flex-col transition-transform md:relative md:translate-x-0 md:z-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl">GuardCheck</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 hover:bg-zinc-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('equipment'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'equipment' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <ClipboardCheck size={20} />
            <span className="font-medium">Peralatan</span>
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <History size={20} />
            <span className="font-medium">Riwayat</span>
          </button>
        </nav>

        <div className="pt-6 mt-6 border-t border-zinc-100 pb-4">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
              <UserIcon size={20} className="text-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold truncate">{user?.username}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase ${user?.role === 'admin' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
          </div>
          {user?.role === 'admin' && activeTab === 'equipment' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-zinc-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-zinc-800"
            >
              <Plus size={18} />
              Tambah Alat
            </button>
          )}
        </header>

        <div className="p-6 overflow-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                  <p className="text-zinc-500 text-sm font-bold uppercase mb-2">Total Peralatan</p>
                  <p className="text-4xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-500 text-sm font-bold uppercase">Kondisi Baik</p>
                    <CheckCircle2 className="text-emerald-500" size={20} />
                  </div>
                  <p className="text-4xl font-bold text-emerald-600">{stats.good}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-500 text-sm font-bold uppercase">Unit Rusak</p>
                    <AlertTriangle className="text-amber-500" size={20} />
                  </div>
                  <p className="text-4xl font-bold text-amber-600">{stats.broken}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-500 text-sm font-bold uppercase">Unit Kritis</p>
                    <AlertTriangle className="text-rose-500" size={20} />
                  </div>
                  <p className="text-4xl font-bold text-rose-600">{stats.critical}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="font-bold">Inspeksi Terakhir</h3>
                    <History size={18} className="text-zinc-400" />
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {inspections.slice(0, 5).map(inspection => (
                      <div key={inspection.id} className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(inspection.status)}`}>
                          <ClipboardCheck size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{inspection.equipment_name}</p>
                          <p className="text-xs text-zinc-500">{inspection.inspector_name} • {new Date(inspection.inspection_date).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="font-bold">Peralatan Kritis</h3>
                    <AlertTriangle size={18} className="text-rose-400" />
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {equipment.filter(e => e.status === 'Critical').map(item => (
                      <div key={item.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <AlertTriangle size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.location}</p>
                        </div>
                        <button 
                          onClick={() => setShowInspectModal(item)}
                          className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1.5 rounded-lg"
                        >
                          Periksa
                        </button>
                      </div>
                    ))}
                    {equipment.filter(e => e.status === 'Critical').length === 0 && (
                      <div className="p-12 text-center">
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                        <p className="text-sm text-zinc-500">Semua peralatan dalam kondisi aman.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipment.map(item => (
                <motion.div 
                  layout
                  key={item.id}
                  className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{item.type}</p>
                    </div>
                    <h3 className="text-lg font-bold mb-1">{item.name}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-6">
                      <MapPin size={14} />
                      {item.location}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Inspeksi Terakhir</span>
                        <span className="font-medium text-zinc-900">
                          {item.last_inspection_date ? new Date(item.last_inspection_date).toLocaleDateString() : 'Belum pernah'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowInspectModal(item)}
                        className="w-full bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
                      >
                        Mulai Inspeksi
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari peralatan, inspektur, atau petugas..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={historyStatusFilter}
                    onChange={e => setHistoryStatusFilter(e.target.value)}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 bg-white text-sm font-medium"
                  >
                    <option value="All">Semua Status</option>
                    <option value="Good">Baik</option>
                    <option value="Broken">Rusak</option>
                    <option value="Critical">Kritis</option>
                  </select>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={downloadCSV}
                      className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      title="Download CSV"
                    >
                      <TableIcon size={18} />
                      <span className="hidden lg:inline text-xs font-bold">CSV</span>
                    </button>
                    <button 
                      onClick={downloadPDF}
                      className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      title="Download PDF"
                    >
                      <FileText size={18} />
                      <span className="hidden lg:inline text-xs font-bold">PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-zinc-50">
                  {filteredInspections.map(inspection => (
                    <div key={inspection.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{inspection.equipment_name}</p>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mt-0.5">
                            <Clock size={10} />
                            <span>{new Date(inspection.inspection_date).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getStatusColor(inspection.status)}`}>
                          {inspection.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {inspection.image ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
                            <img src={inspection.image} alt="Inspection" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                            <Shield size={16} className="text-zinc-200" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-600 font-medium truncate">Inspektur: {inspection.inspector_name}</p>
                          <p className="text-[10px] text-zinc-400 truncate">Petugas: {inspection.officer_name || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                        <p className="text-xs text-zinc-500 italic truncate flex-1 mr-4">
                          {inspection.notes || 'Tidak ada catatan'}
                        </p>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setViewInspection(inspection)}
                            className="p-2 text-zinc-400 hover:text-zinc-900"
                          >
                            <ChevronRight size={18} />
                          </button>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => handleDeleteInspection(inspection.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Peralatan</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Inspektur / Pos</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Tanggal</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Gambar</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">Catatan</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredInspections.map(inspection => (
                        <tr key={inspection.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">{inspection.equipment_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-zinc-600 font-medium">{inspection.inspector_name}</p>
                            <p className="text-xs text-zinc-400">Pos: {inspection.guard_post || '-'}</p>
                            <p className="text-[10px] text-zinc-400 italic">Petugas: {inspection.officer_name || '-'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-zinc-500">
                              <Clock size={14} />
                              <span className="text-sm">{new Date(inspection.inspection_date).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(inspection.status)}`}>
                              {inspection.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {inspection.image ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-100">
                                <img src={inspection.image} alt="Inspection" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-300">No Image</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-zinc-500 italic max-w-xs truncate">{inspection.notes || '-'}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setViewInspection(inspection)}
                                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                                title="Lihat Detail"
                              >
                                <ChevronRight size={20} />
                              </button>
                              {user?.role === 'admin' && (
                                <button 
                                  onClick={() => handleDeleteInspection(inspection.id)}
                                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus Record"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredInspections.length === 0 && (
                  <div className="px-6 py-12 text-center text-zinc-400 italic">
                    Tidak ada data riwayat yang ditemukan.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 right-0 p-4 text-[10px] text-zinc-400 pointer-events-none hidden md:block">
        © 2026 Security Command Center Soka ags
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('equipment')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'equipment' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <ClipboardCheck size={20} />
          <span className="text-[10px] font-bold uppercase">Alat</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <History size={20} />
          <span className="text-[10px] font-bold uppercase">Riwayat</span>
        </button>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-zinc-400"
        >
          <Menu size={20} />
          <span className="text-[10px] font-bold uppercase">Menu</span>
        </button>
      </nav>

      {/* Add Equipment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold mb-6">Tambah Peralatan Baru</h3>
              <form onSubmit={handleAddEquipment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Nama Alat</label>
                  <input 
                    required
                    type="text" 
                    value={newEquip.name}
                    onChange={e => setNewEquip({...newEquip, name: e.target.value})}
                    placeholder="Contoh: CCTV Area Parkir"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Tipe</label>
                  <select 
                    value={newEquip.type}
                    onChange={e => setNewEquip({...newEquip, type: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="">Pilih Tipe</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Surveillance">Surveillance</option>
                    <option value="Security Tool">Security Tool</option>
                    <option value="Communication">Communication</option>
                    <option value="Safety Gear">Safety Gear</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Lokasi</label>
                  <input 
                    required
                    type="text" 
                    value={newEquip.location}
                    onChange={e => setNewEquip({...newEquip, location: e.target.value})}
                    placeholder="Contoh: Pos Jaga Utama"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspect Modal */}
      <AnimatePresence>
        {showInspectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold">Inspeksi Peralatan</h3>
                <p className="text-zinc-500 text-sm">{showInspectModal.name}</p>
              </div>
              
              <form onSubmit={handleAddInspection} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Nama Pelaksana</label>
                    <input 
                      required
                      type="text" 
                      value={newInspect.inspector_name}
                      onChange={e => setNewInspect({...newInspect, inspector_name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Tanggal</label>
                    <input 
                      required
                      type="date" 
                      value={newInspect.inspection_date}
                      onChange={e => setNewInspect({...newInspect, inspection_date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Nama Petugas Jaga / KARU / QRT</label>
                  <input 
                    required
                    type="text" 
                    value={newInspect.officer_name}
                    onChange={e => setNewInspect({...newInspect, officer_name: e.target.value})}
                    placeholder="Masukkan nama petugas..."
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Pos Penjagaan</label>
                  <input 
                    required
                    type="text" 
                    value={newInspect.guard_post}
                    onChange={e => setNewInspect({...newInspect, guard_post: e.target.value})}
                    placeholder="Contoh: Pos Timur"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Status Kondisi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Good', 'Broken', 'Critical'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setNewInspect({...newInspect, status: status as any})}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${newInspect.status === status ? getStatusColor(status) : 'border-zinc-100 text-zinc-400'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Upload Gambar</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl p-4 cursor-pointer hover:bg-zinc-50 transition-colors">
                      <Plus className="text-zinc-400 mb-1" size={20} />
                      <span className="text-xs text-zinc-500 font-medium">Klik untuk upload</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {newInspect.image && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-100">
                        <img src={newInspect.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">Catatan Temuan</label>
                  <textarea 
                    value={newInspect.notes}
                    onChange={e => setNewInspect({...newInspect, notes: e.target.value})}
                    rows={3}
                    placeholder="Masukkan detail kondisi alat..."
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowInspectModal(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                  >
                    Selesaikan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Inspection Detail Modal */}
      <AnimatePresence>
        {viewInspection && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewInspection(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900">Detail Inspeksi</h3>
                    <p className="text-zinc-500">{viewInspection.equipment_name}</p>
                  </div>
                  <button 
                    onClick={() => setViewInspection(null)}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Status</p>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getStatusColor(viewInspection.status)}`}>
                          {viewInspection.status}
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Tanggal</p>
                        <p className="text-sm font-bold">{new Date(viewInspection.inspection_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Pelaksana Inspeksi</p>
                        <p className="text-sm font-medium text-zinc-900">{viewInspection.inspector_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Petugas Jaga / KARU / QRT</p>
                        <p className="text-sm font-medium text-zinc-900">{viewInspection.officer_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Pos Penjagaan</p>
                        <p className="text-sm font-medium text-zinc-900">{viewInspection.guard_post || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Catatan Temuan</p>
                        <p className="text-sm text-zinc-600 bg-zinc-50 p-4 rounded-2xl italic">
                          {viewInspection.notes || 'Tidak ada catatan.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Dokumentasi Foto</p>
                    {viewInspection.image ? (
                      <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50">
                        <img 
                          src={viewInspection.image} 
                          alt="Dokumentasi Inspeksi" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-2xl border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center text-zinc-300">
                        <Shield size={48} className="mb-2 opacity-20" />
                        <p className="text-xs font-medium">Tidak ada foto dokumentasi</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-50 p-6 flex justify-between items-center">
                <button 
                  onClick={() => window.print()}
                  className="text-zinc-600 font-bold hover:text-zinc-900 flex items-center gap-2"
                >
                  <History size={18} />
                  Cetak Laporan
                </button>
                <button 
                  onClick={() => setViewInspection(null)}
                  className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
