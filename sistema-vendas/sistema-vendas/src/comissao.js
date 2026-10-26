// Única fonte da regra de comissão (evita duplicação de lógica)
const BONUS_CLIENTE = { PF: 2, PJ: 3 };

/**
 * Comissão total = valor × (percentual_base + bônus_cliente + bônus_região) / 100
 * Os percentuais são SOMADOS (sem composição).
 * @param {number} valorVenda
 * @param {number} percentualBase    % base do vendedor
 * @param {'PF'|'PJ'} tipoCliente
 * @param {number} percentualRegiao  % bônus da região (tabela regioes)
 */
async function calcularComissao(valorVenda, percentualBase, tipoCliente, percentualRegiao) {
  const percentualCliente = BONUS_CLIENTE[tipoCliente];
  if (percentualCliente === undefined) {
    throw new Error(`Tipo de cliente inválido: ${tipoCliente}`);
  }
  const percentualTotal = Number(percentualBase) + percentualCliente + Number(percentualRegiao);
  // arredonda para centavos
  const valorComissao = Math.round(valorVenda * percentualTotal) / 100;
  return {
    percentual_total: Number(percentualTotal.toFixed(2)),
    valor_comissao: valorComissao
  };
}

module.exports = { calcularComissao, BONUS_CLIENTE };
