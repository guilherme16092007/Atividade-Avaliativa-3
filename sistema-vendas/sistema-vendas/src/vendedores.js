const conexao = require('./db');
const { ErroApp, validarId, validarNumero } = require('./erros');

async function cadastrarVendedor(dados = {}) {
  try {
    const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
    if (!nome || nome.length > 100) throw new ErroApp(400, 'nome é obrigatório (até 100 caracteres).');
    const meta = validarNumero(dados.meta_mensal, 'meta_mensal', { min: 0 });
    const base = validarNumero(dados.percentual_base, 'percentual_base', { min: 0, max: 100 });

    const [resultado] = await conexao.execute(
      'INSERT INTO vendedores (nome, meta_mensal, percentual_base, ativo) VALUES (?, ?, ?, 1)',
      [nome, meta, base]
    );
    return { id_vendedor: resultado.insertId, nome, meta_mensal: meta, percentual_base: base, ativo: 1 };
  } catch (erro) {
    console.error('Erro ao cadastrar vendedor:', erro.message);
    throw erro;
  }
}

async function listarVendedores(apenasAtivos = false) {
  try {
    const [resultados] = apenasAtivos
      ? await conexao.execute('SELECT * FROM vendedores WHERE ativo = ? ORDER BY nome', [1])
      : await conexao.execute('SELECT * FROM vendedores ORDER BY nome');
    return resultados;
  } catch (erro) {
    console.error('Erro ao consultar vendedores:', erro.message);
    throw erro;
  }
}

async function consultarVendedor(id) {
  try {
    const idVendedor = validarId(id, 'id_vendedor');
    const [linhas] = await conexao.execute('SELECT * FROM vendedores WHERE id_vendedor = ?', [idVendedor]);
    if (linhas.length === 0) throw new ErroApp(404, 'Vendedor não encontrado.');
    return linhas[0];
  } catch (erro) {
    console.error('Erro ao consultar vendedor:', erro.message);
    throw erro;
  }
}

async function atualizarVendedor(id, dados = {}) {
  try {
    const idVendedor = validarId(id, 'id_vendedor');
    if (dados.meta_mensal === undefined && dados.percentual_base === undefined) {
      throw new ErroApp(400, 'Informe meta_mensal e/ou percentual_base.');
    }
    const atual = await consultarVendedor(idVendedor); // 404 se não existir
    const meta = dados.meta_mensal === undefined
      ? atual.meta_mensal
      : validarNumero(dados.meta_mensal, 'meta_mensal', { min: 0 });
    const base = dados.percentual_base === undefined
      ? atual.percentual_base
      : validarNumero(dados.percentual_base, 'percentual_base', { min: 0, max: 100 });

    await conexao.execute(
      'UPDATE vendedores SET meta_mensal = ?, percentual_base = ? WHERE id_vendedor = ?',
      [meta, base, idVendedor]
    );
    return { ...atual, meta_mensal: meta, percentual_base: base };
  } catch (erro) {
    console.error('Erro ao atualizar vendedor:', erro.message);
    throw erro;
  }
}

// Desativação lógica: preserva o histórico de vendas
async function desativarVendedor(id) {
  try {
    const idVendedor = validarId(id, 'id_vendedor');
    const atual = await consultarVendedor(idVendedor);
    await conexao.execute('UPDATE vendedores SET ativo = 0 WHERE id_vendedor = ?', [idVendedor]);
    return { ...atual, ativo: 0 };
  } catch (erro) {
    console.error('Erro ao desativar vendedor:', erro.message);
    throw erro;
  }
}

module.exports = { cadastrarVendedor, listarVendedores, consultarVendedor, atualizarVendedor, desativarVendedor };
