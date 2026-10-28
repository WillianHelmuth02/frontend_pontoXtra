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

/** Documento genérico: mantém zeros e pontuação; contatos vazios limpam o campo. */
export function dadosPrestador(nome: string, documento: string, telefone: string, email: string) {
  function texto(valor: string, campo: string, limite: number) {
    const resultado = valor.trim();
    if (!resultado || Array.from(resultado).length > limite) {
      throw new Error(`${campo} deve conter entre 1 e ${limite} caracteres.`);
    }
    return resultado;
  }
  const contato = email.trim() ? texto(email, 'E-mail', 180) : null;
  if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    throw new Error('Informe um e-mail válido.');
  }
  return {
    nome: texto(nome, 'Nome', 150),
    documento: texto(documento, 'Documento', 30),
    telefone: telefone.trim() ? texto(telefone, 'Telefone', 25) : null,
    email: contato,
  };
}
