/** Aceita vírgula ou ponto sem arredondar ou interpretar separadores de milhar. */
export function dadosCadastro(nome: string, valorHora?: string) {
  const texto = nome.trim();
  if (!texto || Array.from(texto).length > 100) {
    throw new Error('Nome deve conter entre 1 e 100 caracteres.');
  }
  if (valorHora === undefined) return { nome: texto };
  const valor = valorHora.trim().replace(',', '.');
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) {
    throw new Error('Informe um valor por hora entre 0,01 e 99999999,99, com até duas casas decimais, sem separador de milhar.');
  }
  const [inteiro, decimal = ''] = valor.split('.');
  return { nome: texto, valor_hora: `${inteiro}.${decimal.padEnd(2, '0')}` };
}
