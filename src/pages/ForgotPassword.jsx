import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/AuthLayout';
import './AuthPages.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength state
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isUsingSuggested, setIsUsingSuggested] = useState(false);

  const { forgotPassword, checkOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Password Generation
  const generatePassword = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  // Password Strength Calculator
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length > 8) score++;
    if (pwd.length > 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const finalScore = Math.min(score, 4);
    const labels = ['Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#ef4444', '#f59e0b', '#10b981', '#059669'];
    return { score: finalScore, label: labels[finalScore], color: colors[finalScore] };
  };

  useEffect(() => {
    setSuggestedPassword(generatePassword());
  }, [generatePassword]);

  const handleUseSuggested = () => {
    setNewPassword(suggestedPassword);
    setConfirmPassword(suggestedPassword);
    setPasswordStrength(calculateStrength(suggestedPassword));
    setShowSuggestion(false);
    setIsUsingSuggested(true);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setMessage(`A verification code has been sent to ${email}. Please check your inbox.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 4) {
      return setError('Please enter the full 4-digit code.');
    }
    setError('');
    setIsSubmitting(true);
    try {
      await checkOtp(email, enteredOtp);
      setMessage(null);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsSubmitting(true);

    try {
      await verifyOtp(email, otp.join(''), newPassword);
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title={step === 1 ? "Forgot Password" : step === 2 ? "Verify OTP" : "Reset Password"} 
      subtitle={
        step === 1 ? "Enter your email to receive a reset code" : 
        step === 2 ? `We've sent a 4-digit code to ${email}` : 
        "Create a strong new password for your account"
      }
    >
      {step === 2 && (
        <div className="auth-success-alert" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <strong>Real email sent! Please check your inbox for the code.</strong>
        </div>
      )}
      {message && <div className="auth-success-alert">{message}</div>}
      {error && <div className="auth-error-alert">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleEmailSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary w-full h-12" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpSubmit} className="auth-form">
          <div className="otp-input-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                className="otp-digit"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !otp[index] && index > 0) {
                    document.getElementById(`otp-${index - 1}`).focus();
                  }
                }}
                maxLength="1"
                required
              />
            ))}
          </div>
          <div className="resend-otp">
            Didn't receive the code? <button type="button" className="auth-link" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>Resend</button>
          </div>
          <button type="submit" className="btn btn-primary w-full h-12" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetSubmit} className="auth-form">
          {/* New Password with strength system */}
          <div className="form-group relative">
            <label className="form-label" htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="form-input"
                value={newPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPassword(val);
                  setPasswordStrength(calculateStrength(val));
                  if (val.length > 0) setShowSuggestion(false);
                  setIsUsingSuggested(false);
                }}
                onFocus={() => {
                  if (!newPassword) setShowSuggestion(true);
                }}
                placeholder="••••••••"
                required
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>

            {showSuggestion && (
              <div className="password-suggestion-popup">
                <div className="suggestion-header">
                  <span className="suggestion-title">Suggested Strong Password</span>
                  <button type="button" onClick={() => setShowSuggestion(false)} className="close-suggestion">&times;</button>
                </div>
                <div className="suggested-value">
                  <code>{suggestedPassword}</code>
                </div>
                <div className="suggestion-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowSuggestion(false)}
                  >
                    Use Own
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleUseSuggested}
                  >
                    Use Strong Password
                  </button>
                </div>
              </div>
            )}

            {newPassword && (
              <div className="strength-meter-container">
                <div className="strength-meter-bar">
                  <div
                    className="strength-meter-fill"
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  ></div>
                </div>
                <div className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label} Password
                  {isUsingSuggested && <span className="text-secondary ml-1" style={{ fontSize: '0.7rem' }}>(Suggested)</span>}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {confirmPassword && newPassword && (
              <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: confirmPassword === newPassword ? '#10b981' : '#ef4444' }}>
                {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full h-12" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}


      <div className="auth-footer-text">
        <Link to="/login" className="auth-link flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
