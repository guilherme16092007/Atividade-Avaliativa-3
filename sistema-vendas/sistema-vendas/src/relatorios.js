const conexao = require('./db');
const { ErroApp } = require('./erros');

function validarDataISO(valor, nome) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new ErroApp(400, `${nome} inválida. Use o formato YYYY-MM-DD.`);
  }
  return valor;
}

// fim é INCLUSIVO: data_venda >= inicio 00:00 e < (fim + 1 dia)
const FILTRO_PERIODO = 'v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY)';

async function gerarRelatorioPerformance(inicio, fim) {
  try {
    validarDataISO(inicio, 'Data inicial (inicio)');
    validarDataISO(fim, 'Data final (fim)');
    if (inicio > fim) throw new ErroApp(400, 'A data inicial não pode ser maior que a data final.');

    const periodo = [inicio, fim];
    // Mês de referência das metas = mês da data inicial
    const mesReferencia = `${inicio.slice(0, 7)}-01`;

    const [
      [geral],
      [porRegiao],
      [porTipo],
      [melhorVendedor],
      [maiorComissao],
      [metas]
    ] = await Promise.all([
      // Total de vendas + comissão média geral
      conexao.execute(
        `SELECT COUNT(*) AS total_vendas,
                COALESCE(SUM(v.valor_venda), 0) AS valor_total,
                COALESCE(AVG(v.valor_comissao), 0) AS comissao_media_geral
           FROM vendas v WHERE ${FILTRO_PERIODO}`, periodo),

      // Vendas por região + comissão média por região (JOIN + GROUP BY + SUM + AVG)
      conexao.execute(
        `SELECT r.id_regiao, r.nome_regiao AS regiao,
                COUNT(v.id_venda) AS quantidade_vendas,
                COALESCE(SUM(v.valor_venda), 0) AS total_vendido,
                COALESCE(AVG(v.valor_comissao), 0) AS comissao_media
           FROM regioes r
           LEFT JOIN vendas v ON v.id_regiao = r.id_regiao AND ${FILTRO_PERIODO}
          GROUP BY r.id_regiao, r.nome_regiao
          ORDER BY r.id_regiao`, periodo),

      // Vendas por tipo de cliente (GROUP BY + SUM + COUNT)
      conexao.execute(
        `SELECT v.tipo_cliente, COUNT(*) AS quantidade_vendas, SUM(v.valor_venda) AS total_vendido
           FROM vendas v WHERE ${FILTRO_PERIODO}
          GROUP BY v.tipo_cliente`, periodo),

      // Melhor vendedor: maior valor vendido (JOIN + GROUP BY + SUM)
      conexao.execute(
        `SELECT ve.id_vendedor, ve.nome, SUM(v.valor_venda) AS total_vendido
           FROM vendas v JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
          WHERE ${FILTRO_PERIODO}
          GROUP BY ve.id_vendedor, ve.nome
          ORDER BY total_vendido DESC LIMIT 1`, periodo),

      // Maior comissão acumulada (JOIN + GROUP BY + SUM)
      conexao.execute(
        `SELECT ve.id_vendedor, ve.nome, SUM(v.valor_comissao) AS comissao_acumulada
           FROM vendas v JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
          WHERE ${FILTRO_PERIODO}
          GROUP BY ve.id_vendedor, ve.nome
          ORDER BY comissao_acumulada DESC LIMIT 1`, periodo),

      // Metas do mês de referência (LEFT JOIN para incluir quem não vendeu)
      conexao.execute(
        `SELECT ve.id_vendedor, ve.nome, ve.meta_mensal,
                COALESCE(SUM(v.valor_venda), 0) AS total_vendido_no_mes
           FROM vendedores ve
           LEFT JOIN vendas v ON v.id_vendedor = ve.id_vendedor
                AND v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 MONTH)
          WHERE ve.ativo = 1 OR v.id_venda IS NOT NULL
          GROUP BY ve.id_vendedor, ve.nome, ve.meta_mensal
          ORDER BY ve.nome`, [mesReferencia, mesReferencia])
    ]);

    const vendedoresMeta = metas.map((m) => ({
      ...m,
      percentual_da_meta: m.meta_mensal > 0
        ? Number(((m.total_vendido_no_mes / m.meta_mensal) * 100).toFixed(2)) : null,
      meta_atingida: m.total_vendido_no_mes >= m.meta_mensal
    }));

    const tiposCliente = ['PF', 'PJ'].map((tipo) => {
      const linha = porTipo.find((t) => t.tipo_cliente === tipo);
      return { tipo_cliente: tipo, quantidade_vendas: linha ? linha.quantidade_vendas : 0,
               total_vendido: linha ? linha.total_vendido : 0 };
    });

    const arred = (n) => Number(Number(n).toFixed(2));
    return {
      periodo: { inicio, fim },
      total_vendas: geral[0].total_vendas,
      valor_total_vendido: arred(geral[0].valor_total),
      comissao_media_geral: arred(geral[0].comissao_media_geral),
      vendas_por_regiao: porRegiao.map((r) => ({
        regiao: r.regiao, quantidade_vendas: r.quantidade_vendas,
        total_vendido: arred(r.total_vendido), comissao_media: arred(r.comissao_media)
      })),
      vendas_por_tipo_cliente: tiposCliente,
      melhor_vendedor: melhorVendedor[0] || null,
      maior_comissao: maiorComissao[0] || null,
      metas: {
        mes_referencia: mesReferencia.slice(0, 7),
        quantidade_metas_atingidas: vendedoresMeta.filter((v) => v.meta_atingida).length,
        vendedores: vendedoresMeta
      }
    };
  } catch (erro) {
    console.error('Erro ao gerar relatório de performance:', erro.message);
    throw erro;
  }
}

module.exports = { gerarRelatorioPerformance };
