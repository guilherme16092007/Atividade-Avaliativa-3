// Erro de negócio/validação com código HTTP associado
class ErroApp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function validarId(valor, nomeCampo = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ErroApp(400, `${nomeCampo} inválido: deve ser um inteiro positivo.`);
  }
  return n;
}

function validarNumero(valor, nomeCampo, { min = 0, minExclusivo = false, max = Infinity } = {}) {
  const n = typeof valor === 'string' && valor.trim() === '' ? NaN : Number(valor);
  if (!Number.isFinite(n)) throw new ErroApp(400, `${nomeCampo} deve ser numérico.`);
  if (minExclusivo ? n <= min : n < min) {
    throw new ErroApp(400, `${nomeCampo} deve ser ${minExclusivo ? 'maior que' : 'maior ou igual a'} ${min}.`);
  }
  if (n > max) throw new ErroApp(400, `${nomeCampo} deve ser no máximo ${max}.`);
  return n;
}

module.exports = { ErroApp, validarId, validarNumero };
