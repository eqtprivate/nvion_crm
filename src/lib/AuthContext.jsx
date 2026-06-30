import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

function normalizeProfile(profile, modules = []) {
  if (!profile) return null;
  return {
    id: profile.id,
    supabase_user_id: profile.id,
    display_name: profile.display_name,
    full_name: profile.display_name,
    email: profile.email,
    role: profile.role,
    empresa_id: profile.empresa_id,
    empresa_vinculada: profile.empresa_vinculada,
    modulos_permitidos: modules,
    status: profile.status,
    profile_picture: profile.profile_picture,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const loadProfile = useCallback(async (session) => {
    if (!session?.user) {
      clearAuthState();
      return null;
    }

    const client = assertSupabaseConfigured();
    const authUser = session.user;

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, display_name, email, empresa_id, empresa_vinculada, role, status, profile_picture')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      clearAuthState();
      setAuthError(`Erro ao carregar perfil de acesso: ${profileError.message}`);
      return null;
    }

    if (!profile) {
      clearAuthState();
      setAuthError('Perfil de acesso não encontrado no Supabase. Crie um registro em public.profiles para este usuário.');
      return null;
    }

    if (profile.status !== 'ativo') {
      clearAuthState();
      setAuthError('Usuário sem acesso ativo. Verifique o status do perfil no Supabase.');
      await client.auth.signOut();
      return null;
    }

    const { data: moduleRows, error: modulesError } = await client
      .from('user_modules')
      .select('module_key, enabled')
      .eq('user_id', authUser.id)
      .eq('enabled', true);

    if (modulesError) {
      clearAuthState();
      setAuthError(`Erro ao carregar módulos do usuário: ${modulesError.message}`);
      return null;
    }

    const modules = Array.isArray(moduleRows) ? moduleRows.map((item) => item.module_key).filter(Boolean) : [];
    const normalized = normalizeProfile(profile, modules);
    setUser(normalized);
    setIsAuthenticated(true);
    setAuthError(null);
    return normalized;
  }, [clearAuthState]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) {
          clearAuthState();
          setAuthError('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do build.');
          setIsLoadingAuth(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted && data?.session) await loadProfile(data.session);
        if (mounted && !data?.session) clearAuthState();
      } catch (err) {
        if (mounted) {
          clearAuthState();
          setAuthError(`Erro ao inicializar autenticação: ${err?.message || err?.toString?.() || 'sem detalhe'}`);
        }
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    }

    initAuth();

    if (!supabase) return () => { mounted = false; };

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        clearAuthState();
        return;
      }
      if (session) await loadProfile(session);
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [clearAuthState, loadProfile]);

  const login = async (email, password) => {
    const client = assertSupabaseConfigured();
    setAuthError(null);

    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(error.message || 'Falha no login. Verifique e-mail e senha.');
    }

    const profile = await loadProfile(data.session);
    if (!profile) {
      throw new Error('Login autenticado, mas perfil operacional não encontrado ou não ativo.');
    }

    return profile;
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    clearAuthState();
  };

  const updateUser = async (changes) => {
    if (!user?.id) return;
    const allowed = {};
    if (Object.prototype.hasOwnProperty.call(changes, 'display_name')) allowed.display_name = changes.display_name;
    if (Object.prototype.hasOwnProperty.call(changes, 'profile_picture')) allowed.profile_picture = changes.profile_picture;

    if (Object.keys(allowed).length > 0) {
      const client = assertSupabaseConfigured();
      const { error } = await client.from('profiles').update(allowed).eq('id', user.id);
      if (error) throw new Error(error.message);
    }

    setUser(prev => ({ ...prev, ...allowed }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
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
