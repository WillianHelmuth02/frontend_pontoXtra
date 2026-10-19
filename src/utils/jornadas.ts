/** Contratos usados pela listagem. IDs BIGINT e valores DECIMAL continuam strings,
 * como no backend, para não perder precisão ao converter para number.
 */
export const STATUS_LABELS = {
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CONFERENCIA: 'Aguardando conferência',
  AGUARDANDO_AUTORIZACAO: 'Aguardando autorização',
  AUTORIZADO: 'Autorizado',
  REJEITADO: 'Rejeitado',
  PAGO: 'Pago',
} as const;
export type StatusJornada = keyof typeof STATUS_LABELS;
export type CadastroResumo = { id: string; nome: string };
export type Jornada = {
  id: string;
  prestador_id: string;
  funcao_id: string;
  setor_id: string;
  data_jornada: string;
  status: StatusJornada;
  entrada_em: string | null;
  saida_em: string | null;
};
export type FiltrosJornadas = {
  prestador_id: string;
  status: StatusJornada | '';
  data_inicio: string;
  data_fim: string;
};
export const FILTROS_VAZIOS: FiltrosJornadas = {
  prestador_id: '', status: '', data_inicio: '', data_fim: '',
};

/** Só antecipa a habilitação da UI. O servidor revalida perfil, estado atual e
 * sequência dentro de transação; selecionar uma linha nunca registra um evento.
 */
export function podeRegistrarEntrada(perfil: string, jornada?: Jornada): boolean {
  return perfil === 'OPERACIONAL' && jornada?.status === 'EM_ANDAMENTO'
    && jornada.entrada_em === null && jornada.saida_em === null;
}

/** DATE não representa um instante: formatamos sem Date/toLocaleDateString para
 * evitar que uma conversão de fuso apresente o dia anterior.
 */
export function formatarData(data: string): string {
  return data.split('-').reverse().join('/');
}

function dataParaApi(value: string): string {
  if (!value.trim()) return '';
  const match = /^(\d{2})\/(\d{2})\/([1-9]\d{3})$/.exec(value.trim());
  if (!match) throw new Error('Informe as datas no formato DD/MM/AAAA.');
  const [, dia, mes, ano] = match;
  const date = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (date.getUTCFullYear() !== Number(ano) || date.getUTCMonth() !== Number(mes) - 1 || date.getUTCDate() !== Number(dia)) {
    throw new Error('Informe uma data de calendário válida.');
  }
  return `${ano}-${mes}-${dia}`;
}

/** Os filtros são enviados ao GET /jornadas, não apenas aplicados à lista local.
 * Os limites são inclusivos e podem ser preenchidos separadamente.
 */
export function queryJornadas(filtros: FiltrosJornadas): string {
  const inicio = dataParaApi(filtros.data_inicio);
  const fim = dataParaApi(filtros.data_fim);
  if (inicio && fim && inicio > fim) throw new Error('A data inicial não pode ser posterior à final.');
  const query = new URLSearchParams();
  if (filtros.prestador_id) query.set('prestador_id', filtros.prestador_id);
  if (filtros.status) query.set('status', filtros.status);
  if (inicio) query.set('data_inicio', inicio);
  if (fim) query.set('data_fim', fim);
  return query.size ? `?${query.toString()}` : '';
}
