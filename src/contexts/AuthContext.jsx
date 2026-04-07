import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeOtp, setActiveOtp] = useState(null); // Temporary storage for verification

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('billing_user') || sessionStorage.getItem('billing_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password, rememberMe) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid email/username or password');
      }

      const userFromServer = await response.json();
      
      // Map MongoDB _id or id to id for consistency
      const normalizedUser = { 
        ...userFromServer, 
        id: userFromServer.id || userFromServer._id 
      };
      
      setUser(normalizedUser);
      
      if (rememberMe) {
        localStorage.setItem('billing_user', JSON.stringify(normalizedUser));
      } else {
        sessionStorage.setItem('billing_user', JSON.stringify(normalizedUser));
      }
      return normalizedUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error occurred while registering.');
      }

      const userFromServer = await response.json();
      
      // Map MongoDB _id or id to id for consistency
      const normalizedUser = { 
        ...userFromServer, 
        id: userFromServer.id || userFromServer._id 
      };
      
      setUser(normalizedUser);
      localStorage.setItem('billing_user', JSON.stringify(normalizedUser));
      sessionStorage.setItem('billing_user', JSON.stringify(normalizedUser));
      
      return normalizedUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('billing_user');
    sessionStorage.removeItem('billing_user');
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }

      // Store the email for the NEXT step (verification)
      setActiveOtp({ email }); 
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const checkOtp = async (email, otp) => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }

      return { success: true };
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  const verifyOtp = async (email, otp, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }

      setActiveOtp(null); // Clear session
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const loginWithProvider = async (provider) => {
    // Simulate Social OAuth flow
    return new Promise((resolve) => {
      setTimeout(() => {
        const socialUser = {
          id: `social_${Date.now()}`,
          firstName: provider === 'google' ? 'Google' : 'Facebook',
          lastName: 'User',
          email: `${provider}@example.com`,
          username: `${provider}_user`,
          role: 'user',
          status: 'active',
          provider: provider
        };

        setUser(socialUser);
        localStorage.setItem('billing_user', JSON.stringify(socialUser));
        resolve(socialUser);
      }, 1500); // Slightly longer simulation for "redirect/login"
    });
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    checkOtp,
    verifyOtp,
    loginWithProvider,
    activeOtp
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
