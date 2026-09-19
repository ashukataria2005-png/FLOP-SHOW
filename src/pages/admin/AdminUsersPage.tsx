import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Wallet,
  ShoppingBag,
  CreditCard,
  Calendar,
  Copy,
  Check,
  X,
  QrCode,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Film,
  Tv,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface AdminUsersPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = () => {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // User Details Modal State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'purchases' | 'transactions' | 'upi' | 'metadata'>('purchases');

  // Password Reset & Security State
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPasswordInput, setShowNewPasswordInput] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<{ password: string; show: boolean } | null>(null);
  const [copiedResetPassword, setCopiedResetPassword] = useState(false);
  const [showBcryptNotice, setShowBcryptNotice] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // User Selection & Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleSelectUser = (userId: string, isAdmin: boolean) => {
    if (isAdmin) return;
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleConfirmDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await api.admin.deleteUsers(selectedIds);
      showToast(res.message || `Deleted ${selectedIds.length} user(s).`, 'success');
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete selected users.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getUsers();
      setUsers(data.users || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch registered users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailsLoading(true);
    setShowResetPassword(false);
    setNewPassword('');
    setShowNewPasswordInput(false);
    setLastResetResult(null);
    setShowBcryptNotice(false);
    setActiveTab('purchases');

    try {
      const res = await api.admin.getUserDetails(userId);
      setUserDetails(res.user);
    } catch (err: any) {
      showToast(err.message || 'Failed to load user profile.', 'error');
      setSelectedUserId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setShowResetPassword(false);
    setNewPassword('');
    setShowNewPasswordInput(false);
    setLastResetResult(null);
    setShowBcryptNotice(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    showToast('User ID copied to clipboard.', 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleToggleUserStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setStatusUpdating(true);
    try {
      await api.admin.updateUserStatus(user.id, nextStatus);
      showToast(`User status updated to ${nextStatus}.`, 'success');
      if (userDetails && userDetails.id === user.id) {
        setUserDetails({ ...userDetails, status: nextStatus });
      }
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPassword.trim();
    if (!selectedUserId || !trimmed || trimmed.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      await api.admin.resetUserPassword(selectedUserId, trimmed);
      showToast('User password successfully reset and re-hashed with bcrypt.', 'success');
      setLastResetResult({ password: trimmed, show: true });
      setShowResetPassword(false);
      setNewPassword('');
      setShowNewPasswordInput(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    return (
      q === '' ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            User Directory & Account Management
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Inspect full user profiles, ledger history, purchases, and secure account controls.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Trash2 size={15} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <div
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF'
            }}
          >
            Total Registered: <span style={{ color: 'var(--brand-gold, #F5C518)' }}>{users.length}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          marginBottom: '24px',
          backgroundColor: 'var(--bg-surface, #12121A)',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 14px 11px 42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px', color: '#9CA3AF' }}>
          <Loader2 className="animate-spin" size={26} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>Retrieving user directory...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Users size={48} style={{ color: '#4B5563', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>No Users Found</h3>
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No user records match your search query.</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ width: '48px', padding: '16px 12px 16px 20px', textAlign: 'center' }}>
                    {/* Manual selection column */}
                  </th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>User Profile</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Wallet Balance</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Purchases</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Registered</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isAdmin = user.role === 'ADMIN';
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Checkbox Column */}
                      <td style={{ padding: '16px 12px 16px 20px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAdmin}
                          onChange={() => handleToggleSelectUser(user.id, isAdmin)}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: '#EF4444',
                            cursor: isAdmin ? 'not-allowed' : 'pointer',
                            opacity: isAdmin ? 0.3 : 1
                          }}
                          title={isAdmin ? 'Admin accounts cannot be deleted' : 'Select user'}
                        />
                      </td>

                      {/* User Profile */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: isAdmin ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: isAdmin ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '15px'
                            }}
                          >
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px' }}>
                              {user.name}
                            </p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Mail size={12} />
                              <span>{user.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                            backgroundColor: isAdmin ? 'rgba(245, 197, 24, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                            color: isAdmin ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'
                          }}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: user.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: user.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                            }}
                          />
                          <span>{user.status || 'ACTIVE'}</span>
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                          ₹{user.balanceRupees || user.wallet_balance_rupees || 0}
                        </span>
                      </td>

                      {/* Purchases */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#D1D5DB' }}>
                          {user.purchaseCount ?? user.purchase_count ?? 0} titles
                        </span>
                      </td>

                      {/* Registered */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenUserDetails(user.id)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(245, 197, 24, 0.15)',
                            border: '1px solid rgba(245, 197, 24, 0.35)',
                            color: 'var(--brand-gold, #F5C518)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER COMPLETE PROFILE / DETAILS MODAL */}
      {selectedUserId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              backgroundColor: '#12121A',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(245, 197, 24, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-gold, #F5C518)',
                    fontWeight: 800,
                    fontSize: '18px'
                  }}
                >
                  {userDetails?.name ? userDetails.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      {userDetails?.name || 'User Profile'}
                    </h2>
                    {userDetails && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          backgroundColor: userDetails.role === 'ADMIN' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: userDetails.role === 'ADMIN' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'
                        }}
                      >
                        {userDetails.role}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
                    {userDetails?.email || 'Loading details...'}
                  </p>
                  {userDetails && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Plan: </span>
                      <span style={{
                        color: userDetails.subscription?.status === 'ACTIVE' ? '#10B981' : 'var(--brand-gold, #F5C518)',
                        fontWeight: 700
                      }}>
                        {userDetails.subscription?.status === 'ACTIVE'
                          ? (userDetails.subscription?.plan_id === 'MONTHLY' ? 'VIP Monthly' : userDetails.subscription?.plan_id === 'YEARLY' ? 'VIP Yearly' : 'VIP Subscription')
                          : 'Free / Standard Plan'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {userDetails && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleToggleUserStatus(userDetails)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: userDetails.status === 'ACTIVE' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      backgroundColor: userDetails.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: userDetails.status === 'ACTIVE' ? '#F87171' : '#10B981',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {userDetails.status === 'ACTIVE' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                    <span>{userDetails.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}</span>
                  </button>
                )}

                <button
                  onClick={handleCloseModal}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              {detailsLoading || !userDetails ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#9CA3AF' }}>
                  <Loader2 className="animate-spin" size={26} style={{ color: 'var(--brand-gold, #F5C518)' }} />
                  <span>Loading full user profile & financial ledger...</span>
                </div>
              ) : (
                <>
                  {/* Account Overview Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Wallet Balance */}
                    <div
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(245, 197, 24, 0.06)',
                        border: '1px solid rgba(245, 197, 24, 0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-gold, #F5C518)', marginBottom: '8px' }}>
                        <Wallet size={20} />
                        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Wallet Balance</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
                        ₹{userDetails.balanceRupees || 0}
                      </div>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>Available for video purchases</p>
                    </div>

                    {/* Total Purchases */}
                    <div
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(16, 185, 129, 0.06)',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10B981', marginBottom: '8px' }}>
                        <ShoppingBag size={20} />
                        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Purchased Titles</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
                        {userDetails.purchaseCount || 0}
                      </div>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>Content titles unlocked</p>
                    </div>

                    {/* Total Amount Spent */}
                    <div
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(99, 102, 241, 0.06)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#818CF8', marginBottom: '8px' }}>
                        <CreditCard size={20} />
                        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Total Spent</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
                        ₹{userDetails.totalSpentRupees || 0}
                      </div>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>Lifetime spend on FLOPSHOW</p>
                    </div>
                  </div>

                  {/* Password & Security Panel */}
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      marginBottom: '24px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10B981'
                          }}
                        >
                          <Lock size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>Password:</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>Hidden / Secured</span>
                            <span style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '2px' }}>••••••••</span>
                            <button
                              type="button"
                              onClick={() => setShowBcryptNotice(prev => !prev)}
                              title={showBcryptNotice ? 'Hide security details' : 'View password security status'}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                color: '#9CA3AF',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                marginLeft: '6px'
                              }}
                            >
                              <Eye size={13} />
                              <span>{showBcryptNotice ? 'Hide Info' : 'Show Details'}</span>
                            </button>
                          </div>
                          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                            Protected with bcrypt-10 cryptographic hash. Plaintext passwords are never stored or exposed.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowResetPassword(prev => !prev);
                          setShowBcryptNotice(false);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: showResetPassword ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 197, 24, 0.15)',
                          border: showResetPassword ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 197, 24, 0.35)',
                          color: showResetPassword ? '#F87171' : 'var(--brand-gold, #F5C518)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <KeyRound size={14} />
                        <span>{showResetPassword ? 'Cancel Reset' : 'Admin Reset Password'}</span>
                      </button>
                    </div>

                    {/* Irreversible Hash Security Notice */}
                    {showBcryptNotice && (
                      <div
                        style={{
                          marginTop: '14px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <AlertCircle size={16} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: '#93C5FD', lineHeight: 1.5 }}>
                          <strong>Cryptographic Security Standard:</strong> The original user password is encrypted via irreversible bcrypt cryptographic hash and is never stored in plaintext. It cannot be recovered or displayed. To change the user credentials, use the <strong>Admin Reset Password</strong> option.
                        </div>
                      </div>
                    )}

                    {/* Newly Reset Password Temporary View Banner */}
                    {lastResetResult && (
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '16px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(245, 197, 24, 0.08)',
                          border: '1px solid rgba(245, 197, 24, 0.35)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={18} color="var(--brand-gold, #F5C518)" />
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Newly Reset Password (Temporary View)
                            </span>
                          </div>
                          <button
                            onClick={() => setLastResetResult(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Dismiss temporary password view"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div
                          style={{
                            fontSize: '12px',
                            color: '#FDE68A',
                            lineHeight: 1.4,
                            marginBottom: '12px'
                          }}
                        >
                          <strong>Notice:</strong> This is the <strong>newly reset password</strong> set by the administrator, <em>NOT a recovered old password</em>. Please copy and provide it to the user now. For security, it is held only in memory and will not be displayed again once dismissed.
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              flex: 1,
                              minWidth: '220px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.45)',
                              border: '1px solid rgba(245, 197, 24, 0.4)',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              color: '#FFFFFF',
                              letterSpacing: lastResetResult.show ? '1px' : '3px'
                            }}
                          >
                            {lastResetResult.show ? lastResetResult.password : '••••••••••••'}
                          </div>

                          <button
                            type="button"
                            onClick={() => setLastResetResult(prev => prev ? { ...prev, show: !prev.show } : null)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#FFFFFF',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            {lastResetResult.show ? <EyeOff size={15} /> : <Eye size={15} />}
                            <span>{lastResetResult.show ? 'Hide' : 'Show'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lastResetResult.password);
                              setCopiedResetPassword(true);
                              setTimeout(() => setCopiedResetPassword(false), 2000);
                              showToast('Newly reset password copied to clipboard!', 'success');
                            }}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '8px',
                              backgroundColor: copiedResetPassword ? '#10B981' : 'var(--brand-gold, #F5C518)',
                              border: 'none',
                              color: '#0E0E12',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 800
                            }}
                          >
                            {copiedResetPassword ? <Check size={15} /> : <Copy size={15} />}
                            <span>{copiedResetPassword ? 'Copied!' : 'Copy Password'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLastResetResult(null)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Done & Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reset Password Form */}
                    {showResetPassword && (
                      <form
                        onSubmit={handleResetPasswordSubmit}
                        style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                          <input
                            type={showNewPasswordInput ? 'text' : 'password'}
                            placeholder="Enter new password (min 6 characters)..."
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 42px 10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#FFFFFF',
                              fontSize: '13px',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPasswordInput(prev => !prev)}
                            title={showNewPasswordInput ? 'Hide password' : 'Show password'}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px'
                            }}
                          >
                            {showNewPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={isResetting}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--brand-gold, #F5C518)',
                            color: '#0E0E12',
                            fontSize: '13px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {isResetting ? 'Hashing & Updating...' : 'Set & Hash New Password'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Tabs Navigation */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      marginBottom: '20px'
                    }}
                  >
                    <button
                      onClick={() => setActiveTab('purchases')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeTab === 'purchases' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'purchases' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShoppingBag size={15} />
                      <span>Purchases ({userDetails.purchases?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('transactions')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeTab === 'transactions' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'transactions' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Wallet Ledger ({userDetails.transactions?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('upi')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeTab === 'upi' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'upi' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <QrCode size={15} />
                      <span>UPI Recharges ({userDetails.upiRecharges?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('metadata')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeTab === 'metadata' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'metadata' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Calendar size={15} />
                      <span>Account Metadata</span>
                    </button>
                  </div>

                  {/* Tab 1: Purchases */}
                  {activeTab === 'purchases' && (
                    <div>
                      {!userDetails.purchases || userDetails.purchases.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                          <ShoppingBag size={36} style={{ color: '#4B5563', margin: '0 auto 12px' }} />
                          <p style={{ margin: 0 }}>This user has not made any content purchases yet.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {userDetails.purchases.map((purchase: any) => (
                            <div
                              key={purchase.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                {purchase.content_poster ? (
                                  <img
                                    src={purchase.content_poster}
                                    alt={purchase.content_title}
                                    style={{ width: '42px', height: '58px', objectFit: 'cover', borderRadius: '6px' }}
                                  />
                                ) : (
                                  <div style={{ width: '42px', height: '58px', borderRadius: '6px', backgroundColor: '#1F1F2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {purchase.content_type === 'series' ? <Tv size={18} color="#9CA3AF" /> : <Film size={18} color="#9CA3AF" />}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                                    {purchase.content_title || 'Purchased Content'}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ textTransform: 'uppercase' }}>{purchase.content_type || 'MEDIA'}</span>
                                    <span>•</span>
                                    <span>{new Date(purchase.purchased_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                                  ₹{purchase.amountRupees || 0}
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>
                                  {purchase.status || 'COMPLETED'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Wallet Transactions */}
                  {activeTab === 'transactions' && (
                    <div>
                      {!userDetails.transactions || userDetails.transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                          <CreditCard size={36} style={{ color: '#4B5563', margin: '0 auto 12px' }} />
                          <p style={{ margin: 0 }}>No wallet ledger transactions recorded for this user.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userDetails.transactions.map((tx: any) => {
                            const isCredit = tx.type === 'CREDIT' || tx.type === 'RECHARGE';
                            return (
                              <div
                                key={tx.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '8px',
                                      backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: isCredit ? '#10B981' : '#F87171',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                                      {tx.description || tx.type}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                      Ref: {tx.reference_id || tx.id} • {new Date(tx.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: isCredit ? '#10B981' : '#F87171' }}>
                                    {isCredit ? `+₹${tx.amountRupees || 0}` : `-₹${tx.amountRupees || 0}`}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                    Bal: ₹{tx.balanceAfterRupees || 0}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: UPI Recharges */}
                  {activeTab === 'upi' && (
                    <div>
                      {!userDetails.upiRecharges || userDetails.upiRecharges.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                          <QrCode size={36} style={{ color: '#4B5563', margin: '0 auto 12px' }} />
                          <p style={{ margin: 0 }}>No UPI recharge requests submitted by this user.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userDetails.upiRecharges.map((req: any) => (
                            <div
                              key={req.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                                  UTR: <span style={{ fontFamily: 'monospace', color: 'var(--brand-gold, #F5C518)' }}>{req.utr}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                  Submitted: {new Date(req.created_at).toLocaleString()}
                                  {req.admin_note && ` • Note: ${req.admin_note}`}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                                  ₹{req.amountRupees || 0}
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: req.status === 'APPROVED' ? '#10B981' : req.status === 'PENDING' ? '#F59E0B' : '#EF4444'
                                  }}
                                >
                                  {req.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Account Metadata */}
                  {activeTab === 'metadata' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* User ID */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>User ID</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF' }}>{userDetails.id}</span>
                          <button
                            onClick={() => handleCopy(userDetails.id)}
                            title="Copy ID"
                            style={{ background: 'none', border: 'none', color: copiedId ? '#10B981' : '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            {copiedId ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Email Address</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{userDetails.email}</span>
                      </div>

                      {/* Role */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>System Role</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: userDetails.role === 'ADMIN' ? 'var(--brand-gold, #F5C518)' : '#FFFFFF' }}>
                          {userDetails.role}
                        </span>
                      </div>

                      {/* Account Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Account Status</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: userDetails.status === 'ACTIVE' ? '#10B981' : '#EF4444' }}>
                          {userDetails.status || 'ACTIVE'}
                        </span>
                      </div>

                      {/* Registered Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Registered On</span>
                        <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                          {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      {/* Last Updated */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Last Activity / Update</span>
                        <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                          {userDetails.updatedAt ? new Date(userDetails.updatedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#161622',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444'
                }}
              >
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Delete {selectedIds.length} selected user{selectedIds.length > 1 ? 's' : ''}?
                </h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '24px' }}>
              Are you sure you want to permanently delete {selectedIds.length === 1 ? 'this user' : `these ${selectedIds.length} users`}? All associated wallet balances, purchases, and subscriptions will also be removed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)'
                }}
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
