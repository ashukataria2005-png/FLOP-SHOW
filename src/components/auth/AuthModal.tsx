import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { X, UserCheck, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../common/Logo';

// Signup flow steps
type SignupStep = 'details' | 'otp';

export const AuthModal: React.FC = () => {
  const { activeModal, closeAuthModal, login, signup } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign-in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupStep, setSignupStep] = useState<SignupStep>('details');
  const [otpValue, setOtpValue] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending backend data carried between signup steps
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingBalance, setPendingBalance] = useState(0);

  if (activeModal !== 'auth') return null;

  const resetForm = () => {
    setName(''); setEmail(''); setPassword('');
    setSignupEmail(''); setSignupPassword(''); setOtpValue('');
    setSignupStep('details');
    setPendingUserId(''); setPendingName(''); setPendingEmail(''); setPendingBalance(0);
    setError(null);
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  // ── Sign In ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    setError(null);
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!password.trim() || password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.auth.login(email.trim(), password.trim());

      // W3C Credential Management API: prompt browser to store credentials natively
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try {
          const cred = new (window as any).PasswordCredential(form);
          await (navigator as any).credentials.store(cred);
        } catch {
          // Gracefully ignore if blocked or unavailable
        }
      }

      // Allow browser submission lifecycle to settle before modal closes
      await new Promise(resolve => setTimeout(resolve, 150));

      // Pass real backend userId so the frontend never generates a fake timestamp ID
      login(data.user.id, data.user.name, data.user.email, data.user.role, data.wallet?.balanceRupees ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Signup Step 1: Account Details → register on backend ──────────────────
  const handleSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!signupEmail.trim() || !signupEmail.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!signupPassword.trim() || signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.auth.register(name.trim(), signupEmail.trim(), signupPassword.trim());
      setPendingUserId(data.user.id);
      setPendingName(data.user.name);
      setPendingEmail(data.user.email);
      setPendingBalance(data.wallet?.balanceRupees ?? 0);
      setSignupStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Account creation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Signup Step 2: OTP Placeholder → complete signup ──────────────────────
  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpValue.trim()) {
      setError('Please enter any 6-digit code to continue.');
      return;
    }
    // OTP verification is a UI placeholder. The account already exists in the backend.
    // A real OTP provider will be integrated in a future milestone.
    signup(pendingUserId, pendingName, pendingEmail, pendingBalance);
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    fontSize: '14px', color: '#FFFFFF'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '14px' };
  const errorBox = error ? (
    <div style={{
      padding: '10px 14px', borderRadius: '8px',
      backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#F87171',
      fontSize: '13px', marginBottom: '16px'
    }}>{error}</div>
  ) : null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <Logo size="sm" />
          <button onClick={handleClose} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle — only visible on step 1 */}
        {!(mode === 'signup' && signupStep === 'otp') && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                style={{
                  flex: 1, padding: '14px', textAlign: 'center',
                  fontWeight: mode === m ? 700 : 500, fontSize: '14px',
                  color: mode === m ? 'var(--brand-gold)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${mode === m ? 'var(--brand-gold)' : 'transparent'}`,
                  transition: 'all var(--transition-fast)'
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        {/* ── Sign In Form ── */}
        {mode === 'signin' && (
          <form
            id="user-signin-form"
            name="userSigninForm"
            method="post"
            action="/api/auth/login"
            autoComplete="on"
            onSubmit={handleSignIn}
            className="modal-body"
          >
            {errorBox}
            <div style={fieldStyle}>
              <label htmlFor="user-signin-email" style={labelStyle}>Email Address</label>
              <input
                id="user-signin-email"
                name="username"
                type="email"
                placeholder="e.g. user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label htmlFor="user-signin-password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="user-signin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" name="login" disabled={isSubmitting} className="btn btn-primary btn-block btn-lg" style={{ marginBottom: '12px' }}>
              {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={18} />}
              <span>{isSubmitting ? 'Signing in...' : 'Sign In to FLOPSHOW'}</span>
            </button>
          </form>
        )}

        {/* ── Signup Step 1: Account Details ── */}
        {mode === 'signup' && signupStep === 'details' && (
          <form
            id="user-signup-form"
            name="userSignupForm"
            method="post"
            action="/api/auth/register"
            autoComplete="on"
            onSubmit={handleSignupDetails}
            className="modal-body"
          >
            {errorBox}
            <div style={fieldStyle}>
              <label htmlFor="signup-name" style={labelStyle}>Full Name</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                placeholder="e.g. Maya Roy"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSubmitting}
                autoComplete="name"
                required
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label htmlFor="signup-email" style={labelStyle}>Email Address</label>
              <input
                id="signup-email"
                name="username"
                type="email"
                placeholder="e.g. user@example.com"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label htmlFor="signup-password" style={labelStyle}>Password</label>
              <input
                id="signup-password"
                name="new-password"
                type="password"
                placeholder="At least 6 characters"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
                style={inputStyle}
              />
            </div>
            <button type="submit" name="register" disabled={isSubmitting} className="btn btn-primary btn-block btn-lg">
              {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={18} />}
              <span>{isSubmitting ? 'Creating Account...' : 'Continue'}</span>
            </button>
          </form>
        )}

        {/* ── Signup Step 2: OTP Placeholder ── */}
        {mode === 'signup' && signupStep === 'otp' && (
          <form onSubmit={handleOtpVerify} className="modal-body">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <ShieldCheck size={40} color="var(--brand-gold)" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '6px' }}>Verify Your Account</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                OTP verification is coming soon. Enter any code and click Verify to continue.
              </p>
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)',
                fontSize: '12px', color: 'var(--brand-gold)'
              }}>
                ⚠️ No real OTP is sent — this is a UI placeholder only
              </div>
            </div>
            {errorBox}
            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label style={labelStyle}>OTP Code</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle, fontSize: '22px', textAlign: 'center', letterSpacing: '8px', fontFamily: 'monospace' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg">
              <ShieldCheck size={18} />
              <span>Verify &amp; Complete Signup</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

