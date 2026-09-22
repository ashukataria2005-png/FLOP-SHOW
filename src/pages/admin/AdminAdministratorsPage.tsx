import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  KeyRound,
  Shield,
  Layers,
  Sparkles,
  BarChart3,
  CreditCard,
  Tag,
  Film,
  Users,
  Settings,
  DollarSign
} from 'lucide-react';

interface AdminAdministratorsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  is_super_admin: boolean;
  permissions: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

const MODULE_PERMISSIONS = [
  {
    key: 'analytics',
    label: 'Analytics & Revenue',
    icon: BarChart3,
    color: 'emerald',
    description: 'Overview, Revenue, and Watch Pass Analytics',
  },
  {
    key: 'monetization',
    label: 'Plans & Monetization',
    icon: DollarSign,
    color: 'amber',
    description: 'Subscription Plans, Pricing & Custom Title Pricing',
  },
  {
    key: 'promos',
    label: 'Promos & Bonus Hub',
    icon: Tag,
    color: 'purple',
    description: 'Promo Codes, Discounts, and Bonus Hub Management',
  },
  {
    key: 'payments',
    label: 'Payments & UTR',
    icon: CreditCard,
    color: 'blue',
    description: 'Manual Payment Approvals, UTR Verification & History',
  },
  {
    key: 'catalog',
    label: 'Catalog & Media',
    icon: Film,
    color: 'rose',
    description: 'Movies, Series, Episodes, Hero Banner & Spotlight',
  },
  {
    key: 'users',
    label: 'User Management',
    icon: Users,
    color: 'indigo',
    description: 'Registered Users, Wallets, Purchases & Activity',
  },
  {
    key: 'settings',
    label: 'System & Reset',
    icon: Settings,
    color: 'cyan',
    description: 'Platform Theme, System Settings & Financial Reset',
  },
];

export const AdminAdministratorsPage: React.FC<AdminAdministratorsPageProps> = () => {
  const { user: currentUser, showToast } = useApp();
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permissions: [] as string[],
  });

  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    password: '',
    permissions: [] as string[],
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });

  const [deletingAdmin, setDeletingAdmin] = useState<AdminUserItem | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.admin.subAdmins.list();
      setAdmins(res.admins || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load administrators.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      permissions: ['analytics', 'catalog'],
    });
    setShowAddModal(true);
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and Email are required.', 'error');
      return;
    }
    if (!formData.password.trim() || formData.password.trim().length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (formData.permissions.length === 0) {
      showToast('Please grant at least one module permission.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.admin.subAdmins.create({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        permissions: formData.permissions,
      });
      showToast(`Sub-admin "${formData.name.trim()}" created successfully!`, 'success');
      setShowAddModal(false);
      await fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to create sub-admin.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (admin: AdminUserItem) => {
    setEditingAdmin(admin);
    setEditFormData({
      name: admin.name,
      password: '',
      permissions: admin.permissions || [],
      status: admin.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    if (!editFormData.name.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (editFormData.password.trim() && editFormData.password.trim().length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (!editingAdmin.is_super_admin && editFormData.permissions.length === 0) {
      showToast('Please assign at least one module permission.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.admin.subAdmins.update(editingAdmin.id, {
        name: editFormData.name.trim(),
        password: editFormData.password.trim() ? editFormData.password.trim() : undefined,
        permissions: editingAdmin.is_super_admin ? undefined : editFormData.permissions,
        status: editingAdmin.is_super_admin ? 'ACTIVE' : editFormData.status,
      });
      showToast(`Administrator updated successfully.`, 'success');
      setShowEditModal(false);
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to update administrator.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUserItem) => {
    if (admin.is_super_admin) {
      showToast('Super Admin accounts cannot be suspended.', 'error');
      return;
    }
    const newStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.admin.subAdmins.setStatus(admin.id, newStatus);
      showToast(`Administrator status changed to ${newStatus}.`, 'success');
      setAdmins(prev =>
        prev.map(a => (a.id === admin.id ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleOpenDeleteModal = (admin: AdminUserItem) => {
    if (admin.is_super_admin) {
      showToast('Super Admin accounts cannot be deleted.', 'error');
      return;
    }
    if (admin.id === currentUser?.id) {
      showToast('You cannot delete your own account.', 'error');
      return;
    }
    setDeletingAdmin(admin);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAdmin) return;
    try {
      setSubmitting(true);
      await api.admin.subAdmins.delete(deletingAdmin.id);
      showToast(`Administrator "${deletingAdmin.name}" deleted.`, 'success');
      setShowDeleteModal(false);
      setDeletingAdmin(null);
      await fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete administrator.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermissionInAdd = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(k => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const togglePermissionInEdit = (key: string) => {
    setEditFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(k => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const filteredAdmins = admins.filter(admin => {
    const q = searchQuery.toLowerCase();
    return (
      admin.name.toLowerCase().includes(q) ||
      admin.email.toLowerCase().includes(q) ||
      (admin.is_super_admin ? 'super admin' : 'sub-admin').includes(q)
    );
  });

  const totalAdmins = admins.length;
  const totalSuperAdmins = admins.filter(a => a.is_super_admin).length;
  const totalSubAdmins = admins.filter(a => !a.is_super_admin).length;
  const activeCount = admins.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in text-white pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-zinc-100">
                  Manage Administrators & RBAC
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Super Admin Only
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                Configure team permissions, delegate administrative modules, and secure platform access.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add New Sub-Admin
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-lg bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Admins</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">{totalAdmins}</p>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Super Admins</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{totalSuperAdmins}</p>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Sub-Admins</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">{totalSubAdmins}</p>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Active Accounts</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search admin name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 w-full sm:w-auto justify-end">
            <span>Showing {filteredAdmins.length} of {totalAdmins} admin accounts</span>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm">Loading administrators directory...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <ShieldAlert className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-200">No Administrators Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search keywords.' : 'No administrators have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-950/40">
                  <th className="py-3.5 px-4">Administrator</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Active Permissions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredAdmins.map(admin => {
                  const isCurrent = admin.id === currentUser?.id;
                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${
                            admin.is_super_admin
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}>
                            {admin.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                {admin.name}
                                {isCurrent && (
                                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700">
                                    You
                                  </span>
                                )}
                              </p>
                            </div>
                            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {admin.is_super_admin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            <Shield className="w-3 h-3 text-zinc-400" />
                            SUB-ADMIN
                          </span>
                        )}
                      </td>

                      {/* Permissions Badges */}
                      <td className="py-4 px-4">
                        {admin.is_super_admin ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            <Check className="w-3.5 h-3.5" /> Full Root Bypass (All 7 Modules)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {admin.permissions && admin.permissions.length > 0 ? (
                              admin.permissions.map(permKey => {
                                const mod = MODULE_PERMISSIONS.find(m => m.key === permKey);
                                return (
                                  <span
                                    key={permKey}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/80 inline-flex items-center gap-1"
                                  >
                                    {mod ? (
                                      <>
                                        <mod.icon className="w-3 h-3 text-amber-400" />
                                        {mod.label.split('&')[0].trim()}
                                      </>
                                    ) : (
                                      permKey
                                    )}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-rose-400 italic">No permissions assigned</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={admin.is_super_admin}
                          onClick={() => handleToggleStatus(admin)}
                          title={admin.is_super_admin ? 'Super Admin cannot be suspended' : 'Click to toggle status'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            admin.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                          } ${admin.is_super_admin ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          {admin.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-4 text-xs text-zinc-400 whitespace-nowrap">
                        {admin.last_login_at ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{new Date(admin.last_login_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Never logged in</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(admin)}
                            title="Edit Permissions & Password"
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!admin.is_super_admin && (
                            <button
                              onClick={() => handleOpenDeleteModal(admin)}
                              title="Delete Sub-Admin"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Sub-Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Add New Sub-Admin</h3>
                  <p className="text-xs text-zinc-400">Configure credentials and module permissions</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Admin Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@flopshow.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Password <span className="text-rose-400">*</span> (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Permissions Header & Quick Toggles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Module Permissions ({formData.permissions.length}/{MODULE_PERMISSIONS.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: MODULE_PERMISSIONS.map(m => m.key) })}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-[11px] text-zinc-400 hover:text-zinc-300 font-medium underline-offset-2 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {MODULE_PERMISSIONS.map(mod => {
                    const checked = formData.permissions.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => togglePermissionInAdd(mod.key)}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all ${
                          checked
                            ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                            : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}} // Handled by parent div
                          className="mt-1 rounded accent-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <mod.icon className={`w-4 h-4 ${checked ? 'text-amber-400' : 'text-zinc-500'}`} />
                            <span className="text-sm font-semibold">{mod.label}</span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Sub-Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-Admin Modal */}
      {showEditModal && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">
                    Edit Administrator: {editingAdmin.name}
                  </h3>
                  <p className="text-xs text-zinc-400">{editingAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubAdmin} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Password (Optional reset) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Change Password <span className="text-zinc-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Enter new password (optional)"
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status */}
              {!editingAdmin.is_super_admin && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">Active (Can Login & Access)</option>
                    <option value="SUSPENDED">Suspended (Access Blocked)</option>
                  </select>
                </div>
              )}

              {/* Permissions */}
              {editingAdmin.is_super_admin ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Super Administrator Account:</span> Super Admins always possess root bypass access across all platform modules. Permissions cannot be restricted.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Module Permissions ({editFormData.permissions.length}/{MODULE_PERMISSIONS.length})
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, permissions: MODULE_PERMISSIONS.map(m => m.key) })}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, permissions: [] })}
                        className="text-[11px] text-zinc-400 hover:text-zinc-300 font-medium underline-offset-2 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {MODULE_PERMISSIONS.map(mod => {
                      const checked = editFormData.permissions.includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          onClick={() => togglePermissionInEdit(mod.key)}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all ${
                            checked
                              ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                              : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-1 rounded accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <mod.icon className={`w-4 h-4 ${checked ? 'text-amber-400' : 'text-zinc-500'}`} />
                              <span className="text-sm font-semibold">{mod.label}</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">{mod.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-zinc-100">
              Revoke & Delete Administrator?
            </h3>
            <p className="text-sm text-zinc-400 mt-2">
              Are you sure you want to delete <span className="text-white font-semibold">{deletingAdmin.name}</span> ({deletingAdmin.email})? They will immediately lose all access to the FLOPSHOW Admin Panel.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAdmin(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Delete Admin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
