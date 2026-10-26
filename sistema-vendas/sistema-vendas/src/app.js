const express = require('express');
const vendedores = require('./vendedores');
const vendas = require('./vendas');
const { gerarRelatorioPerformance } = require('./relatorios');
const { ErroApp } = require('./erros');

const app = express();
app.use(express.json());

// Encapsula handlers async para encaminhar erros ao middleware central
const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => res.json({ mensagem: 'API de Vendas e Comissões no ar.' }));

// ---------------------------- Vendedores ----------------------------
app.post('/vendedores', rota(async (req, res) => res.status(201).json(await vendedores.cadastrarVendedor(req.body))));
app.get('/vendedores', rota(async (req, res) => res.json(await vendedores.listarVendedores(req.query.ativos === 'true'))));
app.get('/vendedores/:id', rota(async (req, res) => res.json(await vendedores.consultarVendedor(req.params.id))));
app.put('/vendedores/:id', rota(async (req, res) => res.json(await vendedores.atualizarVendedor(req.params.id, req.body))));
app.patch('/vendedores/:id/desativar', rota(async (req, res) => res.json(await vendedores.desativarVendedor(req.params.id))));

// ------------------------------ Vendas ------------------------------
app.post('/vendas', rota(async (req, res) => res.status(201).json(await vendas.registrarVenda(req.body))));
app.get('/vendas', rota(async (req, res) => res.json(await vendas.listarVendas())));
app.get('/vendas/vendedor/:id', rota(async (req, res) => res.json(await vendas.consultarVendasPorVendedor(req.params.id))));
app.get('/vendas/regiao/:id', rota(async (req, res) => res.json(await vendas.consultarVendasPorRegiao(req.params.id))));
app.delete('/vendas/:id', rota(async (req, res) => res.json(await vendas.excluirVenda(req.params.id))));

// ----------------------- Regiões e relatórios -----------------------
app.get('/regioes', rota(async (req, res) => res.json(await vendas.listarRegioes())));
app.get('/relatorios/performance', rota(async (req, res) =>
  res.json(await gerarRelatorioPerformance(req.query.inicio, req.query.fim))));

// ------------------------- 404 e erros -------------------------
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof ErroApp) return res.status(err.status).json({ erro: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Registro duplicado (código já existente).' });

  // Falhas de conexão/consulta no banco: não expõe detalhes internos ao cliente
  console.error('Erro inesperado:', err.code || '', err.message);
  const semConexao = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ETIMEDOUT'];
  return res.status(500).json({
    erro: semConexao.includes(err.code)
      ? 'Falha na conexão com o banco de dados.'
      : 'Erro interno ao processar a requisição.'
  });
});

module.exports = app;
