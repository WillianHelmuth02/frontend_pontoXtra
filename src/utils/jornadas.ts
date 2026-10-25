/** Contratos usados pela listagem. IDs BIGINT e valores DECIMAL continuam strings,
 * como no backend, para não perder precisão ao converter para number.
 */
export const STATUS_LABELS = {
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CONFERENCIA: 'Aguardando conferência',
  AGUARDANDO_AUTORIZACAO: 'Aguardando aprovação de pagamento',
  AUTORIZADO: 'Pagamento autorizado',
  REJEITADO: 'Pagamento rejeitado',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
  AGUARDANDO_AUTORIZACAO_REALIZACAO: 'Aguardando autorização de realização',
  AUTORIZADA_PARA_REALIZACAO: 'Realização autorizada',
  REALIZACAO_REJEITADA: 'Realização rejeitada',
} as const;
export type StatusJornada = keyof typeof STATUS_LABELS;
export type CadastroResumo = { id: string; nome: string; ativo?: boolean; valor_hora?: string };
export type Jornada = {
  id: string;
  criada_por: string;
  excluida_em: string | null;
  excluida_por: string | null;
  prestador_id: string;
  funcao_id: string;
  setor_id: string;
  data_jornada: string;
  status: StatusJornada;
  realizacao_decidida_por: string | null;
  realizacao_decidida_em: string | null;
  justificativa_rejeicao_realizacao: string | null;
  legado_sem_aprovacao_previa: boolean;
  entrada_em: string | null;
  saida_em: string | null;
  inicio_intervalo_em: string | null;
  fim_intervalo_em: string | null;
  valor_hora: string;
  minutos_trabalhados: number | null;
  valor_calculado: string | null;
  justificativa_rejeicao: string | null;
  conferida_em: string | null;
  decidida_em: string | null;
  data_pagamento: string | null;
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
  return perfil === 'OPERACIONAL' && jornada?.status === 'AUTORIZADA_PARA_REALIZACAO'
    && realizacaoAutorizada(jornada) && !jornada.excluida_em
    && !jornada.entrada_em && !jornada.inicio_intervalo_em && !jornada.fim_intervalo_em && !jornada.saida_em;
}

function realizacaoAutorizada(j: Jornada): boolean {
  return !!j.realizacao_decidida_por && !!j.realizacao_decidida_em && Number.isFinite(Date.parse(j.realizacao_decidida_em)) && !j.justificativa_rejeicao_realizacao;
}

/** DATE não representa um instante: formatamos sem Date/toLocaleDateString para
 * evitar que uma conversão de fuso apresente o dia anterior.
 */
export function formatarData(data: string): string {
  return data.split('-').reverse().join('/');
}

export function dataParaApi(value: string): string {
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

export type HistoricoJornada = {
  id: string; usuario_id: string; acao: string; descricao: string | null;
  criado_em: string; dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
};
export type AcaoJornada = 'entrada' | 'inicio-intervalo' | 'fim-intervalo' | 'saida'
  | 'conferir' | 'autorizar' | 'rejeitar' | 'corrigir' | 'pagar' | 'cancelar' | 'autorizar-realizacao' | 'rejeitar-realizacao';
export const ACAO_LABELS: Record<AcaoJornada, string> = {
  entrada: 'Registrar entrada', 'inicio-intervalo': 'Iniciar intervalo',
  'fim-intervalo': 'Finalizar intervalo', saida: 'Registrar saída', conferir: 'Conferir jornada',
  'autorizar-realizacao': 'Autorizar realização', 'rejeitar-realizacao': 'Rejeitar realização',
  autorizar: 'Autorizar pagamento', rejeitar: 'Rejeitar pagamento', corrigir: 'Corrigir jornada',
  pagar: 'Registrar pagamento', cancelar: 'Cancelar jornada',
};

/** Visibilidade de ações por perfil e estado. A API revalida tudo na transação,
 * inclusive quando outro usuário alterou a jornada depois desta consulta.
 */
export function acoesPermitidas(perfil: string, j: Jornada, usuarioId?: string): AcaoJornada[] {
  if (j.excluida_em) return [];
  const semMarcacoes = ['EM_ANDAMENTO', 'AGUARDANDO_AUTORIZACAO_REALIZACAO', 'AUTORIZADA_PARA_REALIZACAO', 'REALIZACAO_REJEITADA'].includes(j.status)
    && !j.entrada_em && !j.inicio_intervalo_em && !j.fim_intervalo_em && !j.saida_em;
  const podeExcluir = semMarcacoes && (perfil === 'RH'
    || (['OPERACIONAL', 'ADMINISTRADOR'].includes(perfil) && !!usuarioId && j.criada_por === usuarioId));
  const iniciais: AcaoJornada[] = [];
  if (perfil === 'ADMINISTRADOR' && j.status === 'AGUARDANDO_AUTORIZACAO_REALIZACAO' && semMarcacoes && !j.realizacao_decidida_por && !j.realizacao_decidida_em && !j.justificativa_rejeicao_realizacao) iniciais.push('autorizar-realizacao', 'rejeitar-realizacao');
  if (podeRegistrarEntrada(perfil, j)) iniciais.push('entrada');
  if (podeExcluir) iniciais.push('cancelar');
  if (iniciais.length || ['AGUARDANDO_AUTORIZACAO_REALIZACAO', 'AUTORIZADA_PARA_REALIZACAO', 'REALIZACAO_REJEITADA'].includes(j.status)) return iniciais;
  if (!realizacaoAutorizada(j) && !(j.legado_sem_aprovacao_previa && j.entrada_em)) return [];
  if (perfil === 'OPERACIONAL' && j.status === 'EM_ANDAMENTO' && !j.saida_em) {
    if ((!j.entrada_em && (j.inicio_intervalo_em || j.fim_intervalo_em)) || (!j.inicio_intervalo_em && j.fim_intervalo_em)) return [];
    if (!j.entrada_em) return [];
    if (j.inicio_intervalo_em && !j.fim_intervalo_em) return ['fim-intervalo'];
    return j.inicio_intervalo_em ? ['saida'] : ['inicio-intervalo', 'saida'];
  }
  if (perfil === 'RH') {
    if (j.status === 'AGUARDANDO_CONFERENCIA') return ['conferir', 'corrigir'];
    if (j.status === 'REJEITADO') return ['corrigir'];
    if (j.status === 'AUTORIZADO') return ['pagar'];
  }
  if (perfil === 'ADMINISTRADOR' && j.status === 'AGUARDANDO_AUTORIZACAO') return ['autorizar', 'rejeitar'];
  return [];
}

/** A seleção em lote só antecipa a regra; o servidor verifica cada registro. */
export function podeEnviarLixeira(perfil: string, j: Jornada, usuarioId: string): boolean {
  return j.status === 'CANCELADO' && !j.excluida_em
    && !j.entrada_em && !j.inicio_intervalo_em && !j.fim_intervalo_em && !j.saida_em
    && (perfil === 'RH' || (['OPERACIONAL', 'ADMINISTRADOR'].includes(perfil) && j.criada_por === usuarioId));
}

export function validarLoteLixeira(ids: string[]): string[] {
  if (ids.length < 1 || ids.length > 50 || new Set(ids).size !== ids.length
    || ids.some((id) => !/^[1-9]\d{0,19}$/.test(id) || BigInt(id) > 18446744073709551615n)) {
    throw new Error('Selecione de 1 a 50 jornadas diferentes.');
  }
  return [...ids];
}

/** Mostra DECIMAL em reais sem converter para ponto flutuante. */
export function dinheiro(valor: string | null | undefined): string {
  if (valor == null) return 'Ainda não calculado';
  const [inteiro, decimal = '00'] = valor.split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal.padEnd(2, '0')}`;
}

/** Os formulários de correção usam Brasília UTC-03, explicitado na interface.
 * Somamos/subtraímos um offset fixo, sem depender do fuso do navegador de teste.
 */
export function horarioFormulario(value: string | null): string {
  if (!value) return '';
  const iso = new Date(new Date(value).getTime() - 3 * 3600000).toISOString();
  return `${formatarData(iso.slice(0, 10))} ${iso.slice(11, 19)}`;
}
export function horarioParaApi(value: string): string {
  const match = /^(\d{2}\/\d{2}\/[1-9]\d{3}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) throw new Error('Horário deve ser DD/MM/AAAA HH:mm:ss, em Brasília (UTC-03).');
  return new Date(`${dataParaApi(match[1])}T${match[2]}:${match[3]}:${match[4]}-03:00`).toISOString();
}

export type CorrecaoForm = {
  data_jornada: string; valor_hora: string; entrada_em: string; saida_em: string;
  inicio_intervalo_em: string; fim_intervalo_em: string;
};
/** Converte o formulário amigável para o contrato estrito do backend. Intervalo
 * pode ser removido apenas como par; cálculo e status nunca vêm do navegador.
 */
export function payloadCorrecao(form: CorrecaoForm) {
  if (!form.data_jornada.trim()) throw new Error('Informe a data de referência.');
  const valor = form.valor_hora.trim().replace(',', '.');
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) throw new Error('Informe valor/hora entre 0,01 e 99999999,99, sem separador de milhar.');
  if (!!form.inicio_intervalo_em.trim() !== !!form.fim_intervalo_em.trim()) throw new Error('Informe início e fim do intervalo ou deixe ambos vazios para removê-lo.');
  const entrada_em = horarioParaApi(form.entrada_em);
  const saida_em = horarioParaApi(form.saida_em);
  const inicio_intervalo_em = form.inicio_intervalo_em.trim() ? horarioParaApi(form.inicio_intervalo_em) : null;
  const fim_intervalo_em = form.fim_intervalo_em.trim() ? horarioParaApi(form.fim_intervalo_em) : null;
  if (saida_em <= entrada_em || (inicio_intervalo_em && fim_intervalo_em &&
    (inicio_intervalo_em <= entrada_em || fim_intervalo_em <= inicio_intervalo_em || saida_em <= fim_intervalo_em))) throw new Error('Confira a sequência: entrada, início/fim do intervalo e saída, em ordem crescente.');
  return { data_jornada: dataParaApi(form.data_jornada), valor_hora: valor, entrada_em, saida_em, inicio_intervalo_em, fim_intervalo_em };
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
