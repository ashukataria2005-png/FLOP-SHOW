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
  const [signupMethod, setSignupMethod] = useState<'email' | 'mobile'>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
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
    setSignupEmail(''); setSignupMobile(''); setSignupPassword(''); setOtpValue('');
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
    const cleanId = email.trim();
    if (!cleanId) { setError('Please enter your email or mobile number.'); return; }
    if (!password.trim() || password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.auth.login(cleanId, password.trim());

      // W3C Credential Management API: prompt browser to store credentials natively
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try {
          const cred = new (window as any).PasswordCredential(form);
          await (navigator as any).credentials.store(cred);
        } catch {
          // Gracefully ignore if blocked or unavailable
        }
      }

      // Allow browser submission lifecycle to settle before modal closes (600ms delay for password manager prompt)
      await new Promise(resolve => setTimeout(resolve, 600));

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
    const form = e.currentTarget as HTMLFormElement;
    setError(null);
    if (!name.trim()) { setError('Please enter your full name.'); return; }

    if (signupMethod === 'email') {
      if (!signupEmail.trim() || !signupEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
    } else {
      const cleanMob = signupMobile.trim().replace(/[^0-9]/g, '');
      if (cleanMob.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    if (!signupPassword.trim() || signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = signupMethod === 'email'
        ? await api.auth.register(name.trim(), signupEmail.trim(), signupPassword.trim())
        : await api.auth.register(name.trim(), undefined, signupPassword.trim(), signupMobile.trim().replace(/[^0-9]/g, ''));

      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try {
          const cred = new (window as any).PasswordCredential(form);
          await (navigator as any).credentials.store(cred);
        } catch {
          // Gracefully ignore
        }
      }

      // Allow browser submission lifecycle to settle before DOM transition (600ms delay for password manager prompt)
      await new Promise(resolve => setTimeout(resolve, 600));

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

  // ── Signup Step 2: OTP (Optional / Bypassable) → complete signup ────────────
  const handleOtpVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    // OTP verification is optional/bypassable per requirements. Account is already created on backend.
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
              <label htmlFor="username" style={labelStyle}>Email or Mobile Number</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="e.g. user@example.com or 9876543210"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
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
            {/* Signup Method Switcher (Email vs Mobile) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setSignupMethod('email')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: signupMethod === 'email' ? 700 : 500,
                  backgroundColor: signupMethod === 'email' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: signupMethod === 'email' ? '#000000' : '#9CA3AF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign up with Email
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod('mobile')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: signupMethod === 'mobile' ? 700 : 500,
                  backgroundColor: signupMethod === 'mobile' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: signupMethod === 'mobile' ? '#000000' : '#9CA3AF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign up with Mobile Number
              </button>
            </div>

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

            {/* OPTION A: Sign up with Email */}
            {signupMethod === 'email' && (
              <div style={fieldStyle}>
                <label htmlFor="username" style={labelStyle}>Email Address</label>
                <input
                  id="username"
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
            )}

            {/* OPTION B: Sign up with Mobile Number */}
            {signupMethod === 'mobile' && (
              <div style={fieldStyle}>
                <label htmlFor="username" style={labelStyle}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    +91
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={signupMobile}
                    onChange={e => setSignupMobile(e.target.value.replace(/\D/g, ''))}
                    disabled={isSubmitting}
                    autoComplete="username"
                    required
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            )}

            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                name="password"
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
              <span>{isSubmitting ? 'Creating Account...' : 'Continue to Verification'}</span>
            </button>
          </form>
        )}

        {/* ── Signup Step 2: OTP (Optional / Bypassable) ── */}
        {mode === 'signup' && signupStep === 'otp' && (
          <form onSubmit={e => handleOtpVerify(e)} className="modal-body">
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <ShieldCheck size={40} color="var(--brand-gold)" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>Verify Your Account</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Enter the 6-digit OTP or continue directly. Verification is currently optional during account setup.
              </p>
            </div>
            {errorBox}
            <div style={{ ...fieldStyle, marginBottom: '18px' }}>
              <label style={labelStyle}>OTP Code (Optional)</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle, fontSize: '22px', textAlign: 'center', letterSpacing: '8px', fontFamily: 'monospace' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginBottom: '10px' }}>
              <ShieldCheck size={18} />
              <span>Verify &amp; Complete Signup</span>
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => handleOtpVerify()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '6px'
                }}
              >
                Skip verification for now →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

