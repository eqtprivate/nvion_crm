import React, { createContext, useState, useContext, useEffect } from 'react';
import { saveSession, getSession, clearSession } from '@/lib/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
  }, []);

  const login = (usuario) => {
    saveSession(usuario);
    setUser({
      id: usuario.id,
      display_name: usuario.display_name,
      full_name: usuario.full_name,
      email: usuario.email,
      role: usuario.role,
      empresa_vinculada: usuario.empresa_vinculada,
      modulos_permitidos: usuario.modulos_permitidos,
      status: usuario.status,
      profile_picture: usuario.profile_picture,
    });
    setIsAuthenticated(true);
  };

  const updateUser = (changes) => {
    setUser(prev => {
      const updated = { ...prev, ...changes };
      saveSession(updated);
      return updated;
    });
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError: null,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
