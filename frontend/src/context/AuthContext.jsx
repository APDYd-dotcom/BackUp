import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = (token, user) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
  };

  const impersonate = (newToken, newUser) => {
    localStorage.setItem('superAdminToken', token);
    localStorage.setItem('superAdminUser', JSON.stringify(user));
    login(newToken, newUser);
  };

  const stopImpersonating = () => {
    const origToken = localStorage.getItem('superAdminToken');
    const origUser = localStorage.getItem('superAdminUser');
    if (origToken && origUser) {
      login(origToken, JSON.parse(origUser));
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
    }
  };

  const isImpersonating = !!localStorage.getItem('superAdminToken');

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, impersonate, stopImpersonating, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
