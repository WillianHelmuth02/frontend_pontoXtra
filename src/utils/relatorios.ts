import { queryJornadas, type FiltrosJornadas, type StatusJornada } from './jornadas';

export type FiltrosRelatorio = FiltrosJornadas & { setor_id?: string; busca?: string };
export type Distribuicoes = {
  por_setor: { id: string; nome: string; quantidade: string }[];
  por_mes: { mes: string; quantidade: string }[];
};
export type GrupoRelatorio = { quantidade: string; sem_calculo: string; minutos_trabalhados: string; horas_trabalhadas: string; valor_calculado: string };
export type TotaisRelatorio = { geral: GrupoRelatorio; por_status: (GrupoRelatorio & { status: StatusJornada })[] };
export type PaginaRelatorio = {
  pagina: number; limite: number; tem_proxima: boolean;
  itens: { id: string; prestador_id: string; prestador_nome: string | null; data_jornada: string; minutos_trabalhados: number | null; horas_trabalhadas: string | null; setor_nome: string | null; valor_hora?: string; valor_calculado?: string | null; status: StatusJornada }[];
};

/** As duas consultas recebem os mesmos filtros; só a lista recebe paginação. */
export function consultasRelatorio(filtros: FiltrosRelatorio, pagina: number) {
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 1000000) throw new Error('Página inválida.');
  const params = new URLSearchParams(queryJornadas(filtros));
  if (filtros.busca?.trim()) params.set('busca', filtros.busca.trim());
  if (filtros.setor_id) params.set('setor_id', filtros.setor_id);
  const query = params.size ? '?' + params.toString() : '';
  return { distribuicoes: '/relatorios/distribuicoes' + query, minhas: '/relatorios/minhas' + query + (query ? '&' : '?') + 'pagina=' + pagina + '&limite=50', totais: `/relatorios/totais${query}`, jornadas: `/relatorios/jornadas${query}${query ? '&' : '?'}pagina=${pagina}&limite=50` };
}
