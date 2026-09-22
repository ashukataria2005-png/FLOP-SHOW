import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Users,
  Crown,
  RefreshCw,
  Power
} from 'lucide-react';

interface AdminSecurityPageProps {
  onNavigateTab?: (tab: string, param?: string) => void;
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

export const AdminSecurityPage: React.FC<AdminSecurityPageProps> = () => {
  const { showToast } = useApp();

  // Current session admin
  const currentAdminUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('flops_admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Section A: Credential Manager State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState(currentAdminUser?.email || 'ashukataria2005@gmail.com');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  // Section B: Administrators List State
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [adminToDelete, setAdminToDelete] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await api.admin.subAdmins.list();
      setAdmins(res.admins || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch administrator list.', 'error');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Update Master Super Admin Credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.', 'error');
      return;
    }

    if (newPassword && !currentPassword) {
      showToast('Current master password is required to set a new password.', 'error');
      return;
    }

    if (!newPassword && adminEmail.trim().toLowerCase() === (currentAdminUser?.email || '').toLowerCase()) {
      showToast('No changes detected in credentials or contact email.', 'info');
      return;
    }

    try {
      setIsUpdatingCredentials(true);
      const payload: { currentPassword?: string; newPassword?: string; email?: string } = {};

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (adminEmail.trim()) {
        payload.email = adminEmail.trim().toLowerCase();
      }

      const res = await api.admin.security.updateCredentials(payload);
      showToast(res.message || 'Master credentials updated successfully!', 'success');

      // Update local storage if email changed
      if (payload.email && currentAdminUser) {
        const updated = { ...currentAdminUser, email: payload.email };
        localStorage.setItem('flops_admin_user', JSON.stringify(updated));
      }

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to update credentials. Please check current password.', 'error');
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // Toggle Sub-Admin Status (Active <-> Suspended)
  const handleToggleStatus = async (admin: AdminUserItem) => {
    if (admin.is_super_admin || admin.email.toLowerCase() === 'ashukataria2005@gmail.com') {
      showToast('Root Super Admin status cannot be altered.', 'error');
      return;
    }

    const newStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      setActionLoadingId(admin.id);
      await api.admin.subAdmins.setStatus(admin.id, newStatus);
      showToast(`Administrator status set to ${newStatus}.`, 'success');
      setAdmins(prev =>
        prev.map(a => (a.id === admin.id ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update administrator status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Sub-Admin Confirmation
  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    if (adminToDelete.is_super_admin || adminToDelete.email.toLowerCase() === 'ashukataria2005@gmail.com') {
      showToast('Root Super Admin cannot be deleted.', 'error');
      setAdminToDelete(null);
      return;
    }

    try {
      setIsDeleting(true);
      await api.admin.subAdmins.delete(adminToDelete.id);
      showToast(`Administrator "${adminToDelete.name}" was permanently removed.`, 'success');
      setAdmins(prev => prev.filter(a => a.id !== adminToDelete.id));
      setAdminToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete administrator.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.status === 'ACTIVE').length;
  const subAdminsCount = admins.filter(a => !a.is_super_admin && a.email.toLowerCase() !== 'ashukataria2005@gmail.com').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <KeyRound size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Admin Security & Credentials
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldCheck size={12} /> Root Protected
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">
              Manage master Super Admin access keys and overview/revoke team credentials.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdmins}
          disabled={loadingAdmins}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold text-sm transition-all shadow-sm hover:text-white"
        >
          <RefreshCw size={16} className={loadingAdmins ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Master Super Admin</span>
            <Crown size={20} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-black text-amber-400 truncate">ashukataria2005@gmail.com</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Immutable Root Owner • Wildcard [*] Access</p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Active Sub-Admins</span>
            <Users size={20} className="text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{subAdminsCount}</span>
            <span className="text-xs text-neutral-400">accounts</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Delegated team members with restricted roles</p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Admin Accounts</span>
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{totalAdmins}</span>
            <span className="text-xs text-neutral-400">({activeAdmins} active)</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Fully purged of all dummy & test credentials</p>
        </div>
      </div>

      {/* SECTION A: Super Admin Master Credentials Manager */}
      <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Master Super Admin Credentials
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Owner Only
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Update your master login password and primary root notification email.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateCredentials} className="space-y-6 max-w-2xl">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Primary Super Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="ashukataria2005@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-neutral-950/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1.5">
              This email is granted absolute master bypass privileges across all administrative operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3.5 pr-10 py-3 bg-neutral-950/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-3.5 pr-10 py-3 bg-neutral-950/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-3.5 pr-10 py-3 bg-neutral-950/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isUpdatingCredentials}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingCredentials ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Updating Master Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Update Master Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION B: All Admins & Sub-Admins Overview & Deletion */}
      <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                All Active Administrative Accounts
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Audit credentials, toggle sub-admin active states, and purge unauthorized users with 1 click.
              </p>
            </div>
          </div>
        </div>

        {loadingAdmins ? (
          <div className="py-16 text-center">
            <Loader2 size={32} className="animate-spin mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-neutral-400">Loading administrator registry...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <ShieldAlert size={40} className="mx-auto text-neutral-500 mb-2" />
            <p>No administrators found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  <th className="pb-3 pl-2">Administrator</th>
                  <th className="pb-3 px-3">Role & Authority</th>
                  <th className="pb-3 px-3">Permissions Scope</th>
                  <th className="pb-3 px-3">Account Status</th>
                  <th className="pb-3 pr-2 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {admins.map(admin => {
                  const isRoot = admin.is_super_admin || admin.email.toLowerCase() === 'ashukataria2005@gmail.com';
                  const isCurrent = currentAdminUser?.id === admin.id;

                  return (
                    <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 pl-2 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                              isRoot
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {isRoot ? <Crown size={18} /> : <User size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-2 truncate">
                              <span>{admin.name || 'Admin'}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 truncate">{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Authority */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {isRoot ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-300 shadow-sm">
                            <Crown size={13} /> Root Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300">
                            <ShieldCheck size={13} /> Sub-Admin
                          </span>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="py-4 px-3">
                        {isRoot ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Full Unrestricted Access [*]
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {admin.permissions && admin.permissions.length > 0 ? (
                              admin.permissions.map(p => (
                                <span
                                  key={p}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-neutral-500 italic">No modules granted</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {isRoot ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 size={12} /> Permanent Active
                          </span>
                        ) : admin.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-2 text-right whitespace-nowrap">
                        {isRoot ? (
                          <span className="text-xs font-semibold text-neutral-500 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-lg">
                            Protected Owner
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Suspend / Activate Toggle */}
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              disabled={actionLoadingId === admin.id}
                              title={admin.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                              className={`p-2 rounded-lg border transition-all text-xs font-semibold inline-flex items-center gap-1.5 ${
                                admin.status === 'ACTIVE'
                                  ? 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border-white/10 hover:text-white'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              <Power size={14} />
                              <span className="hidden sm:inline">
                                {admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </span>
                            </button>

                            {/* 1-Click Delete Account */}
                            <button
                              onClick={() => setAdminToDelete(admin)}
                              title="Permanently Delete Account"
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 transition-all text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-white">Delete Administrator Account?</h3>
            <p className="text-sm text-neutral-300 mt-2">
              Are you sure you want to permanently delete administrator{' '}
              <strong className="text-white font-semibold">{adminToDelete.name}</strong> (
              <span className="text-neutral-400">{adminToDelete.email}</span>)?
            </p>
            <p className="text-xs text-red-400 mt-2 font-medium">
              This action is immediate and irrevocable. Their administrative access token will be instantly revoked.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdmin}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Confirm Delete</span>
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
