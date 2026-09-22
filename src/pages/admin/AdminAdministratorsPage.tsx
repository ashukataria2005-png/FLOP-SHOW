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
    color: '#10B981',
    description: 'Overview, Revenue, and Watch Pass Analytics',
  },
  {
    key: 'monetization',
    label: 'Plans & Monetization',
    icon: DollarSign,
    color: '#F5A623',
    description: 'Subscription Plans, Pricing & Custom Title Pricing',
  },
  {
    key: 'promos',
    label: 'Promos & Bonus Hub',
    icon: Tag,
    color: '#A855F7',
    description: 'Promo Codes, Discounts, and Bonus Hub Management',
  },
  {
    key: 'payments',
    label: 'Payments & UTR',
    icon: CreditCard,
    color: '#3B82F6',
    description: 'Manual Payment Approvals, UTR Verification & History',
  },
  {
    key: 'catalog',
    label: 'Catalog & Media',
    icon: Film,
    color: '#EC4899',
    description: 'Movies, Series, Episodes, Hero Banner & Spotlight',
  },
  {
    key: 'users',
    label: 'User Management',
    icon: Users,
    color: '#6366F1',
    description: 'Registered Users, Wallets, Purchases & Activity',
  },
  {
    key: 'settings',
    label: 'System & Reset',
    icon: Settings,
    color: '#06B6D4',
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
    <div
      className="admin-rbac-page"
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
        className="admin-rbac-header-card"
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
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                Administrators & Role-Based Access Control
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
                <Sparkles size={12} /> Super Admin Only
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Delegate administrative modules, provision sub-admins, and manage team permissions.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            background: 'linear-gradient(135deg, #F5A623 0%, #D97706 100%)',
            color: '#000000',
            fontWeight: 700,
            fontSize: '13.5px',
            padding: '11px 20px',
            borderRadius: '12px',
            boxShadow: '0 6px 20px rgba(245, 166, 35, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.15s ease',
            zIndex: 1
          }}
        >
          <UserPlus size={16} />
          <span>Add New Administrator</span>
        </button>
      </div>

      {/* 2. Modern Stats Overview Grid */}
      <div
        className="admin-rbac-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Total Admins */}
        <div
          className="admin-rbac-stat-card"
          style={{
            background: 'rgba(18, 18, 26, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Total Admins
            </p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
              {totalAdmins}
            </p>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F5A623'
            }}
          >
            <Shield size={22} />
          </div>
        </div>

        {/* Super Admins */}
        <div
          className="admin-rbac-stat-card"
          style={{
            background: 'rgba(18, 18, 26, 0.85)',
            border: '1px solid rgba(245, 166, 35, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Super Admins
            </p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#F5A623', margin: '4px 0 0' }}>
              {totalSuperAdmins}
            </p>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 166, 35, 0.12)',
              border: '1px solid rgba(245, 166, 35, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F5A623'
            }}
          >
            <Sparkles size={22} />
          </div>
        </div>

        {/* Sub-Admins */}
        <div
          className="admin-rbac-stat-card"
          style={{
            background: 'rgba(18, 18, 26, 0.85)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Delegated Sub-Admins
            </p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#60A5FA', margin: '4px 0 0' }}>
              {totalSubAdmins}
            </p>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA'
            }}
          >
            <Layers size={22} />
          </div>
        </div>

        {/* Active Accounts */}
        <div
          className="admin-rbac-stat-card"
          style={{
            background: 'rgba(18, 18, 26, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Active Accounts
            </p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#34D399', margin: '4px 0 0' }}>
              {activeCount}
            </p>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399'
            }}
          >
            <Check size={22} />
          </div>
        </div>
      </div>

      {/* 3. Sub-Admins Table & Card List */}
      <div
        className="admin-rbac-table-card"
        style={{
          background: 'rgba(18, 18, 26, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Search & Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }}
            />
            <input
              type="text"
              placeholder="Search admin name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Showing <strong style={{ color: '#FFFFFF' }}>{filteredAdmins.length}</strong> of {totalAdmins} administrators</span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={28} className="animate-spin" color="#F5A623" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading administrators directory...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
            <ShieldAlert size={36} color="#6B7280" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No Administrators Found</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '6px 0 0' }}>
              {searchQuery ? 'No accounts matched your search keyword.' : 'No administrators registered yet.'}
            </p>
          </div>
        ) : (
          <div className="admin-rbac-table-scroll" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="admin-rbac-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Administrator</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Role</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Assigned Permissions</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Account Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Last Login</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map(admin => {
                  const isCurrent = admin.id === currentUser?.id;
                  return (
                    <tr
                      key={admin.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              backgroundColor: admin.is_super_admin ? 'rgba(245, 166, 35, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              color: admin.is_super_admin ? '#F5A623' : '#E5E7EB',
                              border: admin.is_super_admin ? '1px solid rgba(245, 166, 35, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)'
                            }}
                          >
                            {admin.name.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
                                {admin.name}
                              </span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: '#D1D5DB'
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                              <Mail size={12} color="#6B7280" />
                              <span>{admin.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {admin.is_super_admin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              backgroundColor: 'rgba(245, 166, 35, 0.15)',
                              color: '#F5A623',
                              border: '1px solid rgba(245, 166, 35, 0.35)',
                              boxShadow: '0 0 12px rgba(245, 166, 35, 0.15)'
                            }}
                          >
                            <Sparkles size={12} />
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              color: '#60A5FA',
                              border: '1px solid rgba(59, 130, 246, 0.3)'
                            }}
                          >
                            <Shield size={12} />
                            SUB-ADMIN
                          </span>
                        )}
                      </td>

                      {/* Permissions Badges */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        {admin.is_super_admin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: '#F5A623',
                              fontWeight: 600,
                              backgroundColor: 'rgba(245, 166, 35, 0.08)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(245, 166, 35, 0.2)'
                            }}
                          >
                            <Check size={14} /> Full Root Bypass (All 7 Modules)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '420px' }}>
                            {admin.permissions && admin.permissions.length > 0 ? (
                              admin.permissions.map(permKey => {
                                const mod = MODULE_PERMISSIONS.find(m => m.key === permKey);
                                return (
                                  <span
                                    key={permKey}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      color: '#E5E7EB',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    {mod ? (
                                      <>
                                        <mod.icon size={12} color={mod.color} />
                                        <span>{mod.label.split('&')[0].trim()}</span>
                                      </>
                                    ) : (
                                      permKey
                                    )}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: '12px', color: '#F87171', fontStyle: 'italic' }}>
                                No permissions assigned
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          disabled={admin.is_super_admin}
                          onClick={() => handleToggleStatus(admin)}
                          title={admin.is_super_admin ? 'Super Admin cannot be suspended' : 'Click to toggle status'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: admin.is_super_admin ? 'default' : 'pointer',
                            backgroundColor: admin.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: admin.status === 'ACTIVE' ? '#34D399' : '#F87171',
                            border: admin.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            opacity: admin.is_super_admin ? 0.9 : 1
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: admin.status === 'ACTIVE' ? '#34D399' : '#F87171'
                            }}
                          />
                          <span>{admin.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span>
                        </button>
                      </td>

                      {/* Last Login */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {admin.last_login_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} color="#6B7280" />
                            <span>{new Date(admin.last_login_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#6B7280', fontStyle: 'italic' }}>Never logged in</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEditModal(admin)}
                            title="Edit Administrator"
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#D1D5DB',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          {!admin.is_super_admin && (
                            <button
                              onClick={() => handleOpenDeleteModal(admin)}
                              title="Delete Sub-Admin"
                              style={{
                                padding: '8px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#F87171',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Trash2 size={14} />
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

      {/* 4. Add New Sub-Admin Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#12121A',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 166, 35, 0.12)',
                    color: '#F5A623',
                    border: '1px solid rgba(245, 166, 35, 0.25)'
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Add New Sub-Admin</h3>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>Provision sub-admin credentials & module permissions</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Name & Email Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#F87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 36px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        color: '#FFFFFF',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Email Address <span style={{ color: '#F87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@flopshow.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 36px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        color: '#FFFFFF',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Account Password <span style={{ color: '#F87171' }}>*</span> (min. 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter secure initial password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      fontSize: '13.5px',
                      color: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <KeyRound size={14} color="#F5A623" />
                    <span>Module Permissions ({formData.permissions.length}/{MODULE_PERMISSIONS.length})</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: MODULE_PERMISSIONS.map(m => m.key) })}
                      style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Select All
                    </button>
                    <span style={{ color: '#4B5563', fontSize: '11px' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div
                  className="admin-rbac-perm-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '10px'
                  }}
                >
                  {MODULE_PERMISSIONS.map(mod => {
                    const checked = formData.permissions.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => togglePermissionInAdd(mod.key)}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: checked ? '1px solid rgba(245, 166, 35, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: checked ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#F5A623' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <mod.icon size={14} color={checked ? '#F5A623' : '#9CA3AF'} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: checked ? '#FFFFFF' : '#D1D5DB' }}>
                              {mod.label}
                            </span>
                          </div>
                          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '3px 0 0', lineHeight: 1.3 }}>
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#D1D5DB',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #F5A623 0%, #D97706 100%)',
                    color: '#000000',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Create Sub-Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Sub-Admin Modal */}
      {showEditModal && editingAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#12121A',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 166, 35, 0.12)',
                    color: '#F5A623',
                    border: '1px solid rgba(245, 166, 35, 0.25)'
                  }}
                >
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Edit Administrator: {editingAdmin.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>{editingAdmin.email}</p>
                </div>
              </div>

              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateSubAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    color: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Password Reset (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Change Password <span style={{ color: '#6B7280', fontWeight: 400 }}>(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Enter new password (optional)"
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    color: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Account Status Toggle (for sub-admins only) */}
              {!editingAdmin.is_super_admin && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Account Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#181824',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      fontSize: '13.5px',
                      color: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="ACTIVE">Active (Full Access)</option>
                    <option value="SUSPENDED">Suspended (Access Blocked)</option>
                  </select>
                </div>
              )}

              {/* Permissions */}
              {editingAdmin.is_super_admin ? (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(245, 166, 35, 0.1)',
                    border: '1px solid rgba(245, 166, 35, 0.25)',
                    fontSize: '12.5px',
                    color: '#F5A623',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Super Administrator Account:</strong> Super Admins permanently retain root bypass access across all platform modules.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <KeyRound size={14} color="#F5A623" />
                      <span>Module Permissions ({editFormData.permissions.length}/{MODULE_PERMISSIONS.length})</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, permissions: MODULE_PERMISSIONS.map(m => m.key) })}
                        style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Select All
                      </button>
                      <span style={{ color: '#4B5563', fontSize: '11px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, permissions: [] })}
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div
                    className="admin-rbac-perm-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                      gap: '10px'
                    }}
                  >
                    {MODULE_PERMISSIONS.map(mod => {
                      const checked = editFormData.permissions.includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          onClick={() => togglePermissionInEdit(mod.key)}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: checked ? '1px solid rgba(245, 166, 35, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: checked ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#F5A623' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <mod.icon size={14} color={checked ? '#F5A623' : '#9CA3AF'} />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: checked ? '#FFFFFF' : '#D1D5DB' }}>
                                {mod.label}
                              </span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '3px 0 0', lineHeight: 1.3 }}>
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#D1D5DB',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #F5A623 0%, #D97706 100%)',
                    color: '#000000',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Sub-Admin Confirmation Modal */}
      {showDeleteModal && deletingAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#12121A',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Revoke Administrator Access?
            </h3>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '8px 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#FFFFFF' }}>{deletingAdmin.name}</strong> ({deletingAdmin.email})? They will immediately lose all access to the FLOPSHOW Admin Panel.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAdmin(null);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#D1D5DB',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Admin</span>
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
