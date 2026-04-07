import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/AuthLayout';
import './AuthPages.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New password features state
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [isUsingSuggested, setIsUsingSuggested] = useState(false);

  // Password Generation Utility
  const generatePassword = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure it's balanced (simplified)
    return password;
  }, []);

  // Password Strength Utility
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (pwd.length > 8) score++;
    if (pwd.length > 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    // Normalize score to 0-4
    const finalScore = Math.min(score, 4);
    
    const labels = ['Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#ef4444', '#f59e0b', '#10b981', '#059669'];
    
    return {
      score: finalScore,
      label: labels[finalScore],
      color: colors[finalScore]
    };
  };

  useEffect(() => {
    setSuggestedPassword(generatePassword());
  }, [generatePassword]);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'password') {
      const strength = calculateStrength(value);
      setPasswordStrength(strength);
      if (value.length > 0) setShowSuggestion(false);
      setIsUsingSuggested(false);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUseSuggested = () => {
    setFormData(prev => ({
      ...prev,
      password: suggestedPassword,
      confirmPassword: suggestedPassword
    }));
    setPasswordStrength(calculateStrength(suggestedPassword));
    setShowSuggestion(false);
    setIsUsingSuggested(true);
  };

  /*
  const handleSocialLogin = async (provider) => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithProvider(provider);
      navigate('/');
    } catch (_err) {
      setError(`Failed to sign in with ${provider}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (!formData.agreeToTerms) {
      return setError('You must agree to the Terms and Conditions');
    }

    setIsSubmitting(true);

    try {
      const { confirmPassword: _confirmPassword, agreeToTerms: _agreeToTerms, ...registerData } = formData;
      await register(registerData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title="Sign Up" 
      subtitle="Fill in the details below to create your account"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error-alert">{error}</div>}
        
        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label className="form-label" htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              className="form-input"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              required
            />
          </div>
          <div className="form-group flex-1">
            <label className="form-label" htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className="form-input"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address <span className="text-secondary" style={{ fontSize: '0.7rem' }}>(Required)</span></label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="username">Username <span className="text-secondary" style={{ fontSize: '0.7rem' }}>(Required)</span></label>
          <input
            type="text"
            id="username"
            name="username"
            className="form-input"
            value={formData.username}
            onChange={handleChange}
            placeholder="johndoe123"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">Phone Number <span className="text-secondary" style={{ fontSize: '0.7rem' }}>(Optional)</span></label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="form-group relative">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => {
                if (!formData.password) setShowSuggestion(true);
              }}
              placeholder="••••••••"
              required
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

          {formData.password && (
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

        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className="form-input"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="auth-options flex items-center mb-6">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              required
            />
            <span className="checkmark"></span>
            I agree to the <Link to="/terms" className="auth-link">Terms</Link> & <Link to="/privacy" className="auth-link">Privacy Policy</Link>
          </label>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary w-full h-12"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>


        <div className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-link">Login</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
