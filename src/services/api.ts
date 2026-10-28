/** Cliente HTTP compartilhado pelas telas e pelos futuros CRUDs.
 * EXPO_PUBLIC_* é incorporado ao aplicativo: apenas configurações públicas aqui.
 * O fallback permite iniciar o desenvolvimento Web sem criar um arquivo .env.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | undefined;

// A sessão fica somente na memória; não gravamos senha nem token no localStorage.
// Recarregar o navegador exige novo login. A persistência mobile será tratada depois.
export function configureSession(value: string | null, expired?: () => void) {
  token = value;
  onUnauthorized = expired;
}

/** authenticated=false é usado apenas nas rotas públicas, como login.
 * Timeout evita deixar a interface esperando indefinidamente uma API indisponível.
 */
export async function api<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = new Headers(options.headers);
  // Guarda a identidade desta requisição: um 401 antigo não deve derrubar
  // uma nova sessão que tenha sido aberta enquanto a chamada estava em trânsito.
  const requestToken = token;
  if (options.body) headers.set('Content-Type', 'application/json');
  if (authenticated && token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      // Um 401 no login significa credenciais incorretas; nas demais chamadas,
      // indica que a sessão precisa ser encerrada também no frontend.
      if (response.status === 401 && authenticated && requestToken && requestToken === token) onUnauthorized?.();
      const message = body?.message;
      throw new ApiError(Array.isArray(message) ? message.join('\n') : typeof message === 'string' ? message : `A API retornou erro ${response.status}.`, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(`Não foi possível acessar a API em ${API_URL}. Confira se o backend está ligado e se este aparelho está na mesma rede do servidor.`);
  } finally {
    clearTimeout(timeout);
  }
}
