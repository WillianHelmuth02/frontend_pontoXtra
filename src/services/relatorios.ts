import { api } from '@/services/api';
import { consultasRelatorio, type PaginaRelatorio, type TotaisRelatorio } from '@/utils/relatorios';
import type { FiltrosJornadas } from '@/utils/jornadas';

export async function carregarRelatorio(filtros: FiltrosJornadas, pagina: number) {
  const urls = consultasRelatorio(filtros, pagina);
  const [lista, totais] = await Promise.all([api<PaginaRelatorio>(urls.jornadas), api<TotaisRelatorio>(urls.totais)]);
  return { lista, totais, chave: JSON.stringify([filtros, pagina]) };
}
