import { api } from '@/services/api';
import { queryJornadas, validarLoteLixeira, type CadastroResumo, type FiltrosJornadas, type HistoricoJornada, type Jornada } from '@/utils/jornadas';

/** A API de jornadas retorna vínculos por ID, sem nomes expandidos.
 * Buscamos cada catálogo uma vez por atualização (não uma chamada por linha).
 * Não usamos ?ativo=true: jornadas antigas podem referenciar cadastros inativos.
 * Promise.all evita apresentar nomes e jornadas de carregamentos incompletos.
 */
export async function carregarJornadas(filtros: FiltrosJornadas) {
  const query = queryJornadas(filtros);
  const [jornadas, prestadores, funcoes, setores] = await Promise.all([
    api<Jornada[]>(`/jornadas${query}`),
    api<CadastroResumo[]>('/prestadores'),
    api<CadastroResumo[]>('/funcoes'),
    api<CadastroResumo[]>('/setores'),
  ]);
  return { jornadas, prestadores, funcoes, setores };
}

export async function carregarCadastrosAtivos() {
  const [prestadores, funcoes, setores] = await Promise.all([
    api<CadastroResumo[]>('/prestadores?ativo=true'),
    api<CadastroResumo[]>('/funcoes?ativo=true'),
    api<CadastroResumo[]>('/setores?ativo=true'),
  ]);
  return { prestadores, funcoes, setores };
}

export async function carregarDetalhes(id: string) {
  const [jornada, historico, prestadores, funcoes, setores] = await Promise.all([
    api<Jornada>(`/jornadas/${id}`), api<HistoricoJornada[]>(`/jornadas/${id}/historico`),
    api<CadastroResumo[]>('/prestadores'), api<CadastroResumo[]>('/funcoes'), api<CadastroResumo[]>('/setores'),
  ]);
  return { jornada, historico, prestadores, funcoes, setores };
}

export async function carregarLixeira() {
  const [jornadas, prestadores, funcoes, setores] = await Promise.all([
    api<Jornada[]>('/jornadas/lixeira'), api<CadastroResumo[]>('/prestadores'),
    api<CadastroResumo[]>('/funcoes'), api<CadastroResumo[]>('/setores'),
  ]);
  return { jornadas, prestadores, funcoes, setores };
}

export function detalhesLixeira(id: string) {
  return api<{ jornada: Jornada; historico: HistoricoJornada[] }>(`/jornadas/lixeira/${id}`);
}

export function operarLixeira(ids: string[], acao: 'enviar' | 'restaurar' | 'excluir') {
  const lote = validarLoteLixeira(ids);
  return api<{ quantidade: number }>(acao === 'excluir' ? '/jornadas/lixeira' : `/jornadas/lixeira/${acao}`, {
    method: acao === 'excluir' ? 'DELETE' : 'POST', body: JSON.stringify({ ids: lote }),
  });
}
