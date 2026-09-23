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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [name, setName] = useState('');
  const [signupIdentifier, setSignupIdentifier] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
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
    setIdentifier(''); setPassword('');
    setName(''); setSignupIdentifier(''); setSignupPassword(''); setOtpValue('');
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
    const cleanId = identifier.trim();
    if (!cleanId) { setError('Please enter your email or 10-digit mobile number.'); return; }
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

      // Settle delay before closing modal allowing Chrome / Android to prompt "Save password to Google"
      await new Promise(resolve => setTimeout(resolve, 500));

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

    const cleanInput = signupIdentifier.trim();
    if (!cleanInput) { setError('Please enter your email or 10-digit mobile number.'); return; }

    const isEmail = cleanInput.includes('@');
    let emailParam: string | undefined = undefined;
    let phoneParam: string | undefined = undefined;

    if (isEmail) {
      if (!cleanInput.includes('.') || cleanInput.length < 5) {
        setError('Please enter a valid email address.');
        return;
      }
      emailParam = cleanInput;
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit mobile number or email address.');
        return;
      }
      phoneParam = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    }

    if (!signupPassword.trim() || signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.auth.register(name.trim(), emailParam, signupPassword.trim(), phoneParam);

      // Store in browser credential manager upon successful account registration
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try {
          const cred = new (window as any).PasswordCredential(form);
          await (navigator as any).credentials.store(cred);
        } catch {
          // Gracefully ignore
        }
      }

      // Settle delay allowing Chrome / Android to prompt "Save password to Google"
      await new Promise(resolve => setTimeout(resolve, 500));

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
            method="POST"
            action="/api/auth/login"
            autoComplete="on"
            onSubmit={handleSignIn}
            className="modal-body"
          >
            {errorBox}
            <div style={fieldStyle}>
              <label htmlFor="username" style={labelStyle}>Email or 10-digit mobile number</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Email or 10-digit mobile number"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
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
            method="POST"
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
              <label htmlFor="signup-username" style={labelStyle}>Email or 10-digit mobile number</label>
              <input
                id="signup-username"
                name="username"
                type="text"
                placeholder="Email or 10-digit mobile number"
                value={signupIdentifier}
                onChange={e => setSignupIdentifier(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ ...fieldStyle, marginBottom: '22px' }}>
              <label htmlFor="signup-password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password"
                  name="password"
                  type={showSignupPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(prev => !prev)}
                  title={showSignupPassword ? 'Hide password' : 'Show password'}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
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
                  {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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

