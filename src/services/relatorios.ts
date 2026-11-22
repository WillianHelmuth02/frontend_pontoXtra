import { api } from '@/services/api';
import { consultasRelatorio, type Distribuicoes, type FiltrosRelatorio, type PaginaRelatorio, type TotaisRelatorio } from '@/utils/relatorios';

export async function carregarRelatorio(filtros: FiltrosRelatorio, pagina: number, administrativo: boolean) {
  const urls = consultasRelatorio(filtros, pagina);
  const chave = JSON.stringify([filtros, pagina]);
  if (!administrativo) {
    return { lista: await api<PaginaRelatorio>(urls.minhas), totais: null, distribuicoes: null, chave };
  }
  const [lista, totais, distribuicoes] = await Promise.all([
    api<PaginaRelatorio>(urls.jornadas), api<TotaisRelatorio>(urls.totais), api<Distribuicoes>(urls.distribuicoes),
  ]);
  return { lista, totais, distribuicoes, chave };
}
