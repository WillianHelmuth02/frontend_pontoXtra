import { queryJornadas, type FiltrosJornadas, type StatusJornada } from './jornadas';

export type GrupoRelatorio = { quantidade: string; sem_calculo: string; minutos_trabalhados: string; horas_trabalhadas: string; valor_calculado: string };
export type TotaisRelatorio = { geral: GrupoRelatorio; por_status: (GrupoRelatorio & { status: StatusJornada })[] };
export type PaginaRelatorio = {
  pagina: number; limite: number; tem_proxima: boolean;
  itens: { id: string; prestador_id: string; prestador_nome: string | null; data_jornada: string; minutos_trabalhados: number | null; horas_trabalhadas: string | null; valor_hora: string; valor_calculado: string | null; status: StatusJornada }[];
};

/** As duas consultas recebem os mesmos filtros; só a lista recebe paginação. */
export function consultasRelatorio(filtros: FiltrosJornadas, pagina: number) {
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 1000000) throw new Error('Página inválida.');
  const query = queryJornadas(filtros);
  return { totais: `/relatorios/totais${query}`, jornadas: `/relatorios/jornadas${query}${query ? '&' : '?'}pagina=${pagina}&limite=50` };
}
