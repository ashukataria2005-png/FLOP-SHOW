import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserCheck, Sparkles } from 'lucide-react';
import { Logo } from '../common/Logo';

export const AuthModal: React.FC = () => {
  const { activeModal, closeAuthModal, login, signup } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'auth') return null;

  const handleSubmit = (e: React.FormEvent) => {
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

    if (mode === 'signup') {
      signup(name.trim(), email.trim());
    } else {
      const displayName = email.split('@')[0];
      login(displayName, email.trim());
    }
  };

  const handleQuickDemo = () => {
    login('Demo User', 'demo@flopshow.tv');
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

          <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginBottom: '12px' }}>
            <UserCheck size={18} />
            <span>{mode === 'signin' ? 'Sign In to FLOPSHOW' : 'Create Account'}</span>
          </button>

          {/* Quick Demo Fill Button */}
          <button
            type="button"
            onClick={handleQuickDemo}
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
