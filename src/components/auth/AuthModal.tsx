import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Eye, EyeOff, Loader2, UserCheck, ShieldCheck, Film, Star, Zap } from 'lucide-react';
import { Logo } from '../common/Logo';

type SignupStep = 'details' | 'otp';

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-styles (kept inline for portability — no CSS modules needed)
// ─────────────────────────────────────────────────────────────────────────────
const GOLD   = '#F5A623';
const GOLD_DIM = 'rgba(245,166,35,0.18)';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER  = 'rgba(255,255,255,0.10)';
const RED_ERR = 'rgba(244,63,94,0.15)';

const inputBase: React.CSSProperties = {
  width:           '100%',
  padding:         '13px 16px',
  borderRadius:    '12px',
  backgroundColor: SURFACE,
  border:          `1px solid ${BORDER}`,
  color:           '#FFFFFF',
  fontSize:        '14px',
  fontFamily:      'inherit',
  outline:         'none',
  transition:      'border-color 0.2s ease, box-shadow 0.2s ease',
  boxSizing:       'border-box',
};

const labelBase: React.CSSProperties = {
  fontSize:     '12px',
  fontWeight:   600,
  color:        'rgba(255,255,255,0.55)',
  display:      'block',
  marginBottom: '7px',
  letterSpacing:'0.03em',
  textTransform:'uppercase',
};

// ─────────────────────────────────────────────────────────────────────────────
// AuthModal — rendered as a modal overlay (when activeModal === 'auth')
// OR as a full-screen gate (when used standalone via isFullPage prop)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthModalProps {
  /** When true, renders as a full-screen page instead of a centred modal card */
  isFullPage?: boolean;
  /** Called after successful login/signup when used as a full-page gate */
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isFullPage = false, onSuccess }) => {
  const { activeModal, closeAuthModal, login, signup } = useApp();

  const [mode,             setMode]            = useState<'signin' | 'signup'>('signin');
  const [identifier,       setIdentifier]      = useState('');
  const [password,         setPassword]        = useState('');
  const [showPassword,     setShowPassword]    = useState(false);
  const [name,             setName]            = useState('');
  const [signupId,         setSignupId]        = useState('');
  const [signupPw,         setSignupPw]        = useState('');
  const [showSignupPw,     setShowSignupPw]    = useState(false);
  const [signupStep,       setSignupStep]      = useState<SignupStep>('details');
  const [otpValue,         setOtpValue]        = useState('');
  const [error,            setError]           = useState<string | null>(null);
  const [isSubmitting,     setIsSubmitting]    = useState(false);
  const [pendingUserId,    setPendingUserId]   = useState('');
  const [pendingName,      setPendingName]     = useState('');
  const [pendingEmail,     setPendingEmail]    = useState('');
  const [pendingBalance,   setPendingBalance]  = useState(0);
  const [focusedField,     setFocusedField]   = useState<string | null>(null);

  // Only render when acting as a modal and that modal is active
  if (!isFullPage && activeModal !== 'auth') return null;

  const resetForm = () => {
    setIdentifier(''); setPassword('');
    setName(''); setSignupId(''); setSignupPw(''); setOtpValue('');
    setSignupStep('details');
    setPendingUserId(''); setPendingName(''); setPendingEmail(''); setPendingBalance(0);
    setError(null);
  };

  const handleModeSwitch = (m: 'signin' | 'signup') => { setMode(m); resetForm(); };

  const handleClose = () => { resetForm(); closeAuthModal(); };

  const afterAuth = () => {
    if (isFullPage) onSuccess?.();
    else            handleClose();
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
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try { await (navigator as any).credentials.store(new (window as any).PasswordCredential(form)); } catch { /* ignore */ }
      }
      await new Promise(r => setTimeout(r, 400));
      login(data.user.id, data.user.name, data.user.email, data.user.role, data.wallet?.balanceRupees ?? 0);
      afterAuth();
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Signup Step 1 ──────────────────────────────────────────────────────────
  const handleSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    setError(null);
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    const cleanInput = signupId.trim();
    if (!cleanInput) { setError('Please enter your email or 10-digit mobile number.'); return; }
    const isEmail = cleanInput.includes('@');
    let emailParam: string | undefined;
    let phoneParam: string | undefined;
    if (isEmail) {
      if (!cleanInput.includes('.') || cleanInput.length < 5) { setError('Please enter a valid email address.'); return; }
      emailParam = cleanInput;
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      if (cleanPhone.length < 10) { setError('Please enter a valid 10-digit mobile number or email address.'); return; }
      phoneParam = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    }
    if (!signupPw.trim() || signupPw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.auth.register(name.trim(), emailParam, signupPw.trim(), phoneParam);
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials?.store) {
        try { await (navigator as any).credentials.store(new (window as any).PasswordCredential(form)); } catch { /* ignore */ }
      }
      await new Promise(r => setTimeout(r, 400));
      setPendingUserId(data.user.id); setPendingName(data.user.name);
      setPendingEmail(data.user.email); setPendingBalance(data.wallet?.balanceRupees ?? 0);
      setSignupStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Account creation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Signup Step 2 (OTP — optional) ────────────────────────────────────────
  const handleOtpVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    signup(pendingUserId, pendingName, pendingEmail, pendingBalance);
    afterAuth();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const focusStyle = (field: string): React.CSSProperties => ({
    ...inputBase,
    borderColor: focusedField === field ? GOLD : BORDER,
    boxShadow:   focusedField === field ? `0 0 0 3px ${GOLD_DIM}` : 'none',
  });

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      style={{
        position: 'absolute', right: '14px', top: '50%',
        transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,0.35)', display: 'flex', padding: '4px',
      }}
    >
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  // ── Card container used by both modal and full-page modes ──────────────────
  const card = (
    <div
      style={{
        width:           '100%',
        maxWidth:        '420px',
        backgroundColor: 'rgba(14,14,20,0.85)',
        backdropFilter:  'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRadius:    '24px',
        border:          `1px solid rgba(245,166,35,0.22)`,
        boxShadow:       `0 0 60px rgba(245,166,35,0.08), 0 24px 80px rgba(0,0,0,0.7)`,
        overflow:        'hidden',
      }}
    >
      {/* ── Gradient accent bar ── */}
      <div style={{
        height:     '3px',
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      {/* ── Header ── */}
      <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size="sm" />
        {!isFullPage && (
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Tab toggle ── */}
      {!(mode === 'signup' && signupStep === 'otp') && (
        <div style={{
          display:    'flex',
          margin:     '20px 32px 0',
          background: 'rgba(255,255,255,0.04)',
          borderRadius:'12px',
          padding:    '4px',
          gap:        '4px',
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => handleModeSwitch(m)}
              style={{
                flex:            1,
                padding:         '10px 0',
                borderRadius:    '9px',
                fontSize:        '13px',
                fontWeight:      700,
                border:          'none',
                cursor:          'pointer',
                transition:      'all 0.2s ease',
                backgroundColor: mode === m ? GOLD : 'transparent',
                color:           mode === m ? '#0E0E12' : 'rgba(255,255,255,0.45)',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>
      )}

      {/* ── Form body ── */}
      <div style={{ padding: '24px 32px 32px' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            padding:         '11px 14px',
            borderRadius:    '10px',
            backgroundColor: RED_ERR,
            border:          '1px solid rgba(244,63,94,0.3)',
            color:           '#FCA5A5',
            fontSize:        '13px',
            marginBottom:    '18px',
            lineHeight:      1.5,
          }}>
            {error}
          </div>
        )}

        {/* ── SIGN IN ── */}
        {mode === 'signin' && (
          <form
            id="user-signin-form"
            name="userSigninForm"
            method="POST"
            action="/api/auth/login"
            autoComplete="on"
            onSubmit={handleSignIn}
          >
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="username" style={labelBase}>Email or Mobile</label>
              <input
                id="username" name="username" type="text"
                placeholder="email@example.com or 9876543210"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                onFocus={() => setFocusedField('identifier')}
                onBlur={() => setFocusedField(null)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={focusStyle('identifier')}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="password" style={labelBase}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                  style={{ ...focusStyle('password'), paddingRight: '46px' }}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
              </div>
            </div>

            <button
              type="submit"
              name="login"
              disabled={isSubmitting}
              style={{
                width:           '100%',
                padding:         '14px',
                borderRadius:    '12px',
                background:      isSubmitting ? 'rgba(245,166,35,0.5)' : `linear-gradient(135deg, ${GOLD} 0%, #E8940A 100%)`,
                color:           '#0E0E12',
                fontSize:        '15px',
                fontWeight:      800,
                border:          'none',
                cursor:          isSubmitting ? 'not-allowed' : 'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                gap:             '9px',
                transition:      'opacity 0.2s ease, transform 0.15s ease',
                letterSpacing:   '0.01em',
              }}
            >
              {isSubmitting
                ? <><Loader2 size={17} style={{ animation: 'spin 0.9s linear infinite' }} /><span>Signing in…</span></>
                : <><UserCheck size={17} /><span>Sign In to FLOPSHOW</span></>
              }
            </button>
          </form>
        )}

        {/* ── SIGNUP STEP 1 ── */}
        {mode === 'signup' && signupStep === 'details' && (
          <form
            id="user-signup-form"
            name="userSignupForm"
            method="POST"
            action="/api/auth/register"
            autoComplete="on"
            onSubmit={handleSignupDetails}
          >
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signup-name" style={labelBase}>Full Name</label>
              <input
                id="signup-name" name="name" type="text"
                placeholder="e.g. Maya Roy"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('sname')}
                onBlur={() => setFocusedField(null)}
                disabled={isSubmitting}
                autoComplete="name"
                required
                style={focusStyle('sname')}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signup-username" style={labelBase}>Email or Mobile</label>
              <input
                id="signup-username" name="username" type="text"
                placeholder="email@example.com or 9876543210"
                value={signupId}
                onChange={e => setSignupId(e.target.value)}
                onFocus={() => setFocusedField('suser')}
                onBlur={() => setFocusedField(null)}
                disabled={isSubmitting}
                autoComplete="username"
                required
                style={focusStyle('suser')}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="signup-password" style={labelBase}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password" name="password"
                  type={showSignupPw ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={signupPw}
                  onChange={e => setSignupPw(e.target.value)}
                  onFocus={() => setFocusedField('spw')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                  style={{ ...focusStyle('spw'), paddingRight: '46px' }}
                />
                <PasswordToggle show={showSignupPw} onToggle={() => setShowSignupPw(p => !p)} />
              </div>
            </div>

            <button
              type="submit"
              name="register"
              disabled={isSubmitting}
              style={{
                width:          '100%',
                padding:        '14px',
                borderRadius:   '12px',
                background:     isSubmitting ? 'rgba(245,166,35,0.5)' : `linear-gradient(135deg, ${GOLD} 0%, #E8940A 100%)`,
                color:          '#0E0E12',
                fontSize:       '15px',
                fontWeight:     800,
                border:         'none',
                cursor:         isSubmitting ? 'not-allowed' : 'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '9px',
                transition:     'opacity 0.2s ease',
                letterSpacing:  '0.01em',
              }}
            >
              {isSubmitting
                ? <><Loader2 size={17} style={{ animation: 'spin 0.9s linear infinite' }} /><span>Creating Account…</span></>
                : <><UserCheck size={17} /><span>Continue to Verification</span></>
              }
            </button>
          </form>
        )}

        {/* ── SIGNUP STEP 2 OTP ── */}
        {mode === 'signup' && signupStep === 'otp' && (
          <form onSubmit={e => handleOtpVerify(e)}>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                backgroundColor: GOLD_DIM, border: `1px solid rgba(245,166,35,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', color: GOLD,
              }}>
                <ShieldCheck size={26} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '0 0 6px' }}>Verify Your Account</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
                Enter the 6-digit OTP or skip — verification is optional during account setup.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelBase}>OTP Code (Optional)</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                onFocus={() => setFocusedField('otp')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...focusStyle('otp'),
                  fontSize: '24px', textAlign: 'center',
                  letterSpacing: '10px', fontFamily: 'monospace',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: `linear-gradient(135deg, ${GOLD} 0%, #E8940A 100%)`,
                color: '#0E0E12', fontSize: '15px', fontWeight: 800, border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '9px', marginBottom: '10px',
              }}
            >
              <ShieldCheck size={17} /><span>Verify &amp; Complete Signup</span>
            </button>

            <button
              type="button"
              onClick={() => handleOtpVerify()}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', fontSize: '13px',
                cursor: 'pointer', transition: 'color 0.2s ease',
              }}
            >
              Skip verification for now →
            </button>
          </form>
        )}

        {/* ── Feature badges (only on initial forms) ── */}
        {!(mode === 'signup' && signupStep === 'otp') && (
          <div style={{
            display:       'flex',
            justifyContent:'center',
            gap:           '20px',
            marginTop:     '22px',
            paddingTop:    '18px',
            borderTop:     '1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { icon: <Film size={13} />,  label: 'Exclusive Films' },
              { icon: <Star size={13} />,  label: 'Premium Series' },
              { icon: <Zap  size={13} />,  label: 'Bonus Content' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600 }}>
                {icon}<span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── FULL-PAGE MODE (auth gate) ─────────────────────────────────────────────
  if (isFullPage) {
    return (
      <div style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '20px',
        background:     'radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.07) 0%, transparent 60%), #07070A',
        overflow:       'auto',
      }}>
        {/* Ambient glow blobs */}
        <div style={{
          position: 'fixed', top: '-10%', left: '30%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(245,166,35,0.05) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'fixed', bottom: '-5%', right: '20%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(80px)',
        }} />

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input:focus { outline: none !important; }
        `}</style>

        {card}
      </div>
    );
  }

  // ── MODAL MODE (triggered by openAuthModal()) ──────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none !important; }
      `}</style>
      <div
        className="modal-backdrop"
        onClick={handleClose}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      >
        <div onClick={e => e.stopPropagation()}>{card}</div>
      </div>
    </>
  );
};
