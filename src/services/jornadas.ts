import { api } from '@/services/api';
import { queryJornadas, type CadastroResumo, type FiltrosJornadas, type Jornada } from '@/utils/jornadas';

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
