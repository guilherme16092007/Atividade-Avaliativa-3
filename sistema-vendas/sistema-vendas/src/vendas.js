const conexao = require('./db');
const { ErroApp, validarId, validarNumero } = require('./erros');
const { calcularComissao } = require('./comissao');

const SELECT_VENDAS = `
  SELECT v.id_venda, v.id_vendedor, ve.nome AS vendedor,
         v.id_regiao, r.nome_regiao AS regiao,
         v.data_venda, v.valor_venda, v.tipo_cliente, v.valor_comissao
    FROM vendas v
    JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
    JOIN regioes r     ON r.id_regiao    = v.id_regiao`;

function normalizarData(data) {
  if (data === undefined || data === null || data === '') return null; // usa DEFAULT CURRENT_TIMESTAMP
  if (typeof data !== 'string' || Number.isNaN(Date.parse(data))) {
    throw new ErroApp(400, "data_venda inválida. Use 'YYYY-MM-DD HH:MM:SS' ou ISO 8601.");
  }
  return data.replace('T', ' ').slice(0, 19);
}

async function registrarVenda(dados = {}) {
  try {
    // 1) Validações de entrada
    const idVendedor = validarId(dados.id_vendedor, 'id_vendedor');
    const idRegiao = validarId(dados.id_regiao, 'id_regiao');
    const valor = validarNumero(dados.valor_venda, 'valor_venda', { min: 0, minExclusivo: true });
    if (!['PF', 'PJ'].includes(dados.tipo_cliente)) {
      throw new ErroApp(400, "tipo_cliente deve ser 'PF' ou 'PJ'.");
    }
    const idVenda = dados.id_venda === undefined ? null : validarId(dados.id_venda, 'id_venda');
    const dataVenda = normalizarData(dados.data_venda);

    // 2) Regras de negócio (vendedor ativo, região existente, código único)
    const [vendedores] = await conexao.execute(
      'SELECT id_vendedor, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?', [idVendedor]);
    if (vendedores.length === 0) throw new ErroApp(404, 'Vendedor inexistente.');
    if (!vendedores[0].ativo) throw new ErroApp(400, 'Vendedor inativo: não é possível registrar vendas.');

    const [regioes] = await conexao.execute(
      'SELECT id_regiao, percentual_bonus FROM regioes WHERE id_regiao = ?', [idRegiao]);
    if (regioes.length === 0) throw new ErroApp(404, 'Região inexistente.');

    if (idVenda !== null) {
      const [existente] = await conexao.execute('SELECT 1 FROM vendas WHERE id_venda = ?', [idVenda]);
      if (existente.length > 0) throw new ErroApp(409, `Já existe uma venda com o código ${idVenda}.`);
    }

    // 3) Cálculo da comissão (função única)
    const comissao = await calcularComissao(
      valor, vendedores[0].percentual_base, dados.tipo_cliente, regioes[0].percentual_bonus);

    // 4) Persistência (colunas opcionais: id_venda e data_venda)
    const colunas = ['id_vendedor', 'id_regiao', 'valor_venda', 'tipo_cliente', 'valor_comissao'];
    const valores = [idVendedor, idRegiao, valor, dados.tipo_cliente, comissao.valor_comissao];
    if (idVenda !== null) { colunas.push('id_venda'); valores.push(idVenda); }
    if (dataVenda !== null) { colunas.push('data_venda'); valores.push(dataVenda); }

    const [resultado] = await conexao.execute(
      `INSERT INTO vendas (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
      valores
    );
    const [criada] = await conexao.execute(`${SELECT_VENDAS} WHERE v.id_venda = ?`, [resultado.insertId]);
    return { ...criada[0], percentual_total: comissao.percentual_total };
  } catch (erro) {
    console.error('Erro ao registrar venda:', erro.message);
    throw erro;
  }
}

async function listarVendas() {
  try {
    const [resultados] = await conexao.execute(`${SELECT_VENDAS} ORDER BY v.data_venda DESC, v.id_venda DESC`);
    return resultados;
  } catch (erro) {
    console.error('Erro ao listar vendas:', erro.message);
    throw erro;
  }
}

async function consultarVendasPorVendedor(id) {
  try {
    const idVendedor = validarId(id, 'id_vendedor');
    const [vend] = await conexao.execute('SELECT 1 FROM vendedores WHERE id_vendedor = ?', [idVendedor]);
    if (vend.length === 0) throw new ErroApp(404, 'Vendedor não encontrado.');
    const [resultados] = await conexao.execute(
      `${SELECT_VENDAS} WHERE v.id_vendedor = ? ORDER BY v.data_venda DESC`, [idVendedor]);
    return resultados;
  } catch (erro) {
    console.error('Erro ao consultar vendas por vendedor:', erro.message);
    throw erro;
  }
}

async function consultarVendasPorRegiao(id) {
  try {
    const idRegiao = validarId(id, 'id_regiao');
    const [reg] = await conexao.execute('SELECT 1 FROM regioes WHERE id_regiao = ?', [idRegiao]);
    if (reg.length === 0) throw new ErroApp(404, 'Região não encontrada.');
    const [resultados] = await conexao.execute(
      `${SELECT_VENDAS} WHERE v.id_regiao = ? ORDER BY v.data_venda DESC`, [idRegiao]);
    return resultados;
  } catch (erro) {
    console.error('Erro ao consultar vendas por região:', erro.message);
    throw erro;
  }
}

async function excluirVenda(id) {
  try {
    const idVenda = validarId(id, 'id_venda');
    const [existente] = await conexao.execute('SELECT 1 FROM vendas WHERE id_venda = ?', [idVenda]);
    if (existente.length === 0) throw new ErroApp(404, 'Venda não encontrada.');
    await conexao.execute('DELETE FROM vendas WHERE id_venda = ?', [idVenda]);
    return { mensagem: `Venda ${idVenda} excluída com sucesso.` };
  } catch (erro) {
    console.error('Erro ao excluir venda:', erro.message);
    throw erro;
  }
}

async function listarRegioes() {
  try {
    const [resultados] = await conexao.execute('SELECT * FROM regioes ORDER BY id_regiao');
    return resultados;
  } catch (erro) {
    console.error('Erro ao listar regiões:', erro.message);
    throw erro;
  }
}

module.exports = {
  registrarVenda, listarVendas, consultarVendasPorVendedor,
  consultarVendasPorRegiao, excluirVenda, listarRegioes
};
