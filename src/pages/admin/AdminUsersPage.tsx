import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Loader2,
  Mail
} from 'lucide-react';

interface AdminUsersPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = () => {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
            Registered Users & Accounts
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Audit active accounts, role privileges, authentication statuses, and wallet accounts.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          marginBottom: '24px',
          backgroundColor: 'var(--bg-surface, #12121A)',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#9CA3AF' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>Retrieving user accounts...</span>
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
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No user records match your query.</p>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>User Profile</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Account Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Wallet Balance</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isAdmin = user.role === 'ADMIN';
                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: isAdmin ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: isAdmin ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '14px'
                            }}
                          >
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px' }}>
                              {user.name}
                            </p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} />
                              <span>{user.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

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

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                          ₹{user.wallet_balance_rupees || 0}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
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
};
