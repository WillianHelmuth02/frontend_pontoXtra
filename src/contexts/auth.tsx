import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api, ApiError, configureSession } from '@/services/api';
import { removerPush } from '@/services/push';

/** Contrato público de usuário retornado pela API; IDs BIGINT são strings. */
type Usuario = { id: string; nome: string; email: string; perfil: 'OPERACIONAL' | 'RH' | 'ADMINISTRADOR'; ativo: boolean };
type LoginResponse = { access_token: string; expires_in: number; usuario: Usuario };
type AuthContextValue = {
  usuario: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

/** Compartilha o usuário entre rotas e sincroniza expiração local com o cliente HTTP.
 * A autorização final sempre pertence ao backend; o perfil na UI não concede acesso.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const clear = useCallback(() => {
    configureSession(null);
    setUsuario(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(clear, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, clear]);

  async function login(email: string, senha: string) {
    const result = await api<LoginResponse>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
    }, false);
    configureSession(result.access_token, clear);
    setExpiresAt(Date.now() + result.expires_in * 1000);
    setUsuario(result.usuario);
  }

  async function logout() {
    try {
      await removerPush();
      await api<void>('/auth/logout', { method: 'POST' });
      clear();
    } catch (error) {
      // Token já expirado/revogado equivale a uma sessão encerrada.
      if (error instanceof ApiError && error.status === 401) { clear(); return; }
      // Falha de rede mantém a sessão para permitir nova tentativa de revogação.
      throw error;
    }
  }

  return <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return value;
}
