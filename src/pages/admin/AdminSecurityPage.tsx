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
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px 80px',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* 1. Header Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.08) 0%, rgba(18, 18, 26, 0.9) 60%, rgba(18, 18, 26, 0.95) 100%)',
          border: '1px solid rgba(245, 166, 35, 0.25)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #F5A623 0%, #D97706 100%)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245, 166, 35, 0.3)'
            }}
          >
            <KeyRound size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Security & Credentials
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 166, 35, 0.15)',
                  color: '#F5A623',
                  border: '1px solid rgba(245, 166, 35, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ShieldCheck size={12} /> Root Protected
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Manage master Super Admin access keys and overview/revoke team credentials.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdmins}
          disabled={loadingAdmins}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#D1D5DB',
            fontWeight: 600,
            fontSize: '13px',
            cursor: loadingAdmins ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={15} className={loadingAdmins ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Metric 1: Root Super Admin */}
        <div
          style={{
            backgroundColor: '#12121A',
            border: '1px solid rgba(245, 166, 35, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
              Master Super Admin
            </span>
            <Crown size={20} style={{ color: '#F5A623' }} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#F5A623', wordBreak: 'break-all' }}>
              ashukataria2005@gmail.com
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0' }}>
              Immutable Root Owner • Wildcard [*] Access
            </p>
          </div>
        </div>

        {/* Metric 2: Active Sub-Admins */}
        <div
          style={{
            backgroundColor: '#12121A',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
              Active Sub-Admins
            </span>
            <Users size={20} style={{ color: '#3B82F6' }} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF' }}>{subAdminsCount}</span>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>delegated accounts</span>
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0' }}>
              Assigned module roles with revoked root access
            </p>
          </div>
        </div>

        {/* Metric 3: Total Accounts */}
        <div
          style={{
            backgroundColor: '#12121A',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
              Verified Administrators
            </span>
            <ShieldCheck size={20} style={{ color: '#10B981' }} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#10B981' }}>{totalAdmins}</span>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>({activeAdmins} active)</span>
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0' }}>
              Clean registry • 0 dummy or test accounts
            </p>
          </div>
        </div>
      </div>

      {/* 3. SECTION A: Super Admin Master Credentials Manager */}
      <div
        style={{
          backgroundColor: '#12121A',
          border: '1px solid rgba(245, 166, 35, 0.2)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 166, 35, 0.12)',
              border: '1px solid rgba(245, 166, 35, 0.3)',
              color: '#F5A623',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Lock size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Master Super Admin Credentials
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 166, 35, 0.2)',
                  color: '#F5A623',
                  border: '1px solid rgba(245, 166, 35, 0.35)'
                }}
              >
                Owner Only
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '2px 0 0' }}>
              Update your master login password and primary root notification email.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '780px' }}>
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D1D5DB', marginBottom: '8px' }}>
              Primary Super Admin Contact Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="ashukataria2005@gmail.com"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '6px 0 0' }}>
              This email is recognized as the sole master owner with full administrative bypass privileges.
            </p>
          </div>

          {/* Password Fields Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              paddingTop: '6px'
            }}
          >
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D1D5DB', marginBottom: '8px' }}>
                Current Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D1D5DB', marginBottom: '8px' }}>
                New Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D1D5DB', marginBottom: '8px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
            <button
              type="submit"
              disabled={isUpdatingCredentials}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F5A623 0%, #D97706 100%)',
                color: '#000000',
                fontWeight: 800,
                fontSize: '14px',
                border: 'none',
                cursor: isUpdatingCredentials ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(245, 166, 35, 0.3)',
                transition: 'all 0.2s ease',
                opacity: isUpdatingCredentials ? 0.6 : 1
              }}
            >
              {isUpdatingCredentials ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Master Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Update Master Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4. SECTION B: All Admins & Sub-Admins Overview & Deletion */}
      <div
        style={{
          backgroundColor: '#12121A',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              All Active Administrative Accounts
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '2px 0 0' }}>
              Audit credentials, toggle sub-admin active states, and purge unauthorized users with 1 click.
            </p>
          </div>
        </div>

        {loadingAdmins ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#F5A623' }} />
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Loading administrator registry...</p>
          </div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF' }}>
            <ShieldAlert size={40} style={{ margin: '0 auto 8px', color: '#6B7280' }} />
            <p>No administrators found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 16px 12px 8px' }}>Administrator</th>
                  <th style={{ padding: '12px 16px' }}>Role & Authority</th>
                  <th style={{ padding: '12px 16px' }}>Permissions Scope</th>
                  <th style={{ padding: '12px 16px' }}>Account Status</th>
                  <th style={{ padding: '12px 8px 12px 16px', textAlign: 'right' }}>Security Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => {
                  const isRoot = admin.is_super_admin || admin.email.toLowerCase() === 'ashukataria2005@gmail.com';
                  const isCurrent = currentAdminUser?.id === admin.id;

                  return (
                    <tr
                      key={admin.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '16px 16px 16px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px',
                              flexShrink: 0,
                              backgroundColor: isRoot ? 'rgba(245, 166, 35, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              border: isRoot ? '1px solid rgba(245, 166, 35, 0.35)' : '1px solid rgba(59, 130, 246, 0.25)',
                              color: isRoot ? '#F5A623' : '#3B82F6'
                            }}
                          >
                            {isRoot ? <Crown size={18} /> : <User size={18} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#FFFFFF', fontSize: '14px' }}>
                              <span>{admin.name || 'Admin'}</span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '9999px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: '#D1D5DB',
                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Authority */}
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        {isRoot ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: 'rgba(245, 166, 35, 0.15)',
                              border: '1px solid rgba(245, 166, 35, 0.35)',
                              color: '#F5A623'
                            }}
                          >
                            <Crown size={12} /> Root Super Admin
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              color: '#93C5FD'
                            }}
                          >
                            <ShieldCheck size={12} /> Sub-Admin
                          </span>
                        )}
                      </td>

                      {/* Permissions */}
                      <td style={{ padding: '16px' }}>
                        {isRoot ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: '#10B981'
                            }}
                          >
                            Full Unrestricted Access [*]
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '320px' }}>
                            {admin.permissions && admin.permissions.length > 0 ? (
                              admin.permissions.map(p => (
                                <span
                                  key={p}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#D1D5DB'
                                  }}
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>No modules granted</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        {isRoot ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#10B981'
                            }}
                          >
                            <CheckCircle2 size={12} /> Permanent Active
                          </span>
                        ) : admin.status === 'ACTIVE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: '#10B981'
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#F87171'
                            }}
                          >
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 8px 16px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isRoot ? (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#6B7280',
                              padding: '4px 10px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '8px'
                            }}
                          >
                            Protected Owner
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {/* Suspend / Activate Toggle */}
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              disabled={actionLoadingId === admin.id}
                              title={admin.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                backgroundColor: admin.status === 'ACTIVE' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 185, 129, 0.15)',
                                border: admin.status === 'ACTIVE' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(16, 185, 129, 0.3)',
                                color: admin.status === 'ACTIVE' ? '#D1D5DB' : '#10B981'
                              }}
                            >
                              <Power size={13} />
                              <span>{admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</span>
                            </button>

                            {/* 1-Click Delete Account */}
                            <button
                              onClick={() => setAdminToDelete(admin)}
                              title="Permanently Delete Account"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#F87171',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
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

      {/* 5. Delete Confirmation Modal */}
      {adminToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div
            style={{
              backgroundColor: '#161622',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Delete Administrator Account?
            </h3>
            <p style={{ fontSize: '14px', color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete administrator{' '}
              <strong style={{ color: '#FFFFFF' }}>{adminToDelete.name}</strong> (
              <span style={{ color: '#9CA3AF' }}>{adminToDelete.email}</span>)?
            </p>
            <p style={{ fontSize: '12px', color: '#F87171', margin: 0, fontWeight: 600 }}>
              This action is immediate and irrevocable. Their administrative access token will be instantly revoked.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdmin}
                disabled={isDeleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
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
