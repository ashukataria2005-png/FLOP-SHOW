import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { X, UserCheck, Sparkles, Loader2 } from 'lucide-react';
import { Logo } from '../common/Logo';

export const AuthModal: React.FC = () => {
  const { activeModal, closeAuthModal, login, signup } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeModal !== 'auth') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        // Real backend register — stores JWT token and creates wallet
        const data = await api.auth.register(name.trim(), email.trim(), password.trim());
        // Update React state with real backend user + wallet balance
        signup(data.user.name, data.user.email, data.wallet?.balanceRupees ?? 0);
      } else {
        // Real backend login — stores JWT token
        const data = await api.auth.login(email.trim(), password.trim());
        // Update React state with real backend user + wallet balance
        login(data.user.name, data.user.email, data.user.role, data.wallet?.balanceRupees ?? 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      // Try to log in with demo account first; if not found, register it
      const data = await api.auth.login('demo@flopshow.tv', 'demo1234');
      login(data.user.name, data.user.email, data.user.role, data.wallet?.balanceRupees ?? 0);
    } catch {
      try {
        const data = await api.auth.register('Demo User', 'demo@flopshow.tv', 'demo1234');
        signup(data.user.name, data.user.email, data.wallet?.balanceRupees ?? 0);
      } catch (err: any) {
        // If demo account exists but wrong password — just show a helpful message
        setError('Demo login unavailable. Please create your own account using the sign-up tab.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <Logo size="sm" />
          <button
            onClick={closeAuthModal}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            onClick={() => { setMode('signin'); setError(null); }}
            style={{
              flex: 1,
              padding: '14px',
              textAlign: 'center',
              fontWeight: mode === 'signin' ? 700 : 500,
              fontSize: '14px',
              color: mode === 'signin' ? 'var(--brand-gold)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${mode === 'signin' ? 'var(--brand-gold)' : 'transparent'}`,
              transition: 'all var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            style={{
              flex: 1,
              padding: '14px',
              textAlign: 'center',
              fontWeight: mode === 'signup' ? 700 : 500,
              fontSize: '14px',
              color: mode === 'signup' ? 'var(--brand-gold)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${mode === 'signup' ? 'var(--brand-gold)' : 'transparent'}`,
              transition: 'all var(--transition-fast)'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#F87171',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Maya Roy"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '14px',
                  color: '#FFFFFF'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '14px',
                color: '#FFFFFF'
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '14px',
                color: '#FFFFFF'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block btn-lg"
            style={{ marginBottom: '12px' }}
          >
            {isSubmitting ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <UserCheck size={18} />
            )}
            <span>{isSubmitting ? 'Please wait...' : (mode === 'signin' ? 'Sign In to FLOPSHOW' : 'Create Account')}</span>
          </button>

          {/* Quick Demo Login */}
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={isSubmitting}
            className="btn btn-secondary btn-block"
            style={{ fontSize: '13px' }}
          >
            <Sparkles size={16} color="var(--brand-gold)" />
            <span>Quick Login as Demo User</span>
          </button>
        </form>
      </div>
    </div>
  );
};
